# Sprint 8 — Ventas Specification

## Purpose

Full non-POS sales lifecycle for a Colombian meat plant: Quotation → Order → Invoice with credit, Accounts Receivable (CxC), Customer Payments, Statements, and Collections tracking.

## Requirements

### Slice 1: Sales Docs UI

| ID    | Requirement            | Strength | Core Behavior                                                                                            |
| ----- | ---------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| S1-R1 | Sales Doc List View    | MUST     | GET /ventas/documentos with filters (type, status, date range, client), paginated results                |
| S1-R2 | Sales Doc Detail View  | MUST     | Display line items (qty×price), totals (net, IVA, INC, amount), status badge, allowed transition buttons |
| S1-R3 | Recalculate Totals     | MUST     | After addItem/updateItem/removeItem → recalc totalNet, totalTaxIVA, totalTaxINC, totalAmount             |
| S1-R4 | Migrate Zero Totals    | MUST     | V45 migration: recalculate totals for DRAFT documents where total=0. Non-DRAFT are immutable             |
| S1-R5 | dueDate + isCreditSale | MUST     | Add `dueDate` (LocalDate) and `isCreditSale` (boolean) to SalesDocument record, entity, V45 migration    |
| S1-R6 | Enable Menu Items      | MUST     | Unlock 6 Ventas menu items: Clientes, Créditos, CxC, Recibos, Estados, Cobranzas                         |
| S1-R7 | Ventas Routes          | MUST     | Add lazy routes under /ventas: /documentos, /clientes, /creditos, /cxc, /recibos, /estados, /cobranzas   |

#### S1-R1 + S1-R2 Scenarios

- **Filtered list**: GIVEN documents with mixed types/statuses → WHEN user filters by status=SENT → THEN only SENT documents shown
- **Detail view**: GIVEN user clicks a document row → WHEN detail loads → THEN items table with subtotals, totals summary panel, status badge, transition buttons
- **Create quote with items**: GIVEN new QUOTE with items (2×5000, 1×3000, 4×2500) → WHEN saved → THEN totalNet=23000, taxIVA=4370 (19%), totalAmount=27370
- **Transition quote**: GIVEN QUOTE status=DRAFT → WHEN user clicks "Enviar" → THEN status transitions to SENT
- **Credit validation**: GIVEN isCreditSale=true, creditLimit=500000, currentBalance=480000, total=50000 → WHEN transition DRAFT→SENT → THEN 409, "Excede cupo de crédito disponible"
- **Force credit override**: GIVEN credit exceeded but user clicks "Forzar" with mandatory comment → WHEN confirmed → THEN transition succeeds with audit log entry

### Slice 2: Client CRUD UI

| ID    | Requirement   | Strength | Core Behavior                                                                                         |
| ----- | ------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| S2-R1 | Client List   | MUST     | List ThirdParty where type=CLIENT, with search (name/NIT), filter, pagination                         |
| S2-R2 | Client Form   | MUST     | Create/edit ThirdParty: name, NIT, phone, email, creditLimit, creditDays. currentBalance is read-only |
| S2-R3 | Client Detail | MUST     | Show full info + credit summary: creditLimit, currentBalance, available (limit−balance), creditDays   |

#### S2 Scenarios

- **Search client**: GIVEN "Carnes del Valle" and "DistriCarnes" → WHEN user types "valle" → THEN only "Carnes del Valle" shown
- **Edit credit limit**: GIVEN client creditLimit=1M → WHEN user edits to 2M and saves → THEN 200, creditLimit=2M persisted
- **New client**: GIVEN valid NIT not in system → WHEN user fills form with name, NIT, creditDays=30 → THEN 201, type=CLIENT, currentBalance=0

### Slice 3: CxC Module

| ID    | Requirement                  | Strength | Core Behavior                                                                                                    |
| ----- | ---------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| S3-R1 | accounts_receivable table    | MUST     | V46: id, client_id, document_id (nullable), total_amount, paid_amount, outstanding, due_date, status, created_at |
| S3-R2 | CxC Domain + Controller      | MUST     | Domain record, JPA entity + adapter, repository, use case, REST controller at /api/v1/cxc                        |
| S3-R3 | CxC List View + Aging        | MUST     | Frontend list with filters (client, date range, status). Aging buckets: 0-30, 31-60, 61-90, 90+ days             |
| S3-R4 | Auto-generate CxC on Invoice | MUST     | When SalesDocument transitions to ISSUED with isCreditSale=true → auto-create CxC entry                          |

#### S3 Scenarios

- **Invoice creates CxC**: GIVEN invoice ISSUED, isCreditSale=true, total=500000 → WHEN status=ISSUED → THEN CxC created: outstanding=500000, paidAmount=0, status=PENDING
- **Aging dashboard**: GIVEN CxC entries with due dates 5, 35, 65, 95 days ago → WHEN aging view renders → THEN buckets: 0-30:1, 31-60:1, 61-90:1, 90+:1
- **Filter by client**: GIVEN CxC entries for clients A and B → WHEN filter client=A → THEN only A's entries returned

### Slice 4: Recibos de Caja

| ID    | Requirement                        | Strength | Core Behavior                                                                                               |
| ----- | ---------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| S4-R1 | customer_payment_receipts table    | MUST     | V47: id, client_id, amount, payment_date, method (CASH/TRANSFER/CHECK/DEPOSIT), reference, notes            |
| S4-R2 | receipt_invoice_applications table | MUST     | Junction: receipt_id, invoice_id (SalesDocument), applied_amount                                            |
| S4-R3 | Receipt Controller                 | MUST     | POST/GET /api/v1/recibos, POST /api/v1/recibos/{id}/apply                                                   |
| S4-R4 | Receipt List + Form                | MUST     | Frontend: receipt list with filters, creation form with client selector, amount, method, invoice-apply grid |
| S4-R5 | Balance Update on Apply            | MUST     | Applying receipt: reduce AccountsReceivable.outstanding, reduce ThirdParty.currentBalance by applied amount |

#### S4 Scenarios

- **Create receipt and apply**: GIVEN client with 2 open invoices (100K + 50K) → WHEN receipt 80K applied: 50K to inv1, 30K to inv2 → THEN inv1 outstanding→50K, inv2→20K, client.balance −80K
- **Overpayment error**: GIVEN invoice outstanding=30K → WHEN user applies 40K → THEN 400, "Monto aplicado excede saldo pendiente"
- **Receipt list**: GIVEN receipts exist for client → WHEN list loads → THEN shows date, amount, method, reference per receipt

### Slice 5: Estados de Cuenta

| ID    | Requirement       | Strength | Core Behavior                                                                                                     |
| ----- | ----------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| S5-R1 | Statement Query   | MUST     | GET /api/v1/cxc/estado-cuenta/{clientId}?from=&to= → aggregates invoices + receipts → opening, movements, closing |
| S5-R2 | Statement View    | MUST     | Frontend: summary card (opening, charges, credits, closing) + movement detail table                               |
| S5-R3 | Date Range Filter | MUST     | Per-client, per-period filtering via date pickers                                                                 |

#### S5 Scenarios

- **Generate statement**: GIVEN client: inv1 Jun-1=200K, receipt Jun-5=100K, inv2 Jun-10=150K → WHEN query Jun-1 to Jun-15 → THEN opening=0, charges=350K, credits=100K, closing=250K, 3 rows
- **Empty period**: GIVEN client with no activity in range → WHEN query → THEN opening=closing=currentBalance, 0 movement rows
- **With opening balance**: GIVEN client had outstanding 50K before May-1 → WHEN query May 1-31 → THEN opening=50K, movements from May only

### Slice 6: Cobranzas

| ID    | Requirement               | Strength | Core Behavior                                                                                                                                                                    |
| ----- | ------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S6-R1 | collection_attempts table | MUST     | V48: id, client_id, accounts_receivable_id, contact_date, method (CALL/EMAIL/VISIT/WHATSAPP), result (PROMISE_TO_PAY/NO_ANSWER/DISPUTED/PAID), notes, next_follow_up, created_by |
| S6-R2 | Collection List View      | MUST     | Frontend: list with overdue indicators (30d→yellow, 60d→orange, 90d+→red), filters by client/status                                                                              |
| S6-R3 | Log Contact Attempt       | MUST     | POST /api/v1/cobranzas → register attempt with method, result, notes, optional nextFollowUp                                                                                      |

#### S6 Scenarios

- **Log call**: GIVEN overdue invoice (15 days) → WHEN collector logs CALL, result=PROMISE_TO_PAY, notes="Paga viernes" → THEN attempt saved with next_follow_up
- **Overdue indicators**: GIVEN invoices due 5d, 35d, 70d → WHEN list renders → THEN 5d=no flag, 35d=orange badge, 70d=red badge
- **History view**: GIVEN 3 attempts logged for same invoice → WHEN viewing history → THEN chronological list with method, result, notes
