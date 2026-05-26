# Sprint 10 — Anticipos y Notas débito/crédito

## Intención

El ecosistema Compras/CxP tiene dos capacidades financieras críticas para el negocio cárnico colombiano que están completamente ausentes: (1) **anticipos a proveedores ganaderos** — pagos que se entregan antes de recibir factura y se aplican contra facturas futuras, práctica rutinaria con proveedores de ganado; (2) **notas débito/crédito** — ajustes al saldo CxP por diferencias en peso, calidad, bonificaciones o fletes que no modifican la factura original. Ambas son operaciones de alto volumen y alto valor en una planta de beneficio.

## Alcance

### Slice 1: Anticipos a proveedores 🔴

- **Backend**: Migración V53 (`ALTER TABLE payments ADD is_advance BOOLEAN DEFAULT FALSE, ADD remaining_advance NUMERIC(15,2)`). Nueva tabla `advance_applications` (advance_id, invoice_id, applied_amount, date, version). Modificar `PaymentUseCase.create()`: cuando `isAdvance=true`, NO se requieren invoicePayments, NO se actualiza status de factura, se actualiza `remainingAdvance=amount`. Nuevo `ApplyAdvanceUseCase`: consume saldo de anticipo contra factura(s), crea `advance_applications`, actualiza `remainingAdvance`, actualiza status de factura (PAID/RECONCILED) y balance del proveedor. Endpoints: `POST /api/v1/payments` (extendido con isAdvance), `GET /api/v1/payments?isAdvance=true`, `POST /api/v1/payments/{id}/apply` (nuevo).
- **Frontend**: Módulo `features/compras/anticipos/`. `AdvanceListComponent` (MatTable: proveedor, monto, saldo restante, fecha, filtro por proveedor). `AdvanceFormComponent` (reutilizar patrón PagoForm: ReactiveForms + MatFormField outline + selector de proveedor). `ApplyAdvanceDialog` (MatDialog: selector de facturas pendientes del proveedor + montos a aplicar). Nuevo `AdvanceService` (`httpResource`).
- **Ruta**: `/compras/anticipos` con hijo `/nuevo` y parámetro `:id/aplicar`.
- **Shell**: nuevo item "Anticipos" en el menú Compras.

### Slice 2: Notas débito/crédito 🟡

- **Backend**: Migración V54 — nueva tabla `debit_credit_notes` (id, type CHECK DEBIT_NOTE/CREDIT_NOTE, supplier_id FK, invoice_id FK opcional, amount, reason, reference, created_by, created_at, updated_at, version). Nuevo dominio `DebitCreditNote` (record Java). Stack hexagonal completo: `DebitCreditNoteRepository` (port) → `DebitCreditNoteJpaRepository` + `DebitCreditNoteJpaEntity` + `DebitCreditNoteRepositoryAdapter` (MapStruct) → `ManageDebitCreditNoteUseCase` → `DebitCreditNoteController` + DTOs. Endpoints: `POST/GET/PUT/DELETE /api/v1/debit-credit-notes`, `GET /api/v1/debit-credit-notes?supplierId=`. Actualizar `SupplierInvoiceUseCase`: al crear/aplicar una nota débito, incrementar balance CxP del proveedor; nota crédito, reducirlo.
- **Frontend**: Módulo `features/compras/notas/`. `DebitCreditNoteListComponent` (MatTable: tipo, proveedor, factura, monto, motivo). `DebitCreditNoteFormComponent` (ReactiveForms: tipo DEBIT/CREDIT, selector proveedor, factura opcional, monto, motivo). Nuevo `SupplierNoteService` (`httpResource`).
- **Ruta**: `/compras/notas` con hijo `/nuevo`.
- **Shell**: nuevo item "Notas débito/crédito" en el menú Compras.

## Fuera de alcance

- Notas débito/crédito para clientes (CxC) — solo proveedores (CxP) en este sprint
- Aplicación automática de anticipos al recibir factura (manual por ahora)
- Workflow de aprobación de notas (supervisor autoriza)
- Integración contable automática (asientos de anticipos/notas)
- Notas que afecten retenciones (solo subtotal por ahora)
- Impresión/PDF de notas

## Enfoque técnico

- **Anticipos extienden Payments, no los reemplazan**: `isAdvance` como flag en la tabla `payments`. Un anticipo es un payment sin `invoicePayments`. El `remainingAdvance` se decrementa al aplicar. `ApplyAdvanceUseCase` es el espejo de `PaymentUseCase.create()`: en lugar de crear un pago, consume uno existente.
- **Notas débito/crédito**: entidad independiente con stack hexagonal completo. El `ManageDebitCreditNoteUseCase` actualiza `ThirdParty.currentBalance` del proveedor (débito → suma, crédito → resta), igual que `PaymentUseCase.updateSupplierBalance()`.
- **Backend hexagonal**: domain record → repository port → JPA entity + adapter (MapStruct) → use case + DTOs → controller. Mismo patrón que `SupplierInvoice`, `Retencion`, `Payment`.
- **Frontend**: standalone components, signals, `httpResource` con `untracked()`, `ReactiveFormsModule` + `MatFormField appearance="outline"`. Mismo patrón que `pago-form`, `retencion-form`.
- **Migraciones**: V53 (anticipos) y V54 (notas). Flyway incremental, sin `UNDO`.
- **Auditoría**: ambos módulos heredan `@Auditable` automáticamente del AOP existente (V52) si se anotan los use cases.

## Áreas afectadas

| Área                                             | Impacto    | Descripción                            |
| ------------------------------------------------ | ---------- | -------------------------------------- |
| `payments` table (V29)                           | Modificado | +is_advance, +remaining_advance (V53)  |
| `advance_applications`                           | Nuevo      | Tabla de aplicación de anticipos (V53) |
| `debit_credit_notes`                             | Nuevo      | Tabla de notas (V54)                   |
| `PaymentUseCase.java`                            | Modificado | Soporte para pagos tipo anticipo       |
| `ApplyAdvanceUseCase.java`                       | Nuevo      | Aplicar anticipo a facturas            |
| `ManageDebitCreditNoteUseCase.java` + 7 archivos | Nuevo      | Stack completo de notas (8 archivos)   |
| `SupplierInvoiceUseCase.java`                    | Modificado | Balance ajustado por notas             |
| `src/app/layout/shell/shell.ts`                  | Modificado | +2 items en menú Compras               |
| `src/app/app.routes.ts`                          | Modificado | +2 rutas lazy bajo /compras            |
| `src/app/features/compras/anticipos/`            | Nuevo      | 3 componentes + 1 servicio             |
| `src/app/features/compras/notas/`                | Nuevo      | 2 componentes + 1 servicio             |

## Riesgos

| #   | Riesgo                                                                                               | Prob  | Mitigación                                                                                                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Aplicación parcial de anticipo deja `remainingAdvance` inconsistente                                 | Media | `ApplyAdvanceUseCase` con `@Transactional` atómico. CHECK `remaining_advance >= 0` en BD. Test de concurrencia con version locking.                                                                  |
| 2   | Nota débito duplica deuda ya registrada en factura                                                   | Alta  | La nota es independiente de la factura. El `SupplierInvoiceUseCase` mantiene el total original de la factura; las notas ajustan el balance CxP del proveedor por fuera. Documentar claramente en UI. |
| 3   | `PaymentUseCase.create()` se complejiza con lógica condicional de anticipo                           | Media | Extraer método `createAdvance()` separado. Validación temprana: si `isAdvance=true` e `invoicePayments` no vacío → error.                                                                            |
| 4   | Orden de slices: Slice 2 (notas) depende de la modificación a `ThirdParty.currentBalance` en Slice 1 | Baja  | `updateSupplierBalance()` ya existe en `PaymentUseCase`. Extraer a `SupplierBalanceService` compartido durante Slice 1 para que Slice 2 lo reutilice.                                                |
| 5   | Notas sin factura asociada (invoice_id opcional) podrían no reflejarse en reportes CxP               | Baja  | El `CxPUseCase` actual ya consulta por `supplierId`. Las notas afectan `currentBalance` directamente → visibles en CxP sin modificar el módulo.                                                      |

## Rollback

- **Backend**: revertir V53 (`ALTER TABLE payments DROP COLUMN is_advance, DROP COLUMN remaining_advance; DROP TABLE advance_applications`). Revertir V54 (`DROP TABLE debit_credit_notes`). Eliminar `ApplyAdvanceUseCase.java` y los 8 archivos de notas. Revertir `PaymentUseCase.create()` a versión sin lógica de anticipo. Revertir `SupplierInvoiceUseCase` para quitar referencia a notas.
- **Frontend**: eliminar rutas `/compras/anticipos` y `/compras/notas` de `app.routes.ts`. Remover items "Anticipos" y "Notas débito/crédito" de `shell.ts`. Eliminar carpetas `features/compras/anticipos/` y `features/compras/notas/`.

## Dependencias

- **Sprint 5 (Compras)** ✅ — `Payment`, `PaymentUseCase`, `SupplierInvoice`, `SupplierInvoiceUseCase`, `ThirdParty.currentBalance`, `CxPUseCase`. Todo el ecosistema CxP existe.
- **Sprint 9 (Admin)** ✅ — `audit_log` V52. `@Auditable` AOP disponible para ambos use cases nuevos.
- **Tabla `payments` V29** ✅ — estructura base para extender con anticipos.
- **Tabla `invoice_payments` V29** ✅ — patrón de aplicación de pagos a facturas que `advance_applications` replica.
- **`httpResource` (Angular 21)** ✅ — `AdvanceService` y `SupplierNoteService` siguen el mismo patrón que `RetencionService`, `PaymentService`.

## Criterios de éxito

- [ ] Crear anticipo: `POST /api/v1/payments` con `isAdvance=true` registra pago sin factura, `remainingAdvance=amount`
- [ ] Listar anticipos: `GET /api/v1/payments?isAdvance=true` retorna solo anticipos con saldo restante
- [ ] Aplicar anticipo: `POST /api/v1/payments/{id}/apply` consume saldo contra factura(s), actualiza `remainingAdvance`, crea `advance_applications`, actualiza status de factura y balance del proveedor
- [ ] Anticipo agotado (`remainingAdvance=0`) no permite más aplicaciones
- [ ] CRUD notas débito: crear (`amount > 0`, type=DEBIT_NOTE), listar, editar, eliminar con actualización de balance CxP
- [ ] CRUD notas crédito: crear (`amount > 0`, type=CREDIT_NOTE) con reducción de balance CxP
- [ ] Notas con factura asociada (opcional) referencian `supplier_invoices(id)` sin modificar el total de la factura
- [ ] Menú Compras muestra "Anticipos" y "Notas débito/crédito" habilitados y navegables
- [ ] `ApplyAdvanceDialog` muestra solo facturas PENDING/RECONCILED del proveedor del anticipo
- [ ] Ambos módulos generan logs de auditoría automáticamente

## Orden de slices

| #   | Slice                   | Justificación                                                                                                                                                                                                                                    |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Anticipos a proveedores | Fundacional: extiende `payments` (ya estable), crea `advance_applications`. Al modificar `PaymentUseCase`, extrae `SupplierBalanceService` que Slice 2 reutiliza. El patrón de aplicación de anticipos sienta la base conceptual para las notas. |
| 2   | Notas débito/crédito    | Entidad nueva, stack completo. Requiere `SupplierBalanceService` que se extrajo en Slice 1. Completa el ecosistema CxP con ajustes financieros.                                                                                                  |

## Esfuerzo estimado

| Slice                     | Esfuerzo       | Backend                       | Frontend        |
| ------------------------- | -------------- | ----------------------------- | --------------- |
| S1 — Anticipos            | 5-7 días       | 8 archivos (1 mod + 7 nuevos) | 5 archivos      |
| S2 — Notas débito/crédito | 6-8 días       | 12 archivos                   | 5 archivos      |
| **Total**                 | **11-15 días** | **20 archivos**               | **10 archivos** |
