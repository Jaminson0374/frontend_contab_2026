# Sprint 5 — Compras: Documento Consolidado

**Cambio**: Purchase Orders + Goods Receipt + Supplier Invoices + Payments + CxP
**Estado**: 📋 Planificado — listo para implementar
**Última actualización**: 2026-05-17

---

## 1. Exploration

### Current State

Cero código de compras. El menú tiene 8 items TODOS `disabled: true`. No existe ruta `/compras`. Lo que SÍ se reutilizará:

- `purchaseCost` + `supplierId` en `Batch` — kernel de recepción
- `ThirdParty` SUPPLIER con datos DIAN completos
- `ProductSupplier` con `unitCost`
- Patrones de código establecidos: Batch CRUD + Slaughter Process

### Recommendation

**Approach A**: Full OC → Receipt → Invoice lifecycle. ~95 archivos totales.

---

## 2. Proposal

### Scope

- Purchase Order CRUD con line items y ciclo PENDING→RECEIVED→CANCELLED
- Goods Receipt: validación OC → auto-crea Batches + Stock → reconciliación
- Supplier Invoice con campos DIAN + CxP
- Payments aplicados a facturas
- Menú/rutas habilitados para 8 items de compras

### Out of Scope

- Auto-cálculo retenciones DIAN (entrada manual)
- Factura electrónica PDF
- Workflow aprobación OC
- Módulo POS

### Slice Breakdown

| Slice                              | Archivos      | Días |
| ---------------------------------- | ------------- | ---- |
| S1 — Purchase Order CRUD           | 12 FE + 16 BE | 5-7  |
| S2 — Goods Receipt                 | 10 FE + 14 BE | 6-8  |
| S3 — Supplier Invoice + CxP        | 8 FE + 10 BE  | 4-6  |
| S4 — Payments + Menu + Retenciones | 10 FE + 9 BE  | 3-5  |

**Total: ~95 archivos, 18-26 dev-days**

---

## 3. Specification (13 requirements, 30 scenarios)

### S1: Purchase Order

- R-001: Create OC → 201 PENDING
- R-002: OC lifecycle PENDING→RECEIVED→CANCELLED
- R-003: Line item validation (qty>0, valid product/warehouse)

### S2: Goods Receipt

- R-004: Create receipt, validate OC, create batches + stock
- R-005: Qty reconciliation (receivedQty ≤ remaining)
- R-006: Batch auto-creation per line item
- R-007: Cost deviation flag (>20% warning)

### S3: Invoice + CxP

- R-008: Register invoice with DIAN fields
- R-009: Invoice lifecycle PENDING→RECONCILED→PAID
- R-010: CxP balance update

### S4: Payments + Menu

- R-011: Apply payment, reduce CxP
- R-012: 8 menu items enabled, role-based
- R-013: Purchase history read-only

---

## 4. Design

### Architecture Decisions

1. **Cost source of truth**: `Receipt.actualCost → Batch.purchaseCost`
2. **Batch FKs**: Nullable `sourceReceiptId` + `ocId` (backward compatible)
3. **OC status**: Domain-level enum validation
4. **Invoice uniqueness**: `supplierId + invoiceNumber UNIQUE`
5. **CxP model**: `supplier.currentBalance` (denormalizado)
6. **Partial receipts**: Line-level `orderedQty + receivedQty`

### Data Flow: Goods Receipt (S2)

```
POST /api/v1/goods-receipts { ocId, lines }
  ├─1─ PurchaseOrderRepository.findById(ocId) → oc (PENDING/PARTIAL)
  ├─2─ ReceiptDomainService.validateLines(oc, lines)
  ├─3─ For each line:
  │     ├─ ProductRepository.findById
  │     ├─ BatchRepository.save(Batch { supplierId, warehouseId, initialWeight, purchaseCost, sourceReceiptId, ocId })
  │     └─ StockRepository.upsert(productId, batchId, warehouseId, qty)
  ├─4─ PurchaseOrderRepository.updateStatus(ocId)
  ├─5─ GoodsReceiptRepository.save(receipt)
  └─→ GoodsReceiptResponse { id, batchIds, deviations }
```

### API Endpoints (12)

| Method       | Path                           | Auth                      |
| ------------ | ------------------------------ | ------------------------- |
| POST/GET/PUT | /api/v1/purchase-orders        | ADMIN, AUXILIAR, CONTADOR |
| POST         | /api/v1/goods-receipts         | ADMIN, AUXILIAR           |
| POST/GET     | /api/v1/supplier-invoices      | ADMIN, AUXILIAR, CONTADOR |
| GET          | /api/v1/suppliers/{id}/balance | ADMIN, AUXILIAR, CONTADOR |
| POST/GET     | /api/v1/payments               | ADMIN, CONTADOR           |
| GET          | /api/v1/retenciones            | ADMIN, CONTADOR           |
| GET          | /api/v1/purchase-history       | ADMIN, AUXILIAR, CONTADOR |

### DB Migrations (V25-V30)

| Version | Tables                               | Key Columns                                                      |
| ------- | ------------------------------------ | ---------------------------------------------------------------- |
| V25     | purchase_orders, purchase_line_items | supplier_id FK, status_enum, ordered_qty, received_qty           |
| V26     | goods_receipts, receipt_line_items   | oc_id FK, receipt_date, actual_cost                              |
| V27     | ALTER batches                        | source_receipt_id FK, oc_id FK (nullable)                        |
| V28     | supplier_invoices, invoice_orders    | invoice_number UNIQUE per supplier, DIAN fields, current_balance |
| V29     | payments, invoice_payments           | amount, applied_amount, method                                   |
| V30     | Indexes                              | covering indexes for all lookup queries                          |

---

## 5. Tasks (90 tasks, 6 fases)

| Fase                  | Tasks  | Descripción                               |
| --------------------- | ------ | ----------------------------------------- |
| 1: Migrations         | 6      | V25-V30 Flyway SQL                        |
| 2: S1 OC CRUD         | ~28    | PurchaseOrder dominio → infra → frontend  |
| 3: S2 Goods Receipt   | ~21    | ReceiptDomainService + UseCase + frontend |
| 4: S3 Invoice + CxP   | ~17    | SupplierInvoice + factura components      |
| 5: S4 Payments + Menu | ~19    | Payment + pago-form + menu enablement     |
| 6: Integration        | 4      | E2E verification                          |
| **Total**             | **90** |                                           |

### Archivos modificados (existentes)

| Archivo          | Fase       | Cambio                                      |
| ---------------- | ---------- | ------------------------------------------- |
| `app.routes.ts`  | 2, 3, 4, 5 | Agregar /compras + 11 rutas hijas           |
| `shell.ts`       | 2, 3, 4, 5 | `disabled:false` en 8 items menú            |
| `batch.model.ts` | 3          | Agregar `sourceReceiptId?`, `ocId?`         |
| V27              | 1          | ALTER TABLE batches (2 FKs + indexes)       |
| V28              | 1          | ALTER TABLE third_parties (current_balance) |

---

## 6. Estado Actual (2026-05-17)

### 📋 Planificación — COMPLETA

- ✅ Exploration
- ✅ Proposal
- ✅ Specification (13 reqs, 30 scenarios)
- ✅ Design (6 decisions, 12 endpoints, 6 migrations)
- ✅ Tasks (90 tasks, 6 fases)

### 🔲 Implementación — PENDIENTE

- 🔲 Phase 1: Migrations V25-V30 (6 SQL)
- 🔲 Phase 2: Slice 1 — Purchase Order CRUD (~28 tasks)
- 🔲 Phase 3: Slice 2 — Goods Receipt (~21 tasks)
- 🔲 Phase 4: Slice 3 — Supplier Invoice + CxP (~17 tasks)
- 🔲 Phase 5: Slice 4 — Payments + Menu (~19 tasks)
- 🔲 Phase 6: Integration Verification (4 tasks)

**Total: 90 tasks pendientes / ~95 archivos por crear/modificar**
