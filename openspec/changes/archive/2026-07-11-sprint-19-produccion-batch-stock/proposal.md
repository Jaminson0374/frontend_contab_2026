# Proposal: Sprint 19 — Fix Producción Batch + InventoryStock

**Status**: Archived (completed)  
**Date**: 2026-07-11  
**Engram IDs**: #524 (proposal), #526 (spec), #527 (design), #528 (tasks)

## Intent

Fix the production output to create a real Batch (using a system supplier) + InventoryStock for finished products, so manufactured products become discoverable by FefoPicker, stock counts update correctly via `v_available_stock`, and secondary production chains work end-to-end.

## Problem

`batches.supplier_id` is `NOT NULL` per V9 migration, but manufactured products have no supplier. `FormulaProductionUseCase.produce()` works correctly for raw material consumption (steps 1–6), but step 7 records PRODUCTION_OUTPUT kardex with `batchId=null`, never creates a Batch or InventoryStock for the finished product. This means FefoPicker returns NO_STOCK_AVAILABLE for manufactured products, secondary production chains break, and `v_available_stock` shows 0 for manufactured products.

## Approach

Use a dedicated "system supplier" ThirdParty to satisfy the `NOT NULL` constraint on `batches.supplier_id` — no ALTER TABLE needed. A V95 seed migration creates `ThirdParty(numIdentification='000000000-0', name='PRODUCCIÓN INTERNA', personType=JURIDICA, type=SUPPLIER)`. FormulaProductionUseCase is modified to, after saving the ProductionBatch, also create a real Batch with `supplierId=systemSupplierId` and then an InventoryStock record for the (product, batch, warehouse) triplet. This is the least invasive approach (additive only, no schema changes) and works within the existing hexagonal architecture.

## Scope

**In Scope**: (1) Seed system supplier. (2) Create real Batch + InventoryStock for finished product after ProductionBatch. (3) Fix batchId=null in PRODUCTION_OUTPUT kardex. (4) Update unit tests.

**Out of Scope**: Backfilling existing production batches (they stay with no stock until re-produced). Changing the schema to make supplier_id nullable. Frontend changes.

## File Changes

| File                                | Action |
| ----------------------------------- | ------ |
| `V95__seed_system_supplier.sql`     | Create |
| `ThirdPartyRepository.java`         | Modify |
| `FormulaProductionUseCase.java`     | Modify |
| `ProductionBatch.java`              | Modify |
| `ProductionBatchEntity.java`        | Modify |
| `ProduceRequest.java`               | Modify |
| `ProduceResponse.java`              | Modify |
| `ProduceController.java`            | Modify |
| `FormulaProductionUseCaseTest.java` | Modify |

## Success Criteria (all met)

- [x] PRODUCTION_OUTPUT kardex has non-null batchId
- [x] InventoryStock record exists for finished product
- [x] FefoPicker discovers manufactured products
- [x] product.totalStock updates correctly
- [x] Secondary production chains work end-to-end
- [x] All tests pass (96 tests, BUILD SUCCESSFUL)
