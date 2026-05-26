# Tasks: Sprint 11 — Devoluciones POS e Intereses de mora

## Phase 1: Foundation — DB & Domain Models (ambos slices)

- [ ] 1.1 [BE] `resources/db/migration/V55__add_credit_note_type.sql` — DROP old CHECK, ADD new constraint with `CREDIT_NOTE`; include `reason VARCHAR` column on `sales_documents`
- [ ] 1.2 [BE] `resources/db/migration/V56__ar_interest_fields.sql` — ADD `interest_rate NUMERIC(5,2)`, `interest_amount NUMERIC(15,2) DEFAULT 0`, `last_interest_calc_date DATE`
- [ ] 1.3 [BE] `resources/db/migration/V57__company_interest_config.sql` — ADD `moratory_interest_rate`, `interest_grace_days`, `interest_compound_frequency`
- [ ] 1.4 [BE] `domain/model/SalesDocumentType.java` — add `CREDIT_NOTE`
- [ ] 1.5 [BE] `domain/model/AccountsReceivable.java` — add `interestRate`, `interestAmount`, `lastInterestCalcDate` + domain/repository `findOverdueBeforeGrace(today, graceDays)`
- [ ] 1.6 [BE] `domain/model/CompanyConfig.java` — add `moratoryInterestRate`, `interestGraceDays`, `interestCompoundFrequency`
- [ ] 1.7 [BE] Persistence layer: update `AccountsReceivableEntity`, `CompanyConfigEntity`, `AccountsReceivableMapper`, `CompanyConfigMapper` — map new columns

> ⚠️ Depends on: 1.1–1.3 (migrations must run first). Required by all downstream phases.

## Phase 2: Slice 1 Backend — PosDevolutionUseCase

- [ ] 2.1 [BE] `application/usecase/DevolutionRequest.java` — DTO: `invoiceId`, `items[{productId, quantity}]`, `reason`
- [ ] 2.2 [BE] `application/usecase/DevolutionResponse.java` — DTO: `creditNoteId`, `documentNumber`, `totalAmount`, `reversedItems`, `arAdjustment`
- [ ] 2.3 [BE] `application/usecase/PosDevolutionUseCase.java` — validate invoice (exists, ISSUED, no prior credit note), validate items (belong to invoice, qty ≤ original), create CREDIT_NOTE with negative items + sourceDocumentId, delegate to RecordMovementUseCase.record(ENTRY, DEVOLUTION) per item, reduce AR.outstanding if credit sale
- [ ] 2.4 [BE] `infrastructure/adapters/in/rest/PosController.java` — `POST /api/v1/pos/devolutions`, `GET /api/v1/pos/devolutions?invoiceId=`

> ⚠️ Depends on: Phase 1. Cross-slice dependency: Phase 3 frontend depends on this endpoint.

## Phase 3: Slice 1 Frontend — PosDevolutionComponent

- [ ] 3.1 [FE] `src/app/core/models/sale.model.ts` — add `CREDIT_NOTE` to `SALES_DOCUMENT_TYPE`; `src/app/core/services/devolution.service.ts` — `httpResource` with `submit(request)` (POST) + `getByInvoice(id)` (GET)
- [ ] 3.2 [FE] `src/app/features/pos/devoluciones/pos-devolution.ts` — PosDevolutionComponent: invoice search, item grid with `devolverCantidad` inputs per item, `motivo` field, submit handler calling DevolutionService; Swal on success/error
- [ ] 3.3 [FE] `src/app/features/pos/devoluciones/pos-devolution.html` — split-screen layout: invoice lookup panel + items table + devolution summary + submit button; `src/app/features/pos/devoluciones/pos-devolution.css` — styles
- [ ] 3.4 [FE] `src/app/app.routes.ts` — add `{ path: 'pos/devoluciones', loadComponent: () => import('...PosDevolutionComponent') }`; `src/app/layout/shell/shell.ts` line 79 — remove `disabled: true` on Devoluciones menu item

> ⚠️ Depends on: Phase 2 endpoint. Cross-slice dependency: none.

## Phase 4: Slice 2 Backend — InterestCalculationService

- [ ] 4.1 [BE] `application/usecase/InterestCalculationResponse.java` — DTO: `processedCount`, `totalInterestAccrued`, `skippedCount`
- [ ] 4.2 [BE] `application/usecase/InterestCalculationService.java` — batch `calculateOverdueInterest()`: find all OVERDUE where `dueDate+graceDays < today`, skip if `lastInterestCalcDate == today`, rate = `AR.interestRate ?? config.moratoryRate`, compute interest (MONTHLY compound), update `interestAmount` + `lastInterestCalcDate`; `@Scheduled(cron="0 0 2 * * ?")`
- [ ] 4.3 [BE] `application/usecase/AccountsReceivableUseCase.java` — integrate `InterestCalculationService` in `markOverdue()`; `application/usecase/CompanyConfigUseCase.java` — map 3 new interest fields
- [ ] 4.4 [BE] `application/dto/AccountsReceivableResponse.java` — add `interestAmount`, `lastInterestCalcDate`; `application/dto/CompanyConfigRequest.java` + `CompanyConfigResponse.java` — add 3 interest fields
- [ ] 4.5 [BE] `infrastructure/adapters/in/rest/CxcController.java` — `POST /api/v1/cxc/calculate-interest`, `GET /api/v1/cxc/intereses?clientId=`

> ⚠️ Depends on: Phase 1. Cross-slice dependency: Phase 5 frontend depends on these endpoints.

## Phase 5: Slice 2 Frontend — Intereses UI

- [ ] 5.1 [FE] `src/app/core/models/company-config.model.ts` — add `moratoryInterestRate`, `interestGraceDays`, `interestCompoundFrequency` to request/response interfaces; `src/app/core/services/company-config.service.ts` — map new fields
- [ ] 5.2 [FE] `src/app/features/admin/company/company-form.ts` + `.html` — add form controls: `moratoryInterestRate` (number), `interestGraceDays` (number), `interestCompoundFrequency` (select: NONE/DAILY/MONTHLY)
- [ ] 5.3 [FE] `src/app/core/models/cxc.model.ts` — add `interestAmount`, `lastInterestCalcDate` to `AccountsReceivable`; `src/app/core/services/cxc.service.ts` — add `calculateInterest()` (POST) + `getIntereses(clientId)` (GET)
- [ ] 5.4 [FE] `src/app/features/ventas/cxc/cxc-list.ts` + `.html` — add "Interés acumulado" column (currency), add "Calcular intereses" button in header (disabled while in-flight), Swal confirmation with `{affectedCount, totalInterestAccrued}`, refresh list

> ⚠️ Depends on: Phase 4 endpoints.

## Phase 6: Testing

- [ ] 6.1 [BE] Unit test `PosDevolutionUseCase` — invoice not found → 404, qty exceeds original → 400, full devolution restores stock, partial devolution skips non-returned items, credit sale reduces AR.outstanding
- [ ] 6.2 [BE] Unit test `InterestCalculationService` — AR without own rate uses CompanyConfig fallback, AR with own rate prevails, same-day guard skips, graceDays respected, batch processes all eligible
- [ ] 6.3 [FE] Unit test `DevolutionService` — submit calls correct POST URL; test `CxcService.calculateInterest` calls correct endpoint
