# Design: Sprint 5 — Compras

## 1. Architecture Decisions

| #   | Decision                           | Choice                                                                                                                                                              | Alternatives Rejected                    | Rationale                                                                                                                                                                                                                                                          |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Cost source of truth**           | Receipt `actualCost` → `Batch.purchaseCost`                                                                                                                         | OC `unitCost`; Invoice `total`           | OC cost is BUDGET (prices change between order/delivery). Invoice is ACCOUNTING (may include freight, span receipts). Receipt cost = what entered your warehouse — the number Yield Costing depends on. `ProductSupplier.unitCost` is only a default for OC lines. |
| 2   | **Batch FK — Nullable source IDs** | `ALTER batches ADD source_receipt_id UUID NULL, oc_id UUID NULL`                                                                                                    | Polymorphic `batch_source_type` enum     | Manually-created batches (Sprint 4) stay NULL — zero migration risk. Simpler than polymorphic FK. Index on `source_receipt_id` for fast receipt→batch trace.                                                                                                       |
| 3   | **OC status transitions**          | Domain-level `PurchaseOrderDomainService.validateTransition(from,to)` with allowed graph: `PENDING→PARTIAL, PENDING→CANCELLED, PARTIAL→RECEIVED, PARTIAL→CANCELLED` | Controller validation; DB CHECK only     | Same pattern as `SlaughterDomainService.ensureProcessableAnimal()`. Pure, testable without Spring. DB CHECK is a secondary safety net.                                                                                                                             |
| 4   | **Invoice numbering**              | `UNIQUE(supplier_id, invoice_number)`                                                                                                                               | Global unique `invoice_number`           | Colombian DIAN allows supplier-scoped numbering series. Prevents duplicates per supplier without blocking legitimate cross-supplier collisions.                                                                                                                    |
| 5   | **CxP balance strategy**           | Denormalized: Invoice ADD, Payment SUBTRACT on `ThirdParty.currentBalance`                                                                                          | Computed `SUM(invoices) - SUM(payments)` | `currentBalance` already exists in the model. Denormalized = instant CxP queries. No multi-table joins needed for `GET /api/v1/suppliers/{id}/balance`.                                                                                                            |
| 6   | **Partial receipts**               | OC line tracks `orderedQty` + `receivedQty`; receipt validates `receivedQty ≤ orderedQty − receivedQty`                                                             | Multiple OC versions per receipt         | Standard ERP pattern. Colombian plants receive against one OC over multiple days. OC transitions to RECEIVED when all lines fully received.                                                                                                                        |

## 2. Data Flow: Goods Receipt (S2 Core Complexity)

```
POST /api/v1/goods-receipts
{
  ocId: UUID,
  receiptDate: "2026-05-17",
  lines: [{ productId, receivedQty, actualCost, warehouseId }]
}
          │
          ▼
CreateGoodsReceiptUseCase.process(request)  [@Transactional — single DB transaction]
  │
  ├─1─ PurchaseOrderRepository.findById(ocId) → oc (must be PENDING or PARTIAL)
  ├─2─ ReceiptDomainService.validateLines(oc, receiptLines)
  │     → For each line: supplier = oc.supplierId ✓
  │     → receivedQty ≤ (ocLine.orderedQty − ocLine.receivedQty) ✓
  │     → BusinessException if ANY validation fails (rollback entire tx)
  │
  ├─3─ FOR each receipt line WITHIN transaction:
  │     ├─ BatchRepository.save({
  │     │     supplierId:      oc.supplierId,
  │     │     warehouseId:     line.warehouseId,
  │     │     entryDate:       TODAY,
  │     │     initialWeight:   line.receivedQty,     ← in kg for meat
  │     │     purchaseCost:    line.actualCost,      ← SOURCE OF TRUTH
  │     │     status:          OPEN,
  │     │     sourceReceiptId: receipt.id,           ← NEW FK column
  │     │     ocId:            oc.id,                ← NEW FK column
  │     │     notes:           "Recepción #{receipt.id} vs OC #{oc.id}"
  │     │   })
  │     ├─ StockRepository.upsert(productId, batchId, warehouseId, +receivedQty, unitCost=actualCost)
  │     ├─ PurchaseLineItemRepository.updateReceivedQty(lineId, receivedQty)
  │     └─ IF |actualCost − ocLine.unitCost| / ocLine.unitCost > 0.20
  │          → tag receipt with "HIGH_COST_DEVIATION" (warning, never blocks)
  │
  ├─4─ PurchaseOrderRepository.updateStatus(ocId):
  │     → ALL lines orderedQty == receivedQty? → RECEIVED
  │     → SOME remaining? → PARTIAL
  │
  ├─5─ GoodsReceiptRepository.save(receipt)
  │
          ▼
  GoodsReceiptResponse {
    id, ocId, batchIds: [UUID×N], totalLines, totalReceivedQty,
    deviations: [{ productId, expectedCost, actualCost, variancePct }]
  }
```

**Transaction invariants**: batch count = receipt line count; stock entries exist per batch; OC line `receivedQty` ≤ `orderedQty` always; OC status reflects actual completion; cost deviations logged but never block.

## 3. Entity Relationships

```
                    ┌──────────────────────┐
                    │     ThirdParty        │
                    │  (SUPPLIER type)      │
                    │  currentBalance       │
                    └──┬───────┬───────┬────┘
                       │       │       │
               supplierId  supplierId supplierId
                       │       │       │
        ┌──────────────┼──┐    │    ┌──┴──────────────────┐
        │ PurchaseOrder  │    │    │  SupplierInvoice     │
        │ status: enum   │    │    │  subtotal, iva,      │
        │ orderDate      │    │    │  retenciones, total  │
        └──────┬─────────┘    │    │  status: enum        │
               │              │    │  UNIQUE(supplier_id, │
               │ 1:N          │    │    invoice_number)   │
        ┌──────┴─────────┐    │    └──────────┬───────────┘
        │ PurchaseLineItem│    │               │
        │ productId       │    │         N:M   │ invoice_orders
        │ orderedQty      │    │    ┌──────────┴───────────┐
        │ receivedQty     │    │    │                      │
        │ unitCost        │    │    │             1:N      │
        │ warehouseId     │    │    │  invoice_payments    │
        └─────────────────┘    │    │  ┌──────────┴──────┐ │
                               │    │  │    Payment       │ │
               ocId            │    │  │    amount        │ │
        ┌──────┴───────────────┼────┘  │    paymentDate   │ │
        │  GoodsReceipt        │       │    method         │ │
        │  receiptDate         │       │    reference      │ │
        │  status (COMPLETED/  │       └───────────────────┘ │
        │    HIGH_COST_DEV)    │                             │
        └──────────┬───────────┘                             │
                   │ 1:N                                     │
          ┌────────┴──────────────┐                          │
          │ ReceiptLineItem       │                          │
          │ productId, receivedQty│                          │
          │ actualCost, warehouseId│                         │
          └───────────────────────┘                          │
                                                            │
        ┌───────────────────────────────────────────────────┘
        │ 1:N (via sourceReceiptId, FK NULLable)
        ▼
   ┌─────────────┐
   │   Batch     │  ← ALTER: sourceReceiptId, ocId (nullable)
   │ supplierId  │
   │ purchaseCost│
   │ status      │
   └─────────────┘
```

## 4. Database Migrations

| Version | Action       | Table / Columns                                                                                                                                                                                                                                                            | Key Constraints                                                                             |
| ------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **V25** | CREATE       | `purchase_orders` (id UUID PK, supplier_id UUID, status_enum VARCHAR(20) DEFAULT 'PENDING', order_date DATE NOT NULL, notes TEXT)                                                                                                                                          | FK → third_parties(id)                                                                      |
| **V25** | CREATE       | `purchase_line_items` (id UUID PK, oc_id UUID, product_id UUID, warehouse_id UUID, ordered_qty NUMERIC(15,3), received_qty NUMERIC(15,3) DEFAULT 0, unit_cost NUMERIC(15,2), line_number INT)                                                                              | FK→purchase_orders ON DELETE CASCADE; FK→products; FK→warehouses; UNIQUE(oc_id, product_id) |
| **V26** | CREATE       | `goods_receipts` (id UUID PK, oc_id UUID, receipt_date DATE NOT NULL, status_enum VARCHAR(30) DEFAULT 'COMPLETED', notes TEXT)                                                                                                                                             | FK→purchase_orders(id)                                                                      |
| **V26** | CREATE       | `receipt_line_items` (id UUID PK, receipt_id UUID, product_id UUID, warehouse_id UUID, received_qty NUMERIC(15,3), actual_cost NUMERIC(15,2))                                                                                                                              | FK→goods_receipts ON DELETE CASCADE; FK→products; FK→warehouses                             |
| **V27** | CREATE INDEX | `idx_batches_source_receipt ON batches(source_receipt_id)`                                                                                                                                                                                                                 | Fast receipt→batch trace queries                                                            |
| **V28** | CREATE       | `supplier_invoices` (id UUID PK, supplier_id UUID, invoice_number VARCHAR(50), issue_date DATE, due_date DATE, subtotal NUMERIC(15,2), iva_total NUMERIC(15,2), retention_total NUMERIC(15,2), total NUMERIC(15,2), status_enum VARCHAR(20) DEFAULT 'PENDING', notes TEXT) | FK→third_parties(id); UNIQUE(supplier_id, invoice_number)                                   |
| **V28** | CREATE       | `invoice_orders` (invoice_id UUID, oc_id UUID)                                                                                                                                                                                                                             | PK(invoice_id, oc_id); FK→supplier_invoices; FK→purchase_orders                             |
| **V29** | CREATE       | `payments` (id UUID PK, supplier_id UUID, amount NUMERIC(15,2), payment_date DATE, method VARCHAR(30), reference VARCHAR(100), notes TEXT)                                                                                                                                 | FK→third_parties(id)                                                                        |
| **V29** | CREATE       | `invoice_payments` (payment_id UUID, invoice_id UUID, applied_amount NUMERIC(15,2))                                                                                                                                                                                        | PK(payment_id, invoice_id); FK→payments; FK→supplier_invoices                               |
| **V30** | CREATE INDEX | Covering indexes on `purchase_line_items(oc_id)`, `receipt_line_items(receipt_id)`, `supplier_invoices(supplier_id, status_enum)`, `payments(supplier_id)`, `invoice_payments(invoice_id)`                                                                                 | Query performance for list/filter endpoints                                                 |

## 5. Batch + ThirdParty Schema Changes

### Batch (V27)

```sql
ALTER TABLE batches
  ADD COLUMN source_receipt_id UUID NULL,
  ADD COLUMN oc_id            UUID NULL,
  ADD CONSTRAINT fk_batches_source_receipt FOREIGN KEY (source_receipt_id)
    REFERENCES goods_receipts(id),
  ADD CONSTRAINT fk_batches_oc FOREIGN KEY (oc_id)
    REFERENCES purchase_orders(id);

CREATE INDEX idx_batches_source_receipt ON batches(source_receipt_id);
CREATE INDEX idx_batches_oc ON batches(oc_id);
```

- **NULLABLE** — manually-created Batches (Sprint 4) have NULL = zero migration risk
- `sourceReceiptId` populated only by Goods Receipt — enables `WHERE source_receipt_id IS NOT NULL` queries
- Goes in **V27** (after V25 OC tables and V26 Goods Receipt tables exist)

### ThirdParty

- `currentBalance NUMERIC(15,2)` already exists in the `ThirdParty` interface (line 48 of `third-party.model.ts`)
- Verify backend column matches. If missing, add in **V28**: `ALTER TABLE third_parties ADD COLUMN current_balance NUMERIC(15,2) DEFAULT 0`
- No other schema changes needed — `taxRegime`, `taxResponsibilities`, DIAN fields already present

## 6. Technical Patterns (Copy-From)

| New Entity                                         | Copy Pattern                   | Reason                                                                                      |
| -------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------- |
| `PurchaseOrder` record + entity + mapper + adapter | `Batch` record chain           | Same CRUD + status enum + paginated list                                                    |
| `PurchaseOrderRequest/Response` DTOs               | `AnimalRequest/AnimalResponse` | Standard Jakarta validation + `static from(domain)`                                         |
| `PurchaseOrderUseCase`                             | `BatchUseCase`                 | `@Transactional` CRUD + status filter                                                       |
| `PurchaseOrderController`                          | `BatchController`              | `GET/POST/PUT/DELETE /api/v1/purchase-orders`                                               |
| `PurchaseLineItem` (inline on PO)                  | `Product.priceEntries[]`       | Embedded array on parent entity — same REST pattern                                         |
| `GoodsReceipt` record + entity                     | `Slaughter` record + entity    | Process-result record with FKs to source + result                                           |
| `ReceiptDomainService`                             | `SlaughterDomainService`       | Pure `BusinessException` for: OC not found, invalid status, qty overflow, supplier mismatch |
| `CreateGoodsReceiptUseCase` @Transactional         | `ProcessSlaughterUseCase`      | Multi-step orchestration in single transaction                                              |
| `GoodsReceiptController`                           | `SlaughterController`          | Single `POST /api/v1/goods-receipts`                                                        |
| `SupplierInvoice` full CRUD                        | `ThirdParty` CRUD              | Complex fields, status enum, FK relationships                                               |
| `Payment` CRUD                                     | `Batch` simplified             | Standard CRUD filtered by `supplierId`                                                      |

**Frontend pattern mapping**:

| New Service / Component       | Copy From                                                   |
| ----------------------------- | ----------------------------------------------------------- |
| `purchase-order.service.ts`   | `batch.service.ts` (httpResource + mutations)               |
| `goods-receipt.service.ts`    | `slaughter.service.ts` (POST-only process)                  |
| `supplier-invoice.service.ts` | `third-party.service.ts` (full CRUD + filters)              |
| `payment.service.ts`          | `batch.service.ts` (list + create)                          |
| `orden-list/` (3 files)       | `batch-list/` (mat-table, status chip, page signal)         |
| `orden-form/` (3 files)       | `batch-form/` (ReactiveForms, FormArray for lines)          |
| `recepcion-form/` (3 files)   | `faena/` (read source → validate → submit process)          |
| `factura-list/` (3 files)     | `batch-list/` (paginated table, status filter)              |
| `factura-form/` (3 files)     | `third-party-form/` (complex form with DIAN fields)         |
| `pago-form/` (3 files)        | `batch-form/` (supplier select, amount, invoice checkboxes) |

## 7. Frontend Component Map

| Slice | Route                            | Component                                     | Menu Item              |
| ----- | -------------------------------- | --------------------------------------------- | ---------------------- |
| S1    | `/compras/ordenes`               | `orden-list`                                  | "Órdenes de compra"    |
| S1    | `/compras/ordenes/nuevo`         | `orden-form`                                  | —                      |
| S1    | `/compras/ordenes/:id`           | `orden-form` (edit)                           | —                      |
| S2    | `/compras/recepcion/nueva?ocId=` | `recepcion-form`                              | "Recepción mercancía"  |
| S3    | `/compras/facturas`              | `factura-list`                                | "Facturas proveedores" |
| S3    | `/compras/facturas/nueva`        | `factura-form`                                | —                      |
| S4    | `/compras/pagos`                 | `pago-form`                                   | "Pagos realizados"     |
| S4    | `/compras/historial`             | `historial-list`                              | "Historial compras"    |
| S4    | `/compras/retenciones`           | `retenciones (read-only)`                     | "Retenciones"          |
| —     | `/compras/proveedores`           | redirect → `/terceros/proveedores`            | "Proveedores"          |
| —     | `/compras/cxp`                   | redirect → `/compras/facturas` (CxP embedded) | "CxP"                  |

**Routes added to `app.routes.ts`** (under ShellComponent children):

```typescript
{
  path: 'compras',
  loadComponent: () =>
    import('./features/compras/compras').then(m => m.ComprasComponent),
  children: [
    { path: 'ordenes', loadComponent: () => import('./features/compras/ordenes/orden-list/orden-list').then(m => m.OrdenListComponent) },
    { path: 'ordenes/nuevo', loadComponent: () => import('./features/compras/ordenes/orden-form/orden-form').then(m => m.OrdenFormComponent) },
    { path: 'ordenes/:id', loadComponent: () => import('./features/compras/ordenes/orden-form/orden-form').then(m => m.OrdenFormComponent) },
    { path: 'recepcion/nueva', loadComponent: () => import('./features/compras/recepcion/recepcion-form/recepcion-form').then(m => m.RecepcionFormComponent) },
    { path: 'facturas', loadComponent: () => import('./features/compras/facturas/factura-list/factura-list').then(m => m.FacturaListComponent) },
    { path: 'facturas/nueva', loadComponent: () => import('./features/compras/facturas/factura-form/factura-form').then(m => m.FacturaFormComponent) },
    { path: 'pagos', loadComponent: () => import('./features/compras/pagos/pago-form').then(m => m.PagoFormComponent) },
    { path: 'historial', loadComponent: () => import('./features/compras/historial/historial-list').then(m => m.HistorialListComponent) },
    { path: 'retenciones', loadComponent: () => import('./features/compras/retenciones/retenciones-list').then(m => m.RetencionesListComponent) },
    { path: 'proveedores', redirectTo: '/terceros/proveedores' },
    { path: 'cxp', redirectTo: '/compras/facturas' },
    { path: '', redirectTo: 'ordenes', pathMatch: 'full' },
  ],
}
```

**Shell menu change** (`layout/shell/shell.ts`): Set `disabled: false` on all 8 `compras` children. Roles already set: `['ADMIN', 'AUXILIAR', 'CONTADOR']`.

## 8. API Endpoints

All endpoints prefixed `/api/v1/`. Auth: `@PreAuthorize("hasAnyRole('ADMIN','AUXILIAR','CONTADOR')")` for compras endpoints.

### S1 — Purchase Orders

| Method   | Path                                   | Request Body                                                                                               | Response                                             | Auth    |
| -------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------- |
| `GET`    | `/purchase-orders?page=&size=&status=` | —                                                                                                          | `PageResponse<PurchaseOrderResponse>`                | COMPRAS |
| `GET`    | `/purchase-orders/{id}`                | —                                                                                                          | `PurchaseOrderResponse` (with lines)                 | COMPRAS |
| `GET`    | `/purchase-orders/{id}/lines`          | —                                                                                                          | `PurchaseLineItemResponse[]`                         | COMPRAS |
| `POST`   | `/purchase-orders`                     | `{ supplierId: UUID, orderDate: date, lines: [{ productId, orderedQty, unitCost, warehouseId }], notes? }` | `201 PurchaseOrderResponse`                          | COMPRAS |
| `PUT`    | `/purchase-orders/{id}`                | Same as POST                                                                                               | `PurchaseOrderResponse`                              | COMPRAS |
| `DELETE` | `/purchase-orders/{id}`                | —                                                                                                          | `204 No Content` (only if PENDING + no receipts)     | COMPRAS |
| `PATCH`  | `/purchase-orders/{id}/status`         | `{ status: "CANCELLED" }`                                                                                  | `200 PurchaseOrderResponse` (only PENDING→CANCELLED) | COMPRAS |

### S2 — Goods Receipts

| Method | Path                                | Request Body                                                                                | Response                                                                            | Auth    |
| ------ | ----------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------- |
| `POST` | `/goods-receipts`                   | `{ ocId: UUID, receiptDate, lines: [{ productId, receivedQty, actualCost, warehouseId }] }` | `201 GoodsReceiptResponse { id, ocId, batchIds[], totalReceivedQty, deviations[] }` | COMPRAS |
| `GET`  | `/goods-receipts?ocId=&page=&size=` | —                                                                                           | `PageResponse<GoodsReceiptResponse>`                                                | COMPRAS |
| `GET`  | `/goods-receipts/{id}`              | —                                                                                           | `GoodsReceiptResponse` (with lines + batch IDs)                                     | COMPRAS |

### S3 — Supplier Invoices

| Method  | Path                                                 | Request Body                                                                                                     | Response                                      | Auth    |
| ------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------- |
| `GET`   | `/supplier-invoices?supplierId=&status=&page=&size=` | —                                                                                                                | `PageResponse<SupplierInvoiceResponse>`       | COMPRAS |
| `GET`   | `/supplier-invoices/{id}`                            | —                                                                                                                | `SupplierInvoiceResponse`                     | COMPRAS |
| `POST`  | `/supplier-invoices`                                 | `{ supplierId, invoiceNumber, issueDate, dueDate, subtotal, ivaTotal, retentionTotal, total, ocIds?[], notes? }` | `201 SupplierInvoiceResponse`                 | COMPRAS |
| `PATCH` | `/supplier-invoices/{id}/status`                     | `{ status: "RECONCILED" }`                                                                                       | `200 SupplierInvoiceResponse`                 | COMPRAS |
| `GET`   | `/suppliers/{id}/balance`                            | —                                                                                                                | `{ supplierId, currentBalance, lastUpdated }` | COMPRAS |

### S4 — Payments + History + Retentions

| Method | Path                                                          | Request Body                                                                  | Response                                                                                                  | Auth    |
| ------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------- |
| `GET`  | `/payments?supplierId=&page=&size=`                           | —                                                                             | `PageResponse<PaymentResponse>`                                                                           | COMPRAS |
| `POST` | `/payments`                                                   | `{ supplierId, amount, paymentDate, method, reference?, invoiceIds: UUID[] }` | `201 PaymentResponse { id, appliedBreakdown: [{ invoiceId, appliedAmount }] }`                            | COMPRAS |
| `GET`  | `/purchase-history?from=YYYY-MM-DD&to=YYYY-MM-DD&supplierId=` | —                                                                             | `{ purchaseOrders[], goodsReceipts[], supplierInvoices[] }` (chronological)                               | COMPRAS |
| `GET`  | `/retenciones?supplierId=&period=YYYY-MM`                     | —                                                                             | `RetencionSummary[] { supplierId, supplierName, ivaRetenido, rentaRetenido, icaRetenido, totalRetenido }` | COMPRAS |

## 9. Risk Mitigations

| #   | Risk                                                                        | Severity | How Design Addresses It                                                                                                                                                                                                                                                                                                |
| --- | --------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Backend in separate repo → API drift**                                    | HIGH     | Contract-first: this design serves as the OpenAPI contract. All request/response shapes, status codes, and error formats are specified in Section 8 before any code is written. Both frontend and backend developers code against this shared contract.                                                                |
| 2   | **Batch FK columns (`sourceReceiptId`, `ocId`)**                            | MEDIUM   | NULLable (V27). Existing batches stay NULL. Only receipt-created batches populate them. Backward-compatible. Index on `source_receipt_id` ensures query perf. No existing code queries these columns → no regression.                                                                                                  |
| 3   | **Cost reconciliation conflicts** (OC cost vs Receipt cost vs Invoice cost) | MEDIUM   | Single source of truth: Receipt `actualCost` → `Batch.purchaseCost`. No reconciliation attempt — the receipt IS the truth. Invoice cost is accounting only. OC cost is budget. Deviation >20% logged as `HIGH_COST_DEVIATION` warning on receipt response — never blocks. CxP uses Invoice total.                      |
| 4   | **DIAN retenciones complexity**                                             | MEDIUM   | Manual entry only for S3/S4. `SupplierInvoice.retentionTotal` is a single NUMERIC field — no formula, no auto-calculation. `GET /api/v1/retenciones` is read-only aggregation (`SUM(retention_total) GROUP BY supplier_id, period`). Auto-calculation deferred to Sprint 6.                                            |
| 5   | **Partial receipts over multiple sessions**                                 | LOW      | OC `PurchaseLineItem.receivedQty` tracks cumulative receipts. Receipt validation is: `receivedQty ≤ orderedQty − receivedQty` (remaining). Runs inside `@Transactional` — two concurrent receipts for the same OC line cannot both succeed (DB row-level locking). All-or-nothing transaction = no partial corruption. |

---

**Total files**: ~95 (40 frontend + 49 backend + 6 migrations).  
**Pattern foundation**: `Batch` CRUD (10 files/entity), `SlaughterDomainService + ProcessSlaughterUseCase` for receipt.  
**Key invariant**: Receipt — not OC, not Invoice — is the single source of truth for `Batch.purchaseCost` that flows into Yield Costing.
