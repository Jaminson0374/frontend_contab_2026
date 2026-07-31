# Design: Sprint 18 — FEFO + PEPS + Trazabilidad

## Architecture Decisions

### 1. Kardex como fuente única de trazabilidad batch→venta

| Opción                                         | Tradeoff                                                         | Decisión   |
| ---------------------------------------------- | ---------------------------------------------------------------- | ---------- |
| `InventoryMovement` (kardex) como fuente única | Una consulta extra por venta, pero sin redundancia               | ✅ Elegido |
| `batchAllocations` JSONB en `SaleItem`         | Dato rápido pero redundante con kardex, riesgo de inconsistencia | ❌         |

`SaleItem.batchId` se depreca (queda null). La trazabilidad se consulta en kardex.

### 2. PEPS alineado con FEFO para costeo

| Opción                                   | Tradeoff                                                               | Decisión   |
| ---------------------------------------- | ---------------------------------------------------------------------- | ---------- |
| PEPS (consumir CostLayers en orden FEFO) | Coincidencia perfecta físico-contable, más complejo                    | ✅ Elegido |
| Mantener Promedio Ponderado              | Simple pero ficción contable: el costo no refleja el lote real vendido | ❌         |

### 3. FefoPicker como servicio de dominio puro

- Sin dependencias de infraestructura
- Recibe `StockRepository` como interfaz (inyectado)
- Retorna `List<BatchAllocation>`: record `(UUID batchId, BigDecimal quantity, BigDecimal unitCost)`
- Orden: `Batch.expirationDate ASC NULLS LAST → Batch.entryDate ASC`
- Degradación: si ningún batch tiene `expirationDate` → FIFO por `entryDate ASC`

### 4. Múltiples InventoryMovements por ítem de venta

Antes: 1 SaleItem → 1 InventoryMovement
Ahora: 1 SaleItem → N InventoryMovements (uno por batch consumido)

Cada movimiento mantiene `referenceType="SALE"` y `referenceId=saleDocumentId`.

### 5. CostingService revive con orden FEFO

`CostLayer` se consume en orden `Batch.expirationDate ASC` (antes era `entryDate ASC`).
Se llama desde `PosCheckoutUseCase`, `ManageSalesDocumentUseCase`, y `FormulaProductionUseCase`.

## Data Flow — Venta con FEFO

```
VENTA solicita Q cantidad de producto P en bodega W
  │
  ▼
FefoPicker.pick(P, W, Q)
  │
  ├─ StockRepository.findAvailableByProductWarehouse(P, W)
  │     → JOIN batches ON batch_id
  │     → WHERE current_qty > 0 AND status <> CLOSED
  │     → ORDER BY b.expiration_date ASC NULLS LAST, b.entry_date ASC
  │
  ├─ Itera acumulando qty hasta cubrir Q
  │
  └─ Retorna List<BatchAllocation>
       │
       ▼
  FOR EACH BatchAllocation:
    ├─ Decrementa InventoryStock.currentQuantity
    ├─ RecordMovementUseCase.record(EXIT, batchId, qty, unitCost, "SALE", invoiceId)
    ├─ CostingService.consumeCostLayer(batchId, qty, unitCost)
    └─ productRepository.recalculateTotalStock(productId)
```

## Data Flow — Producción con FEFO (fix)

```
PRODUCCIÓN requiere materias primas M1, M2, ...
  │
  FOR EACH materia prima:
    │
    ▼
  FefoPicker.pick(materiaPrimaId, warehouseId, requiredQty)
    │
    └─ Retorna List<BatchAllocation>
         │
         ▼
    FOR EACH BatchAllocation:
      ├─ Decrementa InventoryStock (ANTES no se hacía — BUG)
      ├─ RecordMovementUseCase.record(PRODUCTION_CONSUMPTION, batchId, qty, unitCost)
      └─ CostingService.consumeCostLayer(batchId, qty, unitCost)
         │
         ▼
  Crear producto terminado (batch nuevo, ENTRY)
```

## Data Flow — Auto-disposición

```
CRON 6:00 AM → ExpirationMonitorJob.checkExpiringBatches()
  │
  ├─ findExpiringBatches(days=0) → lotes YA vencidos con stock > 0
  │    │
  │    └─ IF app.inventory.auto-dispose = true:
  │         FOR EACH lote vencido:
  │           ├─ RecordMovementUseCase.record(DISPOSAL, batchId, remainingQty, unitCost)
  │           ├─ InventoryStock.currentQuantity = 0
  │           └─ Batch.status = CLOSED
  │       ELSE:
  │         └─ log.warn (solo notificar)
  │
  └─ findExpiringBatches(days=30) → lotes PRÓXIMOS a vencer
       └─ log.warn (siempre solo notificar, nunca disponer)
```

## API Changes

### Modificados

| Endpoint                        | Cambio                                         |
| ------------------------------- | ---------------------------------------------- |
| POST /api/v1/goods-receipts     | `ReceiptLine` gana `expirationDate` (opcional) |
| GET /api/v1/goods-receipts/{id} | Response incluye `expirationDate` por línea    |

### Nuevos

| Endpoint                                  | Descripción                        |
| ----------------------------------------- | ---------------------------------- |
| POST /api/v1/batches/{id}/dispose-expired | Disposición manual de lote vencido |

## File Changes

### Backend — C:\POS_VTA\backend_pos-vta\src\main\java\co\posinvent\

| Archivo                                                           | Cambio                                                              |
| ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| `application/dto/GoodsReceiptRequest.java`                        | Agregar `expirationDate` a `ReceiptLine`                            |
| `application/dto/GoodsReceiptResponse.java`                       | Agregar `expirationDate` al response                                |
| `domain/service/ReceiptDomainService.java`                        | `ReceiptLineItemInput` gana `expirationDate`, validación perecedero |
| `application/usecase/CreateGoodsReceiptUseCase.java`              | Pasar `expirationDate` al `Batch`                                   |
| `domain/service/FefoPicker.java`                                  | **NUEVO** — algoritmo FEFO                                          |
| `domain/model/BatchAllocation.java`                               | **NUEVO** — record (batchId, quantity, unitCost)                    |
| `domain/repository/StockRepository.java`                          | Nuevo método `findAvailableByProductWarehouse()`                    |
| `infrastructure/adapters/out/persistence/StockJpaRepository.java` | Implementar query con JOIN batches                                  |
| `application/usecase/PosCheckoutUseCase.java`                     | FefoPicker + N InventoryMovements                                   |
| `application/usecase/ManageSalesDocumentUseCase.java`             | FefoPicker + fix kardex                                             |
| `application/usecase/FormulaProductionUseCase.java`               | FefoPicker + fix InventoryStock decrement                           |
| `application/usecase/CostingService.java`                         | Revivir, ordenar CostLayers por expirationDate                      |
| `application/service/ExpirationMonitorJob.java`                   | Auto-dispose con flag de configuración                              |
| `infrastructure/adapters/in/rest/BatchController.java`            | Endpoint `dispose-expired`                                          |

### Frontend — C:\POS_VTA\posinvent\src\app\

| Archivo                                                         | Cambio                                            |
| --------------------------------------------------------------- | ------------------------------------------------- |
| `core/models/goods-receipt.model.ts`                            | Agregar `expirationDate` a `ReceiptLineItemInput` |
| `features/compras/recepcion/recepcion-form/recepcion-form.ts`   | Nuevo FormControl condicional                     |
| `features/compras/recepcion/recepcion-form/recepcion-form.html` | Input type="date" con \*ngIf/visible condicional  |
