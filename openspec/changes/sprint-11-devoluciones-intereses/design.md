# Design: Sprint 11 — Devoluciones POS e Intereses de mora

## Technical Approach

Extiende `SalesDocument` con `CREDIT_NOTE` (patrón opuesto a `INVOICE` — cantidades negativas, entrada de stock). `PosDevolutionUseCase` es el espejo inverso de `PosCheckoutUseCase`: en lugar de `ORDER→INVOICE + EXIT`, hace `INVOICE→CREDIT_NOTE + ENTRY`. Para intereses, se extiende `AccountsReceivable` y `CompanyConfig` con campos de interés y se crea `InterestCalculationService` que opera sobre ARs vencidas.

## Architecture Decisions

| #   | Decisión                           | Opciones                                                                                              | Tradeoffs                                                                                                                                                                       | Elección                                                            |
| --- | ---------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | CREDIT_NOTE como SalesDocumentType | A) Nuevo enum en SalesDocumentType. B) Nueva entidad CreditNote separada                              | A reutiliza SaleItem (qty negativa), B requeriría tabla + repos + mapper nuevos. El sourceDocumentId (V34) ya soporta la FK                                                     | **A** — Un tipo más en el enum existente                            |
| 2   | Items de nota crédito              | A) Reusar SaleItem con qty negativa. B) Nuevo CreditNoteItem                                          | A usa la misma tabla `sale_items`, mismo repositorio. BigDecimal soporta negativos. B crearía duplicación estructural innecesaria                                               | **A** — SaleItem.quantity ya es BigDecimal                          |
| 3   | Reversión de inventario            | A) PosDevolutionUseCase llama RecordMovementUseCase directamente. B) Delegar a InventoryService nuevo | A sigue el patrón exacto de PosCheckoutUseCase (línea 117: `recordMovement.record(...)`). B requeriría nuevo servicio para una sola operación                                   | **A** — Mismo patrón que checkout                                   |
| 4   | Reversión CxC                      | A) PosDevolutionUseCase reduce AR.outstanding. B) Crear entrada AR de crédito separada                | A es más simple y semánticamente correcto (el cliente debe menos). B crearía una AR "negativa" que no tiene sentido en el modelo actual (no hay signo en AR)                    | **A** — Reducir outstanding de la AR original                       |
| 5   | Precedencia de tasa de interés     | AR.interest_rate > CompanyConfig.moratory_rate                                                        | El proposal (riesgo #6) ya define: si AR.interest_rate != null se usa esa; si null, se usa company_config.moratory_rate. Null-coalescing estándar                               | **Null-coalescing** en InterestCalculationService                   |
| 6   | Alcance cálculo intereses          | A) Todas las ARs OVERDUE (batch). B) ARs seleccionadas por ID                                         | A cubre el caso de negocio (2AM scheduler). B sería para cálculo individual pero añade complejidad sin necesidad inmediata                                                      | **A** — Batch sobre todas las OVERDUE con dueDate+graceDays < today |
| 7   | Compound frequency                 | A) Solo MONTHLY. B) DAILY/WEEKLY/MONTHLY/ANNUAL                                                       | El proposal dice "simple (monthly) only". Práctica colombiana es interés mensual. Agregar frecuencias sin caso de negocio es sobre-ingeniería                                   | **A** — MONTHLY únicamente en este sprint                           |
| 8   | UX PosDevolutionComponent          | A) Inline invoice viewer + item selection (full-screen). B) Stepper/wizard 3 pasos                    | A sigue el patrón PosVentaComponent (pantalla completa, panel izquierdo lectura, panel derecho acción). Son solo 2 pasos lógicos (buscar → devolver), un stepper sería excesivo | **A** — Pantalla dividida: invoice viewer + devolution form         |

## Data Flow

```
PosDevolutionComponent          PosDevolutionUseCase
       │                              │
       │ POST /api/v1/pos/devolutions │
       ├──────────────────────────────▶
       │                              │ 1. Load INVOICE (type=INVOICE, status=ISSUED)
       │                              │ 2. Validate items & quantities (≤ original)
       │                              │ 3. Create CREDIT_NOTE SalesDocument
       │                              │    (negative totals, sourceDocumentId=invoice.id)
       │                              │ 4. For each devolved item:
       │                              │    └── RecordMovementUseCase.record(ENTRY, "DEVOLUTION")
       │                              │    └── stockRepo.save(qty + devolvedQty)
       │                              │ 5. If invoice.isCreditSale:
       │                              │    └── AR.outstanding -= devolved total
       │                              │    └── ThirdParty.currentBalance -= devolved total
       │                              │ 6. Return DevolutionResponse
       │◀──────────────────────────────
       │

InterestCalculationService          [@Scheduled cron="0 0 2 * * ?"]
       │
       │ findOverdueBefore(today - graceDays)
       │ For each OVERDUE AR:
       │   if last_interest_calc_date == today → skip
       │   rate = AR.interest_rate ?? config.moratory_rate
       │   interest = outstanding * rate / 100 / 12  (MONTHLY simple)
       │   AR.interest_amount += interest
       │   AR.last_interest_calc_date = today
       │   AR.save()
```

## API Contracts

### Slice 1 — Devoluciones

```
POST /api/v1/pos/devolutions
  Request: {
    invoiceId: UUID,
    items: [{ productId: UUID, quantity: BigDecimal }],
    reason: string  // motivo de la devolución
  }
  Response 201: {
    creditNoteId: UUID,
    documentNumber: string,
    totalAmount: BigDecimal,     // negativo
    reversedItems: int,
    arAdjustment: BigDecimal|null  // ajuste a CxC si aplica
  }
  Errors: 404 (invoice not found), 400 (invalid quantities)

GET /api/v1/pos/devolutions?invoiceId={UUID}
  Response 200: SalesDocument[]  // notas crédito asociadas a la factura
```

### Slice 2 — Intereses

```
POST /api/v1/cxc/calculate-interest
  Response 200: { processedCount: int, totalInterestAccrued: BigDecimal, skippedCount: int }
  Errors: 500 si falla el batch

GET /api/v1/cxc/intereses?clientId={UUID}
  Response 200: AccountsReceivable[]  // con interest_amount poblado

PUT /api/v1/admin/company-config  (extendido)
  Request: +moratoryInterestRate: BigDecimal, +interestGraceDays: int, +interestCompoundFrequency: string
```

## Data Model

### V55 — ALTER sales_documents CHECK constraint

```sql
ALTER TABLE sales_documents DROP CONSTRAINT IF EXISTS sales_documents_type_check;
ALTER TABLE sales_documents ADD CONSTRAINT sales_documents_type_check
  CHECK (type IN ('QUOTE','ORDER','INVOICE','CREDIT_NOTE'));
```

### V56 — ALTER accounts_receivable (interés)

```sql
ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS interest_rate NUMERIC(5,2);
ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS interest_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS last_interest_calc_date DATE;
```

### V57 — ALTER company_config (interés)

```sql
ALTER TABLE company_config ADD COLUMN IF NOT EXISTS moratory_interest_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE company_config ADD COLUMN IF NOT EXISTS interest_grace_days INT DEFAULT 0;
ALTER TABLE company_config ADD COLUMN IF NOT EXISTS interest_compound_frequency VARCHAR(20) DEFAULT 'MONTHLY';
```

### Domain records extendidos

**SalesDocumentType.java**: `QUOTE, ORDER, INVOICE, CREDIT_NOTE`

**AccountsReceivable.java**: +3 campos `BigDecimal interestRate, BigDecimal interestAmount, LocalDate lastInterestCalcDate`

**CompanyConfig.java**: +3 campos `BigDecimal moratoryInterestRate, int interestGraceDays, String interestCompoundFrequency`

## Component Tree (Frontend)

```
app-shell
└── /pos/devoluciones
    └── PosDevolutionComponent          ← NUEVO
        ├── InvoiceLookupPanel          (buscar factura por número)
        ├── InvoiceItemsTable           (items facturados con qty original)
        │   └── DevolutionItemRow       (campo "cantidad a devolver" por item)
        └── DevolutionSummary           (totales negativos, motivo, submit)

features/admin/company/company-form     ← MODIFICADO
    + moratoryInterestRate (input number)
    + interestGraceDays (input number)
    + interestCompoundFrequency (select MONTHLY)

features/ventas/cxc/cxc-list            ← MODIFICADO
    + columna "Interés acumulado"
    + badge OVERDUE+INTEREST
    + botón "Calcular intereses" en cabecera
```

## File List

### Backend (C:\POS_VTA\backend_pos-vta)

| Archivo                                                                 | Acción | Descripción                                                           |
| ----------------------------------------------------------------------- | ------ | --------------------------------------------------------------------- |
| `domain/model/SalesDocumentType.java`                                   | Modify | +CREDIT_NOTE                                                          |
| `domain/model/AccountsReceivable.java`                                  | Modify | +interestRate, +interestAmount, +lastInterestCalcDate                 |
| `domain/model/CompanyConfig.java`                                       | Modify | +moratoryInterestRate, +interestGraceDays, +interestCompoundFrequency |
| `domain/repository/AccountsReceivableRepository.java`                   | Modify | +findOverdueBeforeGrace(today, graceDays)                             |
| `application/usecase/PosDevolutionUseCase.java`                         | Create | Use case de devolución POS                                            |
| `application/usecase/DevolutionRequest.java`                            | Create | Request DTO                                                           |
| `application/usecase/DevolutionResponse.java`                           | Create | Response DTO                                                          |
| `application/usecase/InterestCalculationService.java`                   | Create | Cálculo batch de intereses                                            |
| `application/usecase/InterestCalculationResponse.java`                  | Create | Response DTO                                                          |
| `application/usecase/AccountsReceivableUseCase.java`                    | Modify | Integrar InterestCalculationService en markOverdue()                  |
| `application/usecase/CompanyConfigUseCase.java`                         | Modify | Mapear 3 campos nuevos                                                |
| `application/dto/AccountsReceivableResponse.java`                       | Modify | +interestAmount, +lastInterestCalcDate                                |
| `application/dto/CompanyConfigRequest.java`                             | Modify | +3 campos de interés                                                  |
| `application/dto/CompanyConfigResponse.java`                            | Modify | +3 campos de interés                                                  |
| `infrastructure/adapters/in/rest/PosController.java`                    | Modify | +POST /devolutions, +GET /devolutions                                 |
| `infrastructure/adapters/in/rest/CxcController.java`                    | Modify | +POST /calculate-interest, +GET /intereses                            |
| `infrastructure/adapters/out/persistence/CompanyConfigEntity.java`      | Modify | +3 columnas                                                           |
| `infrastructure/adapters/out/persistence/AccountsReceivableEntity.java` | Modify | +3 columnas                                                           |
| `infrastructure/adapters/out/persistence/AccountsReceivableMapper.java` | Modify | Mapear nuevos campos                                                  |
| `infrastructure/adapters/out/persistence/CompanyConfigMapper.java`      | Modify | Mapear nuevos campos                                                  |
| `resources/db/migration/V55__add_credit_note_type.sql`                  | Create | ALTER CHECK constraint                                                |
| `resources/db/migration/V56__ar_interest_fields.sql`                    | Create | ALTER accounts_receivable                                             |
| `resources/db/migration/V57__company_interest_config.sql`               | Create | ALTER company_config                                                  |

### Frontend (C:\POS_VTA\posinvent)

| Archivo                                                 | Acción | Descripción                                |
| ------------------------------------------------------- | ------ | ------------------------------------------ |
| `src/app/features/pos/devoluciones/pos-devolution.ts`   | Create | PosDevolutionComponent                     |
| `src/app/features/pos/devoluciones/pos-devolution.html` | Create | Template                                   |
| `src/app/features/pos/devoluciones/pos-devolution.css`  | Create | Estilos                                    |
| `src/app/core/services/devolution.service.ts`           | Create | DevolutionService (httpResource)           |
| `src/app/app.routes.ts`                                 | Modify | +ruta /pos/devoluciones                    |
| `src/app/layout/shell/shell.ts`                         | Modify | Línea 79: remover disabled:true            |
| `src/app/core/models/sale.model.ts`                     | Modify | +CREDIT_NOTE en SALES_DOCUMENT_TYPE        |
| `src/app/core/models/cxc.model.ts`                      | Modify | +interestAmount en AccountsReceivable      |
| `src/app/core/models/company-config.model.ts`           | Modify | +3 campos de interés en request y response |
| `src/app/core/services/cxc.service.ts`                  | Modify | +calculateInterest(), +getIntereses()      |
| `src/app/core/services/company-config.service.ts`       | Modify | Mapear campos nuevos                       |
| `src/app/features/admin/company/company-form.ts`        | Modify | +3 form controls                           |
| `src/app/features/admin/company/company-form.html`      | Modify | +3 form fields                             |
| `src/app/features/ventas/cxc/cxc-list.ts`               | Modify | +columna interés, +botón calcular          |
| `src/app/features/ventas/cxc/cxc-list.html`             | Modify | +columna y botón                           |

## Testing Strategy

| Capa            | Qué probar                              | Enfoque                                                                                                                                                                                                        |
| --------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit**        | PosDevolutionUseCase                    | Mock repos. Test: factura no encontrada → 404, cantidades > original → 400, devolución total → stock restaurado, devolución parcial → solo items especificados, factura crédito → AR.outstanding reducido      |
| **Unit**        | InterestCalculationService              | Mock AR repo y CompanyConfig repo. Test: AR sin interest_rate usa config.rate, AR con interest_rate propio prevalece, last_interest_calc_date==today → skip, múltiples ARs en batch, graceDays pospone cálculo |
| **Unit**        | AccountsReceivableUseCase.markOverdue() | Verificar que markOverdue dispara InterestCalculationService                                                                                                                                                   |
| **Unit**        | Frontend services                       | DevolutionService.submit() → llama POST correcto. CxcService.calculateInterest() → POST /calculate-interest                                                                                                    |
| **Integration** | PosController + PosDevolutionUseCase    | SpringBootTest + TestRestTemplate. Crear INVOICE vía API → POST /devolutions → verificar CREDIT_NOTE creado, stock incrementado                                                                                |
| **Integration** | InterestCalculationService + Scheduler  | Verificar @Scheduled se ejecuta, no recalcula mismo día                                                                                                                                                        |
| **Integration** | Flyway migrations                       | V55/V56/V57 se ejecutan sin errores en BD de prueba                                                                                                                                                            |

## Open Questions

- [ ] ¿La devolución de una factura de crédito con pago parcial (`paidAmount > 0`) solo reduce `outstanding` — no toca `paidAmount`? Confirmar con negocio.
- [ ] ¿El `reason` de devolución se persiste en el campo `notes` del kardex o como campo propio en SalesDocument?
