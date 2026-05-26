# Tasks: Sprint 10 — Anticipos y Notas débito/crédito

## Phase 1: Anticipos — Backend (Slice 1 BE)

- [ ] 1.1 [BE] Create `.../db/migration/V53__add_advance_to_payments.sql` — ALTER payments + CREATE advance_applications
- [ ] 1.2 [BE] Create `domain/model/AdvanceApplication.java` — record: id, advanceId, invoiceId, appliedAmount, date, version
- [ ] 1.3 [BE] Modify `domain/model/Payment.java` — add `Boolean isAdvance`, `BigDecimal remainingAdvance`
- [ ] 1.4 [BE] Create `domain/service/SupplierBalanceService.java` — extracted `updateBalance(supplierId, delta)` logic from PaymentUseCase + SupplierInvoiceUseCase
- [ ] 1.5 [BE] Modify `application/dto/PaymentRequest.java` — add `isAdvance` field (default=false)
- [ ] 1.6 [BE] Modify `application/dto/PaymentResponse.java` — add `isAdvance`, `remainingAdvance`
- [ ] 1.7 [BE] Create `application/dto/ApplyAdvanceRequest.java` — record with `List<ApplicationInput>`
- [ ] 1.8 [BE] Create `application/dto/ApplyAdvanceResponse.java` — response with updated remainingAdvance + applications
- [ ] 1.9 [BE] Modify `application/usecase/PaymentUseCase.java` — advance path: skip invoice validation, set remainingAdvance=amount, delegate balance to SupplierBalanceService; refactor existing `updateSupplierBalance` to use injected service
- [ ] 1.10 [BE] Modify `application/usecase/SupplierInvoiceUseCase.java` — replace private `updateSupplierBalance` with `SupplierBalanceService` injection
- [ ] 1.11 [BE] Create `application/usecase/ApplyAdvanceUseCase.java` — apply advance to invoices: validate supplier, status, remaining; decrement remainingAdvance; update invoice status; atomic `@Transactional` + `@Auditable`
- [ ] 1.12 [BE] Modify `domain/repository/PaymentRepository.java` — add `findByIsAdvanceTrue(Pageable)`
- [ ] 1.13 [BE] Modify `.../persistence/PaymentEntity.java` — add `isAdvance`, `remainingAdvance` columns
- [ ] 1.14 [BE] Modify `.../persistence/PaymentJpaRepository.java` — add `findByIsAdvanceTrue(Pageable)`
- [ ] 1.15 [BE] Create `.../persistence/AdvanceApplicationEntity.java` — JPA entity
- [ ] 1.16 [BE] Create `.../persistence/AdvanceApplicationJpaRepository.java` — Spring Data JPA
- [ ] 1.17 [BE] Modify `.../rest/PaymentController.java` — `isAdvance` query param filter, `POST /{id}/apply` endpoint, `@Auditable` on apply

## Phase 2: Anticipos — Frontend (Slice 1 FE)

- [ ] 2.1 [FE] Create `core/models/advance.model.ts` — AdvancePayment, ApplyAdvanceRequest interface
- [ ] 2.2 [FE] Create `core/services/advance.service.ts` — `httpResource` GET advances, POST create, POST apply
- [ ] 2.3 [FE] Create `.../compras/anticipos/advance-list/advance-list.{ts,html,css}` — MatTable: supplier, amount, remaining, date; filter; "Aplicar" button opens dialog
- [ ] 2.4 [FE] Create `.../compras/anticipos/advance-form/advance-form.{ts,html,css}` — ReactiveForm: supplier selector, amount, date; `isAdvance=true` implicit
- [ ] 2.5 [FE] Create `.../compras/anticipos/apply-advance-dialog/apply-advance-dialog.{ts,html}` — MatDialog: supplier PENDING/RECONCILED invoices with amount inputs
- [ ] 2.6 [FE] Modify `app.routes.ts` — add `/compras/anticipos` → AdvanceListComponent, `anticipos/nuevo` → AdvanceFormComponent (lazy)
- [ ] 2.7 [FE] Modify `layout/shell/shell.ts` — add NavChild "Anticipos" → `/compras/anticipos` in Compras children

## Phase 3: Notas débito/crédito — Backend (Slice 2 BE)

> Depends on: 1.4 `SupplierBalanceService` (shared)

- [x] 3.1 [BE] Create `.../db/migration/V54__create_debit_credit_notes.sql` — CREATE TABLE with CHECK type IN ('DEBIT_NOTE','CREDIT_NOTE')
- [x] 3.2 [BE] Create `domain/model/DebitCreditNote.java` — record: id, supplierId, invoiceId?, type, amount, reason, reference, createdBy, createdAt, updatedAt, version
- [x] 3.3 [BE] Create `domain/repository/DebitCreditNoteRepository.java` — port: save, findById, findAll, findBySupplierId, deleteById
- [x] 3.4 [BE] Create `application/dto/DebitCreditNoteRequest.java` — validation: type CHECK, amount>0
- [x] 3.5 [BE] Create `application/dto/DebitCreditNoteResponse.java` — response with supplierName resolved
- [x] 3.6 [BE] Create `application/usecase/ManageDebitCreditNoteUseCase.java` — CRUD + SupplierBalanceService balance adjustment (DEBIT +, CREDIT −); `@Transactional` + `@Auditable`
- [x] 3.7 [BE] Create `.../persistence/DebitCreditNoteEntity.java` — JPA entity
- [x] 3.8 [BE] Create `.../persistence/DebitCreditNoteJpaRepository.java` — Spring Data JPA
- [x] 3.9 [BE] Create `.../persistence/DebitCreditNoteMapper.java` — MapStruct toDomain/toEntity
- [x] 3.10 [BE] Create `.../persistence/DebitCreditNoteRepositoryAdapter.java` — implements port
- [x] 3.11 [BE] Create `.../rest/DebitCreditNoteController.java` — CRUD endpoints + `@PreAuthorize`

## Phase 4: Notas débito/crédito — Frontend (Slice 2 FE)

- [x] 4.1 [FE] Create `core/models/debit-credit-note.model.ts` — DebitCreditNote interface
- [x] 4.2 [FE] Create `core/services/supplier-note.service.ts` — `httpResource` GET, Observables POST/PUT/DELETE
- [x] 4.3 [FE] Create `.../compras/notas/nota-list.{ts,html,css}` — MatTable: type badge, supplier, invoice, amount, reason, date; filter; edit/delete actions
- [x] 4.4 [FE] Create `.../compras/notas/nota-form.{ts,html,css}` — ReactiveForm: type toggle, supplier autocomplete, optional invoice, amount, reason
- [x] 4.5 [FE] Modify `app.routes.ts` — add `/compras/notas` → NotaListComponent, `notas/nuevo` → NotaFormComponent (lazy)
- [x] 4.6 [FE] Modify `layout/shell/shell.ts` — add NavChild "Notas débito/crédito" → `/compras/notas` in Compras children
