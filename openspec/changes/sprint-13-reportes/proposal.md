# Sprint 13 — Reportes

## Intención

El shell tiene 4 items de menú "Reportes" completamente inhabilitados (`disabled: true`), sin rutas, sin componentes. El negocio cárnico requiere visibilidad analítica sobre ventas, rentabilidad, comportamiento de clientes y estado financiero operacional para tomar decisiones. Este sprint construye la capa de reportes con PostgreSQL como motor de agregación, chart.js para visualización y xlsx para exportación a Excel, consumiendo endpoints REST existentes donde aplique (customer-statements, AR aging, CxC) y creando nuevos donde no (ventas por producto, rentabilidad, estados financieros).

## Alcance

### Slice 1: Quick Wins 🟢 (~18 tasks)

- **Historial de clientes**: Consume `customer-statements`, `accounts-receivable/aging`, `accounts-receivable` existentes. Nueva pantalla compuesta: facturas emitidas, pagos recibidos, aging actual, timeline de cobranzas. Chart: aging pie chart. Export Excel.
- **Ventas por producto**: Nuevo endpoint `GET /api/v1/reports/sales-by-product?from=&to=`. GROUP BY `product_id` sobre `sales_document_items`. Tabla con: producto, cantidad vendida, ingreso total, costo (kardex), margen bruto, margen %. Bar chart top 10 productos. Export Excel.
- **Ventas por corte/período**: Nuevo endpoint `GET /api/v1/reports/sales-by-period?from=&to=&granularity=`. `DATE_TRUNC` + SUM. Line/bar chart diario/semanal/mensual. Selector de rango de fechas + granularidad. Export Excel.

### Slice 2: Analytics 🟡 (~12 tasks)

- **Rentabilidad**: Servicio de cost-matching. Endpoint `GET /api/v1/reports/profitability?from=&to=`. JOIN `sales_document_items` con `kardex_movements` para obtener costo real por producto vendido. Revenue - COGS = gross margin. Agrupable por producto y categoría. Tabla + bar chart. Export Excel.
- **Estados financieros (P&L operacional)**: Endpoint `GET /api/v1/reports/income-statement?from=&to=`. Revenue total (SUM sales_documents where status=ISSUED) - COGS (SUM kardex EXIT) - Expenses (SUM CxP paid) = Net. Sin balance general. Tabla resumen. Export Excel.

## Fuera de alcance

- PDF server-side generation
- Balance Sheet (no ledger contable)
- Ledger/accounting entries (no existe tabla `accounting_entries`)
- Drill-down interactivo / dashboards dinámicos
- Reportes programados / envío por email
- JasperReports / iText en backend

## Enfoque técnico

- **PostgreSQL como motor de agregación**: Native queries con `GROUP BY`, `DATE_TRUNC`, `SUM`, `AVG`. Sin capa de reporting library en backend.
- **Backend**: Nuevo `ReportController` (`/api/v1/reports`) con endpoints REST que devuelven JSON. `ReportUseCase` con queries nativas vía `JdbcTemplate` (no JPA). Stack: controller → use case → repository (JDBC) → JSON response.
- **Frontend**: `chart.js` + `ng2-charts` para gráficos. Angular Material Table para tablas. `xlsx` ya instalado (patrón en `desposte-manual.ts`: `XLSX.utils.json_to_sheet` + `XLSX.writeFile`). Componentes standalone + signals + `httpResource`. Carpeta `features/reportes/` con 5 componentes (uno por reporte).
- **Arquitectura hexagonal**: `ReportController` → `ReportUseCase` → `ReportRepository` (port) + `JdbcReportRepository` (adapter). Sin entidades JPA — queries directas devuelven DTOs.
- **Roles**: ADMIN y CONTADOR (ya definidos en shell línea 187).

## Áreas afectadas

| Área                                               | Impacto      | Descripción                             |
| -------------------------------------------------- | ------------ | --------------------------------------- |
| `ReportController.java`                            | Nuevo        | 5 endpoints REST bajo `/api/v1/reports` |
| `ReportUseCase.java` + `JdbcReportRepository.java` | Nuevo        | Agregación nativa PostgreSQL            |
| `src/app/features/reportes/`                       | Nuevo        | 5 componentes standalone                |
| `src/app/app.routes.ts`                            | Modificado   | +4 rutas lazy bajo `/reportes/`         |
| `src/app/layout/shell/shell.ts`                    | Modificado   | `disabled: true` → remover en 4 items   |
| `src/app/core/services/statement.service.ts`       | Solo lectura | Reutilizado para historial clientes     |
| `src/app/core/services/cxc.service.ts`             | Solo lectura | Reutilizado para aging                  |
| `package.json`                                     | Modificado   | +chart.js, +ng2-charts                  |

## Riesgos

| #   | Riesgo                                                                               | Prob  | Mitigación                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Cost-matching kardex → sales_document_items es impreciso (PEPS vs unidad específica) | Alta  | Usar `kardex_movements.unit_cost` del movimiento de salida más cercano en fecha al `sales_document.issued_at`. No intentar trazabilidad perfecta — reporte gerencial, no contable. |
| 2   | Queries nativas pesadas sobre tablas transaccionales grandes                         | Media | Índices existentes `(product_id, movement_date)` en kardex. Paginación en backend. Filtro `from→to` obligatorio.                                                                   |
| 3   | COGS en P&L usa EXIT de kardex pero incluye mermas y consumos de producción          | Media | Filtrar solo `MovementType.EXIT` (ventas) y `MovementType.PRODUCTION_CONSUMPTION` (costo industrial). Excluir SHRINKAGE y DEVOLUTION del COGS.                                     |
| 4   | chart.js + ng2-charts incompatibilidad con Angular 21                                | Baja  | Verificar compatibilidad con `ng2-charts@latest` que soporta Angular 19+. Si falla, usar chart.js directamente con `ViewChild` + canvas.                                           |

## Rollback

- **Backend**: Eliminar `ReportController.java`, `ReportUseCase.java`, `JdbcReportRepository.java`, `ReportRepository.java`. No hay migraciones — cero impacto en esquema.
- **Frontend**: Eliminar carpeta `features/reportes/`. Revertir `app.routes.ts` (remover 4 rutas). Revertir `shell.ts` (re-agregar `disabled: true`). Revertir `package.json` (remover chart.js + ng2-charts).

## Dependencias

- **Sprint 8 (Ventas/CxC)** ✅ — `SalesDocument`, `SalesDocumentItems`, `customer-statements`, `accounts-receivable/aging`, `ThirdParty`
- **Sprint 7 (Inventario)** ✅ — `KardexMovements`, `MovementType`, `InventoryStock`
- **Sprint 5 (Compras)** ✅ — `accounts_payable` para expenses en P&L
- **Sprint 9 (Admin)** ✅ — `CompanyConfig`, roles ADMIN/CONTADOR

## Criterios de éxito

### Slice 1 — Quick Wins

- [ ] `GET /api/v1/reports/sales-by-product?from=&to=` devuelve agregación GROUP BY con cantidad, revenue, costo y margen
- [ ] `GET /api/v1/reports/sales-by-period?from=&to=&granularity=DAY|WEEK|MONTH` devuelve series temporales agregadas
- [ ] Pantalla "Ventas por producto" muestra tabla + bar chart top 10 + export Excel
- [ ] Pantalla "Ventas por corte/período" muestra line/bar chart + selector granularidad + export Excel
- [ ] Pantalla "Historial clientes" compone: facturas, pagos, aging pie chart, timeline cobranzas; export Excel
- [ ] Los 3 items de menú Slice 1 están habilitados y navegan correctamente

### Slice 2 — Analytics

- [ ] `GET /api/v1/reports/profitability?from=&to=` devuelve revenue, COGS, gross margin por producto/categoría
- [ ] Pantalla "Rentabilidad" muestra tabla + bar chart + filtro por producto/categoría + export Excel
- [ ] `GET /api/v1/reports/income-statement?from=&to=` devuelve Revenue - COGS - Expenses = Net
- [ ] Pantalla "Estados financieros" muestra tabla resumen P&L + export Excel
- [ ] "Estados financieros" habilitado en shell

## Orden de slices

| #   | Slice      | Justificación                                                                                                                                                                                                                                            |
| --- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Quick Wins | Sin migraciones, sin tablas nuevas, riesgo mínimo. Historial clientes reutiliza 3 endpoints existentes (customer-statements, aging, CxC). Ventas por producto/corte solo requieren 2 endpoints nuevos con queries GROUP BY simples. ~18 tasks, 5-7 días. |
| 2   | Analytics  | Mayor complejidad: cost-matching kardex→ventas es impreciso por naturaleza (PEPS vs trazabilidad exacta). P&L requiere filtrar tipos de movimiento correctamente. Sin migraciones — riesgo controlado. ~12 tasks, 5-8 días.                              |

## Esfuerzo estimado

| Slice           | Esfuerzo       | Backend                                                              | Frontend                                            |
| --------------- | -------------- | -------------------------------------------------------------------- | --------------------------------------------------- |
| S1 — Quick Wins | 5-7 días       | 4 archivos (ReportController + use case + repository port + adapter) | 6 archivos (3 componentes + 2 servicios + 1 layout) |
| S2 — Analytics  | 5-8 días       | 2 archivos (extiende use case + repository)                          | 4 archivos (2 componentes + 1 servicio)             |
| **Total**       | **10-15 días** | **6 archivos**                                                       | **10 archivos**                                     |
