# Tasks: Sprint 12 — Presentaciones y Fórmulas/Combo

## Phase 1: Slice 1 — Presentaciones (Backend)

- [ ] 1.1 [BE] `V58__product_presentations.sql` — CREATE TABLE: id, product_id, unit_of_measure_id, conversion_factor, sale_price_override, is_default + UNIQUE(product_id, unit_of_measure_id)
- [ ] 1.2 [BE] `domain/model/ProductPresentation.java` — Java 21 record
- [ ] 1.3 [BE] `ProductPresentationJpaEntity.java` + `ProductPresentationMapper.java`
- [ ] 1.4 [BE] `domain/repository/ProductPresentationRepository.java` — interface
- [ ] 1.5 [BE] `application/usecase/ProductPresentationUseCase.java` — CRUD + validations: dup UoM→400, dup isDefault→400, conversionFactor>0
- [ ] 1.6 [BE] `ProductController.java` — add GET/POST/PUT/DELETE `/api/v1/products/{id}/presentations`
- [ ] 1.7 [BE] `Product.java` + `ProductEntity.java` + `ProductResponse.java` — add `List<ProductPresentation>`, `@OneToMany`, `presentations[]` in detail DTO

## Phase 2: Slice 1 — Presentaciones (Frontend)

- [ ] 2.1 [FE] `src/app/core/models/product.model.ts` — add `ProductPresentation` interface + `presentations[]` to Product
- [ ] 2.2 [FE] `src/app/core/services/presentation.service.ts` — httpResource: getByProduct, create, update, delete
- [ ] 2.3 [FE] `presentations-tab.ts` + `.html` — standalone: inline CRUD table, UoM dropdown, Swal delete, "⚡ Precio personalizado" badge, inline validation
- [ ] 2.4 [FE] `product-form.ts` + `.html` — add `<mat-tab label="Presentaciones">`

## Phase 3: Slice 2 — Fórmulas (Backend DB + Domain)

- [ ] 3.1 [BE] `V59__product_formulas.sql` — CREATE TABLE (UNIQUE(product_id, component_product_id))
- [ ] 3.2 [BE] `V60__production_batches.sql` — CREATE TABLE (11 cols: costs, shrinkage, notes, created_by)
- [ ] 3.3 [BE] `V61__production_batch_items.sql` — CREATE TABLE (FK→batches, FK→products, FK→kardex_movements)
- [ ] 3.4 [BE] `V62__company_cost_config.sql` — ALTER company_config: +costing_method, +overhead_allocation_base, +overhead_rate
- [ ] 3.5 [BE] `V63__movement_types_drop_product_costing.sql` — DROP+ADD CHECK (9 types), DROP products.costing_method
- [ ] 3.6 [BE] `domain/model/` — `ProductFormula.java`, `ProductionBatch.java`, `ProductionBatchItem.java` records
- [ ] 3.7 [BE] `infrastructure/.../persistence/` — 3 JPA entities + mappers
- [ ] 3.8 [BE] `domain/repository/` — `ProductFormulaRepository`, `ProductionBatchRepository` (paged)
- [ ] 3.9 [BE] `MovementType.java` — +PRODUCTION_CONSUMPTION, +PRODUCTION_OUTPUT, +PRODUCTION_SHRINKAGE
- [ ] 3.10 [BE] `CompanyConfig.java` + entity — +costingMethod, +overheadAllocationBase, +overheadRate

## Phase 4: Slice 2 — Fórmulas (Backend Production Logic)

- [ ] 4.1 [BE] `KardexRepository.java` + JPA impl — `getUnitCost(productId)`: WEIGHTED_AVERAGE→avg ENTRY w/ stock>0; PEPS→oldest non-consumed ENTRY
- [ ] 4.2 [BE] `ProductFormulaUseCase.java` — CRUD add/delete components
- [ ] 4.3 [BE] `CompanyConfigUseCase.java` + DTOs — add 3 cost fields
- [ ] 4.4 [BE] `FormulaProductionUseCase.java` — `@Transactional`: validate stock FOR UPDATE→getUnitCost→PRODUCTION_CONSUMPTION→MPD=Σ(actual×cost)→CIF=base×(rate/100)→PRODUCTION_OUTPUT→PRODUCTION_SHRINKAGE(unit_cost=0)→persist. Full rollback.
- [ ] 4.5 [BE] `ProductionBatchRequest.java` + `ProductionBatchResponse.java` — DTOs
- [ ] 4.6 [BE] `ProductionController.java` — POST/GET /batches, GET /formulas/{productId}
- [ ] 4.7 [BE] `ProductController.java` — add POST/DELETE `/api/v1/products/{id}/formula-items`

## Phase 5: Slice 2 — Fórmulas (Frontend)

- [ ] 5.1 [FE] `src/app/core/models/production.model.ts` — ProductFormula, ProductionBatch, ProductionBatchItem, ProductionBatchRequest
- [ ] 5.2 [FE] `src/app/core/models/` — kardex: +3 MovementTypes; company-config: +costingMethod, overheadAllocationBase, overheadRate
- [ ] 5.3 [FE] `src/app/core/services/production.service.ts` — httpResource: getFormulas, getBatches, getBatch, produce
- [ ] 5.4 [FE] `formula-tab.ts` + `.html` — standalone: table, inline add (search+qty+UoM), delete. Visible only type∈{COMBO,FORMULA}
- [ ] 5.5 [FE] `product-form.ts` + `.html` — add `<mat-tab label="Fórmula">` with `*ngIf="isFormula()"`
- [ ] 5.6 [FE] `production-batch.ts` + `.html` + `.css` — standalone: selector (FORMULA/COMBO), auto-load components, laborCost+qty, cost preview, notes, submit with Swal
- [ ] 5.7 [FE] `app.routes.ts` — lazy route `/produccion/lotes`; `shell.ts` — add "Producción" NavModule
- [ ] 5.8 [FE] `company-form.ts` + `.html` — add costingMethod, overheadAllocationBase, overheadRate fields
