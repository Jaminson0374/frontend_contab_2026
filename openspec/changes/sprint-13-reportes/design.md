# Design: Sprint 13 — Reportes

## Technical Approach

Add 4 report endpoints to a single `ReportController` (backend) with PostgreSQL-native aggregation (`GROUP BY`, `DATE_TRUNC`, `SUM`). Frontend follows existing pattern: lazy standalone components under `features/reportes/`, signals + `httpResource`, `isPlatformBrowser` guards for chart.js canvas, client-side Excel export via `xlsx`. Enable 4 disabled shell menu items. Zero schema changes.

## Architecture Decisions

| #   | Decision                    | Choice                                                                                                       | Rejected                                                        | Rationale                                                                                                                                                                                                                                                                               |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **chart.js integration**    | Direct chart.js via `ViewChild` + canvas                                                                     | ng2-charts wrapper                                              | ng2-charts Angular 21 compatibility unverified (risk #4). Direct chart.js gives full config control, smaller bundle, no wrapper indirection. Canvas guarded with `isPlatformBrowser` for SSR.                                                                                           |
| 2   | **Report layout**           | Shell sidenav navigation; `/reportes/ventas` uses internal `MatTabGroup` for "Por producto" \| "Por período" | MatTabs layout like administración; separate pages with sidebar | Ventas reports share date-range picker and export logic — MatTabs within one component avoids duplicating filters. Shell sidebar navigation is already wired (pattern: ventas, compras, inventario). Combining two reports under one route keeps 4 menu items while delivering 5 views. |
| 3   | **Excel export**            | Client-side `XLSX.utils.json_to_sheet` + `XLSX.writeFile`                                                    | Server-side generation                                          | `xlsx` already installed. Proven pattern in `desposte-manual.ts` lines 596–601. No backend overhead, instant export from already-loaded data.                                                                                                                                           |
| 4   | **Date range**              | Request params `from`/`to` (strings)                                                                         | Dedicated DateRangeDTO                                          | Consistent with `StatementService.generate(clientId, from, to)`. Simple, no extra DTO in frontend.                                                                                                                                                                                      |
| 5   | **Historial clientes data** | Compose from 3 existing services: `StatementService`, `CxcService`, `CollectionService`                      | New dedicated endpoint                                          | Reuses Sprint 8 APIs without backend changes. Each service already has `isPlatformBrowser` + `httpResource`. Frontend orchestrates display — aging pie chart from `CxcService.getAging()`, timeline from `CollectionService.collections`.                                               |
| 6   | **SSR compatibility**       | `isPlatformBrowser` guard + `httpResource` returns `undefined` on server                                     | `afterNextRender`                                               | Consistent with all 30+ existing services in the codebase. `httpResource` already short-circuits on server (pattern: `if (!isPlatformBrowser(this.platformId)) return undefined`). Canvas renders empty div on server, chart.js activates on client via `effect()`.                     |
| 7   | **Backend controller**      | Single `ReportController` with 4 endpoints                                                                   | Separate controllers per report                                 | Proposal prescribes single controller. All 4 endpoints share `JdbcTemplate` via `JdbcReportRepository`. Hex: controller → use case → repository port → JDBC adapter.                                                                                                                    |
| 8   | **Income statement**        | Single `GET /api/v1/reports/income-statement`                                                                | Separate revenue/COGS/expenses endpoints                        | Backend computes Revenue − COGS − Expenses = Net in one query. Frontend receives ready-to-render summary table. No client-side composition needed.                                                                                                                                      |

## Data Flow

```
ReportService (httpResource)                      Shell sidenav
       │                                              │
       │ GET /api/v1/reports/sales-by-product         │ /reportes/ventas
       │ GET /api/v1/reports/sales-by-period          │ /reportes/clientes
       │ GET /api/v1/reports/profitability            │ /reportes/rentabilidad
       │ GET /api/v1/reports/income-statement         │ /reportes/financieros
       │                                              │
       ▼                                              ▼
  ReportComponent ──chart.js──▶ <canvas>     StatementService ──▶ CustomerStatement
       │                                              │
       └──xlsx──▶ Excel export               CxcService ──▶ ArAgingResponse
                                              CollectionService ──▶ CollectionEntry[]
```

## API Contracts

### `GET /api/v1/reports/sales-by-product?from=&to=`

```json
[
  {
    "productId": "uuid",
    "productName": "string",
    "quantitySold": "number",
    "totalRevenue": "number",
    "totalCost": "number",
    "grossMargin": "number",
    "marginPercent": "number"
  }
]
```

### `GET /api/v1/reports/sales-by-period?from=&to=&granularity=DAY|WEEK|MONTH`

```json
[
  {
    "period": "2025-05-01",
    "documentCount": "int",
    "totalRevenue": "number",
    "totalItems": "int"
  }
]
```

### `GET /api/v1/reports/profitability?from=&to=`

```json
[
  {
    "productId": "uuid",
    "productName": "string",
    "categoryName": "string",
    "revenue": "number",
    "cogs": "number",
    "grossMargin": "number",
    "marginPercent": "number"
  }
]
```

### `GET /api/v1/reports/income-statement?from=&to=`

```json
{
  "from": "string",
  "to": "string",
  "totalRevenue": "number",
  "totalCogs": "number",
  "totalExpenses": "number",
  "netIncome": "number"
}
```

### Reused existing APIs (Historial clientes)

- `GET /api/v1/customer-statements/{clientId}?from=&to=` → `StatementService`
- `GET /api/v1/accounts-receivable/aging` → `CxcService`
- `GET /api/v1/collections?clientId=` → `CollectionService`

## Component Tree

```
app-shell (sidenav: Reportes children)
└── /reportes → ReportesLayoutComponent (<router-outlet />)
    ├── /reportes/ventas → VentasReportesComponent
    │   ├── DateRangePicker (MatFormField + MatDateRangePicker)
    │   ├── MatTabGroup: "Por producto" | "Por período"
    │   │   ├── Tab: SalesByProductChart (bar chart.js) + MatTable
    │   │   └── Tab: SalesByPeriodChart (line chart.js) + GranularitySelect + MatTable
    │   └── ExportButton (XLSX.writeFile)
    ├── /reportes/clientes → ClientHistoryComponent
    │   ├── ClientAutocomplete (ThirdPartyService)
    │   ├── DateRangePicker
    │   ├── Section: Facturas emitidas (StatementService entries)
    │   ├── Section: Pagos recibidos (StatementService entries)
    │   ├── Section: Aging pie chart (CxcService.getAging)
    │   ├── Section: Timeline cobranzas (CollectionService)
    │   └── ExportButton per section
    ├── /reportes/rentabilidad → ProfitabilityComponent
    │   ├── DateRangePicker + ProductCategoryFilter
    │   ├── ProfitabilityBarChart + MatTable (revenue, COGS, margin)
    │   └── ExportButton
    └── /reportes/financieros → IncomeStatementComponent
        ├── DateRangePicker
        ├── P&L Summary MatTable (Revenue − COGS − Expenses = Net)
        └── ExportButton
```

## File Changes

### Frontend (C:\POS_VTA\posinvent)

| File                                                               | Action | Description                                                                               |
| ------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------- |
| `src/app/features/reportes/reportes-layout.ts`                     | Create | Layout wrapper (`<router-outlet />`) — copy ventas-layout pattern                         |
| `src/app/features/reportes/reportes-layout.html`                   | Create | Single `<router-outlet />`                                                                |
| `src/app/features/reportes/ventas-reportes/ventas-reportes.ts`     | Create | MatTabs: "Por producto" + "Por período"; chart.js via ViewChild                           |
| `src/app/features/reportes/ventas-reportes/ventas-reportes.html`   | Create | DateRangePicker + tabs + canvas + tables                                                  |
| `src/app/features/reportes/ventas-reportes/ventas-reportes.css`    | Create | Canvas sizing, table layout                                                               |
| `src/app/features/reportes/client-history/client-history.ts`       | Create | Client selector, 4 composed sections from 3 services                                      |
| `src/app/features/reportes/client-history/client-history.html`     | Create | Sectioned layout: facturas, pagos, aging pie, timeline                                    |
| `src/app/features/reportes/client-history/client-history.css`      | Create | Section styling                                                                           |
| `src/app/features/reportes/profitability/profitability.ts`         | Create | Bar chart + table; category filter                                                        |
| `src/app/features/reportes/profitability/profitability.html`       | Create | Canvas + MatTable                                                                         |
| `src/app/features/reportes/profitability/profitability.css`        | Create | Layout                                                                                    |
| `src/app/features/reportes/income-statement/income-statement.ts`   | Create | P&L summary from single endpoint                                                          |
| `src/app/features/reportes/income-statement/income-statement.html` | Create | MatTable: Revenue, COGS, Expenses, Net                                                    |
| `src/app/features/reportes/income-statement/income-statement.css`  | Create | Table styling                                                                             |
| `src/app/core/services/report.service.ts`                          | Create | `ReportService` with `httpResource` for 4 report endpoints (PLATFORM_ID guard)            |
| `src/app/core/models/report.model.ts`                              | Create | `SalesByProductRow`, `SalesByPeriodRow`, `ProfitabilityRow`, `IncomeStatement` interfaces |
| `src/app/app.routes.ts`                                            | Modify | +4 lazy routes under `/reportes`                                                          |
| `src/app/layout/shell/shell.ts`                                    | Modify | Remove `disabled: true` from 4 reportes children (lines 193, 199, 205, 211)               |
| `package.json`                                                     | Modify | +`chart.js` dependency                                                                    |

### Backend (C:\POS_VTA\backend_pos-vta)

| File                                               | Action | Description                                                                            |
| -------------------------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| `domain/port/ReportRepository.java`                | Create | Repository interface: 4 query methods                                                  |
| `application/usecase/ReportUseCase.java`           | Create | Orchestrates queries via JdbcReportRepository                                          |
| `infrastructure/adapter/JdbcReportRepository.java` | Create | Native SQL with `JdbcTemplate`: GROUP BY, DATE_TRUNC, JOIN kardex                      |
| `infrastructure/rest/ReportController.java`        | Create | 4 GET endpoints under `/api/v1/reports`                                                |
| `application/dto/` (4 DTOs)                        | Create | `SalesByProductRow`, `SalesByPeriodRow`, `ProfitabilityRow`, `IncomeStatementResponse` |

## Testing Strategy

| Layer                     | What to Test                             | Approach                                                                                                                                      |
| ------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit (frontend)**       | `ReportService` HTTP calls               | Mock `HttpClient`. Verify 4 GET requests with correct query params.                                                                           |
| **Unit (frontend)**       | chart.js initialization                  | Mock `ViewChild` canvas ref. Verify `effect()` only runs chart setup when `isPlatformBrowser` is true.                                        |
| **Unit (frontend)**       | Excel export                             | Verify `XLSX.utils.json_to_sheet` called with displayed data. Mock `XLSX.writeFile`.                                                          |
| **Unit (frontend)**       | `ClientHistoryComponent` composition     | Mock `StatementService`, `CxcService`, `CollectionService`. Verify 4 sections render with mocked data.                                        |
| **Integration**           | Full component render (Vitest + TestBed) | `compileComponents()` + provide mock services. Test tab switching in `VentasReportesComponent`. Test client selection triggers service calls. |
| **Unit (backend)**        | `ReportUseCase` queries                  | Mock `ReportRepository`. Verify correct date range propagation, granularity enum handling.                                                    |
| **Integration (backend)** | `ReportController` endpoints             | `@SpringBootTest` + `TestRestTemplate`. Assert response JSON shape matches DTOs. Test edge: empty date range, invalid granularity.            |

## Migration / Rollout

No migration required — zero schema changes. Rollback: delete `features/reportes/` + `report.service.ts` + `report.model.ts`, revert `app.routes.ts` (remove 4 routes), revert `shell.ts` (re-add `disabled: true`), `npm uninstall chart.js`.

## Open Questions

- [ ] ¿El back de P&L tiene acceso a `accounts_payable` para el total de expenses? La dependencia Sprint 5 (Compras) debe estar desplegada.
- [ ] ¿`granularity=WEEK` en PostgreSQL usa `DATE_TRUNC('week', ...)` con inicio domingo o lunes? Confirmar comportamiento esperado por negocio.
