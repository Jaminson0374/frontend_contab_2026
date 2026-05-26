# Anticipos y Notas débito/crédito Specification

## Purpose

Extend the Compras/CxP ecosystem with two financial capabilities for Colombian meat plant operations: (1) **supplier advances** — prepayments applied against future invoices, routine with livestock suppliers; (2) **debit/credit notes** — balance adjustments for weight differences, quality penalties, bonuses, or freight without modifying the original invoice.

## Architecture

```
Payments (V29 + V53: isAdvance, remainingAdvance)
  └── advance_applications (V53: advance_id → invoice_id, appliedAmount)
       ↓ updates
  SupplierInvoice.status + ThirdParty.currentBalance

debit_credit_notes (V54: type CHECK DEBIT_NOTE/CREDIT_NOTE)
  └── updates ThirdParty.currentBalance (débito +, crédito −)
```

---

## Slice 1 — Anticipos a proveedores

| ID          | Requirement        | Strength | Core Behavior                                                                                                   |
| ----------- | ------------------ | -------- | --------------------------------------------------------------------------------------------------------------- |
| REQ-CXP-050 | Create Advance     | MUST     | POST `/api/v1/payments` with `isAdvance=true`. MUST NOT require invoicePayments. Sets `remainingAdvance=amount` |
| REQ-CXP-051 | List Advances      | MUST     | GET `/api/v1/payments?isAdvance=true` returns only advances with remainingAdvance > 0, filterable by supplierId |
| REQ-CXP-052 | Apply Advance      | MUST     | POST `/api/v1/payments/{id}/apply` consumes remainingAdvance against PENDING/RECONCILED invoice(s)              |
| REQ-CXP-053 | Advance Exhaustion | MUST     | When remainingAdvance reaches 0, advance MUST NOT accept further applications                                   |
| REQ-CXP-054 | Advance UI List    | MUST     | `/compras/anticipos` renders MatTable: supplier, amount, remainingAdvance, date. Filter by supplier             |
| REQ-CXP-055 | Advance UI Form    | MUST     | `/compras/anticipos/nuevo` renders form reusing PagoForm pattern: supplier selector, amount, date               |
| REQ-CXP-056 | Apply Advance UI   | MUST     | ApplyAdvanceDialog (MatDialog) shows ONLY supplier's PENDING/RECONCILED invoices with amount inputs             |
| REQ-CXP-057 | Advance Menu       | MUST     | Shell Compras menu shows "Anticipos" item. Route `/compras/anticipos` lazy-loaded                               |

### REQ-CXP-050 Scenarios

- **Happy**: GIVEN valid supplierId + amount=500000, isAdvance=true → WHEN POST `/api/v1/payments` → THEN 201, remainingAdvance=500000, NO invoicePayments required
- **Invoice payments rejected**: GIVEN isAdvance=true + invoicePayments non-empty → WHEN POST → THEN 400, "invoicePayments not allowed for advances"
- **Missing supplier**: GIVEN supplierId=null → WHEN POST advance → THEN 400, "supplierId is required"
- **Zero amount**: GIVEN amount=0 → WHEN POST advance → THEN 400, "amount must be > 0"

### REQ-CXP-051 Scenarios

- **Happy**: GIVEN 3 advances exist (2 with remaining > 0, 1 exhausted) → WHEN GET `?isAdvance=true` → THEN 200, only 2 advances with remaining > 0
- **Supplier filter**: GIVEN supplier X has 2 advances → WHEN GET `?isAdvance=true&supplierId=X` → THEN 200, only X's advances
- **Empty**: GIVEN no advances exist → WHEN GET `?isAdvance=true` → THEN 200, empty array

### REQ-CXP-052 Scenarios

- **Full apply**: GIVEN advance remaining=300000, invoice pending=300000 → WHEN POST `/api/v1/payments/{id}/apply` with invoiceId + amount=300000 → THEN 200, remainingAdvance=0, invoice→PAID, supplier balance reduced, advance_application created
- **Partial apply**: GIVEN advance remaining=500000, invoice pending=200000 → WHEN apply amount=200000 → THEN 200, remainingAdvance=300000, invoice→PAID
- **Multi-invoice apply**: GIVEN advance remaining=500000, invoice A=200000, invoice B=200000 → WHEN apply both → THEN remainingAdvance=100000, both invoices→PAID
- **Excess apply**: GIVEN advance remaining=100000 → WHEN apply amount=150000 → THEN 400, "amount exceeds remaining advance"
- **Wrong supplier**: GIVEN advance supplier=A, invoice supplier=B → WHEN apply → THEN 400, "invoice does not belong to this advance's supplier"
- **Paid invoice**: GIVEN invoice already PAID → WHEN apply to it → THEN 400, "invoice is not in receivable status"

### REQ-CXP-053 Scenarios

- **Exhausted advance**: GIVEN advance remainingAdvance=0 → WHEN POST `/api/v1/payments/{id}/apply` → THEN 400, "advance is exhausted"
- **Apply brings to zero**: GIVEN remainingAdvance=50000 → WHEN apply exact 50000 → THEN 200, remainingAdvance=0, advance exhausted

### REQ-CXP-054 Scenarios

- **Happy**: GIVEN 5 advances exist → WHEN navigate to `/compras/anticipos` → THEN MatTable renders with columns: supplier name, amount, remaining, date
- **Empty state**: GIVEN no advances → WHEN page loads → THEN empty table with "No hay anticipos" message
- **Supplier filter**: GIVEN supplier dropdown → WHEN select supplier X → THEN table filters to X's advances only

### REQ-CXP-055 Scenarios

- **Happy**: GIVEN at `/compras/anticipos/nuevo` → WHEN fill supplier + amount + date → THEN POST creates advance, redirects to list
- **Validation**: GIVEN amount empty → WHEN submit → THEN field shows "Monto requerido" error
- **Cancel**: GIVEN form filled → WHEN click "Cancelar" → THEN navigate back to `/compras/anticipos` without saving

### REQ-CXP-056 Scenarios

- **Happy**: GIVEN advance for supplier X → WHEN open ApplyAdvanceDialog → THEN shows only X's PENDING/RECONCILED invoices with amount inputs
- **Apply and close**: GIVEN invoice selected + amount entered → WHEN click "Aplicar" → THEN advance applied, dialog closes, list refreshes
- **No invoices**: GIVEN supplier has no pending invoices → WHEN dialog opens → THEN shows "El proveedor no tiene facturas pendientes"

### REQ-CXP-057 Scenarios

- **Route**: GIVEN COMPRAS/ADMIN role → WHEN navigate to `/compras/anticipos` → THEN AdvanceListComponent renders
- **Menu**: GIVEN COMPRAS/ADMIN role → WHEN shell renders → THEN "Anticipos" visible in Compras submenu
- **Lazy load**: GIVEN first navigation → WHEN route activates → THEN anticipos module lazy-loaded, not in initial bundle

---

## Slice 2 — Notas débito/crédito

| ID          | Requirement          | Strength | Core Behavior                                                                                                                   |
| ----------- | -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| REQ-CXP-060 | Create Note          | MUST     | POST `/api/v1/debit-credit-notes` with type (DEBIT_NOTE/CREDIT_NOTE), supplierId, amount, reason, optional invoiceId → 201      |
| REQ-CXP-061 | List Notes           | MUST     | GET `/api/v1/debit-credit-notes?supplierId=` returns filterable list with type, supplier name, invoice, amount, reason, date    |
| REQ-CXP-062 | Get Note             | MUST     | GET `/api/v1/debit-credit-notes/{id}` returns full note detail                                                                  |
| REQ-CXP-063 | Update Note          | MUST     | PUT `/api/v1/debit-credit-notes/{id}` updates type, amount, reason, invoiceId → 200. Recalculates CxP balance                   |
| REQ-CXP-064 | Delete Note          | MUST     | DELETE `/api/v1/debit-credit-notes/{id}` removes note and reverses CxP balance adjustment → 200                                 |
| REQ-CXP-065 | Balance Adjustment   | MUST     | DEBIT_NOTE → increase supplier.currentBalance by amount. CREDIT_NOTE → decrease supplier.currentBalance by amount               |
| REQ-CXP-066 | Optional Invoice Ref | MUST     | invoiceId FK is optional. When set, references existing invoice WITHOUT modifying its total. Notes adjust balance independently |
| REQ-CXP-067 | Note List UI         | MUST     | `/compras/notas` renders MatTable: type badge, supplier, invoice (optional), amount, reason, date. Filter by supplier           |
| REQ-CXP-068 | Note Form UI         | MUST     | `/compras/notas/nuevo` renders ReactiveForm: type toggle, supplier selector, optional invoice, amount, reason textarea          |
| REQ-CXP-069 | Note Menu            | MUST     | Shell Compras menu shows "Notas débito/crédito" item. Route `/compras/notas` lazy-loaded                                        |

### REQ-CXP-060 Scenarios

- **Debit note**: GIVEN valid supplier + amount=100000, type=DEBIT_NOTE → WHEN POST → THEN 201, supplier.currentBalance += 100000
- **Credit note**: GIVEN valid supplier + amount=50000, type=CREDIT_NOTE → WHEN POST → THEN 201, supplier.currentBalance −= 50000
- **Invalid type**: GIVEN type="INVALID" → WHEN POST → THEN 400, "type must be DEBIT_NOTE or CREDIT_NOTE"
- **Missing supplier**: GIVEN supplierId=null → WHEN POST → THEN 400, "supplierId is required"
- **Negative amount**: GIVEN amount=-1 → WHEN POST → THEN 400, "amount must be > 0"
- **With invoice**: GIVEN valid invoiceId → WHEN POST → THEN 201, note linked to invoice, invoice total unchanged
- **Invalid invoice**: GIVEN invoiceId does not exist → WHEN POST → THEN 400, "invoice not found"

### REQ-CXP-061 Scenarios

- **Happy**: GIVEN 4 notes exist → WHEN GET `/api/v1/debit-credit-notes` → THEN 200, 4 notes with supplier name
- **Supplier filter**: GIVEN supplier X has 2 notes → WHEN GET `?supplierId=X` → THEN 200, 2 notes
- **Empty**: GIVEN no notes → WHEN GET → THEN 200, empty array

### REQ-CXP-062 Scenarios

- **Happy**: GIVEN note id=X → WHEN GET `/api/v1/debit-credit-notes/X` → THEN 200, full note object
- **Not found**: GIVEN non-existent id → WHEN GET → THEN 404, "Note not found"

### REQ-CXP-063 Scenarios

- **Type change**: GIVEN debit note → WHEN PUT type=CREDIT_NOTE → THEN 200, balance adjustment reversed and recalculated
- **Amount change**: GIVEN note amount=100000, balance already adjusted → WHEN PUT amount=150000 → THEN 200, balance delta +50000 applied
- **Not found**: GIVEN non-existent id → WHEN PUT → THEN 404

### REQ-CXP-064 Scenarios

- **Delete debit**: GIVEN debit note increased balance by 100000 → WHEN DELETE → THEN 200, balance reversed (−100000), note removed
- **Delete credit**: GIVEN credit note decreased balance by 50000 → WHEN DELETE → THEN 200, balance reversed (+50000), note removed
- **Not found**: GIVEN non-existent id → WHEN DELETE → THEN 404

### REQ-CXP-065 Scenarios

- **Debit increases debt**: GIVEN supplier balance=200000 → WHEN DEBIT_NOTE amount=50000 created → THEN balance=250000
- **Credit reduces debt**: GIVEN supplier balance=200000 → WHEN CREDIT_NOTE amount=30000 created → THEN balance=170000
- **Delete reverses**: GIVEN note deleted → WHEN balance recalculated → THEN balance returns to pre-note value

### REQ-CXP-066 Scenarios

- **With invoice**: GIVEN invoice total=500000 → WHEN credit note linked → THEN invoice total remains 500000, supplier balance adjusts independently
- **Without invoice**: GIVEN note created with invoiceId=null → WHEN saved → THEN 201, note exists without invoice reference

### REQ-CXP-067 Scenarios

- **Happy**: GIVEN 5 notes exist → WHEN navigate to `/compras/notas` → THEN MatTable renders: type badge (green=CREDIT, red=DEBIT), supplier, invoice, amount, reason, date
- **Empty state**: GIVEN no notes → WHEN page loads → THEN empty table with "No hay notas" message
- **Supplier filter**: GIVEN supplier dropdown → WHEN select supplier X → THEN table filters to X's notes only

### REQ-CXP-068 Scenarios

- **Debit creation**: GIVEN at `/compras/notas/nuevo` → WHEN select type=DEBIT_NOTE + supplier + amount + reason → THEN POST creates debit note, redirects to list
- **Credit creation**: GIVEN at form → WHEN select type=CREDIT_NOTE + supplier + amount → THEN POST creates credit note
- **Validation**: GIVEN reason empty → WHEN submit → THEN field shows "Motivo requerido" error
- **Invoice optional**: GIVEN invoice field left empty → WHEN submit → THEN 201, note created without invoice
- **Cancel**: GIVEN form filled → WHEN click "Cancelar" → THEN navigate back to `/compras/notas` without saving

### REQ-CXP-069 Scenarios

- **Route**: GIVEN COMPRAS/ADMIN role → WHEN navigate to `/compras/notas` → THEN DebitCreditNoteListComponent renders
- **Menu**: GIVEN COMPRAS/ADMIN role → WHEN shell renders → THEN "Notas débito/crédito" visible in Compras submenu
- **Lazy load**: GIVEN first navigation → WHEN route activates → THEN notas module lazy-loaded

---

## Success Criteria

- [ ] `POST /api/v1/payments` with `isAdvance=true` creates advance without invoicePayments, sets remainingAdvance=amount
- [ ] `GET /api/v1/payments?isAdvance=true` returns only advances with remainingAdvance > 0
- [ ] `POST /api/v1/payments/{id}/apply` consumes remainingAdvance against invoice(s), creates advance_applications, updates invoice status + supplier balance
- [ ] Advance with remainingAdvance=0 rejects further applications (400)
- [ ] CRUD debit notes: create, list, get, update, delete with supplier balance increment
- [ ] CRUD credit notes: create, list, get, update, delete with supplier balance decrement
- [ ] Notes with optional invoice reference do NOT modify invoice total; balance adjusts independently
- [ ] Compras menu shows "Anticipos" and "Notas débito/crédito" for COMPRAS/ADMIN roles
- [ ] ApplyAdvanceDialog shows only supplier's PENDING/RECONCILED invoices
- [ ] `@Auditable` on ApplyAdvanceUseCase and ManageDebitCreditNoteUseCase generates audit logs automatically
- [ ] All operations are `@Transactional` atomic with version-locked optimistic concurrency
