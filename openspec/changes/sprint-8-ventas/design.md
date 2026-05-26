# Design: Sprint 8 — Ventas

## Technical Approach

Enable the disabled Ventas module (6 locked menu items) by building the complete non-POS sales cycle. Backend follows hexagonal architecture (domain record → adapter → use case → controller). Frontend follows existing pattern: standalone components, signals, `httpResource`, ReactiveForms with autocomplete `__create__`. Bugfix: extract `recalculateDocumentTotals()` in `ManageSalesDocumentUseCase` (copy from `PosCheckoutUseCase.calculateTotals()`), call after addItem/updateItem/removeItem. Slices deliver progressively: S1 docs+bufixes → S2 clients → S3 CxC → S4 receipts → S5 statements → S6 collections.

## Architecture Decisions

| #   | Decision                                 | Choice                                                                                                                        | Rejected                                  | Rationale                                                                                                                                                                                                                |
| --- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Customer receipt vs supplier payment** | Separate `CustomerReceipt` module, new tables V47                                                                             | Reuse `payments` table with discriminator | Customer receipts apply to CxC entries (not supplier invoices), need client-facing numbering, and have different business rules. Shared table would leak supplier/customer context. Frontend copies `pago-form` pattern. |
| 2   | **CxC auto-generation**                  | Post-transition hook in `transitionDocument`: INVOICE DRAFT→ISSUED with `isCreditSale=true` auto-creates `AccountsReceivable` | Separate scheduled job; manual creation   | Real-time = instant CxC visibility. Due date computed as `now + client.creditDays`. Atomic within same @Transactional that transitions the invoice.                                                                      |
| 3   | **Aging buckets**                        | Computed SQL query: `CASE WHEN days <= 30 THEN '0-30' WHEN days <= 60 THEN '31-60' ...`                                       | Materialized `aging_bucket` column        | No sync risk, always accurate, zero maintenance. Query performance acceptable with index on `due_date`. Buckets computed at read time.                                                                                   |
| 4   | **Totals recalculation bugfix**          | Private `recalculateDocumentTotals(documentId)` in `ManageSalesDocumentUseCase`, called by addItem/updateItem/removeItem      | Recalculate in controller or mapper       | Same pattern proven in `PosCheckoutUseCase`. Use case owns the business rule. Atomic: query items → sum → update document totals in single transaction.                                                                  |
| 5   | **Stock on credit sales**                | Decrement stock at ISSUED (not DRAFT). No reservation for credit sales.                                                       | Reserve at DRAFT                          | POS already uses `SELECT FOR UPDATE` at checkout. Non-POS credit sales are lower volume — stock decrement at ISSUED is acceptable and avoids stale reservations.                                                         |
| 6   | **ThirdParty.currentBalance sync**       | Recompute as `SUM(CxC.balance)` inside receipt-apply use case                                                                 | Trigger-based sync                        | Application-level ensures consistency. Denormalized `currentBalance` stays instant for CxC queries. Migration V46 recalcs all balances from existing data.                                                               |

## Data Flow

```
Credit Sale:  INVOICE DRAFT ──(transition: ISSUED)──→
              ├── if isCreditSale=true:
              │     AccountsReceivable created { clientId, invoiceId, amount, dueDate=now+creditDays, status=OPEN }
              │     ThirdParty.currentBalance += amount
              └── stock decremented

Payment:      POST /api/v1/customer-receipts { clientId, amount, method }
              ──→ CreateCustomerReceiptUseCase
                    ├── validate client exists, amount > 0
                    ├── save receipt
                    ├── apply to CxC entries (oldest first):
                    │     ├── ReceiptApplication created { receiptId, arId, appliedAmount }
                    │     ├── AccountsReceivable.balance -= appliedAmount
                    │     ├── status = balance==0 ? PAID : PARTIAL
                    │     └── ThirdParty.currentBalance -= appliedAmount
                    └── return receipt with applied breakdown

Collection:   GET /api/v1/collections?status=OVERDUE
              ──→ WHERE due_date < NOW() AND status != PAID
              POST log { arId, contactDate, method, result, notes }
              ──→ CollectionAttempt saved, ar.lastContactDate updated
```

## File Changes

### Frontend (20 new, 2 modified)

| File                                                   | Action | Description                                               |
| ------------------------------------------------------ | ------ | --------------------------------------------------------- |
| `src/app/features/ventas/ventas.ts`                    | Create | Feature wrapper `<router-outlet />` (copy compras.ts)     |
| `src/app/features/ventas/documentos/doc-list.ts`       | Create | Paginated table: type/status/client filters               |
| `src/app/features/ventas/documentos/doc-detail.ts`     | Create | Items table, totals, status chip, transition buttons      |
| `src/app/features/ventas/documentos/doc-form.ts`       | Create | Create/edit doc, item lines with FormArray                |
| `src/app/features/ventas/clientes/client-list.ts`      | Create | ThirdParty list filtered type=CLIENT                      |
| `src/app/features/ventas/clientes/client-form.ts`      | Create | ThirdParty form with credit fields                        |
| `src/app/features/ventas/cxc/cxc-list.ts`              | Create | CxC table with aging tabs, per-client view                |
| `src/app/features/ventas/recibos/receipt-list.ts`      | Create | Receipt list with filters                                 |
| `src/app/features/ventas/recibos/receipt-form.ts`      | Create | Select client → load CxC → apply payment (copy pago-form) |
| `src/app/features/ventas/estados/statement.ts`         | Create | Client selector, date range, ledger view                  |
| `src/app/features/ventas/cobranzas/collection-list.ts` | Create | Overdue filter, log contact dialog                        |
| `src/app/core/models/cxc.model.ts`                     | Create | AccountsReceivable, AgingBucket interfaces                |
| `src/app/core/models/customer-receipt.model.ts`        | Create | CustomerReceipt, ReceiptApplication interfaces            |
| `src/app/core/models/collection.model.ts`              | Create | CollectionAttempt interface                               |
| `src/app/core/services/cxc.service.ts`                 | Create | httpResource list, getByClient, aging                     |
| `src/app/core/services/customer-receipt.service.ts`    | Create | CRUD + apply endpoint                                     |
| `src/app/core/services/collection.service.ts`          | Create | List overdue, log contact                                 |
| `src/app/app.routes.ts`                                | Modify | Add `/ventas` lazy routes (6 slices)                      |
| `src/app/layout/shell/shell.ts`                        | Modify | Enable ventas children, rename "Créditos"→"Documentos"    |

### Backend (27 new, 5 modified)

| File                                                                        | Action               | Description                                                       |
| --------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------- |
| `domain/model/AccountsReceivable.java`                                      | Create               | Record: id, clientId, invoiceId, amount, balance, status, dueDate |
| `domain/model/CustomerReceipt.java`                                         | Create               | Record: id, clientId, amount, method, date, reference             |
| `domain/model/ReceiptApplication.java`                                      | Create               | Record: receiptId, arId, appliedAmount                            |
| `domain/model/CollectionAttempt.java`                                       | Create               | Record: id, arId, contactDate, method, result, notes              |
| `domain/repository/AccountsReceivableRepository.java`                       | Create               | Port: findByClient, findByStatus, aging query                     |
| `domain/repository/CustomerReceiptRepository.java`                          | Create               | Port: CRUD, findByClient                                          |
| `domain/repository/CollectionAttemptRepository.java`                        | Create               | Port: findByArId, findByClient                                    |
| `application/usecase/ManageAccountsReceivableUseCase.java`                  | Create               | Create CxC, aging buckets, apply payment                          |
| `application/usecase/CreateCustomerReceiptUseCase.java`                     | Create               | Create receipt + apply to CxC (oldest-first)                      |
| `application/usecase/CustomerStatementUseCase.java`                         | Create               | Read-only: aggregate invoices + receipts = balance                |
| `application/usecase/ManageCollectionsUseCase.java`                         | Create               | List overdue, log contact, update status                          |
| `application/dto/AccountsReceivableResponse.java`                           | Create               | CxC response DTO with aging info                                  |
| `application/dto/CustomerReceiptRequest.java`                               | Create               | Receipt request: clientId, amount, method, appliedArs[]           |
| `application/dto/CustomerStatementResponse.java`                            | Create               | Statement: client, period, movements[], balance                   |
| `infrastructure/adapters/out/persistence/` (3 entities, 3 repos, 2 mappers) | Create               | JPA entities, Spring Data repos, MapStruct mappers                |
| `infrastructure/adapters/in/rest/` (4 controllers)                          | Create               | REST endpoints for CxC, receipts, statements, collections         |
| `src/main/resources/db/migration/V45__*.sql`                                | Modify SalesDocument | Add dueDate, isCreditSale; recalcular totales                     |
| `src/main/resources/db/migration/V46__*.sql`                                | Create               | accounts_receivable table                                         |
| `src/main/resources/db/migration/V47__*.sql`                                | Create               | customer_receipts + receipt_applications tables                   |
| `src/main/resources/db/migration/V48__*.sql`                                | Create               | collection_attempts table                                         |
| `ManageSalesDocumentUseCase.java`                                           | Modify               | Bugfix: recalculateTotals + credit validation + CxC auto-create   |

## API Contracts

### CxC — `/api/v1/accounts-receivable`

| Method | Path                                       | Description                                 |
| ------ | ------------------------------------------ | ------------------------------------------- |
| `GET`  | `?page=&size=&clientId=&status=&from=&to=` | Paginated list with filters                 |
| `GET`  | `/by-client/{clientId}`                    | All CxC for a client                        |
| `GET`  | `/aging?clientId=&asOf=`                   | Aging buckets: 0-30, 31-60, 61-90, 90+ days |

### Recibos — `/api/v1/customer-receipts`

| Method | Path                     | Request                                                                                              | Response                                |
| ------ | ------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `POST` | `/`                      | `{ clientId, amount, paymentDate, method, reference, notes, appliedArs: [{ arId, appliedAmount }] }` | `201 CustomerReceiptResponse`           |
| `GET`  | `?page=&size=&clientId=` | —                                                                                                    | `PageResponse<CustomerReceiptResponse>` |
| `GET`  | `/{id}`                  | —                                                                                                    | Receipt with applications               |

### Estados — `/api/v1/customer-statements`

| Method | Path                    | Description                                                         |
| ------ | ----------------------- | ------------------------------------------------------------------- |
| `GET`  | `/{clientId}?from=&to=` | Chronological movements: invoices (+), receipts (-), ending balance |

### Cobranzas — `/api/v1/collections`

| Method | Path                                       | Description                                                  |
| ------ | ------------------------------------------ | ------------------------------------------------------------ |
| `GET`  | `?clientId=&status=&from=&to=&page=&size=` | Overdue/collections list                                     |
| `POST` | `/`                                        | `{ arId, contactDate, method, result, notes, nextFollowUp }` |
| `GET`  | `/{id}`                                    | Collection detail with history                               |

## Data Model (V45-V48)

**V45**: `ALTER TABLE sales_documents ADD COLUMN due_date DATE NULL, ADD COLUMN is_credit_sale BOOLEAN DEFAULT FALSE`. Migration script: recalcular totales para documentos DRAFT con items.  
**V46**: `accounts_receivable(id UUID PK, client_id UUID FK→third_parties, invoice_id UUID FK→sales_documents NULLABLE, total_amount NUMERIC(15,2), paid_amount NUMERIC(15,2) DEFAULT 0, outstanding NUMERIC(15,2), due_date DATE, status VARCHAR(20) DEFAULT 'OPEN', created_at TIMESTAMP, updated_at TIMESTAMP)`. CHECK: status IN (OPEN, PARTIAL, PAID, OVERDUE).  
**V47**: `customer_receipts(id UUID PK, client_id UUID FK→third_parties, amount NUMERIC(15,2), payment_date DATE, method VARCHAR(20), reference VARCHAR(100), notes TEXT, created_by VARCHAR(100), created_at TIMESTAMP)`. `receipt_applications(receipt_id UUID FK→customer_receipts, ar_id UUID FK→accounts_receivable, applied_amount NUMERIC(15,2), PK(receipt_id, ar_id))`.  
**V48**: `collection_attempts(id UUID PK, client_id UUID FK→third_parties, ar_id UUID FK→accounts_receivable, due_date DATE, contact_date DATE, method VARCHAR(20), result VARCHAR(30), notes TEXT, next_follow_up DATE, assigned_to VARCHAR(100), created_at TIMESTAMP)`. CHECK: method IN (CALL, EMAIL, VISIT, WHATSAPP), result IN (PROMISE_TO_PAY, NO_ANSWER, DISPUTED, PAID).

## Route Design

```typescript
{
  path: 'ventas',
  loadComponent: () => import('./features/ventas/ventas').then(m => m.VentasComponent),
  children: [
    { path: 'documentos', children: [
      { path: '', loadComponent: () => import('./features/ventas/documentos/doc-list')... },
      { path: 'nuevo', loadComponent: () => import('./features/ventas/documentos/doc-form')... },
      { path: ':id', loadComponent: () => import('./features/ventas/documentos/doc-detail')... },
    ]},
    { path: 'clientes', children: [
      { path: '', loadComponent: () => import('./features/ventas/clientes/client-list')... },
      { path: 'nuevo', loadComponent: () => import('./features/ventas/clientes/client-form')... },
      { path: ':id', loadComponent: () => import('./features/ventas/clientes/client-form')... },
    ]},
    { path: 'cxc', loadComponent: () => import('./features/ventas/cxc/cxc-list')... },
    { path: 'recibos', children: [
      { path: '', loadComponent: () => import('./features/ventas/recibos/receipt-list')... },
      { path: 'nuevo', loadComponent: () => import('./features/ventas/recibos/receipt-form')... },
    ]},
    { path: 'estados', loadComponent: () => import('./features/ventas/estados/statement')... },
    { path: 'cobranzas', loadComponent: () => import('./features/ventas/cobranzas/collection-list')... },
    { path: '', redirectTo: 'documentos', pathMatch: 'full' },
  ],
}
```

**Shell menu**: replace "Créditos"→"Documentos" (route: `/ventas/documentos`). Enable all 6 ventas children incrementally as slices deliver (S1: Documentos enabled; S2: Clientes enabled; S3: CxC; S4: Recibos; S5: Estados; S6: Cobranzas).

## Testing Strategy

| Layer          | What                                                                                | Approach                         |
| -------------- | ----------------------------------------------------------------------------------- | -------------------------------- |
| Unit FE        | Document totals display, aging bucket color coding                                  | Vitest + signal assertions       |
| Unit BE        | `recalculateDocumentTotals`, credit validation, aging calculation                   | JUnit 5 + Mockito                |
| Integration BE | CxC auto-create on ISSUED, receipt apply flow, statement aggregation                | @SpringBootTest + Testcontainers |
| E2E            | Complete credit sale: client→invoice→CxC created→receipt applied→statement balanced | Playwright                       |

## Migration / Rollout

- V45 (dueDate, isCreditSale) → V46 (CxC) → V47 (receipts) → V48 (collections), sequential
- V45 recalcula totales para documentos DRAFT existentes (totalAmount=0 → suma de items)
- Rollback: `flyway undo` + revert `ManageSalesDocumentUseCase` (no DB damage on DRAFT docs)
- Shell.ts: enable menu items per-slice (disabled:false as each delivers)

## Open Questions

- [ ] `isCreditSale` flag: should this be on the document or inferred from `type=INVOICE && client != null`?
- [ ] Aging: use `due_date` or `created_at` as aging start? Proposal says `dueDate` — confirm.
- [ ] CxC auto-create for SENT→INVOICED transition. Is this path correct? The current transition graph allows SENT→DRAFT→(ACCEPTED/REJECTED already). Should "PAID" also be allowed from ISSUED?
