# Tasks: Sprint 18 â€” FEFO + PEPS + Trazabilidad

## Phase 1: Slice 1 â€” Captura expirationDate (FundaciÃ³n)

- [x] 1.1 [BE] GoodsReceiptRequest.ReceiptLine: agregar `@FutureOrPresent LocalDate expirationDate`
- [x] 1.2 [BE] GoodsReceiptResponse: agregar `expirationDate` al response
- [x] 1.3 [BE] ReceiptDomainService.ReceiptLineItemInput: agregar `expirationDate`
- [x] 1.4 [BE] ReceiptDomainService.validateLines(): validar requerido si producto `perishable = true`
- [x] 1.5 [BE] CreateGoodsReceiptUseCase: pasar `expirationDate` al constructor de `Batch`
- [x] 1.6 [FE] goods-receipt.model.ts: agregar `expirationDate?: string` a `ReceiptLineItemInput`
- [x] 1.7 [FE] recepcion-form.ts: nuevo `FormControl` expirationDate, visible solo si producto perecedero
- [x] 1.8 [FE] recepcion-form.html: `<input type="date">` con binding condicional
- [x] 1.9 [BE] Unit test: `ReceiptDomainService` rechaza recepciÃ³n sin expirationDate en perecedero

## Phase 2: Slice 2 â€” FefoPicker (Dominio)

- [x] 2.1 [BE] `domain/model/BatchAllocation.java`: nuevo record `(UUID batchId, BigDecimal quantity, BigDecimal unitCost)`
- [x] 2.2 [BE] `domain/repository/StockRepository.java`: agregar `findAvailableByProductWarehouse(UUID productId, UUID warehouseId)`
- [x] 2.3 [BE] `StockJpaRepository.java`: query nativa con JOIN batches, ORDER BY expiration_date ASC NULLS LAST
- [x] 2.4 [BE] `domain/service/FefoPicker.java`: nuevo servicio con mÃ©todo `pick(productId, warehouseId, requiredQty)`
- [x] 2.5 [BE] Unit test FefoPicker: parcial (2 lotes), sin fecha, stock insuficiente, un solo lote, sin lotes, cantidad exacta

## Phase 3: Slice 3A â€” POS Checkout + Ventas manuales

- [x] 3A.1 [BE] PosCheckoutUseCase: inyectar `FefoPicker`, reemplazar `item.batchId()` por `pick()`
- [x] 3A.2 [BE] PosCheckoutUseCase: crear N `InventoryMovement` (uno por `BatchAllocation`)
- [x] 3A.3 [BE] PosCheckoutUseCase: `SaleItem.batchId` queda como null
- [x] 3A.4 [BE] ManageSalesDocumentUseCase.decrementStock(): FefoPicker en vez de `item.batchId()`
- [x] 3A.5 [BE] ManageSalesDocumentUseCase.decrementStock(): agregar `recordMovement` (fix bug kardex)
- [x] 3A.6 [BE] Unit test: PosCheckoutUseCase consume de 2 lotes â†’ 2 InventoryMovements con mismo referenceId

## Phase 4: Slice 3B â€” ProducciÃ³n FEFO + Fix InventoryStock

- [x] 3B.1 [BE] FormulaProductionUseCase: reemplazar `kardexRepo.getCurrentStock()` por `FefoPicker`
- [x] 3B.2 [BE] FormulaProductionUseCase: decrementar `InventoryStock` real por cada `BatchAllocation`
- [x] 3B.3 [BE] FormulaProductionUseCase: `batchId` en `InventoryMovement` deja de ser null
- [x] 3B.4 [BE] StockRepository: agregar `sumAvailableByProductWarehouse()` para validaciÃ³n rÃ¡pida
- [x] 3B.5 [BE] Unit test: producciÃ³n falla con `INSUFFICIENT_STOCK` si no hay inventario real

## Phase 5: Slice 3C â€” Costeo PEPS alineado con FEFO

- [x] 3C.1 [BE] CostingService: revivir `resolveCostOnExit()`, ordenar CostLayers por `Batch.expirationDate`
- [x] 3C.2 [BE] CostLayerRepository: nuevo mÃ©todo con JOIN batches ordenado por expirationDate
- [x] 3C.3 [BE] PosCheckoutUseCase: llamar `CostingService` por cada `BatchAllocation`
- [x] 3C.4 [BE] FormulaProductionUseCase: llamar `CostingService` para materias primas consumidas
- [x] 3C.5 [BE] Unit test: costo de venta = suma exacta de costos reales de lotes consumidos

## Phase 6: Slice 4 â€” Auto-disposiciÃ³n por vencimiento

- [x] 4.1 [BE] ExpirationMonitorJob: lÃ³gica de auto-dispose para lotes YA vencidos (expirationDate < NOW)
- [x] 4.2 [BE] application.yml: agregar `app.inventory.auto-dispose` (default false) y `expiration-warning-days` (default 30)
- [x] 4.3 [BE] ExpirationMonitorJob: dos ventanas â€” vencidos (dispose si flag = true) + prÃ³ximos (solo log)
- [x] 4.4 [BE] BatchController: endpoint `POST /api/v1/batches/{id}/dispose-expired`
- [x] 4.5 [BE] Unit test: con auto-dispose=true, lote vencido se cierra (status=CLOSED, stock=0)

## Phase 7: Verify

- [x] 7.1 `gradlew compileJava` BUILD SUCCESSFUL (backend)
- [x] 7.2 `npx tsc --noEmit` 0 errores (frontend)
- [x] 7.3 FefoPicker unit tests: 6 escenarios âœ…
- [x] 7.4 ReceiptDomainService unit test: rechaza perecedero sin fecha âœ…
- [x] 7.5 PosCheckoutUseCase unit test: consumo multi-lote + trazabilidad kardex âœ…
- [x] 7.6 FormulaProductionUseCase unit test: stock insuficiente + fix InventoryStock âœ…
- [x] 7.7 ExpirationMonitorJob unit test: auto-dispose con flag âœ…

**Total: 33/33 tareas â€” COMPLETADO**
