# Sprint 8 — Ventas: Clientes, Crédito, CxC y Cobranzas

## Intención

El módulo Ventas/CxC está **completamente inhabilitado** en la UI (6 items de menú desactivados, sin rutas, sin componentes). El backend tiene infraestructura parcial de SalesDocument pero con un **bug crítico** (totales no se recalculan al agregar/editar items) y sin soporte para ventas a crédito, cuentas por cobrar ni pagos de clientes. Este sprint habilita el ciclo completo de ventas no-POS: desde la gestión de clientes hasta el tracking de cobranzas.

## Alcance

### Slice 1: Sales Docs UI 🔴

- **Bugfix backend**: `addItem()` y `updateItem()` recalcular `totalNet`, `totalTax*`, `totalAmount` del documento (hoy en `BigDecimal.ZERO`)
- Agregar `dueDate` al record `SalesDocument` y V45 migration
- Agregar flag `isCreditSale` para distinguir contado vs crédito
- Validación de cupo de crédito (`creditLimit` - `currentBalance`) antes de facturar a crédito
- Frontend: `sales-doc-list` + `sales-doc-detail` en `features/ventas/`
- Ruta `/ventas/documentos` en `app.routes.ts`
- Habilitar items de menú: Clientes, Créditos, CxC, Recibos, Estados, Cobranzas (desbloquear accesos pero con placeholders para slices futuros)

### Slice 2: Clientes CRUD UI 🟡

- Reutiliza `ThirdParty` (type=`CLIENT`) ya existente
- Frontend: `client-list` (filtra type=CLIENT) + `client-form` con campos de crédito
- Ruta `/ventas/clientes`

### Slice 3: CxC Module 🔴

- **Nuevo módulo backend completo**: `accounts_receivable` table (V46)
- Dominio: `AccountsReceivable` record (id, clientId, invoiceId, amount, balance, status, dueDate, createdAt)
- Repositorio, use case (`ManageAccountsReceivableUseCase`), controller (`/api/v1/cxc`)
- `invoiceId` nulleable (soporta saldos iniciales / notas débito)
- Backend: calcular antigüedad de saldos (aging buckets: 0-30, 31-60, 61-90, 90+)
- Frontend: `cxc-list` con filtros por cliente, rango de fechas, aging

### Slice 4: Recibos de Caja 🟡

- **Nuevo módulo backend**: `customer_payment_receipts` table (V47)
- Modelo: `CustomerPaymentReceipt(id, clientId, amount, method, reference, date, appliedInvoices[])`
- Tabla puente: `receipt_invoice_applications(receipt_id, invoice_id, appliedAmount)`
- Lógica: al aplicar recibo → reduce `AccountsReceivable.balance` y `ThirdParty.currentBalance`
- Endpoints: `POST/GET /api/v1/recibos`, `POST /api/v1/recibos/{id}/apply`
- Frontend: `receipt-list` + `receipt-form` en `features/ventas/`

### Slice 5: Estados de Cuenta 🟢

- Servicio de consulta (read-only) que agrega: facturas emitidas → recibos aplicados → saldo pendiente
- No requiere nuevas tablas — consulta `sales_documents` (status=ISSUED/PAID) + `customer_payment_receipts` + `receipt_invoice_applications`
- Endpoint: `GET /api/v1/cxc/estado-cuenta/{clientId}`
- Frontend: `statement-view` con resumen + detalle de movimientos

### Slice 6: Cobranzas 🟢

- Tracking de gestiones de cobro: `collection_attempts` table (V48)
- Modelo: `CollectionAttempt(id, clientId, accountsReceivableId, contactDate, method, result, notes, nextFollowUp)`
- Métodos: CALL, EMAIL, VISIT, WHATSAPP. Resultados: PROMISE_TO_PAY, NO_ANSWER, DISPUTED, PAID
- Frontend: `collection-list` con filtros por cliente/estado + acciones de registro

## Fuera de alcance

- Integración fiscal DIAN (facturación electrónica)
- Notas débito / crédito automáticas
- Descuentos por pronto pago
- Intereses de mora
- Impresión térmica de recibos
- Dashboard financiero / KPIs

## Enfoque técnico

- **Hexagonal architecture** consistente con el resto del backend: domain record → repository port → JPA entity + adapter → use case → controller + DTO
- Frontend: standalone components, signals, `httpResource` con `untracked()`, Reactive Forms con patrón establecido en Compras/Inventario
- **Bugfix de totales**: extraer `recalculateDocumentTotals()` como método privado en `ManageSalesDocumentUseCase`, invocar después de `addItem`, `updateItem`, `removeItem`. Misma lógica que `PosCheckoutUseCase.calculateTotals()`.
- **Validación de crédito**: en `transitionDocument` (DRAFT→SENT para QUOTE, DRAFT→CONFIRMED para ORDER) validar `isCreditSale && (totalAmount > creditLimit - currentBalance)` → BusinessException

## Áreas afectadas

| Área                              | Impacto      | Descripción                                                  |
| --------------------------------- | ------------ | ------------------------------------------------------------ |
| `ManageSalesDocumentUseCase.java` | Modificado   | Bugfix totales + dueDate + isCreditSale + validación crédito |
| `SalesDocument.java` (record)     | Modificado   | +dueDate, +isCreditSale                                      |
| `SalesDocumentEntity.java`        | Modificado   | +dueDate, +isCreditSale                                      |
| `src/app/features/ventas/`        | Nuevo        | 10+ componentes (list/detail/form para cada slice)           |
| `src/app/app.routes.ts`           | Modificado   | +6 rutas lazy bajo `/ventas/`                                |
| `src/app/layout/shell/shell.ts`   | Modificado   | Desbloquear 6 items de menú                                  |
| `accounts_receivable` (V46)       | Nuevo        | Tabla, entity, model, repo, use case, controller             |
| `customer_payment_receipts` (V47) | Nuevo        | Tabla, entity, model, repo, use case, controller             |
| `collection_attempts` (V48)       | Nuevo        | Tabla, entity, model, repo, use case, controller             |
| `ThirdParty`                      | Solo lectura | creditLimit, currentBalance, creditDays ya existen           |

## Riesgos

| #   | Riesgo                                                            | Probabilidad | Mitigación                                                                                                          |
| --- | ----------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------- |
| 1   | Bugfix de totales rompe documentos existentes con items y total=0 | Alta         | Script de migración: recalcular totales para documentos DRAFT en V46; los no-DRAFT permanecen inmutables por estado |
| 2   | Validación de crédito bloquea ventas legítimas                    | Media        | Warning en UI + botón "Forzar" (con comentario obligatorio); registrar auditoría                                    |
| 3   | `ThirdParty.currentBalance` se desincroniza con CxC               | Media        | Recalcular currentBalance = SUM(CxC balances) en use case de aplicación de recibos + test de integración            |
| 4   | Migraciones concurrentes (V45-V48) tienen conflicto de numeración | Baja         | Secuenciales: V45 (dueDate/isCredit), V46 (CxC), V47 (recibos), V48 (cobranzas)                                     |

## Rollback

- **Backend**: rollback de migraciones V45-V48 (DROP TABLE + DROP COLUMN). Revertir cambios en `ManageSalesDocumentUseCase` al estado pre-bugfix. Despliegue con `flyway:migrate` reverso.
- **Frontend**: revertir `app.routes.ts` y `shell.ts` a estado con items disabled. Eliminar carpeta `features/ventas/`. Despliegue estático de `dist/`.

## Dependencias

- **Sprint 7 (Inventario)** ✅ completado
- **Sprint 6 (POS Core)** ✅ SalesDocument + SalesItems + ThirdParty existen
- **Product, Warehouse** — lectura (selección de productos/bodegas en formularios)
- **JWT** — userId para createdBy en nuevos registros

## Criterios de éxito

- [ ] `addItem`/`updateItem`/`removeItem` recalculan totales correctamente (test unitario con assert)
- [ ] Documentos existentes con total=0 se recalculatean en migración V45
- [ ] Formulario de cotización/pedido con items muestra totales en tiempo real
- [ ] Lista de documentos de venta con filtros type+status, paginación
- [ ] CRUD de clientes (ThirdParty type=CLIENT) con campos creditLimit, creditDays
- [ ] Módulo CxC: crear, consultar, aging buckets con filtros
- [ ] Recibo de caja: crear recibo, aplicar a facturas, reduce balance del cliente
- [ ] Estado de cuenta por cliente: facturas, recibos, saldo pendiente
- [ ] Tracking de cobranzas: registrar intento, ver historial, programar follow-up
- [ ] Los 6 items del menú Ventas están habilitados y navegan correctamente

## Esfuerzo estimado

| Slice                       | Esfuerzo       | Backend         | Frontend           |
| --------------------------- | -------------- | --------------- | ------------------ |
| S1 — Sales Docs UI + Bugfix | 4-6 días       | 3 archivos      | 4-5 archivos       |
| S2 — Clientes CRUD UI       | 2-3 días       | 0 archivos      | 3 archivos         |
| S3 — CxC Module             | 4-6 días       | 8 archivos      | 3 archivos         |
| S4 — Recibos de Caja        | 4-5 días       | 7 archivos      | 4 archivos         |
| S5 — Estados de Cuenta      | 2-3 días       | 2 archivos      | 2 archivos         |
| S6 — Cobranzas              | 3-4 días       | 7 archivos      | 3 archivos         |
| **Total**                   | **19-27 días** | **27 archivos** | **19-20 archivos** |
