# Compras Specification

## Purpose

Full purchase lifecycle for a Colombian meat plant: OC → Receipt → Invoice → Payment.
Covers ICA/INVIMA traceability, DIAN compliance, Batches, Stock, and CxP accounting.

## Architecture: Cost Flow

```
OC.unitCost → Receipt.actualCost → Batch.purchaseCost → Yield Costing (desposte)
```

## Requirements

### Slice 1 — Purchase Order CRUD

| ID    | Requirement           | Strength | Core Behavior                                                                                                   |
| ----- | --------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| R-001 | Create Purchase Order | MUST     | POST OC with supplierId + line items (productId, orderedQty, unitCost, warehouseId) → 201, status=PENDING       |
| R-002 | OC Lifecycle          | MUST     | Transitions: PENDING → PARTIAL → RECEIVED; PENDING → CANCELLED. Once RECEIVED or CANCELLED, transition is final |
| R-003 | Line Item Validation  | MUST     | Validate: orderedQty > 0, productId exists and active, warehouseId exists, supplierId valid ThirdParty SUPPLIER |

#### R-001 Scenarios

- **Happy**: GIVEN valid supplier + 3 line items → WHEN POST /api/purchase-orders → THEN 201, status=PENDING, lines persisted
- **Missing supplier**: GIVEN supplierId=null → WHEN POST → THEN 400, "supplierId is required"
- **Empty lines**: GIVEN lineItems=[] → WHEN POST → THEN 400, "at least one line item required"

#### R-002 Scenarios

- **Full receive**: GIVEN OC status=PENDING, all items fully received → WHEN last receipt completes → THEN status=RECEIVED
- **Cancel**: GIVEN OC status=PENDING → WHEN PATCH status=CANCELLED → THEN 200, status=CANCELLED
- **Cancel received OC**: GIVEN OC status=RECEIVED → WHEN PATCH status=CANCELLED → THEN 409, "OC already RECEIVED"

#### R-003 Scenarios

- **Zero qty**: GIVEN lineItem.orderedQty=0 → WHEN POST → THEN 400, "orderedQty must be > 0"
- **Invalid product**: GIVEN productId does not exist → WHEN POST → THEN 400, "product not found"
- **Invalid warehouse**: GIVEN warehouseId does not exist → WHEN POST → THEN 400, "warehouse not found"

### Slice 2 — Goods Receipt

| ID    | Requirement                  | Strength | Core Behavior                                                                                |
| ----- | ---------------------------- | -------- | -------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------- |
| R-004 | Create Goods Receipt         | MUST     | POST receipt validates OC (PENDING/PARTIAL), creates Batches + upserts Stock per line item   |
| R-005 | OC vs Receipt Reconciliation | MUST     | receivedQty per line ≤ remaining (orderedQty − alreadyReceived). Excess → 400                |
| R-006 | Batch Auto-Creation          | MUST     | Each line item creates one Batch: supplierId, purchaseCost=actualCost, sourceReceiptId, ocId |
| R-007 | Cost Deviation Flag          | MUST     | If                                                                                           | actualCost − ocUnitCost | / ocUnitCost > 0.20 → flag receipt with "HIGH_COST_DEVIATION" warning |

#### R-004 Scenarios

- **Happy**: GIVEN OC=PENDING with 2 line items → WHEN POST receipt with matching lines → THEN 201, 2 Batches created, Stock upserted, OC→PARTIAL
- **Cancelled OC**: GIVEN OC=CANCELLED → WHEN POST receipt → THEN 400, "OC is not in receivable status"
- **Warehouse mismatch**: GIVEN OC line warehouseId=A, receipt line warehouseId=B → WHEN POST → THEN 400, "warehouse mismatch"

#### R-005 Scenarios

- **Exact match**: GIVEN orderedQty=10, receivedQty=10 → WHEN POST → THEN 201, line fully received
- **Partial**: GIVEN orderedQty=10, receivedQty=6 → WHEN POST → THEN 201, remainingQty=4, OC→PARTIAL
- **Over-receive**: GIVEN alreadyReceived=8, newReceipt=5 (total 13 > orderedQty 10) → WHEN POST → THEN 400, "receivedQty exceeds remaining"

#### R-006 Scenarios

- **Happy**: GIVEN receipt line productId=A, actualCost=5500 → WHEN batch created → THEN batch.supplierId=OC.supplierId, batch.purchaseCost=5500, batch.sourceReceiptId=receipt.id
- **Multiple lines**: GIVEN receipt with 3 lines → WHEN POST → THEN 3 distinct Batches created, each linked to receipt

#### R-007 Scenarios

- **Within tolerance**: GIVEN ocUnitCost=5000, actualCost=5500 (10%) → WHEN POST → THEN 201, no deviation flag
- **Exceeds tolerance**: GIVEN ocUnitCost=5000, actualCost=6500 (30%) → WHEN POST → THEN 201 + warning "HIGH_COST_DEVIATION" on receipt

### Slice 3 — Supplier Invoice + CxP

| ID    | Requirement               | Strength | Core Behavior                                                                                                        |
| ----- | ------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| R-008 | Register Supplier Invoice | MUST     | POST invoice with DIAN fields (subtotal, iva, retenciones, total), supplierId, optional ocId                         |
| R-009 | Invoice Lifecycle         | MUST     | PENDING → RECONCILED → PAID. PAID is final                                                                           |
| R-010 | CxP Balance Update        | MUST     | On invoice creation: supplier.currentBalance += invoice.total. On payment: supplier.currentBalance −= payment.amount |

#### R-008 Scenarios

- **Happy**: GIVEN valid supplier + DIAN fields → WHEN POST /api/supplier-invoices → THEN 201, status=PENDING
- **Missing DIAN total**: GIVEN total=null → WHEN POST → THEN 400, "total is required"
- **Invalid supplier**: GIVEN supplierId does not exist → WHEN POST → THEN 400, "supplier not found"

#### R-009 Scenarios

- **Reconcile**: GIVEN invoice status=PENDING → WHEN PATCH status=RECONCILED → THEN 200, status=RECONCILED
- **Pay**: GIVEN invoice status=RECONCILED → WHEN payment applied fully → THEN status=PAID
- **Pay unreconciled**: GIVEN invoice status=PENDING → WHEN attempt payment → THEN 400, "invoice must be RECONCILED before payment"

#### R-010 Scenarios

- **Invoice creation**: GIVEN supplier balance=100000 → WHEN invoice total=50000 created → THEN balance=150000
- **Payment**: GIVEN supplier balance=150000 → WHEN payment 50000 applied → THEN balance=100000

### Slice 4 — Payments + Menu

| ID    | Requirement              | Strength | Core Behavior                                                                                                   |
| ----- | ------------------------ | -------- | --------------------------------------------------------------------------------------------------------------- |
| R-011 | Apply Payment            | MUST     | POST payment (supplierId, amount, invoiceIds[]) → reduce CxP, update invoice status(es)                         |
| R-012 | Menu & Routes Enablement | MUST     | Enable 8 /compras menu items, role-based visibility (ADMIN, COMPRAS)                                            |
| R-013 | Purchase History         | MUST     | GET /api/purchase-history?from=&to=&supplierId= → read-only view of all OCs + receipts + invoices in date range |

#### R-011 Scenarios

- **Full payment**: GIVEN invoice total=50000 → WHEN POST payment amount=50000 → THEN invoice→PAID, CxP reduced
- **Partial payment**: GIVEN invoice total=50000 → WHEN POST payment amount=20000 → THEN invoice→PARTIALLY_PAID, remaining=30000
- **Overpayment**: GIVEN invoice remaining=10000 → WHEN POST payment amount=15000 → THEN 400, "payment exceeds outstanding balance"

#### R-012 Scenarios

- **Admin role**: GIVEN user role=ADMIN → WHEN menu renders → THEN all 8 /compras items visible and enabled
- **Compras role**: GIVEN user role=COMPRAS → WHEN menu renders → THEN all 8 items visible
- **Other role**: GIVEN user role=OPERARIO → WHEN menu renders → THEN /compras items hidden

#### R-013 Scenarios

- **Filtered history**: GIVEN OCs exist in range → WHEN GET /api/purchase-history?from=2026-05-01&to=2026-05-17 → THEN 200, chronological list
- **Supplier filter**: GIVEN supplierId=X → WHEN GET with supplierId=X → THEN only X's OCs, receipts, invoices returned
- **Empty range**: GIVEN no purchases in range → WHEN GET → THEN 200, empty array
