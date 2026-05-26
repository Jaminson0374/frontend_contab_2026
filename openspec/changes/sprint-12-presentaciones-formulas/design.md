# Design: Sprint 12 — Presentaciones y Fórmulas/Combo

## Technical Approach

Two hexagonal stacks: **Presentations** extends `Product` with weak entity `ProductPresentation` (1→N, CRUD inline in `product-form` tab). **Formulas/Combo** introduces `ProductFormula`, `ProductionBatch`, and `ProductionBatchItem` — the core `FormulaProductionUseCase.produce()` orchestrates 7-step atomic batch production with full kardex cost accounting (MPD + MOD + CIF = unit cost). `costing_method` centralizes from `products` to `company_config` (V62-V63).

## Architecture Decisions

| #   | Decisión                             | Opciones                                                                                                                                                    | Tradeoffs                                                                                                                                                                                             | Elección                                                                                                                                                                    |
| --- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `costing_method` centralization      | A) Solo `company_config`. B) Ambos con fallback `company_config`                                                                                            | A es lo que dice el proposal (política de empresa, no de producto). B agrega complejidad de cascada y sincronización. Riesgo #1 ya cubierto en proposal: migrar queries existentes                    | **A** — Centralizar en `company_config`, eliminar de `products` (V63)                                                                                                       |
| 2   | Kardex cost lookup                   | A) `KardexRepository.getUnitCost(productId)` consulta último movimiento. B) Weighted average en tiempo real sobre todos los ENTRY. C) PEPS con `LIMIT 1000` | B es O(n) con millones de registros. A es O(1) si hay índice `(product_id, movement_date DESC)`. C es correcto para PEPS pero computacionalmente más costoso. Proposal define A con filtro por método | **A + C** — `getUnitCost()` devuelve costo según `company_config.costing_method`: WEIGHTED_AVERAGE → avg ponderado de ENTRY con stock > 0; PEPS → primer ENTRY no consumido |
| 3   | MovementType: dónde agregar 3 nuevos | A) `MovementType` enum en backend + union type en frontend. B) Enum separado `ProductionMovementType`                                                       | B crea bifurcación innecesaria. A sigue el patrón existente (ENTRY/EXIT/ADJUSTMENT/TRANSFER_IN/TRANSFER_OUT/DISPOSAL). Misma estrategia V34/V55: DROP + ADD CHECK constraint                          | **A** — `PRODUCTION_CONSUMPTION`, `PRODUCTION_OUTPUT`, `PRODUCTION_SHRINKAGE` en `MovementType` + CHECK constraint en V63                                                   |
| 4   | Batch atomicity                      | A) Full rollback (`@Transactional`). B) Partial commit (componentes que sí hay stock se consumen)                                                           | B deja el batch en estado inconsistente (producto sin todos sus componentes). A es seguro: validación previa `SELECT ... FOR UPDATE` + rollback si cualquier paso falla. Riesgo #3 del proposal       | **A** — Transacción atómica: todo o nada                                                                                                                                    |
| 5   | Presentaciones en POS                | A) Exponer como items separados en POS ahora. B) Solo modelo de datos ahora, POS en sprint futuro                                                           | Proposal explícitamente dice "fuera de alcance inmediato". A requeriría modificar `PosCheckoutUseCase` y UI de venta — alto riesgo para sprint 12                                                     | **B** — Solo CRUD y modelo; POS en sprint futuro                                                                                                                            |
| 6   | Fórmulas en product create           | A) Solo visibles/creables durante product create/edit. B) CRUD independiente con ruta propia                                                                | La fórmula es dependiente del producto (FK `product_id`). B permitiría fórmulas huérfanas. A sigue el patrón de `warehouses/suppliers` inline en product-form                                         | **A** — Tab "Fórmula" visible solo si `productType.code ∈ {COMBO, FORMULA}`; CRUD inline                                                                                    |
| 7   | Overhead allocation                  | A) MOD como base (default). B) MPD como base. C) Manual por batch                                                                                           | Industria cárnica colombiana: mano de obra es el principal driver de CIF (desposte, empaque). B es menos común. C es para plantas con costeo avanzado. Proposal default es MOD                        | **A** — Default `company_config.overhead_allocation_base = 'MOD'`, `overhead_rate` configurable                                                                             |
| 8   | Default presentation                 | A) `is_default=true` en una sola presentación. B) Sin default, el producto base es siempre el default                                                       | A es explícito y validable (CHECK + backend + frontend). B es ambiguo cuando hay 3 presentaciones: ¿cuál muestro en listas?                                                                           | **A** — Exactamente una presentación `is_default=true` por producto; validación backend + frontend                                                                          |

## Data Flow

```
ProductionBatchComponent              FormulaProductionUseCase
       │                                      │
       │ POST /api/v1/production/batches      │
       ├──────────────────────────────────────▶
       │                                      │ 1. Load formula (productId → components[])
       │                                      │ 2. Validate stock for ALL components
       │                                      │    SELECT ... FOR UPDATE (pessimistic lock)
       │                                      │ 3. For each component:
       │                                      │    ├── KardexRepository.getUnitCost(productId)
       │                                      │    ├── RecordMovementUseCase.record(
       │                                      │    │     PRODUCTION_CONSUMPTION, qty, unitCost)
       │                                      │    └── stockRepo.save(qty - consumedQty)
       │                                      │ 4. MPD = Σ(actualQty × unitCostKardex)
       │                                      │ 5. CIF = MOD × overhead_rate / 100
       │                                      │    (or CIF = MPD × overhead_rate if base=MPD)
       │                                      │ 6. totalCost = MPD + MOD + CIF
       │                                      │    unitCost = totalCost / quantityProduced
       │                                      │ 7. RecordMovementUseCase.record(
       │                                      │      PRODUCTION_OUTPUT, quantityProduced, unitCost)
       │                                      │    stockRepo.save(qty + quantityProduced)
       │                                      │ 8. If shrinkage: RecordMovementUseCase.record(
       │                                      │      PRODUCTION_SHRINKAGE, qty, 0)
       │                                      │ 9. Persist ProductionBatch + Items
       │◀──────────────────────────────────────
       │                                      Transaction boundary (@Transactional)
       │                                      Any failure → full rollback
```

```
ProductFormComponent (tab Presentaciones)
       │
       ├── GET /api/v1/products/{id}  →  includes presentations[]
       ├── POST /api/v1/products/{id}/presentations  (add)
       ├── PUT /api/v1/products/{id}/presentations/{presentationId}  (edit)
       └── DELETE /api/v1/products/{id}/presentations/{presentationId}  (remove)

ProductFormComponent (tab Fórmula — visible type ∈ {COMBO, FORMULA})
       │
       ├── GET /api/v1/production/formulas/{productId}  →  components[]
       ├── POST /api/v1/products/{id}/formula-items  (add component)
       ├── PUT /api/v1/products/{id}/formula-items/{itemId}  (edit)
       └── DELETE /api/v1/products/{id}/formula-items/{itemId}  (remove)
```

## API Contracts

### Slice 1 — Presentaciones

```
GET /api/v1/products/{id}
  Response 200: {
    ...Product,
    presentations: [{
      id: UUID,
      unitOfMeasureId: UUID,
      conversionFactor: BigDecimal,    // relativo a UoM base del producto
      salePriceOverride: BigDecimal?,  // null = usa product.salePrice
      isDefault: boolean
    }]
  }

POST /api/v1/products/{id}/presentations
  Request: { unitOfMeasureId: UUID, conversionFactor: BigDecimal, salePriceOverride?: BigDecimal, isDefault: boolean }
  Response 201: ProductPresentation
  Errors: 400 (duplicate UoM), 400 (duplicate isDefault=true)

PUT /api/v1/products/{id}/presentations/{presentationId}
  Request: { conversionFactor?: BigDecimal, salePriceOverride?: BigDecimal, isDefault?: boolean }
  Response 200: ProductPresentation

DELETE /api/v1/products/{id}/presentations/{presentationId}
  Response 204

GET /api/v1/products/{id}/presentations
  Response 200: ProductPresentation[]
```

### Slice 2 — Fórmulas/Combo

```
GET /api/v1/production/formulas/{productId}
  Response 200: [{
    id: UUID,
    productId: UUID,
    componentProductId: UUID,
    componentName: string,            // JOIN
    plannedQuantity: BigDecimal,
    unitOfMeasureId: UUID
  }]

POST /api/v1/products/{id}/formula-items
  Request: { componentProductId: UUID, plannedQuantity: BigDecimal, unitOfMeasureId: UUID }
  Response 201: ProductFormula

DELETE /api/v1/products/{id}/formula-items/{itemId}
  Response 204

POST /api/v1/production/batches
  Request: {
    productId: UUID,                  // producto tipo FORMULA/COMBO
    quantityProduced: BigDecimal,
    directLaborCost: BigDecimal,      // MOD manual
    notes?: string
  }
  Response 201: {
    id: UUID,
    productId: UUID,
    quantityProduced: BigDecimal,
    expectedQuantity: BigDecimal,       // Σ planned
    directMaterialCost: BigDecimal,     // MPD calculado
    directLaborCost: BigDecimal,        // MOD
    overheadCost: BigDecimal,           // CIF calculado
    totalCost: BigDecimal,
    unitCost: BigDecimal,
    shrinkageQuantity: BigDecimal,
    shrinkageCost: BigDecimal,
    items: [{ componentName, plannedQty, actualQty, unitCostKardex, totalCost }]
  }
  Errors: 400 (out of stock), 400 (product has no formula), 404 (product not found)

GET /api/v1/production/batches/{id}
  Response 200: ProductionBatch (con items[])

GET /api/v1/production/batches?productId={UUID}&from={date}&to={date}&page=0&size=20
  Response 200: Page<ProductionBatch>

PUT /api/v1/admin/company-config  (extendido)
  Request: +costingMethod: string, +overheadAllocationBase: string, +overheadRate: BigDecimal
```

## Data Model

### V58 — product_presentations

```sql
CREATE TABLE product_presentations (
    id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id          UUID           NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    unit_of_measure_id  UUID           NOT NULL REFERENCES unit_of_measures(id),
    conversion_factor   NUMERIC(10,4)  NOT NULL CHECK (conversion_factor > 0),
    sale_price_override NUMERIC(15,2),
    is_default          BOOLEAN        NOT NULL DEFAULT FALSE,
    version             BIGINT         NOT NULL DEFAULT 0,
    UNIQUE(product_id, unit_of_measure_id)
);
```

### V59 — product_formulas

```sql
CREATE TABLE product_formulas (
    id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id           UUID           NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    component_product_id UUID           NOT NULL REFERENCES products(id),
    planned_quantity     NUMERIC(12,4)  NOT NULL CHECK (planned_quantity > 0),
    unit_of_measure_id   UUID           NOT NULL REFERENCES unit_of_measures(id),
    version              BIGINT         NOT NULL DEFAULT 0,
    UNIQUE(product_id, component_product_id)
);
```

### V60 — production_batches

```sql
CREATE TABLE production_batches (
    id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id            UUID           NOT NULL REFERENCES products(id),
    quantity_produced     NUMERIC(12,4)  NOT NULL CHECK (quantity_produced > 0),
    expected_quantity     NUMERIC(12,4)  NOT NULL DEFAULT 0,
    direct_material_cost  NUMERIC(15,2)  NOT NULL DEFAULT 0,
    direct_labor_cost     NUMERIC(15,2)  NOT NULL DEFAULT 0,
    overhead_cost         NUMERIC(15,2)  NOT NULL DEFAULT 0,
    total_cost            NUMERIC(15,2)  NOT NULL DEFAULT 0,
    unit_cost             NUMERIC(15,2)  NOT NULL DEFAULT 0,
    shrinkage_quantity    NUMERIC(12,4)  NOT NULL DEFAULT 0,
    shrinkage_cost        NUMERIC(15,2)  NOT NULL DEFAULT 0,
    notes                 TEXT,
    created_by            VARCHAR(100),
    created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    version               BIGINT         NOT NULL DEFAULT 0
);
```

### V61 — production_batch_items

```sql
CREATE TABLE production_batch_items (
    id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id             UUID           NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
    component_product_id UUID           NOT NULL REFERENCES products(id),
    planned_quantity     NUMERIC(12,4)  NOT NULL,
    actual_quantity      NUMERIC(12,4)  NOT NULL,
    unit_cost_kardex     NUMERIC(15,2)  NOT NULL,
    total_cost           NUMERIC(15,2)  NOT NULL,
    kardex_movement_id   UUID           REFERENCES kardex_movements(id),
    version              BIGINT         NOT NULL DEFAULT 0
);
```

### V62 — ALTER company_config (costeo)

```sql
ALTER TABLE company_config ADD COLUMN IF NOT EXISTS costing_method VARCHAR(20) DEFAULT 'WEIGHTED_AVERAGE';
ALTER TABLE company_config ADD COLUMN IF NOT EXISTS overhead_allocation_base VARCHAR(10) DEFAULT 'MOD';
ALTER TABLE company_config ADD COLUMN IF NOT EXISTS overhead_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE company_config ADD CONSTRAINT chk_costing_method
    CHECK (costing_method IN ('WEIGHTED_AVERAGE', 'PEPS'));
ALTER TABLE company_config ADD CONSTRAINT chk_overhead_base
    CHECK (overhead_allocation_base IN ('MOD', 'MPD'));
```

### V63 — MovementType + DROP products.costing_method

```sql
ALTER TABLE kardex_movements DROP CONSTRAINT IF EXISTS kardex_movements_type_check;
ALTER TABLE kardex_movements ADD CONSTRAINT kardex_movements_type_check
    CHECK (movement_type IN ('ENTRY','EXIT','ADJUSTMENT','TRANSFER_IN','TRANSFER_OUT','DISPOSAL','PRODUCTION_CONSUMPTION','PRODUCTION_OUTPUT','PRODUCTION_SHRINKAGE'));

ALTER TABLE products DROP COLUMN IF EXISTS costing_method;
```

## Component Tree (Frontend)

```
app-shell
├── /inventario/articulos/nuevo  →  ProductFormComponent  (MODIFICADO)
│   ├── [tab 0-6 existentes]
│   ├── <mat-tab label="Presentaciones">          ← NUEVO tab 7
│   │   └── PresentationsTabComponent             ← standalone embedded
│   │       ├── PresentationRowComponent           (fila edit/inline)
│   │       └── PresentationAddForm                (form agregar)
│   └── <mat-tab label="Fórmula" *ngIf="isFormula()">  ← NUEVO tab 8
│       └── FormulaTabComponent                   ← standalone embedded
│           ├── FormulaItemRowComponent            (fila edit/inline)
│           └── FormulaItemAddForm                 (product search + qty + UoM)
│
└── /produccion/lotes  →  ProductionBatchComponent  (NUEVO)
    ├── FormulaProductSelector                     (buscar producto FORMULA/COMBO)
    ├── ComponentPreviewTable                      (componentes + costos estimados)
    ├── CostSummaryPanel                           (MOD input + MPD + CIF + unit cost preview)
    └── BatchConfirmation                          (quantity, notes, submit)
```

## File List

### Backend (C:\POS_VTA\backend_pos-vta)

| Archivo                                                                     | Acción | Descripción                                                        |
| --------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------ |
| `domain/model/ProductPresentation.java`                                     | Create | Domain record                                                      |
| `domain/model/ProductFormula.java`                                          | Create | Domain record                                                      |
| `domain/model/ProductionBatch.java`                                         | Create | Domain record                                                      |
| `domain/model/ProductionBatchItem.java`                                     | Create | Domain record                                                      |
| `domain/model/MovementType.java`                                            | Modify | +PRODUCTION_CONSUMPTION, +PRODUCTION_OUTPUT, +PRODUCTION_SHRINKAGE |
| `domain/model/Product.java`                                                 | Modify | +List\<ProductPresentation\>                                       |
| `domain/model/CompanyConfig.java`                                           | Modify | +costingMethod, +overheadAllocationBase, +overheadRate             |
| `domain/repository/ProductPresentationRepository.java`                      | Create | CRUD + findByProductId                                             |
| `domain/repository/ProductFormulaRepository.java`                           | Create | CRUD + findByProductId                                             |
| `domain/repository/ProductionBatchRepository.java`                          | Create | CRUD + findByProductId paginado                                    |
| `domain/repository/KardexRepository.java`                                   | Modify | +getUnitCost(productId)                                            |
| `infrastructure/adapters/out/persistence/ProductPresentationJpaEntity.java` | Create | JPA entity                                                         |
| `infrastructure/adapters/out/persistence/ProductFormulaJpaEntity.java`      | Create | JPA entity                                                         |
| `infrastructure/adapters/out/persistence/ProductionBatchJpaEntity.java`     | Create | JPA entity                                                         |
| `infrastructure/adapters/out/persistence/ProductionBatchItemJpaEntity.java` | Create | JPA entity                                                         |
| `infrastructure/adapters/out/persistence/ProductEntity.java`                | Modify | +@OneToMany presentations                                          |
| `infrastructure/adapters/out/persistence/CompanyConfigEntity.java`          | Modify | +3 columnas                                                        |
| `infrastructure/adapters/out/persistence/ProductPresentationMapper.java`    | Create | Domain ↔ JPA                                                       |
| `infrastructure/adapters/out/persistence/ProductFormulaMapper.java`         | Create | Domain ↔ JPA                                                       |
| `infrastructure/adapters/out/persistence/ProductionBatchMapper.java`        | Create | Domain ↔ JPA                                                       |
| `infrastructure/adapters/out/persistence/KardexJpaRepository.java`          | Modify | +query getUnitCost                                                 |
| `application/usecase/ProductPresentationUseCase.java`                       | Create | CRUD use case                                                      |
| `application/usecase/ProductFormulaUseCase.java`                            | Create | CRUD use case                                                      |
| `application/usecase/FormulaProductionUseCase.java`                         | Create | Batch production orchestrator                                      |
| `application/usecase/ProductionBatchRequest.java`                           | Create | Request DTO                                                        |
| `application/usecase/ProductionBatchResponse.java`                          | Create | Response DTO                                                       |
| `application/usecase/CompanyConfigUseCase.java`                             | Modify | +3 campos costeo                                                   |
| `application/dto/ProductResponse.java`                                      | Modify | +presentations[]                                                   |
| `application/dto/CompanyConfigRequest.java`                                 | Modify | +costingMethod, +overheadAllocationBase, +overheadRate             |
| `application/dto/CompanyConfigResponse.java`                                | Modify | +3 campos costeo                                                   |
| `infrastructure/adapters/in/rest/ProductController.java`                    | Modify | +presentation endpoints                                            |
| `infrastructure/adapters/in/rest/ProductionController.java`                 | Create | /production/batches, /production/formulas/{productId}              |
| `resources/db/migration/V58__product_presentations.sql`                     | Create | CREATE TABLE                                                       |
| `resources/db/migration/V59__product_formulas.sql`                          | Create | CREATE TABLE                                                       |
| `resources/db/migration/V60__production_batches.sql`                        | Create | CREATE TABLE                                                       |
| `resources/db/migration/V61__production_batch_items.sql`                    | Create | CREATE TABLE                                                       |
| `resources/db/migration/V62__company_cost_config.sql`                       | Create | ALTER company_config                                               |
| `resources/db/migration/V63__movement_types_and_drop_product_costing.sql`   | Create | ALTER CHECK + DROP COLUMN                                          |

### Frontend (C:\POS_VTA\posinvent)

| Archivo                                                               | Acción | Descripción                                                                        |
| --------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| `src/app/core/models/product.model.ts`                                | Modify | +ProductPresentation interface, -costingMethod de Product, +presentations[]        |
| `src/app/core/models/production.model.ts`                             | Create | ProductFormula, ProductionBatch, ProductionBatchItem, ProductionBatchRequest       |
| `src/app/core/models/kardex.model.ts`                                 | Modify | +PRODUCTION_CONSUMPTION, +PRODUCTION_OUTPUT, +PRODUCTION_SHRINKAGE en MovementType |
| `src/app/core/models/company-config.model.ts`                         | Modify | +costingMethod, +overheadAllocationBase, +overheadRate en Request y Response       |
| `src/app/core/services/presentation.service.ts`                       | Create | PresentationService (httpResource para CRUD de presentaciones)                     |
| `src/app/core/services/production.service.ts`                         | Create | ProductionService (httpResource: getFormulas, produce, getBatches)                 |
| `src/app/features/admin/products/product-form/presentations-tab.ts`   | Create | PresentationsTabComponent standalone embedido                                      |
| `src/app/features/admin/products/product-form/presentations-tab.html` | Create | Template                                                                           |
| `src/app/features/admin/products/product-form/formula-tab.ts`         | Create | FormulaTabComponent standalone embedido                                            |
| `src/app/features/admin/products/product-form/formula-tab.html`       | Create | Template                                                                           |
| `src/app/features/admin/products/product-form/product-form.ts`        | Modify | +2 tabs condicionales, -costingMethod del form, +isFormula() computed              |
| `src/app/features/admin/products/product-form/product-form.html`      | Modify | +<mat-tab> Presentaciones y Fórmula                                                |
| `src/app/features/produccion/lotes/production-batch.ts`               | Create | ProductionBatchComponent                                                           |
| `src/app/features/produccion/lotes/production-batch.html`             | Create | Template                                                                           |
| `src/app/features/produccion/lotes/production-batch.css`              | Create | Estilos                                                                            |
| `src/app/app.routes.ts`                                               | Modify | +ruta /produccion/lotes                                                            |
| `src/app/layout/shell/shell.ts`                                       | Modify | +grupo "Producción" en NavModule[]                                                 |
| `src/app/features/admin/company/company-form.ts`                      | Modify | +3 campos de costeo en form (costingMethod, overheadBase, overheadRate)            |
| `src/app/features/admin/company/company-form.html`                    | Modify | +3 form fields                                                                     |

## Testing Strategy

| Capa                | Qué probar                        | Enfoque                                                                                                                                                                             |
| ------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit (backend)**  | FormulaProductionUseCase          | Mock repos. Test: stock insuficiente → rollback, fórmula sin componentes → 400, batch exitoso → MPD+MOD+CIF calculados, merma → shrinkage registrado, concurrent batch → FOR UPDATE |
| **Unit (backend)**  | KardexRepository.getUnitCost()    | Test: WEIGHTED_AVERAGE con múltiples ENTRY, PEPS con órdenes de entrada por fecha, sin movimientos → 0                                                                              |
| **Unit (backend)**  | ProductPresentationUseCase        | Test: isDefault duplicado → 400, UoM duplicado por producto → 400, delete último default → 400                                                                                      |
| **Unit (frontend)** | PresentationsTabComponent         | Test: renderiza tabla con presentaciones, agrega fila → aparece en tabla, edita → actualiza inline, delete → remueve fila                                                           |
| **Unit (frontend)** | ProductionBatchComponent          | Test: selecciona producto → carga fórmula, ingresa MOD → preview costos calculados, submit → llama POST                                                                             |
| **Integration**     | FormulaProductionUseCase + kardex | SpringBootTest: crear batch → verificar kardex_movements (3 tipos), stock actualizado, production_batch_items con kardex_movement_id                                                |
| **Integration**     | Flyway migrations                 | V58-V63 ejecutan sin errores en BD test. CHECK constraint con 9 movement types válido                                                                                               |
| **E2E**             | ProductForm tabs                  | Crear producto → cambiar tabs → Presentaciones y Fórmula visibles según tipo. CRUD de presentación inline.                                                                          |
| **E2E**             | Production batch flow             | Navigate → /produccion/lotes → seleccionar producto COMBO → llenar MOD → confirmar → verificar batch created                                                                        |

## Migration / Rollout

- **V58-V62**: Sin dependencias entre sí, ejecutan en orden Flyway. Solo agregan tablas y columnas.
- **V63**: Depende de V58-V62. Modifica CHECK constraint de `kardex_movements` (DROP + ADD) y elimina `products.costing_method`. Requiere ventana de bajo volumen transaccional (misma estrategia V34/V55).
- **Rollback**: V63→V58 en orden inverso. Restaurar `products.costing_method` con `ALTER TABLE products ADD COLUMN costing_method VARCHAR(20) DEFAULT 'PROMEDIO_PONDERADO'`. Revertir CHECK constraint original. Eliminar archivos nuevos del stack hexagonal (6 stacks ≈ 20+ archivos backend, 8 frontend).

## Open Questions

- [ ] ¿El kardex de `PRODUCTION_SHRINKAGE` debe tener `unit_cost=0` o el mismo `unit_cost` del batch? Propongo `unit_cost=0` (la merma es pérdida total, no entra al inventario; el costo ya está absorbido en el `unit_cost` del producto terminado).
- [ ] ¿`GET /api/v1/products` (listado) debe incluir `presentations[]` o solo `GET /api/v1/products/{id}`? Propongo solo en detalle (`/{id}`) para no inflar el listado.
- [ ] ¿El `company_config.overhead_rate` debe ser un porcentaje entero (0-100) o un factor (0.0-1.0)? Propongo porcentaje entero `NUMERIC(5,2)` para mantener consistencia con `profitMargin` que ya usa %.
