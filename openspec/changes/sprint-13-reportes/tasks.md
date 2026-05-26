# Tasks: Sprint 13 — Reportes

## Phase 1: S1 Backend — Quick Wins Endpoints

- [BE] 1.1 Create `domain/repository/ReportRepository.java` — interface with 4 method signatures: `findSalesByProduct`, `findSalesByPeriod`, `findProfitability`, `getIncomeStatement`
- [BE] 1.2 Create `application/dto/SalesByProductRow.java` and `SalesByPeriodRow.java` — DTOs matching API contracts in design.md
- [BE] 1.3 Create `application/usecase/ReportUseCase.java` — injects `ReportRepository`, delegates S1 queries, validates `from`/`to` required
- [BE] 1.4 Create `infrastructure/adapters/out/persistence/JdbcReportRepository.java` — `JdbcTemplate` with S1 native SQL: `GROUP BY product`, `DATE_TRUNC` period, `from`/`to` filtering
- [BE] 1.5 Create `infrastructure/adapters/in/rest/ReportController.java` — `GET /sales-by-product?from=&to=`, `GET /sales-by-period?from=&to=&granularity=`

## Phase 2: S1 Frontend — Ventas + Historial Clientes

- [FE] 2.1 Install chart.js: `npm install chart.js` (update `package.json`)
- [FE] 2.2 Create `src/app/core/models/report.model.ts` — interfaces: `SalesByProductRow`, `SalesByPeriodRow`, `ProfitabilityRow`, `IncomeStatement`
- [FE] 2.3 Create `src/app/core/services/report.service.ts` — `httpResource` with `isPlatformBrowser` guard for `salesByProduct`, `salesByPeriod`; copy pattern from `cxc.service.ts`
- [FE] 2.4 Create `src/app/features/reportes/reportes-layout.ts` (inline template `<router-outlet />`) — copy `ventas-layout.ts` pattern
- [FE] 2.5 Create `src/app/features/reportes/ventas-reportes/ventas-reportes.ts/.html/.css` — MatTabs "Por producto" (bar chart.js) + "Por período" (line chart.js + granularity select), MatTables, DateRangePicker, Excel export via `xlsx` pattern from `desposte-manual.ts:596-601`
- [FE] 2.6 Create `src/app/features/reportes/client-history/client-history.ts/.html/.css` — client autocomplete, 4 composed sections from `StatementService` + `CxcService` + `CollectionService`, pie chart.js for aging, timeline cobranzas, per-section Excel export
- [FE] 2.7 Modify `src/app/app.routes.ts` — add lazy routes: `/reportes` → `reportes-layout` with children `/ventas` → `ventas-reportes`, `/clientes` → `client-history`
- [FE] 2.8 Modify `src/app/layout/shell/shell.ts` — remove `disabled: true` from lines 193, 199, 205, 211 (4 reportes menu items)

## Phase 3: S2 Backend — Profitability + Income Statement

- [BE] 3.1 Create `application/dto/ProfitabilityRow.java` and `IncomeStatementResponse.java`
- [BE] 3.2 Extend `JdbcReportRepository.java` — add S2 queries: profitability (JOIN kardex EXIT nearest cost), income statement (Revenue − COGS − Expenses)
- [BE] 3.3 Extend `ReportUseCase.java` — add `findProfitability(from, to, groupBy)` and `getIncomeStatement(from, to)` methods
- [BE] 3.4 Extend `ReportController.java` — add `GET /profitability?from=&to=&groupBy=`, `GET /income-statement?from=&to=`

## Phase 4: S2 Frontend — Rentabilidad + Financieros

- [FE] 4.1 Extend `report.service.ts` — add `profitability` and `incomeStatement` httpResource methods
- [FE] 4.2 Create `src/app/features/reportes/profitability/profitability.ts/.html/.css` — bar chart.js + MatTable (revenue, COGS, margin%), category/product filter, DateRangePicker, Excel export
- [FE] 4.3 Create `src/app/features/reportes/income-statement/income-statement.ts/.html/.css` — P&L MatTable (Revenue − COGS − Expenses = Net), loss condition red + warning icon, DateRangePicker, Excel export
- [FE] 4.4 Modify `app.routes.ts` — add lazy routes for `/reportes/rentabilidad` → `profitability`, `/reportes/financieros` → `income-statement`

## Phase 5: Testing

- [FE/BE] 5.1 Unit: `ReportService` — mock HttpClient, verify 4 GET with correct query params
- [FE] 5.2 Unit: `ventas-reportes` — mock ViewChild canvas, verify chart.js `effect()` guards isPlatformBrowser
- [FE] 5.3 Unit: `client-history` — mock 3 services, verify 4 sections render with mocked data
- [FE] 5.4 Unit: Excel export — mock XLSX, verify `json_to_sheet` + `writeFile` called with displayed data
- [FE] 5.5 Integration: TestBed `compileComponents()` + mock services, test tab switching in ventas-reportes, client selection triggers service calls
- [BE] 5.6 Unit: `ReportUseCase` — mock ReportRepository, verify date range propagation, granularity enum
- [BE] 5.7 Integration: `@SpringBootTest` + `TestRestTemplate` — assert 4 endpoints JSON shape, test empty range, invalid granularity, unmatched cost edge case
