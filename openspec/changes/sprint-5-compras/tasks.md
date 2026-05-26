# Tasks: Sprint 5 — Compras

> **Files**: ~95 total (6 migrations + 49 backend + 40 frontend)
> **Pattern**: Batch CRUD chain for POs; Slaughter process chain for Goods Receipt
> **Auth**: `hasAnyRole('ADMIN','AUXILIAR','CONTADOR')` on all compras endpoints

---

## Phase 1: Database Migrations (V25–V30) — 6 tasks

**Depends on**: Nothing. Foundation for all slices.

- [ ] 1.1 **V25\_\_create_purchase_orders.sql** — `purchase_orders` (id UUID PK, supplier_id FK→third_parties, status_enum DEFAULT 'PENDING', order_date, notes) + `purchase_line_items` (id UUID PK, oc_id FK→purchase_orders ON DELETE CASCADE, product_id FK→products, warehouse_id FK→warehouses, ordered_qty NUMERIC(15,3), received_qty NUMERIC(15,3) DEFAULT 0, unit_cost NUMERIC(15,2), line_number INT, UNIQUE(oc_id, product_id))
- [ ] 1.2 **V26\_\_create_goods_receipts.sql** — `goods_receipts` (id UUID PK, oc_id FK→purchase_orders, receipt_date, status_enum DEFAULT 'COMPLETED', notes) + `receipt_line_items` (id UUID PK, receipt_id FK→goods_receipts ON DELETE CASCADE, product_id FK→products, warehouse_id FK→warehouses, received_qty, actual_cost)
- [ ] 1.3 **V27\_\_alter_batches_add_receipt_fk.sql** — ALTER TABLE batches ADD source_receipt_id UUID NULL (FK→goods_receipts), oc_id UUID NULL (FK→purchase_orders); CREATE INDEX idx_batches_source_receipt ON batches(source_receipt_id); CREATE INDEX idx_batches_oc ON batches(oc_id)
- [ ] 1.4 **V28\_\_create_supplier_invoices.sql** — `supplier_invoices` (id UUID PK, supplier_id FK→third_parties, invoice_number, issue_date, due_date, subtotal, iva_total, retention_total, total, status_enum DEFAULT 'PENDING', notes, UNIQUE(supplier_id, invoice_number)) + `invoice_orders` (invoice_id FK→supplier_invoices, oc_id FK→purchase_orders, PK(invoice_id, oc_id)); if `current_balance` missing on third_parties: ALTER TABLE third_parties ADD COLUMN current_balance NUMERIC(15,2) DEFAULT 0
- [ ] 1.5 **V29\_\_create_payments.sql** — `payments` (id UUID PK, supplier_id FK→third_parties, amount, payment_date, method, reference, notes) + `invoice_payments` (payment_id FK→payments, invoice_id FK→supplier_invoices, applied_amount, PK(payment_id, invoice_id))
- [ ] 1.6 **V30\_\_create_compras_indexes.sql** — Covering indexes: `purchase_line_items(oc_id)`, `receipt_line_items(receipt_id)`, `supplier_invoices(supplier_id, status_enum)`, `payments(supplier_id)`, `invoice_payments(invoice_id)`

---

## Phase 2: Slice 1 — Purchase Order CRUD — ~28 tasks

### Domain Layer (4 tasks)

- [x] 2.1 Create `PurchaseOrderStatus` enum (PENDING, PARTIAL, RECEIVED, CANCELLED)
- [x] 2.2 Create `PurchaseOrder` record (domain) — id, supplierId, status, orderDate, notes
- [x] 2.3 Create `PurchaseLineItem` record (domain) — id, ocId, productId, warehouseId, orderedQty, receivedQty, unitCost, lineNumber
- [x] 2.4 Create `PurchaseOrderDomainService` — validateTransition(from, to) enforcing: PENDING→PARTIAL, PENDING→CANCELLED, PARTIAL→RECEIVED, PARTIAL→CANCELLED; throw `BusinessException` on invalid transitions; validateLineItem(productId exists, orderedQty>0, warehouseId exists)
- [x] 2.5 Create `PurchaseOrderRequest` DTO — supplierId, orderDate, lines: [{ productId, orderedQty, unitCost, warehouseId }], notes?; Jakarta validation (@NotNull, @NotEmpty, @Positive)
- [x] 2.6 Create `PurchaseOrderResponse` DTO — id, supplierId, supplierName, status, orderDate, lines: [{ productId, productName, orderedQty, receivedQty, unitCost, warehouseId, warehouseName, lineNumber }], notes, createdAt; static from(domain)
- [x] 2.7 Create `PurchaseLineItemResponse` DTO — id, productId, productName, orderedQty, receivedQty, unitCost, remainingQty, warehouseId, warehouseName, lineNumber
- [x] 2.8 Create `PurchaseOrderMapper` — domain↔entity bidirectional mapping
- [x] 2.9 Create `PurchaseOrderUseCase` — @Transactional CRUD: create (validates supplier SUPPLIER type, defaults unitCost from ProductSupplier.unitCost, status=PENDING), update, findById, findAll (paginated + status filter), delete (only PENDING + zero receipts), patchStatus (delegates to domainService.validateTransition)
- [x] 2.10 Create `PurchaseOrderEntity` (JPA) — @Entity, @Table, @OneToMany PurchaseLineItemEntity (cascade ALL, orphanRemoval), @Enumerated statusEnum, @ManyToOne supplier
- [x] 2.11 Create `PurchaseLineItemEntity` (JPA) — @Entity, @Table, @ManyToOne product, @ManyToOne warehouse, UNIQUE(oc_id, product_id)
- [x] 2.12 Create `PurchaseOrderRepository` (interface) — extends JpaRepository<PurchaseOrderEntity, UUID>, findByStatusEnum, findByIdWithLines
- [x] 2.13 Create `PurchaseOrderRepositoryAdapter` — implements domain repo interface, delegates to JPA repository, findAll with Pageable + status filter
- [x] 2.14 Create `PurchaseOrderController` — @RestController, @PreAuthorize("hasAnyRole('ADMIN','AUXILIAR','CONTADOR')"): GET /purchase-orders (paginated, status filter), GET /purchase-orders/{id} (with lines), GET /purchase-orders/{id}/lines, POST /purchase-orders, PUT /purchase-orders/{id}, DELETE /purchase-orders/{id} (only if PENDING + no receipts), PATCH /purchase-orders/{id}/status

### Frontend Models & Services (3 tasks)

- [ ] 2.15 Create `src/app/core/models/purchase-order.model.ts` — PurchaseOrderStatus type, PurchaseOrder interface, PurchaseOrderRequest interface, PurchaseLineItem interface, PurchaseOrderResponse interface; copy pattern from batch.model.ts
- [ ] 2.16 Create `src/app/core/services/purchase-order.service.ts` — httpResource for paginated list with status signal, create, update, delete, patchStatus, getById, getLines; copy pattern from batch.service.ts
- [ ] 2.17 Create `src/app/core/services/product-supplier.service.ts` (optional helper) — GET /api/v1/products/{id}/suppliers to resolve default unitCost on OC line form; or inline in purchase-order.service.ts

### Frontend Components (7 tasks)

- [ ] 2.18 Create `src/app/features/compras/compras.ts` — wrapper component with router-outlet (pattern: inventario.ts)
- [ ] 2.19 Create `orden-list` component (3 files: .ts, .html, .css) — `src/app/features/compras/ordenes/orden-list/`; mat-table with columns: orderDate, supplierName, status (mat-chip), totalLines, actions; status filter dropdown (PENDING/PARTIAL/RECEIVED/CANCELLED); page signals; openForm dialog; cancel OC action; pattern: batch-list
- [ ] 2.20 Create `orden-form` component (3 files: .ts, .html, .css) — `src/app/features/compras/ordenes/orden-form/`; ReactiveForms: supplierId (select from ThirdPartyService.supplierOptions), orderDate (datepicker), lines FormArray (productId select, orderedQty input, unitCost input with default from ProductSupplier.unitCost, warehouseId select); add/remove line buttons; create/edit mode (route param :id); pattern: batch-form + FormArray for lines
- [ ] 2.21 Add route guards / role validation to orden-list and orden-form (COMPRAS roles only)

### Integration Wiring (2 tasks)

- [ ] 2.22 MODIFY `src/app/app.routes.ts` — add `/compras` route group under ShellComponent children with lazy-loaded ComprasComponent wrapper; add children: ordenes (list), ordenes/nuevo (form), ordenes/:id (form edit)
- [ ] 2.23 MODIFY `src/app/layout/shell/shell.ts` — set `disabled: false` on "Órdenes de compra" nav child

---

## Phase 3: Slice 2 — Goods Receipt — ~24 tasks

**Depends on**: Phase 1 (V25–V27), Phase 2 (OC models/services/entities)

### Domain Layer (4 tasks)

- [x] 3.1 Create `GoodsReceipt` record (domain) — id, ocId, receiptDate, status (COMPLETED / HIGH_COST_DEVIATION), notes, lines: List<ReceiptLineItem>, batchIds: List<UUID>
- [x] 3.2 Create `ReceiptLineItem` record (domain) — id, receiptId, productId, warehouseId, receivedQty, actualCost
- [x] 3.3 Create `GoodsReceiptStatus` enum — COMPLETED, HIGH_COST_DEVIATION
- [x] 3.4 Create `ReceiptDomainService` — validateLines(oc, receiptLines): for each line verify supplier = oc.supplierId, warehouseId matches OC line, receivedQty ≤ (ocLine.orderedQty − ocLine.receivedQty); validateOCReceivable(oc): status must be PENDING or PARTIAL; computeCostDeviation(actualCost, ocUnitCost): flag if |diff|/ocUnitCost > 0.20 → HIGH_COST_DEVIATION; throw BusinessException on any validation failure; pattern: SlaughterDomainService.ensureProcessableAnimal()

### Application Layer (5 tasks)

- [x] 3.5 Create `GoodsReceiptRequest` DTO — ocId, receiptDate, lines: [{ productId, receivedQty, actualCost, warehouseId }]; Jakarta validation
- [x] 3.6 Create `GoodsReceiptResponse` DTO — id, ocId, receiptDate, status, lines: [{ productId, productName, receivedQty, actualCost, warehouseId }], batchIds: UUID[], totalLines, totalReceivedQty, deviations: [{ productId, expectedCost, actualCost, variancePct }]
- [x] 3.7 Create `GoodsReceiptMapper` — domain↔entity bidirectional
- [x] 3.8 Create `BatchWithReceiptFields` projection or extend BatchMapper — to set supplierId, purchaseCost, sourceReceiptId, ocId on Batch creation; uses existing BatchRepository.save()
- [x] 3.9 Create `CreateGoodsReceiptUseCase` — @Transactional single-tx orchestration following design §2 data flow: (1) find OC, (2) ReceiptDomainService.validateLines, (3) FOR each line: batchRepository.save (supplierId=oc.supplierId, purchaseCost=actualCost, sourceReceiptId=receipt.id, ocId=oc.id, warehouseId=line.warehouseId, initialWeight=receivedQty, entryDate=TODAY, status=OPEN) → stockRepository.upsert(productId, batchId, warehouseId, +receivedQty, unitCost=actualCost) → purchaseLineItemRepository.updateReceivedQty(lineId, +receivedQty) → if costDeviation > 20% flag HIGH_COST_DEVIATION, (4) purchaseOrderRepository.updateStatus (RECEIVED if all lines full, else PARTIAL), (5) goodsReceiptRepository.save; throw BusinessException if any validation fails → rollback entire tx; pattern: ProcessSlaughterUseCase

### Infrastructure Layer (4 tasks)

- [x] 3.10 Create `GoodsReceiptEntity` (JPA) — @Entity, @Table, @ManyToOne oc, @OneToMany lines (cascade ALL), @Enumerated status
- [x] 3.11 Create `ReceiptLineItemEntity` (JPA) — @Entity, @Table, @ManyToOne product, @ManyToOne warehouse
- [x] 3.12 Create `GoodsReceiptRepository` (interface) — extends JpaRepository<GoodsReceiptEntity, UUID>, findByOcId, findByOcIdPageable
- [x] 3.13 Create `GoodsReceiptRepositoryAdapter` — implements domain repo; findAllByOcId with Pageable

### REST Controller (1 task)

- [x] 3.14 Create `GoodsReceiptController` — @PreAuthorize("hasAnyRole('ADMIN','AUXILIAR','CONTADOR')"): POST /goods-receipts (delegates to CreateGoodsReceiptUseCase), GET /goods-receipts?ocId=&page=&size=, GET /goods-receipts/{id} (with lines + batchIds)

### Frontend Models & Services (2 tasks)

- [x] 3.15 Create `src/app/core/models/goods-receipt.model.ts` — GoodsReceipt, GoodsReceiptRequest, GoodsReceiptResponse, ReceiptLineItem, CostDeviation interfaces; pattern: slaughter.model.ts
- [x] 3.16 Create `src/app/core/services/goods-receipt.service.ts` — process(request): Observable<GoodsReceiptResponse>, getById(id), list(ocId?, page?, size?); pattern: slaughter.service.ts (POST-only process)

### Frontend Components (4 tasks)

- [x] 3.17 Create `recepcion-form` component (3 files: .ts, .html, .css) — `src/app/features/compras/recepcion/recepcion-form/`; route: `/compras/recepcion/nueva?ocId=`; loads OC via PurchaseOrderService.getById(ocId); displays OC summary (supplier, date, lines with remaining qty); FormArray for receipt lines (each: productId readonly from OC line, receivedQty input ≤ remaining, actualCost input, warehouseId readonly); submit calls GoodsReceiptService.process(); shows response (batchIds[], deviations[]); pattern: faena.ts (read source → validate → submit → show result)
- [x] 3.18 Add show-warning banner for HIGH_COST_DEVIATION in recepcion-form template
- [x] 3.19 MODIFY `src/app/core/models/batch.model.ts` — add optional `sourceReceiptId?: string`, `ocId?: string` for traceability display
- [x] 3.20 Add route: `/compras/recepcion/nueva` to app.routes.ts (lazy load recepcion-form component)

### Menu Update (1 task)

- [x] 3.21 MODIFY `src/app/layout/shell/shell.ts` — set `disabled: false` on "Recepción mercancía" nav child

---

## Phase 4: Slice 3 — Supplier Invoice + CxP — ~18 tasks

**Depends on**: Phase 1 (V28), Phase 2 (OC entities, ThirdParty entities)

### Domain Layer (3 tasks)

- [ ] 4.1 Create `SupplierInvoice` record (domain) — id, supplierId, invoiceNumber, issueDate, dueDate, subtotal, ivaTotal, retentionTotal, total, status (PENDING/RECONCILED/PAID), ocIds: List<UUID>, notes
- [ ] 4.2 Create `SupplierInvoiceStatus` enum — PENDING, RECONCILED, PAID
- [ ] 4.3 Create `SupplierInvoiceDomainService` — validateTransition(from, to): PENDING→RECONCILED, RECONCILED→PAID; PAID is final; validateInvoiceNumber unique per supplier; validateDIANFields(total > 0, subtotal + ivaTotal − retentionTotal ≈ total within 1.0 tolerance)

### Application Layer (3 tasks)

- [ ] 4.4 Create `SupplierInvoiceRequest` DTO — supplierId, invoiceNumber, issueDate, dueDate, subtotal, ivaTotal, retentionTotal, total, ocIds?: UUID[], notes?; Jakarta validation
- [ ] 4.5 Create `SupplierInvoiceResponse` DTO — id, supplierId, supplierName, invoiceNumber, issueDate, dueDate, subtotal, ivaTotal, retentionTotal, total, status, ocIds, notes, createdAt; include computed field outstandingBalance
- [ ] 4.6 Create `SupplierInvoiceUseCase` — @Transactional CRUD: create (validates supplier, updates supplier.currentBalance += total, creates invoice_orders join records if ocIds present), findAll (paginated, filter by supplierId+status), findById, patchStatus (PENDING→RECONCILED; RECONCILED→PAID triggers CxP update), getSupplierBalance(id)

### Infrastructure Layer (3 tasks)

- [ ] 4.7 Create `SupplierInvoiceEntity` (JPA) — @Entity, @Table with UNIQUE(supplier_id, invoice_number), @ManyToOne supplier, @ElementCollection ocIds (or @OneToMany InvoiceOrderEntity), @Enumerated statusEnum
- [ ] 4.8 Create `SupplierInvoiceRepository` (interface) — extends JpaRepository, findBySupplierIdAndStatus, findByInvoiceNumberAndSupplierId, sumTotalBySupplierId (native query for CxP)
- [ ] 4.9 Create `SupplierInvoiceRepositoryAdapter` — findAll with Pageable + supplierId/status filters

### REST Controller (1 task)

- [ ] 4.10 Create `SupplierInvoiceController` — @PreAuthorize: GET /supplier-invoices?supplierId=&status=&page=&size=, GET /supplier-invoices/{id}, POST /supplier-invoices, PATCH /supplier-invoices/{id}/status, GET /suppliers/{id}/balance (returns { supplierId, currentBalance, lastUpdated })

### Frontend Models & Services (2 tasks)

- [x] 4.11 Create `src/app/core/models/supplier-invoice.model.ts` — SupplierInvoiceStatus type, SupplierInvoice interface (DIAN fields: subtotal, ivaTotal, retentionTotal, total), SupplierInvoiceRequest interface; copy pattern from third-party.model.ts (complex form with multiple fields)
- [x] 4.12 Create `src/app/core/services/supplier-invoice.service.ts` — httpResource for paginated list with supplierId+status signals, create, getById, patchStatus, getSupplierBalance(id); copy pattern from third-party.service.ts

### Frontend Components (5 tasks)

- [x] 4.13 Create `factura-list` component (3 files: .ts, .html, .css) — `src/app/features/compras/facturas/factura-list/`; mat-table: invoiceNumber, supplierName, issueDate, subtotal, ivaTotal, retentionTotal, total, status chip; supplier filter dropdown; status filter; page signals; row click → expand or navigate to detail; pattern: batch-list
- [x] 4.14 Create `factura-form` component (3 files: .ts, .html, .css) — `src/app/features/compras/facturas/factura-form/`; ReactiveForms: supplierId (select), invoiceNumber, issueDate, dueDate, subtotal, ivaTotal, retentionTotal, total (auto-computed: subtotal+ivaTotal−retentionTotal), ocIds (multi-select from active OCs), notes; pattern: third-party-form (complex DIAN fields)
- [ ] 4.15 Add CxP balance display inline on factura-list or as small card showing currentBalance from GET /suppliers/{id}/balance
- [x] 4.16 Add routes to app.routes.ts: `/compras/facturas` (list), `/compras/facturas/nueva` (form)
- [x] 4.17 MODIFY shell.ts — set `disabled: false` on "Facturas proveedores" and "CxP" nav children

---

## Phase 5: Slice 4 — Payments + Menu + History — ~19 tasks

**Depends on**: Phase 1 (V29), Phase 4 (SupplierInvoice entities/services)

### Domain Layer (3 tasks)

- [ ] 5.1 Create `Payment` record (domain) — id, supplierId, amount, paymentDate, method (EFECTIVO/TRANSFERENCIA/CHEQUE/OTRO), reference, notes, invoicePayments: List<InvoicePayment>
- [ ] 5.2 Create `InvoicePayment` record (domain) — paymentId, invoiceId, appliedAmount
- [ ] 5.3 Create `PaymentDomainService` — validatePayment(amount, invoices): SUM(invoicePayments.appliedAmount) = payment.amount; no single invoice overpaid (appliedAmount ≤ invoice.outstandingBalance); invoice status must be RECONCILED (not PENDING); throw BusinessException on violation

### Application Layer (3 tasks)

- [ ] 5.4 Create `PaymentRequest` DTO — supplierId, amount, paymentDate, method, reference?, invoiceIds: UUID[]; Jakarta validation
- [ ] 5.5 Create `PaymentResponse` DTO — id, supplierId, supplierName, amount, paymentDate, method, reference, appliedBreakdown: [{ invoiceId, invoiceNumber, appliedAmount }], notes
- [ ] 5.6 Create `CreatePaymentUseCase` — @Transactional: (1) load invoices by invoiceIds, (2) PaymentDomainService.validatePayment(amount, invoices), (3) FOR each invoice: update invoice status (PAID if fully paid, PARTIALLY_PAID if partial), reduce supplier.currentBalance by payment.amount, (4) save payment + invoice_payments records; UPDATE ThirdParty.currentBalance; pattern: similar to CreateGoodsReceiptUseCase multi-step tx

### Infrastructure Layer (2 tasks)

- [ ] 5.7 Create `PaymentEntity` (JPA) — @Entity, @Table, @ManyToOne supplier, @OneToMany invoicePayments (cascade ALL), @Enumerated method
- [ ] 5.8 Create `PaymentRepository` (interface) — extends JpaRepository, findBySupplierIdPageable; PaymentRepositoryAdapter

### REST Controller (1 task)

- [ ] 5.9 Create `PaymentController` — @PreAuthorize: GET /payments?supplierId=&page=&size=, POST /payments (delegates to CreatePaymentUseCase)

### Purchase History Endpoint (1 task)

- [ ] 5.10 Create `PurchaseHistoryController` or add endpoint to PurchaseOrderController — GET /purchase-history?from=&to=&supplierId=: aggregates OCs + receipts + invoices in date range into chronological merged list; uses existing repositories (read-only, no write)

### Retenciones Endpoint (1 task)

- [ ] 5.11 Create `RetencionesController` or add endpoint to SupplierInvoiceController — GET /retenciones?supplierId=&period=YYYY-MM: GROUP BY supplier_id, EXTRACT(YEAR_MONTH FROM issue_date) → read-only JSON aggregation (ivaRetenido, rentaRetenido, icaRetenido, totalRetenido); manual retention values from SupplierInvoice.retentionTotal

### Frontend Models & Services (3 tasks)

- [x] 5.12 Create `src/app/core/models/payment.model.ts` — Payment, PaymentRequest, PaymentResponse, InvoicePaymentBreakdown interfaces
- [x] 5.13 Create `src/app/core/services/payment.service.ts` — httpResource for list with supplierId filter, create (POST); copy pattern: batch.service.ts (list + create)
- [ ] 5.14 Create `src/app/core/models/retencion.model.ts` (lightweight) — RetencionSummary interface; create inline read-only service in retenciones component or add to supplier-invoice.service.ts

### Frontend Components (6 tasks)

- [x] 5.15 Create `pago-form` component (3 files: .ts, .html, .css) — `src/app/features/compras/pagos/pago-form/`; supplierId select (loads RECONCILED invoices for that supplier), amount input, paymentDate, method dropdown, invoice checkboxes (multi-select with outstanding balance per invoice per SupplierInvoiceUseCase), submit POST /payments; pattern: batch-form
- [x] 5.16 Create `historial-list` component (3 files: .ts, .html, .css) — `src/app/features/compras/historial/historial-list/`; date range picker (from/to), supplier filter, chronological merged list of OCs+Receipts+Invoices with type badge; pattern: batch-list (read-only table)
- [x] 5.17 Create `retenciones-list` component (3 files: .ts, .html, .css) — `src/app/features/compras/retenciones/retenciones-list/`; supplier filter, period picker (month/year), read-only table: supplierName, ivaRetenido, rentaRetenido, icaRetenido, totalRetenido; pattern: stock-summary (read-only aggregation)

### Menu & Route Enablement (2 tasks)

- [x] 5.18 MODIFY `src/app/layout/shell/shell.ts` — set `disabled: false` on ALL remaining compras children: "Historial compras", "Proveedores" (redirects to /terceros/proveedores), "Pagos realizados", "Retenciones"
- [x] 5.19 Add all S4 routes to app.routes.ts: `/compras/pagos`, `/compras/historial`, `/compras/retenciones`, `/compras/proveedores` (redirectTo /terceros/proveedores), `/compras/cxp` (redirectTo /compras/facturas), `/compras` (redirectTo ordenes); verify all 8 menu items resolve to valid routes

---

## Phase 6: Integration Verification — 4 tasks

- [ ] 6.1 **E2E Contract Verification**: Verify OC→Receipt→Batch→Stock data flow; POST OC → POST receipt (creates batches with sourceReceiptId, upserts stock, OC→PARTIAL) → verify Batch.purchaseCost = receipt actualCost → verify Stock quantities
- [ ] 6.2 **CxP Flow Verification**: POST invoice → verify supplier.currentBalance increased by total → POST payment → verify balance reduced, invoice→PAID → verify overpayment rejected (400)
- [ ] 6.3 **OC Lifecycle Verification**: Create OC → verify PENDING; partial receipt → verify PARTIAL; full receipt → verify RECEIVED; cancel PENDING OC → verify CANCELLED; attempt cancel RECEIVED OC → verify 409
- [ ] 6.4 **Menu & Auth Verification**: Login as ADMIN/AUXILIAR → all 8 /compras menu items enabled, navigable; login as OPERARIO → compras menu hidden; verify proveedores redirects to /terceros/proveedores; verify cxp redirects to /compras/facturas

---

## File Counts Summary

| Phase                   | Tasks  | DB Files | BE Files | FE Files | Modified | Total   |
| ----------------------- | ------ | -------- | -------- | -------- | -------- | ------- |
| Phase 1: Migrations     | 6      | 6        | 0        | 0        | 0        | 6       |
| Phase 2: S1 OC CRUD     | 23     | 0        | 14       | 9        | 2        | 25      |
| Phase 3: S2 Goods Recv  | 21     | 0        | 14       | 5        | 3        | 22      |
| Phase 4: S3 Invoice CxP | 17     | 0        | 10       | 5        | 2        | 17      |
| Phase 5: S4 Payments    | 19     | 0        | 8        | 7        | 2        | 17      |
| Phase 6: Verification   | 4      | 0        | 0        | 0        | 0        | 0       |
| **Total**               | **90** | **6**    | **46**   | **26**   | **9**    | **~87** |

### Modified Files

- `src/app/app.routes.ts` — add /compras route group + children (Phases 2.22, 3.20, 4.16, 5.19)
- `src/app/layout/shell/shell.ts` — enable 8 compras nav children (Phases 2.23, 3.21, 4.17, 5.18)
- `src/app/core/models/batch.model.ts` — add sourceReceiptId?, ocId? (Phase 3.19)
- `ALTER TABLE batches` — V27 migration (Phase 1.3)
- `ALTER TABLE third_parties` — V28 if current_balance missing (Phase 1.4)

### Dependency Order

```
Phase 1 (Migrations V25-V30) → Phase 2 (S1 OC CRUD) → Phase 3 (S2 Goods Receipt) → Phase 4 (S3 Invoice) → Phase 5 (S4 Payments) → Phase 6 (Integration)
```

All frontend tasks within a slice depend on backend models/services being complete. Routes and menu are wired incrementally per slice.
