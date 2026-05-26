# Tasks: Sprint 8 — Ventas: Clientes, Crédito, CxC y Cobranzas

## Slice 1: Sales Docs UI + Bugfix de Totales

- [x] [BE] 1.1 Migration V46+V47: V46 recalculates DRAFT sales_document totals from items; V47 ALTER TABLE ADD due_date DATE, is_credit_sale BOOLEAN (2 files: `db/migration/V46__recalculate_sales_document_totals.sql`, `db/migration/V47__add_sales_doc_credit_fields.sql`)
- [x] [BE] 1.2 `SalesDocument.java` record: add `dueDate` (LocalDate) and `isCreditSale` (Boolean) with defaults (1 file: `domain/model/SalesDocument.java`)
- [x] [BE] 1.3 `SalesDocumentEntity.java`: add `dueDate` column + `isCreditSale` column (1 file: `infrastructure/.../persistence/SalesDocumentEntity.java`)
- [x] [BE] 1.4 `SalesDocumentResponse.java`: add `dueDate` and `isCreditSale` fields. Also updated `SalesDocumentRequest.java` and `SalesDocumentMapper.java` (3 files: DTOs + mapper)
- [x] [BE] 1.5 `ManageSalesDocumentUseCase.java`: extracted `recalculateDocumentTotals()` (copies `PosCheckoutUseCase.calculateTotals()` pattern), called after addItem/updateItem/removeItem. Added credit validation on INVOICE ISSUED with isCreditSale=true. Fixed `PosCheckoutUseCase` constructor calls. CxC auto-create + stock decrement on ISSUED ← pending Slice 3 (1 file: `application/usecase/ManageSalesDocumentUseCase.java`)
- [x] [FE] 1.6 `ventas-layout.ts` + `ventas-layout.html` wrapper with `<router-outlet />` (copy compras.ts pattern) (2 files: `src/app/features/ventas/ventas-layout.ts` + `.html`)
- [x] [FE] 1.7 `sale.model.ts`: added `dueDate?: string | null` and `isCreditSale?: boolean` to SalesDocument (1 file: `src/app/core/models/sale.model.ts`)
- [x] [FE] 1.8 `sales-document-list.ts` + `.html` + `.css`: paginated table with type/status/search filters, chip colors per status (3 files: `src/app/features/ventas/document-list/`)
- [x] [FE] 1.9 `sales-document-detail.ts` + `.html` + `.css`: items table, totals panel, status badge, transition buttons (3 files: `src/app/features/ventas/document-detail/`)
- [ ] [FE] 1.10 `doc-form.ts` + `doc-form.html`: create/edit QUOTE/ORDER with item FormArray — deferred (route redirects to list for now)
- [x] [FE] 1.11 `app.routes.ts`: added `/ventas` lazy route group with children for documentos (list/detail/nuevo) and redirects for clientes/cxc/recibos/estados/cobranzas (1 file: `src/app/app.routes.ts`)
- [x] [FE] 1.12 `shell.ts`: renamed "Créditos"→"Documentos" (route: `/ventas/documentos`), removed disabled:true from ALL ventas children (1 file: `src/app/layout/shell/shell.ts`)

## Slice 2: Clientes CRUD UI

- [x] [FE] 2.1 `client-list.ts` + `client-list.html`: ThirdParty list filtered type=CLIENT, search by name/NIT, pagination using existing ThirdPartyService (3 files: `src/app/features/ventas/clientes/client-list.ts` + `.html` + `.css`)
- [x] [FE] 2.2 `client-form.ts` + `client-form.html`: create/edit CLIENT with creditLimit, creditDays fields, currentBalance read-only. Reuse ThirdPartyService create/update. (3 files: `src/app/features/ventas/clientes/client-form.ts` + `.html` + `.css`)
- [x] [FE] 2.3 `shell.ts`: enable "Clientes" menu item (disabled:false) — already enabled, no change needed (0 files). Routes added in `app.routes.ts`.

## Slice 3: CxC Module

- [x] [BE] 3.1 Migration V48: `accounts_receivable` table (id UUID PK, client_id FK, document_id FK, total_amount, paid_amount, outstanding, due_date, status, created_at, updated_at) (1 file: `src/main/resources/db/migration/V48__create_accounts_receivable.sql`)
- [x] [BE] 3.2 `AccountsReceivable.java` domain record (1 file: `domain/model/AccountsReceivable.java`)
- [x] [BE] 3.3 `AccountsReceivableRepository.java` port interface: findByClientId, findByStatus, findOverdueBefore (aging) (1 file: `domain/repository/AccountsReceivableRepository.java`)
- [x] [BE] 3.4 `AccountsReceivableEntity.java` JPA entity + `AccountsReceivableJpaRepository.java` Spring Data (2 files: `infrastructure/.../persistence/` + mapper + adapter — 4 files total in persistence)
- [x] [BE] 3.5 `AccountsReceivableMapper.java` MapStruct + `AccountsReceivableRepositoryAdapter.java` (2 files: `infrastructure/.../persistence/AccountsReceivableMapper.java` + `AccountsReceivableRepositoryAdapter.java`)
- [x] [BE] 3.6 `AccountsReceivableResponse.java` + `ArAgingResponse.java` DTOs (2 files: `application/dto/AccountsReceivableResponse.java` + `ArAgingResponse.java`)
- [x] [BE] 3.7 `AccountsReceivableUseCase.java`: create CxC, list with filters, aging buckets, applyPayment, markOverdue (1 file: `application/usecase/AccountsReceivableUseCase.java`)
- [x] [BE] 3.8 `AccountsReceivableController.java` REST endpoints: GET list, GET aging, GET /{id} (1 file: `infrastructure/.../rest/AccountsReceivableController.java`)
- [x] [FE] 3.9 `cxc.model.ts`: AccountsReceivable, AgingBucket, ArAgingResponse interfaces (1 file: `src/app/core/models/cxc.model.ts`)
- [x] [FE] 3.10 `cxc.service.ts`: httpResource for list, getById, getAging (1 file: `src/app/core/services/cxc.service.ts`)
- [x] [FE] 3.11 `cxc-list.ts` + `cxc-list.html` + `cxc-list.css`: table with client/status filters, aging summary cards (0-30 green, 31-60 yellow, 61-90 orange, 90+ red) (3 files: `src/app/features/ventas/cxc/`)
- [x] [FE] 3.12 `shell.ts`: "CxC" menu item was already enabled (no `disabled: true`). Verified — no change needed.
- [x] [BE] 3.8b Integration: `ManageSalesDocumentUseCase.java` modified to inject `AccountsReceivableUseCase`, call `createFromInvoice()` on INVOICE ISSUED with `isCreditSale=true`, and decrement stock on ISSUED (1 file modify)

## Slice 4: Recibos de Caja

- [ ] [BE] 4.1 Migration V48: `customer_receipts` (id, client_id, amount, payment_date, method, reference, notes, created_by, created_at) + `receipt_applications` (receipt_id, ar_id, applied_amount, PK composite) (1 file: `src/main/resources/db/migration/V48__create_customer_receipts.sql`)
- [ ] [BE] 4.2 `CustomerReceipt.java` + `ReceiptApplication.java` domain records (2 files: `domain/model/CustomerReceipt.java` + `domain/model/ReceiptApplication.java`)
- [ ] [BE] 4.3 `CustomerReceiptRepository.java` port interface: CRUD, findByClientId (1 file: `domain/repository/CustomerReceiptRepository.java`)
- [ ] [BE] 4.4 `CustomerReceiptEntity.java` + `ReceiptApplicationEntity.java` JPA entities + `CustomerReceiptJpaRepository.java` + `ReceiptApplicationJpaRepository.java` (4 files: `infrastructure/.../persistence/`)
- [ ] [BE] 4.5 `CustomerReceiptMapper.java` + `CustomerReceiptRepositoryAdapter.java` (2 files: `infrastructure/.../persistence/`)
- [ ] [BE] 4.6 `CustomerReceiptRequest.java` + `CustomerReceiptResponse.java` DTOs (2 files: `application/dto/`)
- [ ] [BE] 4.7 `CreateCustomerReceiptUseCase.java`: create receipt, apply to CxC oldest-first, reduce AccountsReceivable.balance + ThirdParty.currentBalance (1 file: `application/usecase/CreateCustomerReceiptUseCase.java`)
- [ ] [BE] 4.8 `CustomerReceiptController.java`: POST /, GET list, GET /{id} (1 file: `infrastructure/.../rest/CustomerReceiptController.java`)
- [ ] [FE] 4.9 `customer-receipt.model.ts`: CustomerReceipt, ReceiptApplication interfaces (1 file: `src/app/core/models/customer-receipt.model.ts`)
- [ ] [FE] 4.10 `customer-receipt.service.ts`: httpResource CRUD + apply endpoint (1 file: `src/app/core/services/customer-receipt.service.ts`)
- [ ] [FE] 4.11 `receipt-list.ts` + `receipt-list.html`: paginated list with client/date filters (2 files: `src/app/features/ventas/recibos/receipt-list.ts` + `.html`)
- [ ] [FE] 4.12 `receipt-form.ts` + `receipt-form.html`: client selector, amount, method (CASH/TRANSFER/CHECK/DEPOSIT), CxC apply grid (copy pago-form pattern) (2 files: `src/app/features/ventas/recibos/receipt-form.ts` + `.html`)
- [ ] [FE] 4.13 `shell.ts`: enable "Recibos de caja" menu item (1 file: `src/app/layout/shell/shell.ts`)

## Slice 5: Estados de Cuenta

- [ ] [BE] 5.1 `CustomerStatementResponse.java`: client info, period, opening balance, movement rows, closing balance (1 file: `application/dto/CustomerStatementResponse.java`)
- [ ] [BE] 5.2 `CustomerStatementUseCase.java`: read-only aggregate: invoices ISSUED (+) + receipts applied (−) = balance. Query sales_documents (status ISSUED/PAID) + customer_receipts + receipt_applications. (1 file: `application/usecase/CustomerStatementUseCase.java`)
- [ ] [BE] 5.3 `CustomerStatementController.java`: GET /api/v1/customer-statements/{clientId}?from=&to= (1 file: `infrastructure/.../rest/CustomerStatementController.java`)
- [ ] [FE] 5.4 `statement.service.ts` or extend `cxc.service.ts` with statement endpoint (same file used for CxC) (modify: `src/app/core/services/cxc.service.ts`)
- [ ] [FE] 5.5 `statement.ts` + `statement.html`: client selector dropdown, date range picker, summary card (opening, charges, credits, closing), movement detail table (2 files: `src/app/features/ventas/estados/statement.ts` + `.html`)
- [ ] [FE] 5.6 `shell.ts`: enable "Estados de cuenta" menu item (1 file: `src/app/layout/shell/shell.ts`)

## Slice 6: Cobranzas

- [ ] [BE] 6.1 Migration V49: `collection_attempts` table (id UUID PK, client_id FK, ar_id FK, due_date, contact_date, method, result, notes, next_follow_up, assigned_to, created_at). CHECK constraints: method IN (CALL,EMAIL,VISIT,WHATSAPP), result IN (PROMISE_TO_PAY,NO_ANSWER,DISPUTED,PAID). (1 file: `src/main/resources/db/migration/V49__create_collection_attempts.sql`)
- [ ] [BE] 6.2 `CollectionAttempt.java` domain record (1 file: `domain/model/CollectionAttempt.java`)
- [ ] [BE] 6.3 `CollectionAttemptRepository.java` port: findByArId, findByClientId, findOverdue (due_date < NOW AND status != PAID) (1 file: `domain/repository/CollectionAttemptRepository.java`)
- [ ] [BE] 6.4 `CollectionAttemptEntity.java` + `CollectionAttemptJpaRepository.java` (2 files: `infrastructure/.../persistence/`)
- [ ] [BE] 6.5 `CollectionAttemptMapper.java` + `CollectionAttemptRepositoryAdapter.java` (2 files: `infrastructure/.../persistence/`)
- [ ] [BE] 6.6 `CollectionAttemptRequest.java` + `CollectionAttemptResponse.java` DTOs (2 files: `application/dto/`)
- [ ] [BE] 6.7 `ManageCollectionsUseCase.java`: list overdue, log contact attempt, update status (1 file: `application/usecase/ManageCollectionsUseCase.java`)
- [ ] [BE] 6.8 `CollectionController.java`: GET list (filters: clientId, status, from, to), POST /, GET /{id} (1 file: `infrastructure/.../rest/CollectionController.java`)
- [ ] [FE] 6.9 `collection.model.ts`: CollectionAttempt interface with overdue indicator helpers (1 file: `src/app/core/models/collection.model.ts`)
- [ ] [FE] 6.10 `collection.service.ts`: httpResource list, log contact (1 file: `src/app/core/services/collection.service.ts`)
- [ ] [FE] 6.11 `collection-list.ts` + `collection-list.html`: overdue indicators (30d yellow, 60d orange, 90d+ red), client/status filters, contact log dialog/modal (2 files: `src/app/features/ventas/cobranzas/collection-list.ts` + `.html`)
- [ ] [FE] 6.12 `shell.ts`: enable "Cobranzas" menu item (1 file: `src/app/layout/shell/shell.ts`)
