# Reportes Specification

## Purpose

Módulo de reportes con PostgreSQL como motor de agregación, chart.js + ng2-charts, xlsx para exportación Excel. Acceso exclusivo ADMIN y CONTADOR. 5 reportes en 2 slices.

## Requirements

| ID          | Requirement                          | Endpoint / Source                                                                      | Key Scenarios                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------- | ------------------------------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-REP-100 | Historial de clientes compuesto      | `StatementService.generate()`, `CxcService.getAging()`, `CxcService.list()` (existing) | **Happy**: cliente con facturas+pagos → dashboard con totales, tabla facturas, tabla pagos, pie chart aging 0-30/31-60/61-90/90+. **Empty**: cliente sin movimientos → totales $0, tablas vacías con "Sin movimientos".                                                                                                                                                                                        |
| REQ-REP-101 | Ventas por producto top 10           | `GET /api/v1/reports/sales-by-product?from=&to=`                                       | **Normal**: 15 productos vendidos → tabla 15 filas (productName, qty, revenue, cost, grossMargin, margin%), bar chart solo top 10, sort revenue desc. **Empty**: sin ventas → array `[]`, mensaje "No hay ventas en el período".                                                                                                                                                                               |
| REQ-REP-102 | Ventas por corte/período             | `GET /api/v1/reports/sales-by-period?from=&to=&granularity=`                           | **Daily**: 22 días hábiles → line chart con 22 puntos, tabla fecha+total, días $0 incluidos. **Switch**: granularity DAY→MONTH → reagrupa `DATE_TRUNC`, tabla 1 fila/mes. **Params**: `from`, `to` obligatorios, `granularity` enum DAY\|WEEK\|MONTH default DAY.                                                                                                                                              |
| REQ-REP-120 | Rentabilidad producto/categoría      | `GET /api/v1/reports/profitability?from=&to=&groupBy=`                                 | **Matched**: JOIN `sales_document_items`↔`kardex_movements` usando `unit_cost` del EXIT más cercano a `issued_at` → revenue, COGS, grossMargin, margin%. **Unmatched**: producto sin mov. EXIT → COGS=$0, margin%=100%, nota "Sin costo registrado — verificar kardex". **groupBy**: `product`\|`category` default `product`.                                                                                  |
| REQ-REP-121 | Estado de resultados P&L operacional | `GET /api/v1/reports/income-statement?from=&to=`                                       | **Profitable**: Revenue=$500K − COGS $300K = Gross $200K − Expenses $50K = Net $150K. **Loss**: COGS+Expenses > Revenue → Net Income rojo + ícono warning. **Calc**: Revenue=`SUM(sales_documents total WHERE ISSUED)`, COGS=`SUM(kardex unit_cost*qty WHERE EXIT,PRODUCTION_CONSUMPTION)`, Expenses=`SUM(accounts_payable paid_amount WHERE PAID)`, Net=Revenue−COGS−Expenses. Excluye SHRINKAGE, DEVOLUTION. |

**All 5 reports MUST include**: Angular Material Table, date range filter (from/to required), button "Exportar Excel" using `XLSX.utils.json_to_sheet()` + `XLSX.writeFile()` per existing pattern in `desposte-manual.ts`.

| ID          | Requirement        | Scenarios                                                                                                                                                                                                                                                                |
| ----------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| REQ-REP-200 | Navegación y roles | **ADMIN/CONTADOR**: acceden a `/reportes/ventas` (tabs: Por producto, Por corte), `/reportes/rentabilidad`, `/reportes/clientes`, `/reportes/financieros`. Shell: `disabled: true` removido por slice. **VENDEDOR**: 403/redirect → dashboard, menú Reportes no visible. |

### Slice Assignment

| Slice         | REQs                  | Items                                                                                        |
| ------------- | --------------------- | -------------------------------------------------------------------------------------------- |
| S1 Quick Wins | REQ-REP-100, 101, 102 | 3 pantallas, 2 endpoints nuevos, 4 items menú habilitados (`/reportes/ventas` cubre 101+102) |
| S2 Analytics  | REQ-REP-120, 121      | 2 pantallas, 2 endpoints nuevos, 2 items menú habilitados                                    |

## Edge Cases

| Concern                                  | Handling                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| Cost-matching impreciso (PEPS vs exacto) | `unit_cost` del EXIT más cercano — gerencial, no contable (Riesgo #1)                       |
| Queries lentas en tablas grandes         | `from→to` obligatorio, paginación backend, índices existentes `(product_id, movement_date)` |
| COGS incluye mermas/producción           | Filtrar solo `EXIT` + `PRODUCTION_CONSUMPTION`; excluir `SHRINKAGE`, `DEVOLUTION`           |
| ng2-charts vs Angular 21                 | Verificar compatibilidad; fallback: chart.js directo con `ViewChild` + canvas               |
