# Tasks: Sprint 19 — Fix Producción Batch + InventoryStock

**Status**: ARCHIVED — All 26 tasks completed ✅

## Phase 1: Foundation (Migrations + Repository)

- [x] 1.1 Create `src/main/resources/db/migration/V95__seed_system_supplier.sql` — `INSERT INTO third_parties (id, num_identification, name, type, person_type, active, created_at, updated_at, credit_limit, current_balance, tax_regime, credit_days, is_gran_contribuyente, is_autoretenedor, is_agente_retencion_iva, is_regimen_simple, other_tax_resp) VALUES (gen_random_uuid(), '000000000-0', 'PRODUCCIÓN INTERNA', 'SUPPLIER', 'JURIDICA', true, NOW(), NOW(), 0, 0, 'ORDINARIO', 0, false, false, false, false, false) ON CONFLICT DO NOTHING`
- [x] 1.2 Create `src/main/resources/db/migration/V96__add_batch_id_to_production_batches.sql` — `ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES batches(id)`
- [x] 1.3 Add `Optional<ThirdParty> findByNumIdentification(String)` to `domain/repository/ThirdPartyRepository.java` interface
- [x] 1.4 Add `Optional<ThirdPartyEntity> findByNumIdentification(String)` to `infrastructure/adapters/out/persistence/ThirdPartyJpaRepository.java`

## Phase 2: Domain Model Changes

- [x] 2.1 Add `UUID batchId` field to `domain/model/ProductionBatch.java` record (append before closing paren, nullable for backward compat)
- [x] 2.2 Add `@Column(name = "batch_id") private UUID batchId` to `infrastructure/adapters/out/persistence/ProductionBatchEntity.java`
- [x] 2.3 Add `@FutureOrPresent LocalDate expirationDate` field to `application/dto/ProduceRequest.java` record
- [x] 2.4 Rename `batchId` → `productionBatchId` and add `UUID inventoryBatchId` to `application/dto/ProduceResponse.java` record

## Phase 3: Use Case Changes

- [x] 3.1 Inject `ThirdPartyRepository` and `BatchRepository` into `application/usecase/FormulaProductionUseCase.java` constructor (fields: `thirdPartyRepo`, `batchInventoryRepo`) — all new imports, no signature change to `produce()` yet
- [x] 3.2 Add `manufacturedInHouse=true` validation at top of `produce()` — `if (!Boolean.TRUE.equals(parentProduct.isManufacturedInHouse())) throw new IllegalArgumentException("El producto no está configurado como fabricado internamente")`
- [x] 3.3 Add private `resolveSystemSupplier()` → `thirdPartyRepo.findByNumIdentification("000000000-0").orElseThrow(() -> new IllegalStateException("Proveedor sistema PRODUCCIÓN INTERNA faltante. Ejecute migración V95."))`
- [x] 3.4 Insert Steps 5a-5c between ProductionBatch save (Step 5) and raw material consumption (Step 6): (5a) `var systemSupplier = resolveSystemSupplier()` → (5b) create `Batch` with `supplierId=systemSupplier, warehouseId=request.warehouseId(), entryDate=LocalDate.now(), initialWeight=request.quantity(), purchaseCost=totalCost, status=OPEN, expirationDate=request.expirationDate()`, save via `batchInventoryRepo.save(batch)` → (5c) create `InventoryStock(productId=formulaProductId, batchId=inventoryBatch.id(), warehouseId=warehouseId, currentQuantity=quantity, committedQuantity=ZERO, unitCost=unitCost)` via `stockRepository.save(stock)`
- [x] 3.5 Insert Steps 5d-5e: (5d) `costingService.resolveCostOnEntry(formulaProductId, inventoryBatch.id(), warehouseId, quantity, unitCost, null)` → (5e) update saved ProductionBatch with batchId via `batchRepo.save(new ProductionBatch(savedBatch.id(), ..., inventoryBatch.id()))`
- [x] 3.6 Change `produce()` signature from `(ProduceRequest)` to `(ProduceRequest, UUID operatorId)` — propagate `operatorId` to `Batch.createdBy` (Step 5b) and `ProductionBatch.createdBy` (Step 5)
- [x] 3.7 Fix Step 7 kardex recording: replace `null` batchId with `inventoryBatch.id()`
- [x] 3.8 Update Step 8 ProduceResponse construction: `ProduceResponse(savedBatch.id(), inventoryBatch.id(), parentProduct.name(), ...)`

## Phase 4: Controller

- [x] 4.1 In `infrastructure/adapters/in/rest/ProductionController.java` `produce()`: extract `operatorId` from `SecurityContextHolder.getContext().getAuthentication()` → call `productionUseCase.produce(request, operatorId)` — add `import org.springframework.security.core.context.SecurityContextHolder`

## Phase 5: Unit Tests

- [x] 5.1 Update `test/java/.../FormulaProductionUseCaseTest.java` — mock `ThirdPartyRepository.findByNumIdentification` returns system supplier; mock `BatchRepository.save` returns Batch; mock `StockRepository.findByProductBatchWarehouse` for raw material path; assert `BatchRepository.save` called with correct `supplierId`, `warehouseId`, `initialWeight=quantity`
- [x] 5.2 Test: produce creates InventoryStock — verify `StockRepository.save` called with `(productId=formulaProductId, batchId=inventoryBatch.id, currentQuantity=quantity, committedQuantity=0)`
- [x] 5.3 Test: PRODUCTION_OUTPUT kardex batchId non-null — verify `RecordMovementUseCase.record` for `MovementType.PRODUCTION_OUTPUT` called with batchId ≠ null
- [x] 5.4 Test: ProductionBatch links to output Batch — verify `ProductionBatchRepository.save` called with ProductionBatch having non-null `batchId`
- [x] 5.5 Test: system supplier missing throws `IllegalStateException` with message containing "PRODUCCIÓN INTERNA faltante"
- [x] 5.6 Test: non-manufactured product throws `IllegalArgumentException("no está configurado como fabricado internamente")`
- [x] 5.7 Test: operatorId propagated — verify `BatchRepository.save` called with Batch having `createdBy=operatorId`

## Phase 6: Verify

- [x] 6.1 Run `gradlew compileJava` (workdir: `C:\POS_VTA\backend_pos-vta`) — BUILD SUCCESSFUL
- [x] 6.2 Run `gradlew test` (workdir: `C:\POS_VTA\backend_pos-vta`) — 96 tests passed ✅

---

## Preexisting Test Fixes (unrelated to Sprint 19)

- Fixed `PosDevolutionUseCaseTest` — verify times(2)→times(1) (code only does 1 save)
- Added `allow-bean-definition-overriding=true` to `PosInventApplicationTests`
- Fixed `PosCheckoutUseCaseTest` — Mockito stubbing order (specific vs any() matcher)
