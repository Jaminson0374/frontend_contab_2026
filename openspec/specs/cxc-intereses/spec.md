# Delta for CxC — Intereses de Mora

## ADDED Requirements

| ID          | Requirement                                                                                                   | Strength |
| ----------- | ------------------------------------------------------------------------------------------------------------- | -------- |
| REQ-CXC-090 | Campos de interés en AccountsReceivable: interestRate, interestAmount, lastInterestCalcDate                   | MUST     |
| REQ-CXC-091 | Configuración de interés en CompanyConfig: moratoryInterestRate, interestGraceDays, interestCompoundFrequency | MUST     |
| REQ-CXC-092 | Cálculo de interés simple (compoundFrequency=NONE) sobre saldo vencido                                        | MUST     |
| REQ-CXC-093 | Cálculo de interés compuesto mensual o diario                                                                 | MUST     |
| REQ-CXC-094 | Guardia de fecha: no recalcular si lastInterestCalcDate == today                                              | MUST     |
| REQ-CXC-095 | Precedencia de tasa: AR.interestRate > CompanyConfig.moratoryInterestRate                                     | MUST     |
| REQ-CXC-096 | Endpoint manual POST /api/v1/cxc/calculate-interest                                                           | MUST     |
| REQ-CXC-097 | Ejecución programada diaria a las 2:00 AM vía scheduler                                                       | SHOULD   |
| REQ-CXC-098 | Frontend company-form: campos moratoryInterestRate, interestGraceDays, interestCompoundFrequency              | MUST     |
| REQ-CXC-099 | Frontend cxc-list: columna interés acumulado y botón calcular intereses                                       | MUST     |

---

### REQ-CXC-090 — Campos de Interés en AccountsReceivable

`AccountsReceivable` MUST include `interestRate` (NUMERIC(5,2), nullable), `interestAmount` (NUMERIC(15,2) DEFAULT 0), and `lastInterestCalcDate` (DATE, nullable). These SHALL be exposed in API responses.

#### Scenario: CxC con interés acumulado

- GIVEN an OVERDUE AR with outstanding=1,000,000, moratory rate=3%, 30 days past due
- WHEN interest has been calculated
- THEN `interestAmount > 0`, `lastInterestCalcDate` reflects the calculation date
- AND GET /api/v1/cxc returns these fields in the response

---

### REQ-CXC-091 — Configuración de Intereses en CompanyConfig

`CompanyConfig` MUST include `moratoryInterestRate` (NUMERIC(5,2) DEFAULT 0), `interestGraceDays` (INT DEFAULT 0), and `interestCompoundFrequency` (VARCHAR DEFAULT 'MONTHLY', allowed: NONE, DAILY, MONTHLY).

#### Scenario: Guardar y consultar configuración

- GIVEN admin saves moratoryInterestRate=2.5, graceDays=5, compoundFrequency=MONTHLY
- WHEN GET /api/v1/company-config is called
- THEN response includes those three fields with the saved values

---

### REQ-CXC-092 — Cálculo de Interés Simple

When `compoundFrequency = 'NONE'`, `InterestCalculationService` MUST compute simple interest: `principal × (rate / 100) × (days / 30)`, where days = days elapsed since `max(dueDate + graceDays, lastCalcDate)`.

#### Scenario: Interés simple mensual

- GIVEN AR outstanding=1,000,000, rate=3%, lastCalcDate=15 days ago, graceDays=0
- WHEN calculateOverdueInterest() runs
- THEN interestAmount increases by 1,000,000 × 0.03 × (15/30) = 15,000
- AND lastInterestCalcDate = today

#### Scenario: Período de gracia respetado

- GIVEN AR dueDate=10 days ago, graceDays=15
- WHEN calculation runs
- THEN this AR is skipped (grace period not exhausted)

---

### REQ-CXC-093 — Cálculo de Interés Compuesto

When `compoundFrequency = 'MONTHLY'`, interest MUST compound: `outstanding(today) = outstanding(prev) × (1 + rate/100)^months`. For `DAILY`: `(1 + rate/100)^(days/30)`.

#### Scenario: Interés compuesto mensual

- GIVEN AR outstanding=1,000,000, rate=3%, lastCalcDate=65 days ago
- WHEN calculation runs with compoundFrequency=MONTHLY
- THEN months = floor(65/30) = 2, interest accrued ≈ 60,900
- AND lastInterestCalcDate = today

---

### REQ-CXC-094 — Guardia de Fecha

The service MUST skip any AR where `lastInterestCalcDate == today` to prevent double-counting when manual trigger overlaps with the scheduler.

#### Scenario: Salto por mismo día

- GIVEN AR-001 was calculated today (lastInterestCalcDate = today)
- WHEN calculateOverdueInterest() runs again
- THEN AR-001 is skipped; interestAmount unchanged

---

### REQ-CXC-095 — Precedencia de Tasa de Interés

If `accounts_receivable.interestRate` IS NOT NULL, it MUST be used. Otherwise, `company_config.moratoryInterestRate` SHALL be the fallback.

#### Scenario: Tasa individual por CxC

- GIVEN company_config.moratoryInterestRate=2%, AR-A.interestRate=NULL, AR-B.interestRate=5%
- WHEN interest calculation runs
- THEN AR-A uses 2%, AR-B uses 5%

---

### REQ-CXC-096 — Disparo Manual de Cálculo

`POST /api/v1/cxc/calculate-interest` MUST trigger `calculateOverdueInterest()` on all OVERDUE ARs where `dueDate + graceDays < today`. Response SHALL include affected count and total interest accrued.

#### Scenario: Cálculo manual

- GIVEN 5 OVERDUE ARs, 3 past grace period
- WHEN POST /api/v1/cxc/calculate-interest is called
- THEN response: `{ affectedCount: 3, totalInterestAccrued: <sum> }`
- AND the 2 ARs still within grace period are skipped

---

### REQ-CXC-097 — Ejecución Programada

`InterestCalculationService.calculateOverdueInterest()` SHOULD be invoked daily at 2:00 AM via `@Scheduled(cron="0 0 2 * * ?")`. `AccountsReceivableUseCase.markOverdue()` MAY also trigger it.

#### Scenario: Job nocturno

- GIVEN it is 2:00 AM and 10 ARs are past grace period
- WHEN the cron job fires
- THEN interest is calculated for all 10, respecting the same-day guard

---

### REQ-CXC-098 — Formulario de Empresa Extendido (Frontend)

`CompanyFormComponent` MUST add form fields: `moratoryInterestRate` (number input), `interestGraceDays` (number input), and `interestCompoundFrequency` (select: NONE/DAILY/MONTHLY).

#### Scenario: Guardar configuración de intereses

- GIVEN user opens `/administracion/empresa` and fills moratoryInterestRate=2.5, graceDays=5, compoundFrequency=MONTHLY
- WHEN user clicks "Guardar configuración"
- THEN CompanyConfig is updated and Swal shows success confirmation

---

### REQ-CXC-099 — Lista CxC con Intereses (Frontend)

`CxcListComponent` MUST add column "Interés acumulado" showing `interestAmount` formatted as currency. A "Calcular intereses" button in the list header MUST call `POST /api/v1/cxc/calculate-interest` and refresh the data.

#### Scenario: Visualización y cálculo desde lista

- GIVEN CxC list shows ARs, some OVERDUE
- WHEN user clicks "Calcular intereses"
- THEN interest is calculated; Swal confirms `{ affectedCount, totalInterestAccrued }`
- AND the list refreshes with updated `interestAmount` values

#### Scenario: Doble clic prevenido

- GIVEN user clicks "Calcular intereses" twice within 5 seconds
- WHEN the first request is still in-flight
- THEN the second click is ignored (button disabled while request is pending)
