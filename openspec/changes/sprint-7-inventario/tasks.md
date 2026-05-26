# Tasks: Sprint 7 — Inventario: Trazabilidad, Ajustes y Costeo Real

## Slice 1: Kardex — Historial de Movimientos

- [x] [BE] 1.1 V39 migration — `inventory_movements` table: `id`, `product_id` FK, `batch_id` FK nullable, `warehouse_id` FK, `movement_type` (ENTRY/EXIT/ADJUSTMENT/TRANSFER/DISPOSAL), `quantity` (signo indica dirección), `unit_cost`, `previous_quantity`, `new_quantity`, `reference_type` + `reference_id` (polymorphic), `notes`, `created_by`, `created_at` (1 file)
- [x] [BE] 1.2 Domain — `InventoryMovement.java` record (`MovementType` enum), `KardexRepository.java` port interface (2 files)
- [x] [BE] 1.3 Infrastructure — `InventoryMovementEntity.java`, `KardexJpaRepository.java`, `KardexMapper.java` (3 files)
- [x] [BE] 1.4 Application — `RecordMovementUseCase.java` (genérico, llamado por otros UC), `KardexQueryUseCase.java` (filtros: productId, batchId, warehouseId, type, dateFrom, dateTo), DTOs `InventoryMovementResponse`, `KardexQuery` (3 files)
- [x] [BE] 1.5 REST — `KardexController.java`: `GET /api/v1/kardex?productId=&batchId=&warehouseId=&type=&from=&to=&page=&size=` (1 file)
- [x] [BE] 1.6 Integration — modificar `CreateGoodsReceiptUseCase`, `PosCheckoutUseCase`, `ManualDesposteUseCase`, `ProcessSlaughterUseCase` para llamar `RecordMovementUseCase` después de cada mutación de stock (4 archivos modify)
- [x] [FE] 1.7 Model — `kardex.model.ts` (`InventoryMovement`, `MovementType`, `KardexQuery`) (1 file)
- [x] [FE] 1.8 Service — `kardex.service.ts` con método `search(query)` paginado (1 file)
- [x] [FE] 1.9 Feature — `kardex-list.component.ts`: tabla con columnas fecha, tipo, producto, lote, bodega, cantidad, costo, usuario; filtros por producto/lote/bodega/tipo/rango fechas (3 files: ts, html, css)

**9 tareas** | Backend: 6 | Frontend: 3

---

## Slice 2: Ajustes de Inventario

- [x] [BE] 2.1 V40 migration — `stock_adjustments` table: `id`, `product_id`, `batch_id` nullable, `warehouse_id`, `adjustment_type` enum, `quantity_before`, `quantity_after`, `unit_cost`, `reason` (TEXT), `created_by`, `created_at` (1 file)
- [x] [BE] 2.2 Domain — `StockAdjustment.java` record (`AdjustmentType`: `PHYSICAL_COUNT`, `DAMAGE`, `EXPIRATION`, `THEFT`, `OTHER`), `StockAdjustmentRepository.java` port (2 files)
- [x] [BE] 2.3 Infrastructure — `StockAdjustmentEntity.java`, `StockAdjustmentJpaRepository.java`, `StockAdjustmentMapper.java` (3 files)
- [x] [BE] 2.4 Application — `CreateAdjustmentUseCase.java` (validar stock suficiente para ajustes negativos, actualizar `inventory_stock`, registrar en Kardex), `ListAdjustmentsUseCase.java`, DTOs `AdjustmentRequest`, `AdjustmentResponse` (3 files)
- [x] [BE] 2.5 REST — `AdjustmentController.java`: `POST /api/v1/adjustments`, `GET /api/v1/adjustments`, `GET /api/v1/adjustments/{id}` (1 file)
- [x] [FE] 2.6 Model — `adjustment.model.ts` (`StockAdjustment`, `AdjustmentType`, `AdjustmentRequest`) (1 file)
- [x] [FE] 2.7 Service — `adjustment.service.ts` con `create()`, `list()` (1 file)
- [x] [FE] 2.8 Feature — `adjustment-form.component.ts`: selector producto, lote, bodega, tipo ajuste, cantidad actual (readonly), cantidad ajustada, motivo; `adjustment-list.component.ts`: tabla con filtros (4 files: 2 components × ts+html)

**8 tareas** | Backend: 5 | Frontend: 3

---

## Slice 3: Entradas y Salidas Manuales

- [x] [BE] 3.1 Application — `ManualStockEntryUseCase.java`: `POST /api/v1/stock/entry` crea o actualiza `inventory_stock`, registra en Kardex (1 file)
- [x] [BE] 3.2 Application — `ManualStockExitUseCase.java`: `POST /api/v1/stock/exit` valida stock suficiente, decrementa, registra en Kardex (1 file)
- [x] [BE] 3.3 REST — Agregar endpoints a `StockController.java`: `POST /api/v1/stock/entry`, `POST /api/v1/stock/exit` (1 file modify)
- [x] [FE] 3.4 Feature — `stock-manual.component.ts` con formularios de entrada y salida manual (3 files: ts, html, css)

**4 tareas** | Backend: 3 | Frontend: 1

---

## Slice 4: Traslados entre Bodegas

- [x] [BE] 4.1 V41 migration — `stock_transfers` table: `id`, `source_warehouse_id`, `target_warehouse_id`, `status` (DRAFT/CONFIRMED/CANCELLED), `notes`, `created_by`, `created_at`, `confirmed_by`, `confirmed_at`; `stock_transfer_items`: `transfer_id`, `product_id`, `batch_id`, `quantity`, `unit_cost` (2 files)
- [x] [BE] 4.2 Domain — `StockTransfer.java`, `StockTransferItem.java` records, repository port (3 files)
- [x] [BE] 4.3 Infrastructure — Entities, JPA repos, Mapper (5 files)
- [x] [BE] 4.4 Application — `CreateTransferUseCase.java` (DRAFT), `ConfirmTransferUseCase.java` (decrementa origen, incrementa destino, registra en Kardex 2 movimientos), `CancelTransferUseCase.java`, DTOs (4 files)
- [x] [BE] 4.5 REST — `TransferController.java`: `POST /api/v1/transfers`, `POST /api/v1/transfers/{id}/confirm`, `POST /api/v1/transfers/{id}/cancel`, `GET /api/v1/transfers`, `GET /api/v1/transfers/{id}` (1 file)
- [x] [FE] 4.6 Feature — `transfer-form.component.ts` + `transfer-list.component.ts` + `transfer.model.ts` + `transfer.service.ts` (6 files)

**6 tareas** | Backend: 5 | Frontend: 1

---

## Slice 5: Costeo PEPS + Promedio Ponderado

- [x] [BE] 5.1 V42 migration — `cost_layers` table: `id`, `product_id`, `batch_id`, `warehouse_id`, `quantity` (remaining), `unit_cost`, `entry_date`, `source_movement_id` FK a `inventory_movements` (1 file)
- [x] [BE] 5.2 Domain — `CostLayer.java` record, `CostLayerRepository.java` port (2 files)
- [x] [BE] 5.3 Infrastructure — `CostLayerEntity.java`, `CostLayerJpaRepository.java`, `CostLayerMapper.java` (3 files)
- [x] [BE] 5.4 Application — `CostingService.java`: `resolveCostOnEntry(productId, batchId, warehouseId, quantity, unitCost)` — crea nueva capa; `resolveCostOnExit(productId, batchId, warehouseId, quantity)` — consume capas según PEPS o Promedio; `recalculateUnitCost(productId, batchId, warehouseId)` — actualiza `inventory_stock.unit_cost` (1 file)
- [x] [BE] 5.5 Integration — Modificar `CreateGoodsReceiptUseCase`, `PosCheckoutUseCase`, `ManualDesposteUseCase`, `ProcessSlaughterUseCase`, `CreateAdjustmentUseCase`, `ConfirmTransferUseCase` para llamar `CostingService` en vez de calcular costo manualmente (6 archivos modify)

**5 tareas** | Backend: 5

---

## Slice 6: Decomisos + Lotes y Vencimientos

- [x] [BE] 6.1 V43 migration — Agregar `expiration_date` a `batches`; crear `stock_disposals` table: `id`, `product_id`, `batch_id`, `warehouse_id`, `disposal_type` (SANITARIO/RESIDUO_VENDIBLE/MERMA_PROCESO), `quantity`, `unit_cost`, `reason`, `created_by`, `created_at` (2 files)
- [x] [BE] 6.2 Domain — `StockDisposal.java` record (`DisposalType` enum), `StockDisposalRepository.java` port; modificar `Batch.java` agregar `expirationDate` (3 files)
- [x] [BE] 6.3 Infrastructure — `StockDisposalEntity.java`, `StockDisposalJpaRepository.java`, `StockDisposalMapper.java`; modificar `BatchEntity.java` agregar `expirationDate` (4 files)
- [x] [BE] 6.4 Application — `CreateDisposalUseCase.java` (decrementa stock, registra en Kardex), `ListDisposalsUseCase.java`; validación de vencimiento en `PosCheckoutUseCase` (no vender lotes vencidos) (3 files)
- [x] [BE] 6.5 REST — `DisposalController.java`: `POST /api/v1/disposals`, `GET /api/v1/disposals` (1 file)
- [x] [FE] 6.6 Feature — `disposal-form.component.ts` + `disposal-list.component.ts` + `disposal.model.ts` + `disposal.service.ts` (5 files)

**6 tareas** | Backend: 5 | Frontend: 1

---

## Resumen

| Slice                       | Tareas | BE     | FE    | Estado   |
| --------------------------- | ------ | ------ | ----- | -------- |
| 1. Kardex                   | 9      | 6      | 3     | ✅ 9/9   |
| 2. Ajustes                  | 8      | 5      | 3     | ✅ 8/8   |
| 3. Entradas/Salidas         | 4      | 3      | 1     | ✅ 4/4   |
| 4. Traslados                | 6      | 5      | 1     | ✅ 6/6   |
| 5. Costeo PEPS              | 5      | 5      | 0     | ✅ 5/5   |
| 6. Decomisos + Vencimientos | 6      | 5      | 1     | ✅ 6/6   |
| **Total**                   | **38** | **29** | **9** | ✅ 38/38 |
