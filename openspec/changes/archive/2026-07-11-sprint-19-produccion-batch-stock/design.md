# Design: Sprint 19 — Fix Producción Batch + InventoryStock

**Status**: Archived (completed)  
**Engram ID**: #527

## Technical Approach

Inject `ThirdPartyRepository` into `FormulaProductionUseCase` to resolve a system supplier ThirdParty (seeded via V95 migration with numIdentification `000000000-0`). After saving the ProductionBatch (current Step 5), insert a new block that creates a real Batch entity with this system supplier, an InventoryStock record for the (product, batch, warehouse) triplet, and cost layers via `CostingService.resolveCostOnEntry()`. Then fix Step 7 to use the real batchId instead of null. The `ProduceRequest` gains an optional `expirationDate` field. The `ProductionBatch` record gets a `batchId` link to the inventory Batch. All operations run within the existing `@Transactional(isolation = SERIALIZABLE)`.

## Architecture Decisions

| #   | Decision                     | Options                                                                     | Chosen                       | Rationale                                                                                                                                                                                                                                                                      |
| --- | ---------------------------- | --------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | supplier_id NOT NULL         | A) System supplier seed / B) Nullable FK / C) Separate model                | **A: System supplier**       | Additive only — no schema change to batches table. Seed creates ThirdParty(numIdentification='000000000-0', name='PRODUCCIÓN INTERNA'). Resolve via `findByNumIdentification`. A/B would touch every Batch constructor and all migration/service code referencing supplier_id. |
| 2   | Insertion point in produce() | A) Between Steps 5-6 / B) After Step 7                                      | **A: Between Steps 5-6**     | Batch must exist before Step 7 which records PRODUCTION_OUTPUT with batchId. Consumption (Step 6) is independent — can run before or after output Batch creation. Inserting after 5 avoids reordering existing code.                                                           |
| 3   | ProductionBatch → Batch link | A) Direct `batchId` column / B) Query via kardex                            | **A: Direct column**         | Clean FK, cheap to query, supports future lookup of "which inventory batches did this production create?" without scanning kardex table.                                                                                                                                       |
| 4a  | expirationDate               | A) Add to ProduceRequest / B) Fixed to today+N days / C) Not in this sprint | **A: Add to ProduceRequest** | Optional, nullable. Perishable products (meat, dairy) need explicit dates. Default null = no expiration.                                                                                                                                                                       |
| 4b  | operatorId source            | A) From SecurityContext / B) In request body                                | **A: SecurityContext**       | Controller extracts UUID from `SecurityContextHolder.getContext().getAuthentication()`. Not in ProduceRequest DTO — prevents spoofing. Passes as method param to `produce()`.                                                                                                  |
| 5   | CostingService               | A) Use existing `resolveCostOnEntry()` / B) New method                      | **A: Existing method**       | Already handles PEPS (create layer) and PROMEDIO_PONDERADO (recalculate avg). Perfect fit. No new method.                                                                                                                                                                      |
| 6   | Transactional boundary       | A) Same SERIALIZABLE / B) New REQUIRES_NEW                                  | **A: Same SERIALIZABLE**     | 3 additional writes (Batch + InventoryStock + CostLayer) in a SERIALIZABLE transaction. PostgreSQL MVCC handles this. No extra boundary needed. If production fails, everything rolls back.                                                                                    |

## Data Flow

```
Controller.produce()
  │  extract operatorId from SecurityContext
  │  call useCase.produce(request, operatorId)
  ▼
FormulaProductionUseCase.produce()
  │
  ├─ Step 1-2: Explode BOM → merged raw materials
  ├─ Step 3:   FefoPicker validates stock → List<BatchAllocation>
  ├─ Step 4:   Calculate costs → unitCost, totalCost
  ├─ Step 5:   Save ProductionBatch → savedBatch
  │
  ├─ Step 5a:  Resolve system supplier UUID
  │                thirdPartyRepo.findByNumIdentification("000000000-0")
  │
  ├─ Step 5b:  Create Batch for finished product output
  │                batchRepo.save(new Batch(null, systemSupplierId, warehouseId,
  │                    today, quantity, unitCost, OPEN, notes, expirationDate,
  │                    operatorId, null, null, null, null))
  │              → inventoryBatch
  │
  ├─ Step 5c:  Create InventoryStock
  │                stockRepo.save(new InventoryStock(null, productId,
  │                    inventoryBatch.id(), warehouseId, quantity, ZERO,
  │                    unitCost, null, null))
  │
  ├─ Step 5d:  Resolve cost on entry
  │                costingService.resolveCostOnEntry(productId, inventoryBatch.id(),
  │                    warehouseId, quantity, unitCost, movementId=null)
  │
  ├─ Step 5e:  Update ProductionBatch.batchId = inventoryBatch.id()
  │                batchRepo.save(saveBatch with batchId set)
  │
  ├─ Step 6:   Consume raw materials (decrement InventoryStock + kardex + resolveCostOnExit)
  │
  ├─ Step 7:   Record PRODUCTION_OUTPUT kardex
  │                batchId = inventoryBatch.id()  ← WAS null, NOW real
  │                referenceId = savedBatch.id()
  │
  └─ Step 8:   Recalculate totalStock for finished product

Return ProduceResponse(inventoryBatch.id(), ...)
```

## File Changes

| File                                | Action | Description                                                                                                                                                                                                                                                                                                        |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `V95__seed_system_supplier.sql`     | Create | (a) `INSERT INTO third_parties (...) ON CONFLICT DO NOTHING` for system supplier with numIdentification `000000000-0`. (b) `ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES batches(id)`.                                                                                         |
| `ThirdPartyRepository.java`         | Modify | Add `Optional<ThirdParty> findByNumIdentification(String)` method.                                                                                                                                                                                                                                                 |
| `FormulaProductionUseCase.java`     | Modify | Inject `ThirdPartyRepository`. New method `resolveSystemSupplier()` (lazy-init). Between Steps 5-6: create Batch → InventoryStock → CostLayer (Steps 5a-5e). Fix Step 7 batchId parameter. Pass operatorId through `produce(ProduceRequest, UUID operatorId)`. Update `ProductionBatch` save to include `batchId`. |
| `ProductionBatch.java`              | Modify | Add `UUID batchId` field (nullable, for backward compat with existing rows).                                                                                                                                                                                                                                       |
| `ProductionBatchEntity.java`        | Modify | Add `@Column(name = "batch_id") UUID batchId` field.                                                                                                                                                                                                                                                               |
| `ProduceRequest.java`               | Modify | Add `@FutureOrPresent LocalDate expirationDate` (optional, nullable).                                                                                                                                                                                                                                              |
| `ProduceResponse.java`              | Modify | Add `UUID inventoryBatchId` field — distinct from `batchId` (which is the production batch id). Rename current `batchId` to `productionBatchId` for clarity, OR keep `batchId`=production batch id and add `inventoryBatchId` separately.                                                                          |
| `ProduceController.java`            | Modify | Extract operatorId from `SecurityContextHolder.getContext().getAuthentication()` → resolve to UUID. Pass as second param to `productionUseCase.produce(request, operatorId)`.                                                                                                                                      |
| `FormulaProductionUseCaseTest.java` | Modify | Mock `ThirdPartyRepository.findByNumIdentification()` to return a system supplier. Assert InventoryStock record is created. Assert PRODUCTION_OUTPUT kardex has non-null batchId. Assert ProductionBatch has batchId set.                                                                                          |

## Interfaces / Contracts

### ProduceRequest (modified)

```java
public record ProduceRequest(
    @NotNull UUID formulaProductId,
    @NotNull UUID warehouseId,
    @NotNull @DecimalMin("0.0001") BigDecimal quantity,
    @DecimalMin("0") BigDecimal laborCost,
    BigDecimal overheadCost,
    String notes,
    @FutureOrPresent LocalDate expirationDate  // NEW — optional
) {}
```

### ProduceResponse (modified)

```java
public record ProduceResponse(
    UUID productionBatchId,     // renamed from 'batchId' — the production_batches.id
    UUID inventoryBatchId,      // NEW — the batches.id for finished product
    String productName,
    BigDecimal quantityProduced,
    BigDecimal mpd,
    BigDecimal mod,
    BigDecimal cif,
    BigDecimal totalCost,
    BigDecimal unitCost,
    BigDecimal shrinkage,
    List<BatchItemResponse> items
) {}
```

### ThirdPartyRepository (new method)

```java
Optional<ThirdParty> findByNumIdentification(String numIdentification);
```

### ProductionBatch (modified)

```java
public record ProductionBatch(
    UUID id, UUID formulaId,
    BigDecimal quantityProduced, BigDecimal expectedQuantity,
    BigDecimal directMaterialCost, BigDecimal directLaborCost,
    BigDecimal overheadCost, BigDecimal totalCost, BigDecimal unitCost,
    BigDecimal shrinkageQuantity, BigDecimal shrinkageCost,
    String notes, UUID createdBy, OffsetDateTime createdAt,
    UUID batchId  // NEW — links to inventory Batch, nullable for old records
) {}
```

### FormulaProductionUseCase signature change

```java
// Before:
public ProduceResponse produce(ProduceRequest request)

// After:
public ProduceResponse produce(ProduceRequest request, UUID operatorId)
```

## Migration Plan

**V95\_\_seed_system_supplier.sql** (idempotent, safe to re-run):

```sql
-- Part 1: Seed system supplier
INSERT INTO third_parties (
    id, num_identification, name, type, person_type,
    active, created_at, updated_at,
    credit_limit, current_balance, tax_regime,
    credit_days, is_gran_contribuyente, is_autoretenedor,
    is_agente_retencion_iva, is_regimen_simple, other_tax_resp
) VALUES (
    gen_random_uuid(),
    '000000000-0',
    'PRODUCCIÓN INTERNA',
    'SUPPLIER',
    'JURIDICA',
    true, NOW(), NOW(),
    0, 0, 'ORDINARIO',
    0, false, false,
    false, false, false
) ON CONFLICT DO NOTHING;

-- Part 2: Link ProductionBatch to inventory Batch
ALTER TABLE production_batches
ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES batches(id);
```

**Rollback**: Reversible — DELETE the system supplier and DROP the column if needed. No data loss risk — old production batches remain unchanged (batch_id = NULL).

## Testing Strategy

| Layer       | What to Test                                     | Approach                                                                                                                                                                                                                                            |
| ----------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit        | System supplier resolution                       | Mock `ThirdPartyRepository.findByNumIdentification()` returns supplier. Assert supplier found.                                                                                                                                                      |
| Unit        | Batch + InventoryStock creation                  | After `produce()` completes: verify `batchRepo.save()` called with correct supplierId/warehouseId/quantity. Verify `stockRepo.save()` called with (productId, batchId, warehouseId, quantity). Verify `costingService.resolveCostOnEntry()` called. |
| Unit        | Kardex batchId non-null                          | Verify `recordMovementUseCase.record()` for PRODUCTION_OUTPUT called with batchId ≠ null.                                                                                                                                                           |
| Unit        | ProductionBatch batchId set                      | Verify saved ProductionBatch has non-null batchId matching the inventory Batch.                                                                                                                                                                     |
| Unit        | Missing system supplier                          | Mock `findByNumIdentification` returns empty → assert `IllegalStateException("Proveedor del sistema 'PRODUCCIÓN INTERNA' no encontrado")`.                                                                                                          |
| Unit        | Edge: quantity=0 expired                         | Already handled by ProduceRequest validation.                                                                                                                                                                                                       |
| Integration | End-to-end produce → FefoPicker discovers output | After produce, call `fefoPicker.pick(formulaProductId, warehouseId, 1)` → should NOT throw NO_STOCK_AVAILABLE.                                                                                                                                      |
| DB          | V95 migration idempotent                         | Run migration twice → no errors, no duplicate rows.                                                                                                                                                                                                 |

## Key Learnings

- CostingService.resolveCostOnEntry() already exists and handles PEPS + PROMEDIO_PONDERADO — no new method needed.
- FefoPicker.pick() queries StockRepository.findAvailableByProductWarehouse(), so creating InventoryStock is sufficient for FEFO discovery.
- Batch has `createdBy UUID NOT NULL REFERENCES users(id)` — requires extracting operatorId from SecurityContext in the controller.
- RecordMovementUseCase.record() hardcodes `"SYSTEM"` as username but accepts batchId as parameter — just pass the real batchId.
