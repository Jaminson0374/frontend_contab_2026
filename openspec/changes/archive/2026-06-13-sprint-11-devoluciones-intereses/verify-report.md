# Verification Report

**Change**: sprint-11-devoluciones-intereses
**Version**: N/A
**Mode**: Strict TDD
**Date**: 2026-06-13

---

## Completeness

| Metric                                 | Value                                   |
| -------------------------------------- | --------------------------------------- |
| Backend tasks total                    | 14 (1.1–1.7, 2.1–2.4, 4.1–4.5, 6.1–6.2) |
| Backend tasks checked [x] in tasks.md  | 0                                       |
| Frontend tasks total                   | 8 (3.1–3.4, 5.1–5.4)                    |
| Frontend tasks checked [x] in tasks.md | 8                                       |
| Test tasks total                       | 3 (6.1–6.3)                             |
| Test tasks checked [x] in tasks.md     | 1 (6.3 only)                            |
| **Tasks total**                        | **21**                                  |
| **Tasks checked [x]**                  | **9**                                   |
| **Tasks unchecked [ ]**                | **12**                                  |

> ⚠️ **WARNING**: Backend code for all 14 backend tasks exists in the codebase (PosDevolutionUseCase.java, InterestCalculationService.java, controllers, DTOs, migrations, domain models, etc.) but tasks.md has NOT been updated to reflect their completion. This is a documentation hygiene issue, not a code gap.

### Unchecked Tasks

| Task | Description                                    | Code Exists?                                                              |
| ---- | ---------------------------------------------- | ------------------------------------------------------------------------- |
| 1.1  | V55 migration                                  | ✅ `V55__add_credit_note_type.sql`                                        |
| 1.2  | V56 migration                                  | ✅ `V56__add_interest_fields_ar.sql`                                      |
| 1.3  | V57 migration                                  | ✅ `V57__add_interest_config.sql`                                         |
| 1.4  | SalesDocumentType +CREDIT_NOTE                 | ✅ `SalesDocumentType.java`                                               |
| 1.5  | AccountsReceivable +interest fields + repo     | ✅ `AccountsReceivable.java`, `AccountsReceivableRepository.java`         |
| 1.6  | CompanyConfig +interest fields                 | ✅ `CompanyConfig.java`                                                   |
| 1.7  | Persistence layer entities/mappers             | ✅ Entity and mapper files exist                                          |
| 2.1  | DevolutionRequest DTO                          | ✅ `DevolutionRequest.java`                                               |
| 2.2  | DevolutionResponse DTO                         | ✅ `DevolutionResponse.java`                                              |
| 2.3  | PosDevolutionUseCase                           | ✅ `PosDevolutionUseCase.java` (314 lines)                                |
| 2.4  | PosController endpoints                        | ✅ `POST /devolutions` + `GET /devolutions`                               |
| 4.1  | InterestCalculationResponse DTO                | ✅ `InterestCalculationResponse.java`                                     |
| 4.2  | InterestCalculationService                     | ✅ `InterestCalculationService.java` (239 lines)                          |
| 4.3  | AR UseCase + CompanyConfig UseCase integration | ✅ `AccountsReceivableUseCase.java` line 139, `CompanyConfigUseCase.java` |
| 4.4  | DTOs extended                                  | ✅ `AccountsReceivableResponse.java`, `CompanyConfig*.java`               |
| 4.5  | AccountsReceivableController endpoints         | ✅ `POST /calculate-interest` + `GET /intereses`                          |
| 6.1  | PosDevolutionUseCaseTest                       | ✅ `PosDevolutionUseCaseTest.java` (447 lines, 9 tests)                   |
| 6.2  | InterestCalculationServiceTest                 | ✅ `InterestCalculationServiceTest.java` (372 lines, 14 tests)            |

---

## Build & Tests Execution

**Build**: ➖ Skipped (orchestrator directive: "Do NOT build or run tests")
**Tests**: ➖ Skipped (orchestrator directive)
**Type Check**: ➖ Skipped (orchestrator directive)
**Coverage**: ➖ Skipped (orchestrator directive)

> Static analysis only. All test files verified to exist with meaningful assertions (see Assertion Quality).

---

## TDD Compliance

| Check                         | Result      | Details                                                                                                                                                          |
| ----------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TDD Evidence reported         | ❌ CRITICAL | No TDD Cycle Evidence table found in apply-progress artifacts (only Task 6.3 documented). Strict TDD was enabled but apply did not report TDD evidence protocol. |
| All tasks have tests          | ⚠️ Partial  | Backend tests exist (6.1, 6.2) + Frontend tests (6.3). Tasks checked off in tasks.md have tests. Unchecked backend tasks have tests but tasks aren't marked.     |
| RED confirmed (tests exist)   | ✅          | 3 backend + 2 frontend test files verified on disk                                                                                                               |
| GREEN confirmed (tests pass)  | ➖          | Not executed per orchestrator directive                                                                                                                          |
| Triangulation adequate        | ✅          | PosDevolutionUseCase: 9 scenarios. InterestCalculationService: 14 scenarios                                                                                      |
| Safety Net for modified files | ➖          | Cannot verify without execution                                                                                                                                  |

**TDD Compliance**: ⚠️ Apply phase did not follow the Strict TDD evidence protocol, but test files exist and cover all major scenarios.

---

## Test Layer Distribution

| Layer                              | Tests  | Files | Tools                     |
| ---------------------------------- | ------ | ----- | ------------------------- |
| Unit (Backend - JUnit 5 + Mockito) | 9      | 1     | JUnit 5, Mockito, AssertJ |
| Unit (Backend - JUnit 5 + Mockito) | 14     | 1     | JUnit 5, Mockito, AssertJ |
| Unit (Frontend - Vitest)           | 6      | 1     | Vitest + Angular TestBed  |
| Unit (Frontend - Vitest)           | 9      | 1     | Vitest + Angular TestBed  |
| Integration                        | 0      | 0     | Not available             |
| E2E                                | 0      | 0     | Not available             |
| **Total**                          | **38** | **4** |                           |

---

## Assertion Quality

| File                         | Line | Assertion                      | Issue                                                                        | Severity |
| ---------------------------- | ---- | ------------------------------ | ---------------------------------------------------------------------------- | -------- |
| `pos-devolution.ts`          | 268  | `response.totalReturned`       | **Field name mismatch** — backend returns `totalAmount`, not `totalReturned` | CRITICAL |
| `pos-devolution.ts`          | 269  | `response.stockReversed`       | **Field does not exist** in backend `DevolutionResponse`                     | CRITICAL |
| `devolution.service.spec.ts` | 26   | `expect(service).toBeTruthy()` | Type-only assertion — trivial                                                | WARNING  |
| `cxc.service.spec.ts`        | 27   | `expect(service).toBeTruthy()` | Type-only assertion — trivial                                                | WARNING  |

**Assertion quality**: 2 CRITICAL (field mismatches will cause runtime failures), 2 WARNING (trivial assertions)

---

## Quality Metrics

| Tool         | Result                              |
| ------------ | ----------------------------------- |
| Linter       | ➖ Not available                    |
| Type Checker | ➖ Skipped (orchestrator directive) |

---

## Spec Compliance Matrix

### Slice 1 — Devoluciones POS

| Requirement | Scenario                                      | Test                                                                                                                                            | Result                                                                                                                                             |
| ----------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-POS-080 | Persistir nota crédito                        | `SalesDocumentType.java` line 7 — `CREDIT_NOTE` in enum. `V55.sql` — CHECK constraint includes `CREDIT_NOTE`                                    | ✅ IMPLEMENTED                                                                                                                                     |
| REQ-POS-081 | Reversión completa de factura                 | `PosDevolutionUseCaseTest.java` line 196 `fullDevolution_restoresStockAndCreatesCreditNote()`                                                   | ✅ IMPLEMENTED                                                                                                                                     |
| REQ-POS-082 | Subset de ítems y cantidades                  | `PosDevolutionUseCaseTest.java` line 288 `partialDevolution_cashSale_doesNotAdjustAR()` — verifies only selected items                          | ✅ IMPLEMENTED                                                                                                                                     |
| REQ-POS-082 | Cantidad cero en un ítem                      | `PosDevolutionUseCase.java` line 92-95 — qty ≤ 0 → BusinessException "mayor a cero"                                                             | ⚠️ PARTIAL — `qty=0` is rejected, but spec says "treated as not returned" (excluded), not an error                                                 |
| REQ-POS-083 | Reducción de saldo pendiente (full)           | `PosDevolutionUseCaseTest.java` line 340 `creditSaleDevolution_reducesARAndThirdPartyBalance()`                                                 | ✅ IMPLEMENTED                                                                                                                                     |
| REQ-POS-083 | Factura parcialmente pagada (paidAmount=200k) | Not directly tested in PosDevolutionUseCaseTest. `pos-devolution.ts` uses `formatCurrency` but backend test scenario 9 only covers paidAmount=0 | ⚠️ PARTIAL — No test for partial payment scenario; code handles it via `ar.outstanding().min(totalReturned)`                                       |
| REQ-POS-084 | Factura inexistente                           | `PosDevolutionUseCaseTest.java` line 74 `invoiceNotFound_throwsResourceNotFoundException()`                                                     | ✅ IMPLEMENTED                                                                                                                                     |
| REQ-POS-084 | Factura ya acreditada                         | `PosDevolutionUseCaseTest.java` line 129 `invoiceAlreadyHasCreditNote_throwsBusinessException()`                                                | ✅ IMPLEMENTED                                                                                                                                     |
| REQ-POS-084 | Factura no emitida (ORDER)                    | `PosDevolutionUseCaseTest.java` line 91 `invoiceIsOrder_throwsBusinessException()`                                                              | ✅ IMPLEMENTED                                                                                                                                     |
| REQ-POS-084 | Factura no ISSUED (DRAFT)                     | `PosDevolutionUseCaseTest.java` line 110 `invoiceNotIssued_throwsBusinessException()`                                                           | ✅ IMPLEMENTED                                                                                                                                     |
| REQ-POS-085 | Cantidad excede la original                   | `PosDevolutionUseCaseTest.java` line 174 `quantityExceedsOriginal_throwsBusinessException()`                                                    | ✅ IMPLEMENTED                                                                                                                                     |
| REQ-POS-085 | Ítem no pertenece a la factura                | `PosDevolutionUseCaseTest.java` line 151 `itemNotInInvoice_throwsBusinessException()`                                                           | ✅ IMPLEMENTED                                                                                                                                     |
| REQ-POS-086 | Entrada por devolución (kardex)               | `PosDevolutionUseCase.java` line 195-202 — `recordMovement.record()` with `MovementType.RETURN`                                                 | ⚠️ PARTIAL — Uses `RETURN` not `ENTRY` as specified. `record()` called with correct params (product, batch, warehouse, qty, costs)                 |
| REQ-POS-087 | Búsqueda y carga de factura                   | `pos-devolution.ts` line 60-174 — search field, loadItems, item grid                                                                            | ✅ IMPLEMENTED                                                                                                                                     |
| REQ-POS-087 | Factura no encontrada en UI                   | `pos-devolution.ts` line 101 — `invoiceError.set('No se encontraron...')`                                                                       | ✅ IMPLEMENTED                                                                                                                                     |
| REQ-POS-087 | Submit exitoso                                | `pos-devolution.ts` line 203-288 — Swal confirmation, POST, success message                                                                     | ⚠️ PARTIAL — Uses `response.totalReturned` which doesn't match backend DTO field `totalAmount`. Uses `response.stockReversed` which doesn't exist. |
| REQ-POS-088 | Navegación desde menú POS                     | `shell.ts` line 77-80 — `Devoluciones` item (no `disabled`), `app.routes.ts` line 333-338 — `/pos/devoluciones` route                           | ✅ IMPLEMENTED                                                                                                                                     |

### Slice 2 — Intereses de Mora

| Requirement | Scenario                                | Test                                                                                                                                                      | Result                                                                                                                                                        |
| ----------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-CXC-090 | CxC con interés acumulado               | `AccountsReceivable.java` line 19-21 — 3 fields. `AccountsReceivableResponse.java` line 23-25 — exposed in API                                            | ✅ IMPLEMENTED                                                                                                                                                |
| REQ-CXC-091 | Guardar y consultar configuración       | `CompanyConfig.java` line 18-20 — 3 fields. `CompanyConfigRequest.java` line 20-22. `CompanyConfigResponse.java` line 20-22                               | ✅ IMPLEMENTED                                                                                                                                                |
| REQ-CXC-092 | Interés simple mensual                  | `InterestCalculationServiceTest.java` line 47 `arWithoutOwnRate_usesCompanyConfigFallback()` — verify 15,000 = 1M × 0.03 × 15/30                          | ✅ IMPLEMENTED                                                                                                                                                |
| REQ-CXC-092 | Período de gracia respetado             | `InterestCalculationServiceTest.java` line 157 `graceDays_flowsFromConfigToRepositoryCall()` — verify graceDays=15 passed to repo                         | ✅ IMPLEMENTED                                                                                                                                                |
| REQ-CXC-093 | Interés compuesto mensual (65 días)     | `InterestCalculationServiceTest.java` line 240 `compoundMonthly_calculatesCorrectly()` — 65 days = 2 months, verify 60,900                                | ✅ IMPLEMENTED                                                                                                                                                |
| REQ-CXC-093 | Interés compuesto diario                | `InterestCalculationService.java` line 225-238 `computeCompoundDaily()` — uses `Math.pow` with fractional exponent                                        | ✅ IMPLEMENTED                                                                                                                                                |
| REQ-CXC-094 | Salto por mismo día                     | `InterestCalculationServiceTest.java` line 128 `sameDayGuard_skipsArAlreadyCalculatedToday()`                                                             | ✅ IMPLEMENTED                                                                                                                                                |
| REQ-CXC-095 | Tasa individual por CxC                 | `InterestCalculationServiceTest.java` line 80 `arWithOwnRate_prevailsOverCompanyConfig()` — AR-A uses 2%, AR-B uses 5%                                    | ✅ IMPLEMENTED                                                                                                                                                |
| REQ-CXC-096 | Cálculo manual (endpoint)               | `AccountsReceivableController.java` line 61-65 `POST /calculate-interest`. `InterestCalculationService.java` line 157-160 `calculateAllOverdueInterest()` | ⚠️ PARTIAL — Frontend calls `/api/v1/cxc/calculate-interest` but backend controller is at `/api/v1/accounts-receivable/calculate-interest` — **URL MISMATCH** |
| REQ-CXC-097 | Job nocturno (scheduler)                | `InterestCalculationService.java` line 47 `@Scheduled(cron = "0 0 2 * * ?")`                                                                              | ✅ IMPLEMENTED                                                                                                                                                |
| REQ-CXC-097 | markOverdue integration                 | `AccountsReceivableUseCase.java` line 138-140 — `if (count > 0) interestCalculationService.calculateOverdueInterest()`                                    | ✅ IMPLEMENTED                                                                                                                                                |
| REQ-CXC-098 | Guardar configuración de intereses (FE) | `company-form.ts` line 51-53 — 3 form controls. `company-form.html` line 89-108 — 3 input fields with select for frequency                                | ✅ IMPLEMENTED                                                                                                                                                |
| REQ-CXC-099 | Visualización y cálculo desde lista     | `cxc-list.ts` line 62 — `intereses` column, line 186-221 `calculateInterest()`. `cxc-list.html` line 50-62 — button, line 118-129 — column                | ⚠️ PARTIAL — Frontend calls `/api/v1/cxc/calculate-interest` but backend is at `/api/v1/accounts-receivable/calculate-interest` — **URL MISMATCH**            |
| REQ-CXC-099 | Doble clic prevenido                    | `cxc-list.ts` line 54 — `[disabled]="calculatingInterest()"` on button. `calculatingInterest` set true before request, false in finally                   | ✅ IMPLEMENTED                                                                                                                                                |

---

## Correctness (Static — Structural Evidence)

| Requirement                                        | Status         | Notes                                                                                                                               |
| -------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| REQ-POS-080: CREDIT_NOTE in SalesDocumentType + DB | ✅ Implemented | `SalesDocumentType.java` line 7, `V55__add_credit_note_type.sql` line 3                                                             |
| REQ-POS-081: Full devolution                       | ✅ Implemented | `PosDevolutionUseCase.java` lines 62-277, creates CN with negative amounts, sourceDocumentId, stock reversal                        |
| REQ-POS-082: Partial devolution                    | ✅ Implemented | lines 90-124 — filter items, validate qty ≤ original                                                                                |
| REQ-POS-083: AR adjustment for credit sales        | ✅ Implemented | lines 214-259 — reduce AR.outstanding + ThirdParty.currentBalance                                                                   |
| REQ-POS-084: Invoice validation                    | ✅ Implemented | lines 66-83 — INVOICE type, ISSUED status, no prior CN                                                                              |
| REQ-POS-085: Item validation                       | ✅ Implemented | lines 90-108 — belongs to invoice, qty ≤ original                                                                                   |
| REQ-POS-086: Stock reversal via kardex             | ⚠️ Partial     | `MovementType.RETURN` used instead of `ENTRY` as specified. Stock increment + recordMovement.record() called correctly.             |
| REQ-POS-087: PosDevolutionComponent                | ⚠️ Partial     | Component exists but uses `response.totalReturned` + `response.stockReversed` — mismatched with backend `DevolutionResponse` fields |
| REQ-POS-088: Route + shell                         | ✅ Implemented | `app.routes.ts` line 333, `shell.ts` line 77-80 (no `disabled: true`)                                                               |
| REQ-CXC-090: AR interest fields                    | ✅ Implemented | `AccountsReceivable.java` lines 19-21                                                                                               |
| REQ-CXC-091: CompanyConfig interest fields         | ✅ Implemented | `CompanyConfig.java` lines 18-20                                                                                                    |
| REQ-CXC-092: Simple interest                       | ✅ Implemented | `InterestCalculationService.java` lines 194-201 `computeSimple()`                                                                   |
| REQ-CXC-093: Compound interest                     | ✅ Implemented | `computeCompoundMonthly()` lines 207-219, `computeCompoundDaily()` lines 225-238                                                    |
| REQ-CXC-094: Same-day guard                        | ✅ Implemented | `InterestCalculationService.java` lines 97-100                                                                                      |
| REQ-CXC-095: Rate precedence                       | ✅ Implemented | lines 103-106 — null-coalescing                                                                                                     |
| REQ-CXC-096: Manual trigger endpoint               | ⚠️ Partial     | Backend endpoint exists. Frontend calls wrong URL (`/api/v1/cxc` vs `/api/v1/accounts-receivable`)                                  |
| REQ-CXC-097: Scheduler                             | ✅ Implemented | `@Scheduled(cron = "0 0 2 * * ?")` line 47. markOverdue() integration line 138-140                                                  |
| REQ-CXC-098: Company form FE                       | ✅ Implemented | 3 form controls in TS, 3 input fields in HTML                                                                                       |
| REQ-CXC-099: CxC list FE                           | ⚠️ Partial     | UI exists. Same URL mismatch as REQ-CXC-096                                                                                         |

---

## Coherence (Design)

| #   | Decision                                                             | Followed?   | Notes                                                                                                                                        |
| --- | -------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | CREDIT_NOTE as SalesDocumentType (Option A)                          | ✅ Yes      | `SalesDocumentType.java` line 7                                                                                                              |
| 2   | Reuse SaleItem with negative qty (Option A)                          | ✅ Yes      | `PosDevolutionUseCase.java` line 118 — `qty.negate()`                                                                                        |
| 3   | PosDevolutionUseCase calls RecordMovementUseCase directly (Option A) | ✅ Yes      | line 195 `recordMovement.record(...)`                                                                                                        |
| 4   | Reduce AR.outstanding (Option A)                                     | ✅ Yes      | lines 214-260                                                                                                                                |
| 5   | Null-coalescing rate precedence                                      | ✅ Yes      | `InterestCalculationService.java` lines 103-106                                                                                              |
| 6   | Batch on OVERDUE ARs (Option A)                                      | ✅ Yes      | `calculateOverdueInterest()` processes all eligible                                                                                          |
| 7   | MONTHLY only (Option A)                                              | ⚠️ Deviated | `InterestCalculationService.java` implements NONE, DAILY, and MONTHLY. DAILY was added beyond the Decision 7 which said "MONTHLY únicamente" |
| 8   | Split-screen UX (Option A)                                           | ✅ Yes      | `pos-devolution.html` — left panel (invoice viewer) + right panel (devolution form)                                                          |

---

## Issues Found

### CRITICAL (must fix before archive)

1. **API URL Mismatch — CxcController path**: Frontend `cxc.service.ts` calls:
   - `POST /api/v1/cxc/calculate-interest` (line 88)
   - `GET /api/v1/cxc/intereses` (line 91)

   But the backend `AccountsReceivableController.java` maps to:
   - `@RequestMapping("/api/v1/accounts-receivable")` → `POST /api/v1/accounts-receivable/calculate-interest` (line 61)

   **These will NEVER match.** The frontend will get 404 at runtime. Fix: either change the frontend base URL to `/api/v1/accounts-receivable` or change the controller `@RequestMapping` to `/api/v1/cxc`.

2. **Frontend DevolutionResponse field mismatch**: `pos-devolution.ts` line 268-269 uses:
   - `response.totalReturned` — but backend `DevolutionResponse.java` has `totalAmount`, not `totalReturned`
   - `response.stockReversed` — field does NOT exist in backend DTO

   The backend returns: `creditNoteId`, `documentNumber`, `totalAmount`, `reversedItems`, `arAdjustment`. Frontend interface has: `creditNoteId`, `documentNumber`, `items`, `totalReturned`, `stockReversed`, `totalAmount`, `reversedItems`, `arAdjustment`.

   `totalReturned` is used in line 268 for display but backend has `totalAmount`. `stockReversed` is used in line 269 but doesn't exist in backend response.

3. **MovementType: RETURN vs ENTRY**: Spec REQ-POS-086 requires `MovementType.ENTRY` with reason `DEVOLUTION`. Code uses `MovementType.RETURN` (line 197). Design.md says ENTRY. This deviates from spec and design.

### WARNING (should fix)

4. **Tasks.md not updated**: 12 backend tasks remain unchecked despite code existing for all of them. This is a documentation hygiene issue.

5. **Frontend DevolutionResponse includes `items` field not in backend**: The `devolution.model.ts` interface includes `items: DevolutionItemResponse[]` but the backend `DevolutionResponse` returns no items array.

6. **No test for partial payment AR scenario**: REQ-POS-083 "Factura parcialmente pagada" scenario has no dedicated test. Code handles it with `ar.outstanding().min(totalReturned)` (line 219), which is correct, but untested.

7. **qty=0 treated as error, not skip**: REQ-POS-082 "Cantidad cero en un ítem" says "treated as not returned" (excluded from credit note). The implementation rejects qty ≤ 0 with an error instead of silently excluding it.

### SUGGESTION (nice to have)

8. **Company config backend returns flat object, not wrapped**: The `CompanyConfigResponse` includes `createdAt`/`updatedAt` which aren't in the spec, but this is standard API convention.

9. **InterestCalculationService uses `findOverdueBefore` pattern not `findOverdueBeforeGrace`**: The repo method `findOverdueBeforeGrace` calculates `today - graceDays` internally, which works but adds complexity to the JPA query vs. doing it in the repo adapter.

---

## Verdict

**FAIL** — 3 CRITICAL issues must be resolved before archive.

**Summary**: Backend implementation is functionally complete and well-tested (9 + 14 unit tests with meaningful assertions). Frontend UI components are implemented. However, 3 blocking issues exist: (1) API URL mismatch between frontend CxcService (`/api/v1/cxc`) and backend controller (`/api/v1/accounts-receivable`), (2) frontend DevolutionResponse fields don't match backend DTO (`totalReturned` vs `totalAmount`, nonexistent `stockReversed`), and (3) kardex uses `MovementType.RETURN` instead of `ENTRY` as specified. Tasks.md needs updating to reflect actual completion of backend work. Frontend Phase 3 and 5 tasks (all 8) are correctly checked off. Test coverage is strong with 38 total test cases across 4 test files.
