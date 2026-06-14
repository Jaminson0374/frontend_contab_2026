# Sprint 11 — Devoluciones POS e Intereses de mora

## Intención

El módulo POS tiene dos capacidades financieras críticas completamente ausentes: (1) **devoluciones** — revertir una factura emitida por POS cuando el cliente devuelve producto, creando nota crédito, reversando inventario y ajustando CxC; (2) **intereses de mora** — calcular y acumular intereses sobre cuentas por cobrar vencidas, práctica estándar en el negocio cárnico colombiano donde plazos de crédito son estrictos. Ambas impactan directamente el flujo de caja y la precisión contable.

## Alcance

### Slice 1: Devoluciones POS 🔴

- **Backend**: Agregar `CREDIT_NOTE` al enum `SalesDocumentType`. Migración V55 (`ALTER TABLE sales_documents DROP CONSTRAINT ... CHECK (type IN ('QUOTE','ORDER','INVOICE','CREDIT_NOTE'))`). Nuevo `PosDevolutionUseCase`: carga la factura original (type=INVOICE, status=ISSUED), valida items y cantidades a devolver, crea `SalesDocument` tipo `CREDIT_NOTE` con `sourceDocumentId` apuntando a la factura original y montos negativos, revierte stock (`MovementType.ENTRY` por `DEVOLUTION` con kardex), actualiza CxC si la venta original fue a crédito (reduce `AccountsReceivable.outstanding` y `ThirdParty.currentBalance`). Endpoints: `POST /api/v1/pos/devolutions` (nuevo), `GET /api/v1/pos/devolutions?invoiceId=`.
- **Frontend**: `PosDevolutionComponent` en `features/pos/devoluciones/`. Flujo: buscar factura por número → mostrar items facturados con cantidades originales → campos `devolverCantidad` por ítem → motivo → submit crea nota crédito. `DevolutionService` (`httpResource`).
- **Ruta**: `/pos/devoluciones` (nueva).
- **Shell**: habilitar "Devoluciones" (remover `disabled: true` en línea 79).

### Slice 2: Intereses de mora 🟡

- **Backend**: Migración V56 (`ALTER TABLE accounts_receivable ADD interest_rate NUMERIC(5,2), ADD interest_amount NUMERIC(15,2) DEFAULT 0, ADD last_interest_calc_date DATE`). Migración V57 (`ALTER TABLE company_config ADD moratory_interest_rate NUMERIC(5,2) DEFAULT 0, ADD interest_grace_days INT DEFAULT 0, ADD interest_compound_frequency VARCHAR(20) DEFAULT 'MONTHLY'`). Nuevo `InterestCalculationService`: método `calculateOverdueInterest()` que itera CxC en estado OVERDUE con `dueDate + graceDays < today`, calcula interés simple o compuesto según `interest_compound_frequency`, actualiza `interest_amount` y `last_interest_calc_date`. Modificar `markOverdue()` para disparar cálculo de intereses o ejecutar vía scheduler `@Scheduled(cron="0 0 2 * * ?")` (2 AM diario). Endpoints: `POST /api/v1/cxc/calculate-interest` (manual trigger), `GET /api/v1/cxc/intereses?clientId=` (consulta).
- **Frontend**: `company-form` extender con campos `moratory_interest_rate`, `interest_grace_days`, `interest_compound_frequency`. `cxc-list` mostrar columna `interés acumulado` y badge OVERDUE+INTEREST. Botón "Calcular intereses" en cabecera de lista CxC. `InterestService` (`httpResource`).
- **Rutas**: sin nuevas rutas — extiende componentes existentes (`features/admin/company/`, `features/ventas/cxc/`).

## Fuera de alcance

- Notas crédito por ajustes administrativos (solo devolución física con reversión de inventario)
- Devoluciones parciales que excedan el stock original (validación estricta)
- Intereses sobre CxP (solo CxC en este sprint)
- Capitalización automática de intereses (generación de nueva factura por intereses)
- Notificaciones automáticas a clientes morosos
- Workflow de autorización para devoluciones de alto monto
- Integración contable automática de notas crédito e intereses

## Enfoque técnico

- **Devoluciones extienden SalesDocument, no crean nueva entidad**: `CREDIT_NOTE` es un `SalesDocumentType` más. `PosDevolutionUseCase` es el espejo inverso de `PosCheckoutUseCase`: en lugar de `checkout(ORDER→INVOICE, salida stock)`, hace `devolver(INVOICE→CREDIT_NOTE, entrada stock)`. Items con cantidades negativas. `sourceDocumentId` FK ya existe (V34) — enlaza nota crédito → factura original.
- **Intereses extienden AccountsReceivable, no nueva tabla**: `interest_rate`, `interest_amount`, `last_interest_calc_date` se agregan al record `AccountsReceivable`. `InterestCalculationService` es un servicio de dominio puro (sin puertos/adaptadores propios) que opera sobre `AccountsReceivableRepository`. La configuración de interés vive en `CompanyConfig` (single-row V51).
- **Backend hexagonal**: `CREDIT_NOTE` se integra al enum existente → `PosDevolutionUseCase` como nuevo use case → controller REST. `InterestCalculationService` como `@Service` inyectado en `AccountsReceivableUseCase.markOverdue()`.
- **Frontend**: standalone components, signals, `httpResource` con `untracked()`. `PosDevolutionComponent` sigue el patrón de `PosCheckoutComponent` pero con flujo inverso. `InterestService` mínimo — solo trigger y consulta.
- **Migraciones**: V55 (CHECK constraint), V56 (AR interest fields), V57 (company_config interest). Flyway incremental.
- **Auditoría**: `@Auditable` en `PosDevolutionUseCase` (V52 AOP existente). Intereses no auditan individualmente (cálculo batch).

## Áreas afectadas

| Área                                     | Impacto      | Descripción                                                |
| ---------------------------------------- | ------------ | ---------------------------------------------------------- |
| `SalesDocumentType.java`                 | Modificado   | +CREDIT_NOTE                                               |
| `sales_documents` CHECK V34 → V55        | Modificado   | +CREDIT_NOTE en constraint                                 |
| `PosDevolutionUseCase.java` + controller | Nuevo        | Use case + REST controller (3 archivos)                    |
| `PosCheckoutUseCase.java`                | Solo lectura | Referencia para lógica inversa                             |
| `AccountsReceivable.java` (record)       | Modificado   | +interest_rate, +interest_amount, +last_interest_calc_date |
| `accounts_receivable` table (V56)        | Modificado   | +3 columnas de interés                                     |
| `InterestCalculationService.java`        | Nuevo        | Cálculo batch de intereses                                 |
| `AccountsReceivableUseCase.java`         | Modificado   | Integrar cálculo en markOverdue()                          |
| `CompanyConfigEntity.java`               | Modificado   | +3 campos de interés                                       |
| `company_config` table (V57)             | Modificado   | +3 columnas de interés                                     |
| `CompanyConfigUseCase.java`              | Modificado   | Mapear nuevos campos                                       |
| `src/app/layout/shell/shell.ts`          | Modificado   | Habilitar Devoluciones (línea 79)                          |
| `src/app/app.routes.ts`                  | Modificado   | +ruta `/pos/devoluciones`                                  |
| `src/app/features/pos/devoluciones/`     | Nuevo        | PosDevolutionComponent + DevolutionService                 |
| `src/app/features/admin/company/`        | Modificado   | company-form: +3 campos de interés                         |
| `src/app/features/ventas/cxc/`           | Modificado   | cxc-list: columna interés + botón calcular                 |

## Riesgos

| #   | Riesgo                                                                               | Prob  | Mitigación                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | CHECK constraint DROP+ADD no es atómico — posible race condition                     | Media | Envolver en transacción Flyway; el DROP y ADD se ejecutan secuencialmente en la misma migración                                                           |
| 2   | Devolución sobre factura de crédito ya pagada parcialmente deja CxC inconsistente    | Media | `PosDevolutionUseCase` valida que la CxC asociada permita reducción; si `paidAmount > 0`, la devolución solo afecta `outstanding` (no el monto ya pagado) |
| 3   | Devolución cuando el producto ya no existe o cambió de costo                         | Baja  | Validar existencia del producto al momento de la devolución; usar `stock.unitCost()` del kardex (PEPS histórico ya registrado), no el costo actual        |
| 4   | Interés compuesto diario con muchas cuentas OVERDUE puede ser pesado en BD           | Baja  | `findOverdueBefore(date)` ya existe y usa índice `due_date`; cálculo diario a las 2 AM con bajo volumen transaccional                                     |
| 5   | Doble cálculo de interés si se ejecuta manual + scheduler                            | Baja  | `last_interest_calc_date` previene recálculo mismo día; CHECK en servicio: si `last_interest_calc_date == today` → skip                                   |
| 6   | rate de interés en CompanyConfig (global) no permite tasas diferenciadas por cliente | Baja  | El campo `interest_rate` en `accounts_receivable` permite override por CxC. Si `interest_rate IS NULL`, se usa el de company_config                       |

## Rollback

- **Backend**: revertir V55 (`ALTER TABLE sales_documents DROP CONSTRAINT ... CHECK (type IN ('QUOTE','ORDER','INVOICE'))`). Revertir V56 (`ALTER TABLE accounts_receivable DROP interest_rate, DROP interest_amount, DROP last_interest_calc_date`). Revertir V57 (`ALTER TABLE company_config DROP moratory_interest_rate, DROP interest_grace_days, DROP interest_compound_frequency`). Eliminar `PosDevolutionUseCase.java`, `PosDevolutionController.java`, `InterestCalculationService.java`. Revertir `SalesDocumentType.java` (remover CREDIT_NOTE). Revertir modificaciones en `AccountsReceivable.java`, `AccountsReceivableUseCase.java`, `CompanyConfigEntity.java`, `CompanyConfigUseCase.java`.
- **Frontend**: revertir `shell.ts` (re-deshabilitar Devoluciones). Eliminar ruta `/pos/devoluciones` de `app.routes.ts`. Eliminar carpeta `features/pos/devoluciones/`. Revertir `company-form` y `cxc-list` a versión sin campos de interés.

## Dependencias

- **Sprint 6 (POS Core)** ✅ — `SalesDocument`, `SalesDocumentType`, `PosCheckoutUseCase`, `sourceDocumentId` FK V34
- **Sprint 7 (Inventario)** ✅ — `MovementType`, `RecordMovementUseCase`, kardex, `InventoryStock`
- **Sprint 8 (Ventas/CxC)** ✅ — `AccountsReceivable`, `AccountsReceivableUseCase`, `markOverdue()`, `ArAgingResponse`
- **Sprint 9 (Admin)** ✅ — `CompanyConfig` V51, `@Auditable` AOP V52
- **Sprint 10 (CxP notas)** ✅ — `DebitCreditNote` (patrón de referencia para notas crédito, pero NO se reutiliza — las devoluciones POS usan `SalesDocument`)

## Criterios de éxito

- [ ] `SalesDocumentType.CREDIT_NOTE` existe y la BD acepta documentos con type='CREDIT_NOTE'
- [ ] `POST /api/v1/pos/devolutions` crea nota crédito con `sourceDocumentId` apuntando a la factura original y montos negativos
- [ ] Devolución total: stock del producto devuelto se incrementa en cantidad original; kardex registra `MovementType.ENTRY` por `DEVOLUTION`
- [ ] Devolución parcial: solo las cantidades especificadas se revierten; items no devueltos permanecen sin cambios
- [ ] Si la factura original fue a crédito, la devolución reduce `AccountsReceivable.outstanding` y `ThirdParty.currentBalance`
- [ ] `markOverdue()` actualiza `interest_amount` para CxC vencidas usando la tasa de `company_config` (o la tasa individual de la CxC)
- [ ] `POST /api/v1/cxc/calculate-interest` dispara cálculo manual de intereses sobre todas las CxC OVERDUE
- [ ] `company-form` permite configurar `moratory_interest_rate`, `interest_grace_days`, `interest_compound_frequency`
- [ ] `cxc-list` muestra columna "Interés acumulado" y botón "Calcular intereses"
- [ ] Menú POS muestra "Devoluciones" habilitado y navega a `PosDevolutionComponent`
- [ ] `InterestCalculationService` no recalcula intereses del mismo día (`last_interest_calc_date == today` → skip)

## Orden de slices

| #   | Slice             | Justificación                                                                                                                                                                                                                                                                                                                                       |
| --- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Devoluciones POS  | Fundacional: extiende `SalesDocumentType`, modifica el CHECK constraint V34, crea `PosDevolutionUseCase` como inverso de `PosCheckoutUseCase`. Sin este, no hay base para el flujo de devolución. Impacta inventario (kardex), CxC y POS shell. Es el cambio de mayor riesgo (modifica esquema core) — debe ir primero para estabilizarlo temprano. |
| 2   | Intereses de mora | Extiende `AccountsReceivable` y `CompanyConfig` (tablas ya estables desde Sprint 8/9). Bajo riesgo, sin impacto en esquemas core. `InterestCalculationService` es un servicio aislado. El orden es flexible — puede ir después de Slice 1 o paralelizarse si hay capacidad.                                                                         |

## Esfuerzo estimado

| Slice                  | Esfuerzo       | Backend                        | Frontend               |
| ---------------------- | -------------- | ------------------------------ | ---------------------- |
| S1 — Devoluciones POS  | 8-10 días      | 10 archivos (1 mod + 9 nuevos) | 4 archivos             |
| S2 — Intereses de mora | 5-7 días       | 6 archivos (4 mod + 2 nuevos)  | 3 archivos modificados |
| **Total**              | **13-17 días** | **16 archivos**                | **7 archivos**         |
