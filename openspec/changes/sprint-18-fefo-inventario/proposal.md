# Sprint 18 — FEFO + PEPS + Trazabilidad Batch→Venta

## Intención

El sistema tiene toda la infraestructura para lotes (batches, expirationDate, perishable, manageLots) pero la lógica FEFO no existe: el `expirationDate` nunca se captura en recepción, los consumos de stock son ciegos al lote, y el kardex no se usa como trazabilidad batch→venta. Este sprint implementa FEFO completo con PEPS contable alineado y trazabilidad real por kardex.

## Alcance

### Slice 1: Captura expirationDate en recepción

- Campo `expirationDate` en `GoodsReceiptRequest.ReceiptLine` (backend + frontend)
- Validación: requerido si `Product.perishable = true`, ignorado si no
- Propagación al `Batch` en `CreateGoodsReceiptUseCase`

### Slice 2: FefoPicker (servicio de dominio)

- Algoritmo FEFO: ordenar batches por `expirationDate ASC NULLS LAST → entryDate ASC`
- Consumo parcial entre múltiples batches
- Degradación a FIFO por entryDate si no hay fechas de vencimiento

### Slice 3: Consumidores FEFO + PEPS

- **3A**: `PosCheckoutUseCase` + `ManageSalesDocumentUseCase` → FEFO + N InventoryMovements (trazabilidad)
- **3B**: `FormulaProductionUseCase` → fix batch=null + decrementar InventoryStock real
- **3C**: `CostingService` revivido con PEPS alineado a FEFO

### Slice 4: Auto-disposición por vencimiento

- `ExpirationMonitorJob` → auto-dispose lotes YA vencidos
- Flag `app.inventory.auto-dispose` (default false)
- Endpoint manual: `POST /batches/{id}/dispose-expired`

### Fuera de alcance

- Clasificación ABC (sprint futuro independiente)
- Reserva de inventario (`committedQuantity`)
- Reemplazo de `SaleItem.batchId` (se depreca a null, no se migra la columna)
- Notificaciones UI en tiempo real de lotes próximos a vencer (queda en logs)

## Impacto

| Módulo      | Archivos modificados                     | Archivos nuevos                                      |
| ----------- | ---------------------------------------- | ---------------------------------------------------- |
| Backend     | ~8 (use cases + DTOs + domain service)   | ~3 (FefoPicker, BatchAllocation, CostingService fix) |
| Frontend    | ~2 (recepcion-form, goods-receipt model) | 0                                                    |
| Migraciones | 0 (no se requieren nuevas columnas)      | 0                                                    |

## Dependencias

- ✅ `Batch.expirationDate` — campo ya existe en dominio, entidad y BD
- ✅ `Product.perishable` + `Product.manageLots` — flags ya existen
- ✅ `InventoryStock.batchId` — stock ya es batch-aware
- ✅ `InventoryMovement.batchId` — kardex ya es batch-aware
- ✅ `CostLayer` — modelo ya existe (en desuso, se revive)
- ✅ Compras (S5), Ventas (S8), Inventario (S7), Producción (S16)
