# Inventario — Fórmulas y Producción Specification

## Purpose

Enable compound products (sausages, combos, manufactured goods) that consume raw materials from inventory via kardex with full industrial cost accounting: raw material cost (MPD) at kardex real cost, direct labor (MOD), manufacturing overhead (CIF), shrinkage (merma), and unit cost calculation. All movements traceable through kardex.

---

## ADDED Requirements

| ID          | Requirement                                                                    | Strength |
| ----------- | ------------------------------------------------------------------------------ | -------- |
| REQ-INV-120 | Table `product_formulas` with component-product FKs and planned quantities     | MUST     |
| REQ-INV-121 | Full hexagonal stack: ProductFormula CRUD                                      | MUST     |
| REQ-INV-122 | Tables `production_batches` + `production_batch_items` with cost fields        | MUST     |
| REQ-INV-123 | `FormulaProductionUseCase.produce()` orchestrates 7-step batch atomically      | MUST     |
| REQ-INV-124 | MPD = Σ(actual_quantity × kardex_unit_cost) — kardex cost, not purchase price  | MUST     |
| REQ-INV-125 | MOD captured manually per batch as direct labor cost                           | MUST     |
| REQ-INV-126 | CIF = overhead_base × overhead_rate from company_config                        | MUST     |
| REQ-INV-127 | Unit cost = (MPD + MOD + CIF) / quantity_produced                              | MUST     |
| REQ-INV-128 | Kardex: `PRODUCTION_CONSUMPTION` movement for component exits                  | MUST     |
| REQ-INV-129 | Kardex: `PRODUCTION_OUTPUT` movement for finished product entry                | MUST     |
| REQ-INV-130 | Kardex: `PRODUCTION_SHRINKAGE` movement for merma                              | MUST     |
| REQ-INV-131 | `company_config.costing_method`: WEIGHTED_AVERAGE or FIFO (company-wide)       | MUST     |
| REQ-INV-132 | `company_config` fields: `overhead_allocation_base`, `overhead_rate`           | MUST     |
| REQ-INV-133 | `KardexRepository.getUnitCost(productId)` per costing method                   | MUST     |
| REQ-INV-134 | `production_batch_items.kardex_movement_id` links each consumption to kardex   | MUST     |
| REQ-INV-135 | `@Transactional`: full rollback if any step fails (inventory consistency)      | MUST     |
| REQ-INV-136 | `SELECT ... FOR UPDATE` on stock validation prevents concurrent batch conflict | MUST     |
| REQ-INV-137 | Shrinkage: `PRODUCTION_SHRINKAGE` when `actual_quantity < planned_quantity`    | MUST     |
| REQ-INV-138 | `FormulaManagerComponent` tab in product-form for FORMULA/COMBO products       | MUST     |
| REQ-INV-139 | `ProductionBatchComponent` at `/produccion/lotes` with cost preview            | MUST     |
| REQ-INV-140 | Shell menu "Producción" enabled with correct route                             | MUST     |
| REQ-INV-141 | `POST /api/v1/production/batches` — create and execute batch                   | MUST     |
| REQ-INV-142 | `GET /api/v1/production/batches/{id}` — batch detail with items and costs      | MUST     |
| REQ-INV-143 | `GET /api/v1/production/batches?formulaId=` — batch history per formula        | MUST     |
| REQ-INV-144 | `GET /api/v1/production/formulas/{productId}` — formula components             | MUST     |

---

### REQ-INV-120 — Table `product_formulas`

The system MUST create table `product_formulas` with: `id` (PK), `product_id` (FK → products), `component_product_id` (FK → products), `planned_quantity` (DECIMAL(12,4)), `unit_of_measure_id` (FK → unit_of_measures), `created_at`, `updated_at`. Unique constraint on `(product_id, component_product_id)`.

#### Scenario: Migración V59 crea fórmula

- GIVEN Flyway V59 runs
- WHEN `product_formulas` is created
- THEN a formula for product CHORIZO with components CARNE_RES(2kg), GRASA_CERDO(0.5kg), CONDIMENTOS(0.05kg) can be persisted
- AND duplicate `(product_id, component_product_id)` is rejected

---

### REQ-INV-121 — Hexagonal Stack: ProductFormula

Full hexagonal stack: `ProductFormula` (domain record), `ProductFormulaJpaEntity`, `ProductFormulaRepository`, `ProductFormulaUseCase`, `ProductFormulaController`.

#### Scenario: CRUD de componentes de fórmula

- GIVEN product CHORIZO is type FORMULA
- WHEN `POST /api/v1/production/formulas/CHORIZO/components` with `{ componentProductId: CARNE_RES, plannedQuantity: 2.0, uomId: KG }`
- THEN 201 — component added to formula
- AND `GET /api/v1/production/formulas/CHORIZO` returns all components with planned quantities

#### Scenario: Eliminar componente

- GIVEN formula has 3 components
- WHEN `DELETE /api/v1/production/formulas/CHORIZO/components/{id}`
- THEN 200 — component removed; formula now has 2 components

---

### REQ-INV-122 — Tables `production_batches` + `production_batch_items`

`production_batches` MUST include: `id`, `formula_id` (FK), `quantity_produced`, `expected_quantity`, `direct_material_cost`, `direct_labor_cost`, `overhead_cost`, `total_cost`, `unit_cost`, `shrinkage_quantity`, `shrinkage_cost`, `notes`, `created_by`, `created_at`.

`production_batch_items` MUST include: `id`, `batch_id` (FK), `component_product_id` (FK), `planned_quantity`, `actual_quantity`, `unit_cost_kardex`, `total_cost`, `kardex_movement_id` (FK nullable), `created_at`.

#### Scenario: Batch completo persistido

- GIVEN a production batch for CHORIZO produces 50kg
- WHEN batch completes successfully
- THEN `production_batches` row has `total_cost = MPD + MOD + CIF`, `unit_cost = total_cost / 50`
- AND `production_batch_items` has one row per component with `kardex_movement_id` linking to kardex

---

### REQ-INV-123 — `FormulaProductionUseCase.produce()` Orchestration

The use case MUST execute these steps atomically:

1. Validate formula exists and product is FORMULA/COMBO type
2. Validate stock: each component has sufficient inventory (FOR UPDATE lock)
3. For each component: get kardex unit cost via `KardexRepository.getUnitCost()`
4. For each component: `PRODUCTION_CONSUMPTION` kardex exit at real cost
5. Calculate MPD = Σ(actual_qty × unit_cost_kardex)
6. Calculate CIF = (MOD if base=MOD else MPD) × overhead_rate
7. Total = MPD + MOD + CIF; Unit cost = total / quantity_produced
8. `PRODUCTION_OUTPUT` kardex entry for finished product at unit cost
9. If actual_qty < planned_qty: `PRODUCTION_SHRINKAGE` for the delta
10. Persist `ProductionBatch` + all `ProductionBatchItems`

#### Scenario: Batch exitoso — chorizo 50kg

- GIVEN formula CHORIZO: CARNE_RES(20kg planned), GRASA_CERDO(5kg), CONDIMENTOS(0.5kg)
- AND kardex unit costs: CARNE_RES=$12,000/kg, GRASA_CERDO=$5,000/kg, CONDIMENTOS=$8,000/kg
- AND user provides MOD=$50,000, company_config: overhead_rate=15%, base=MOD
- WHEN `produce(productId=CHORIZO, quantityToProduce=50, laborCost=50000)`
- THEN MPD = (20×12000)+(5×5000)+(0.5×8000) = 240,000+25,000+4,000 = $269,000
- AND CIF = 50,000 × 0.15 = $7,500
- AND total_cost = 269,000 + 50,000 + 7,500 = $326,500
- AND unit_cost = 326,500 / 50 = $6,530
- AND kardex: CARNE_RES=−20kg(PRODUCTION_CONSUMPTION), GRASA_CERDO=−5kg, CONDIMENTOS=−0.5kg
- AND kardex: CHORIZO=+50kg(PRODUCTION_OUTPUT, unitCost=$6,530)
- AND `production_batch_items` has 3 rows, each with `kardex_movement_id`

#### Scenario: Rollback on stock insufficiency mid-batch

- GIVEN formula requires CARNE_RES(20kg) but only 15kg in stock
- WHEN `produce()` validates stock
- THEN `InsufficientStockException` thrown
- AND transaction rolls back — no kardex movements, no batch persisted
- AND HTTP 422: "Stock insuficiente: CARNE_RES requiere 20.00, disponible 15.00"

#### Scenario: Rollback on second component failure

- GIVEN CARNE_RES has stock (consumed successfully) but GRASA_CERDO insufficient
- WHEN the second component's stock is validated
- THEN entire transaction rolls back — CARNE_RES consumption is undone
- AND no partial batch or orphaned kardex entries remain

---

### REQ-INV-124 — MPD Uses Kardex Cost, Not Purchase Price

`Σ(actual_quantity × unit_cost_kardex)` MUST use the real kardex cost from `KardexRepository.getUnitCost(productId)`, which returns the unit cost per the configured costing method. Purchase price is NEVER used.

#### Scenario: FIFO consumes oldest cost layer

- GIVEN costing_method=FIFO, CARNE_RES has 2 cost layers: 10kg@$12,000 + 15kg@$13,500
- WHEN production consumes 12kg of CARNE_RES
- THEN first 10kg costed at $12,000, next 2kg at $13,500 = $147,000 total
- AND kardex PRODUCTION_CONSUMPTION entries reference both cost layers

#### Scenario: Weighted average uses blended cost

- GIVEN costing_method=WEIGHTED_AVERAGE, CARNE_RES: 10kg@$12,000 + 15kg@$13,500
- AND weighted avg = (120,000+202,500)/25 = $12,900
- WHEN production consumes 12kg of CARNE_RES
- THEN all 12kg costed at $12,900 = $154,800 total
- AND single kardex PRODUCTION_CONSUMPTION entry at $12,900/kg

---

### REQ-INV-125 — MOD Manual Capture

`direct_labor_cost` MUST be a user-provided value per batch. The system SHALL NOT auto-calculate MOD from payroll or timesheets. The field is required and MUST be > 0.

#### Scenario: MOD requerido en el request

- GIVEN `POST /api/v1/production/batches` is called
- WHEN `laborCost` is null, 0, or negative
- THEN 400: "directLaborCost is required and must be > 0"

---

### REQ-INV-126 — CIF Calculation

CIF MUST be calculated as: `base_value × (overhead_rate / 100)`, where `base_value` = MOD if `overhead_allocation_base='MOD'`, or MPD if `overhead_allocation_base='MPD'`.

#### Scenario: CIF based on MOD

- GIVEN overhead_allocation_base=MOD, overhead_rate=15%, MOD=$50,000
- WHEN CIF is calculated
- THEN CIF = 50,000 × 0.15 = $7,500

#### Scenario: CIF based on MPD

- GIVEN overhead_allocation_base=MPD, overhead_rate=10%, MPD=$269,000
- WHEN CIF is calculated
- THEN CIF = 269,000 × 0.10 = $26,900

#### Scenario: Overhead rate = 0 (no CIF)

- GIVEN overhead_rate=0
- WHEN CIF is calculated
- THEN CIF = $0; total_cost = MPD + MOD only

---

### REQ-INV-127 — Unit Cost Final

`unit_cost` MUST equal `(MPD + MOD + CIF) / quantity_produced`, rounded to 2 decimal places. This value SHALL be used as the kardex entry cost for `PRODUCTION_OUTPUT`.

#### Scenario: Unit cost with all components

- GIVEN MPD=$269,000, MOD=$50,000, CIF=$7,500, quantity_produced=50
- WHEN unit cost is calculated
- THEN unit_cost = 326,500 / 50 = $6,530.00

#### Scenario: Unit cost with fractional result

- GIVEN total_cost=$327,000, quantity_produced=47
- WHEN unit cost is calculated
- THEN unit_cost = 327,000 / 47 = $6,957.45 (rounded)

---

### REQ-INV-128 — Kardex `PRODUCTION_CONSUMPTION`

Each component consumed MUST generate a `MovementType.PRODUCTION_CONSUMPTION` kardex entry: negative quantity, unit cost from kardex, `total_cost = qty × unit_cost`. The movement ID SHALL be stored in `production_batch_items.kardex_movement_id`.

#### Scenario: Componente consumido con trazabilidad kardex

- GIVEN CARNE_RES consumed 20kg at $12,000/kg
- WHEN `PRODUCTION_CONSUMPTION` movement is recorded
- THEN kardex: movement_type=PRODUCTION_CONSUMPTION, qty=−20, unit_cost=$12,000, total=$240,000
- AND `production_batch_items.kardex_movement_id` points to this movement

---

### REQ-INV-129 — Kardex `PRODUCTION_OUTPUT`

The finished product MUST generate ONE `MovementType.PRODUCTION_OUTPUT` kardex entry: positive quantity, unit cost = calculated unit_cost, total = qty × unit_cost.

#### Scenario: Producto terminado ingresa a inventario

- GIVEN batch produces 50kg CHORIZO at unit_cost=$6,530
- WHEN `PRODUCTION_OUTPUT` is recorded
- THEN kardex: movement_type=PRODUCTION_OUTPUT, qty=+50, unit_cost=$6,530, total=$326,500
- AND inventory stock for CHORIZO increases by 50kg

---

### REQ-INV-130 — Kardex `PRODUCTION_SHRINKAGE`

If `actual_quantity < planned_quantity` for any component, the delta MUST generate a `MovementType.PRODUCTION_SHRINKAGE` kardex entry: zero quantity movement with `reason="MERMA: expected X, used Y"`. `shrinkage_cost = delta × unit_cost_kardex`.

#### Scenario: Merma registrada

- GIVEN component CARNE_RES: planned=20kg, actual=19.5kg, unit_cost=$12,000
- WHEN batch completes
- THEN PRODUCTION_SHRINKAGE: qty=0 (no stock change), reason="MERMA: CARNE_RES esperado 20.00, usado 19.50"
- AND shrinkage_cost = 0.5 × 12,000 = $6,000
- AND `production_batches.shrinkage_quantity = 0.5`, `shrinkage_cost = $6,000`

#### Scenario: Sin merma (actual == planned)

- GIVEN all components actual == planned
- WHEN batch completes
- THEN no PRODUCTION_SHRINKAGE entries
- AND shrinkage_quantity = 0, shrinkage_cost = 0

---

### REQ-INV-131 — Costing Method Centralized

`company_config.costing_method` MUST accept `'WEIGHTED_AVERAGE'` or `'FIFO'` (VARCHAR(20), DEFAULT 'WEIGHTED_AVERAGE'). The `products` table MUST NOT have a separate `costing_method` column (migrated and dropped in V63).

#### Scenario: Costing method query from company_config only

- GIVEN company_config.costing_method = 'FIFO'
- WHEN `KardexRepository.getUnitCost(productId)` is called
- THEN it reads from company_config, NOT from products table
- AND FIFO cost layering is applied

#### Scenario: Invalid costing method rejected

- GIVEN company_config.costing_method = 'LIFO'
- WHEN the config is saved
- THEN 400: "costingMethod must be WEIGHTED_AVERAGE or FIFO"

---

### REQ-INV-132 — Company Config Overhead Fields

`company_config` MUST include: `overhead_allocation_base` (VARCHAR(10) DEFAULT 'MOD', CHECK IN 'MOD','MPD'), `overhead_rate` (NUMERIC(5,2) DEFAULT 0). Admin form MUST expose these fields.

#### Scenario: Admin configura overhead

- GIVEN admin opens `/administracion/empresa`
- WHEN overhead_allocation_base is set to 'MPD' and overhead_rate to 12.5
- THEN `FormulaProductionUseCase` uses MPD × 0.125 for CIF calculation

---

### REQ-INV-133 — `KardexRepository.getUnitCost(productId)`

The repository MUST return the current unit cost per the configured costing method. FIFO: consume oldest positive-qty entries first. WEIGHTED_AVERAGE: weighted average of all positive-qty entries. Only ENTRY-type movements (purchase, production output) with remaining stock SHALL be considered.

#### Scenario: Weighted average with mixed sources

- GIVEN product has 3 purchase entries (10u@$100, 20u@$110, 15u@$105) and 1 production output (5u@$95)
- WHEN getUnitCost() with WEIGHTED_AVERAGE
- THEN cost = (1000+2200+1575+475)/50 = $105.00

#### Scenario: FIFO skips fully-consumed layers

- GIVEN 3 purchase entries: E1(10u@$100, consumed 8), E2(20u@$110, consumed 0), E3(15u@$105, consumed 0)
- WHEN getUnitCost() with FIFO
- THEN only remaining qty considered: 2u from E1 @ $100 → cost = $100

---

### REQ-INV-134 — Kardex Movement Traceability

Every `production_batch_item` MUST store `kardex_movement_id` FK, creating an unbroken audit chain: batch → item → kardex movement → costing layer. This enables full cost traceability from finished product to raw material purchase.

#### Scenario: Trazabilidad completa de costo

- GIVEN CHORIZO batch B-001 has 3 batch items
- WHEN user queries `GET /api/v1/production/batches/B-001`
- THEN each batch_item shows `kardex_movement_id` → links to PRODUCTION_CONSUMPTION movement
- AND each movement's `unit_cost` matches the raw material's purchase/production cost at that moment

---

### REQ-INV-135 — Atomic Transaction

`FormulaProductionUseCase.produce()` MUST be annotated `@Transactional`. Any exception at any step (validation, stock check, kardex write, batch persist) MUST roll back ALL changes.

#### Scenario: Kardex write fails midway — rollback

- GIVEN CARNE_RES consumption kardex entry succeeds, GRASA_CERDO consumption kardex entry succeeds
- WHEN CONDIMENTOS consumption kardex entry fails (DB constraint violation)
- THEN transaction rolls back
- AND CARNE_RES and GRASA_CERDO kardex entries are undone
- AND `production_batch` is NOT persisted
- AND HTTP 500 with error detail

---

### REQ-INV-136 — Pessimistic Lock on Stock Validation

During stock validation, the use case MUST use `SELECT ... FOR UPDATE` on inventory stock rows to prevent concurrent batches from consuming the same stock.

#### Scenario: Concurrent batches compete for same component

- GIVEN CARNE_RES stock = 25kg
- AND Batch-A requests 20kg (starts first, acquires lock)
- WHEN Batch-B requests 15kg concurrently
- THEN Batch-B waits for Batch-A's transaction to complete
- AND after Batch-A consumes 20kg, Batch-B sees remaining stock=5kg
- AND Batch-B fails with "Stock insuficiente: CARNE_RES requiere 15.00, disponible 5.00"

---

### REQ-INV-137 — Shrinkage Tracking

Shrinkage MUST be tracked per component: `shrinkage_quantity = planned - actual` (only when actual < planned). Total `shrinkage_cost = Σ(shrinkage_qty × unit_cost_kardex)`. Shrinkage generates `PRODUCTION_SHRINKAGE` kardex entries.

#### Scenario: Multiple components with shrinkage

- GIVEN formula: CARNE_RES(planned=20, actual=19.5, cost=$12,000), GRASA_CERDO(planned=5, actual=4.8, cost=$5,000), CONDIMENTOS(planned=0.5, actual=0.5)
- WHEN batch completes
- THEN 2 PRODUCTION_SHRINKAGE entries (CARNE_RES delta=0.5, GRASA_CERDO delta=0.2)
- AND total_shrinkage_cost = (0.5×12000)+(0.2×5000) = $7,000
- AND CONDIMENTOS has no shrinkage entry (actual == planned)

---

### REQ-INV-138 — FormulaManagerComponent in Product Form

`product-form` MUST render a "Fórmula" tab for products with `productType IN ('FORMULA', 'COMBO')`. The component SHALL display a sub-table of components with columns: product name, planned quantity, UoM. Inline add/delete.

#### Scenario: Tab visible only for FORMULA/COMBO

- GIVEN product CHORIZO is type FORMULA
- WHEN product form opens
- THEN "Fórmula" tab is visible among the tabs
- AND "Presentaciones" tab is also visible

#### Scenario: Tab hidden for SIMPLE products

- GIVEN product CARNE_RES is type SIMPLE
- WHEN product form opens
- THEN "Fórmula" tab is NOT rendered

#### Scenario: Agregar componente de fórmula

- GIVEN "Fórmula" tab is open for CHORIZO
- WHEN user clicks "Agregar componente" and selects CARNE_RES with qty=2kg
- THEN component appears in the table
- AND `POST /api/v1/production/formulas/CHORIZO/components` is called

---

### REQ-INV-139 — ProductionBatchComponent

`ProductionBatchComponent` at `/produccion/lotes` MUST provide:

- Formula selector dropdown (filtered to FORMULA/COMBO products)
- Auto-load formula components when formula selected
- `laborCost` input field (required, numeric)
- `quantityToProduce` input field (required, > 0)
- Cost preview panel (real-time or on-demand): MPD, MOD, CIF, total, unit cost, shrinkage estimate
- `notes` textarea
- "Ejecutar producción" submit button
- Success: Swal confirmation with batch summary

#### Scenario: Flujo completo de producción

- GIVEN user navigates to `/produccion/lotes`
- WHEN user selects CHORIZO formula, enters MOD=$50,000, qty=50, clicks "Vista previa de costos"
- THEN cost preview shows: MPD=$269,000, MOD=$50,000, CIF=$7,500, Total=$326,500, Unit=$6,530
- AND user reviews, clicks "Ejecutar producción"
- THEN `POST /api/v1/production/batches` is called
- AND Swal confirms: "Lote #B-001 producido — 50kg CHORIZO a $6,530/kg"

#### Scenario: Vista previa de costos vacía

- GIVEN no formula selected or laborCost empty
- WHEN user clicks "Vista previa de costos"
- THEN panel shows "--" or validation message; no API call made

#### Scenario: Validation — quantity zero

- GIVEN user enters quantity=0
- WHEN submit is clicked
- THEN inline error "Cantidad a producir debe ser mayor a 0"

---

### REQ-INV-140 — Shell Menu "Producción"

The shell MUST render a "Producción" menu item (or group) with route `/produccion/lotes`. Visible for roles with production access.

#### Scenario: Menú Producción habilitado

- GIVEN authenticated user with appropriate role
- WHEN shell sidebar renders
- THEN "Producción" menu item is visible and enabled (not disabled)
- AND clicking navigates to `/produccion/lotes`

#### Scenario: Lazy loading

- GIVEN first navigation to `/produccion/lotes`
- WHEN route activates
- THEN `ProductionBatchComponent` is lazy-loaded, not in initial bundle

---

### REQ-INV-141 — `POST /api/v1/production/batches`

Request body MUST include: `productId`, `quantityToProduce`, `laborCost`, `notes` (optional). Response: 201 with full `ProductionBatch` including all items, costs, and kardex movement IDs.

#### Scenario: Crear lote exitoso

- GIVEN valid formula, sufficient stock, MOD=$50,000
- WHEN `POST /api/v1/production/batches` with `{ productId: CHORIZO, quantityToProduce: 50, laborCost: 50000, notes: "Lote mañana" }`
- THEN 201 with `{ id, totalCost, unitCost, items[{ kardexMovementId, actualQuantity, totalCost }] }`

#### Scenario: Producto no es FORMULA/COMBO

- GIVEN product CARNE_RES is type SIMPLE
- WHEN `POST` with productId=CARNE_RES
- THEN 400: "Solo productos tipo FORMULA o COMBO pueden producirse en lote"

---

### REQ-INV-142 — `GET /api/v1/production/batches/{id}`

Returns full batch detail: batch header (id, qty, all costs), batch_items array (component, planned/actual qty, kardex cost, kardex movement ID), timestamps, creator.

#### Scenario: Batch detail with items

- GIVEN batch B-001 exists with 3 items
- WHEN `GET /api/v1/production/batches/B-001`
- THEN 200: `{ id, totalCost, unitCost, shrinkageQuantity, shrinkageCost, items[{ componentName, plannedQuantity, actualQuantity, unitCostKardex, kardexMovementId }], createdAt, createdBy }`

#### Scenario: Batch not found

- GIVEN batch B-999 does not exist
- WHEN `GET /api/v1/production/batches/B-999`
- THEN 404: "Lote de producción no encontrado"

---

### REQ-INV-143 — `GET /api/v1/production/batches?formulaId=`

Returns paginated list of batches for a specific formula/product. Ordered by `created_at DESC`. SHALL include batch summary: id, qty, totalCost, unitCost, createdAt.

#### Scenario: Historial de lotes por fórmula

- GIVEN CHORIZO has 3 historical batches
- WHEN `GET /api/v1/production/batches?formulaId=CHORIZO&page=0&size=20`
- THEN 200: `{ content: [{ id, quantityProduced, totalCost, unitCost, createdAt }, ...], totalElements: 3 }`

#### Scenario: Empty history

- GIVEN a formula with no batches yet
- WHEN `GET /api/v1/production/batches?formulaId=CHORIZO`
- THEN 200: `{ content: [], totalElements: 0 }`

---

### REQ-INV-144 — `GET /api/v1/production/formulas/{productId}`

Returns all components of a formula with their planned quantities, UoMs, and product names.

#### Scenario: Consultar componentes de fórmula

- GIVEN CHORIZO has 3 components
- WHEN `GET /api/v1/production/formulas/CHORIZO`
- THEN 200: `[{ componentProductId, componentProductName, plannedQuantity, uomId, uomName }, ...]`

#### Scenario: Producto sin fórmula

- GIVEN product CARNE_RES has no formula
- WHEN `GET /api/v1/production/formulas/CARNE_RES`
- THEN 200: `[]` (empty array, not 404)
