# Sprint 7 — Inventario: Trazabilidad, Ajustes y Costeo Real

## Intención

Cerrar las brechas de inventario identificadas en el informe `inventario-brechas.md`. Priorizar las 3 features bloqueantes para operación real: Kardex (trazabilidad), Ajustes de inventario (correcciones) y Costeo PEPS/Promedio (valoración real). Incluir features complementarias en slices secundarios.

## Alcance

### Slice 1: Kardex — Historial de Movimientos 🔴

- Tabla `inventory_movements` con tipo, cantidad, costo, usuario, fecha
- Registrar cada mutación de stock: entrada, salida, ajuste, traslado, decomiso
- Endpoint `GET /api/v1/kardex?productId=X&batchId=Y&from=Z&to=W`
- Frontend: vista de historial por producto con filtros

### Slice 2: Ajustes de Inventario 🔴

- Entidad `StockAdjustment` con `AdjustmentType`: `PHYSICAL_COUNT`, `DAMAGE`, `EXPIRATION`, `THEFT`, `OTHER`
- Auditoría: motivo, usuario, fecha, cantidad antes/después
- Endpoints: `POST /adjustments`, `GET /adjustments`, `GET /adjustments/{id}`
- Frontend: formulario de ajuste con selección de producto/lote/bodega + motivo

### Slice 3: Entradas y Salidas Manuales 🟡

- `POST /api/v1/stock/entry` — entrada manual con producto, lote, bodega, cantidad, costo
- `POST /api/v1/stock/exit` — salida manual con motivo
- Registrar automáticamente en Kardex

### Slice 4: Traslados entre Bodegas 🟡

- Entidad `StockTransfer` con bodega origen, destino, estado
- Validación: stock suficiente en origen
- Endpoints: `POST /transfers`, `POST /transfers/{id}/confirm`
- Frontend: formulario de traslado + confirmación

### Slice 5: Costeo PEPS + Promedio Ponderado 🟡

- Capas de costo (cost layers) para PEPS: fila por cada entrada con cantidad, costo, saldo
- Recalcular `unitCost` en `InventoryStock` con el método configurado en `Product.costingMethod`
- Validación de consistencia: suma de capas = total en stock

### Slice 6: Decomisos + Lotes/Vencimientos 🟢

- Tipos de decomiso: `SANITARIO`, `RESIDUO_VENDIBLE`, `MERMA_PROCESO`
- Agregar `expirationDate` a `Batch`
- Validación de vencimiento al vender (no vender lotes vencidos)
- Alertas de próximos a vencer

## Fuera de alcance (postergado)

- Presentaciones (variantes de producto)
- Fórmulas/Combos (BOM)

## Dependencias

- Sprint 6 (POS Core) — completado al 90%
- Los slices 1-3 son independientes entre sí
- Slice 4 depende de Slice 1 (Kardex para registrar traslados)
- Slice 5 depende de Slice 1 (capas de costo usan historial de entradas)
- Slice 6 depende de Slice 1 (decomisos y vencimientos se registran en Kardex)
