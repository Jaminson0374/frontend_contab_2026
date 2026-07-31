# Delta Spec: Producción — Batch + InventoryStock Output

**Domain**: producción | **Change**: sprint-19-produccion-batch-stock  
**Existing behavior**: `FormulaProductionUseCase.produce()` Step 7 records PRODUCTION_OUTPUT kardex with `batchId=null`. No Batch or InventoryStock is created for the finished product. `recalculateTotalStock()` returns 0 because `v_available_stock` has no matching row. Step 6 (raw material consumption) works correctly.

## ADDED Requirements

| REQ   | Description                                                                                                                                                                                                                                              | Strength |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| REQ-1 | System MUST create a `Batch` for the finished product linked to a system supplier `ThirdParty(name='PRODUCCIÓN INTERNA', personType=JURIDICA, type=SUPPLIER, numIdentification='000000000-0')`                                                           | MUST     |
| REQ-2 | System MUST create an `InventoryStock` for `(productId=finished, batchId=REQ-1-batch, warehouseId=request.warehouseId, currentQuantity=request.quantity, committedQuantity=0)`                                                                           | MUST     |
| REQ-3 | PRODUCTION_OUTPUT kardex movement MUST reference the real `batchId` from REQ-1 (not null)                                                                                                                                                                | MUST     |
| REQ-4 | System MUST call `CostingService.resolveCostOnEntry(productId, batchId, warehouseId, quantity, unitCost, movementId)` to create cost layers                                                                                                              | MUST     |
| REQ-5 | `product.totalStock` MUST equal the newly created stock quantity after `recalculateTotalStock()`                                                                                                                                                         | MUST     |
| REQ-6 | `ProductionBatch` record MUST gain a `batchId: UUID` field linking to the output Batch from REQ-1                                                                                                                                                        | MUST     |
| REQ-7 | `ProduceRequest` MUST gain an `operatorId: UUID` field, and method MUST propagate it to `Batch.createdBy`                                                                                                                                                | MUST     |
| REQ-8 | `ProduceRequest` MUST accept an optional `expirationDate: LocalDate`; if present and product `perishable=true`, `Batch.expirationDate` MUST be set                                                                                                       | MUST     |
| REQ-9 | System supplier "PRODUCCIÓN INTERNA" MUST be available via an idempotent seed migration (V95, ON CONFLICT DO NOTHING); if absent at runtime, MUST throw `IllegalStateException('Proveedor sistema PRODUCCIÓN INTERNA faltante. Ejecute migración V95.')` | MUST     |

## MODIFIED Requirements

| REQ   | Change                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| MOD-1 | `FormulaProductionUseCase.produce()` Step 7: previously recorded kardex output with `batchId=null` and no side effects. Now MUST: (a) fetch or-create system supplier, (b) create `Batch`, (c) update `ProductionBatch.batchId`, (d) create `InventoryStock`, (e) record kardex with real `batchId`, (f) call `resolveCostOnEntry`, (g) call `recalculateTotalStock` — all within the existing SERIALIZABLE transaction. |

## REMOVED Requirements

None.

## Scenarios

### S1: Happy path — single production run

- **GIVEN** formula for "Lomo de Cerdo" (manufacturedInHouse=true), warehouse=WH-1
- **WHEN** `produce({ formulaProductId: lomo, warehouseId: WH-1, quantity: 50, laborCost: 50000, operatorId: UUID, ... })` completes
- **THEN** Batch( supplierId=PROD-INTERNA-Id, warehouseId=WH-1, initialWeight=50 ) created
- **AND** InventoryStock( productId=lomo, batchId=that-batch, warehouseId=WH-1, currentQuantity=50, unitCost=totalCost/50 ) created
- **AND** PRODUCTION_OUTPUT kardex references the real batchId
- **AND** `product.totalStock` = 50 after recalculateTotalStock

### S2: Secondary production chain

- **GIVEN** S1 produced 50kg "Lomo de Cerdo" (batch B1, stock available)
- **WHEN** production runs for "Lomo Ahumado" needing 10kg of lomo
- **THEN** FefoPicker finds B1 and allocates 10kg
- **AND** InventoryStock for B1 decremented by 10kg
- **AND** "Lomo Ahumado" gets its own Batch B2 + InventoryStock with 10kg

### S3: Perishable production

- **GIVEN** product "Salchicha Fresca" (perishable=true, manufacturedInHouse=true), `expirationDate=2026-08-15` in request
- **WHEN** produce() completes
- **THEN** Batch.expirationDate = 2026-08-15

### S4: Cost calculation

- **GIVEN** produce() with mpd=$50000, labor=$50000, overhead=$20000, qty=50
- **WHEN** output Batch and cost layers created
- **THEN** unitCost = 2400.0000 (120000/50)
- **AND** `resolveCostOnEntry()` creates CostLayer( batchId, qty=50, unitCost=2400 )

### S5: System supplier not found

- **GIVEN** no ThirdParty with numIdentification='000000000-0' exists (migration not run)
- **WHEN** produce() is attempted
- **THEN** IllegalStateException thrown: "Proveedor sistema PRODUCCIÓN INTERNA faltante. Ejecute migración V95."

### S6: Non-manufactured product

- **GIVEN** product with manufacturedInHouse=false
- **WHEN** produce() is attempted
- **THEN** IllegalArgumentException: "El producto no está configurado como fabricado internamente"

### S7: Operator identity propagated

- **GIVEN** request.operatorId = UUID
- **WHEN** Batch is created in Step 7
- **THEN** Batch.createdBy = that UUID
