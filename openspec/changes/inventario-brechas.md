# Informe de Brechas — Módulo de Inventarios

**Fecha:** 2026-05-20  
**Proyecto:** posinvent  
**Origen:** Lista de sprints del plan maestro

---

## Resumen

De 9 features de inventario pendientes, **0 están completas**, **3 son parciales** y **6 no existen**.

| Feature                             | Estado                               | Sprint original |
| ----------------------------------- | ------------------------------------ | --------------- |
| Presentaciones                      | ❌ No existe                         | Sprint 3        |
| Fórmulas/Combos                     | ❌ No existe                         | Sprint 3        |
| Kardex (historial movimientos)      | ❌ No existe                         | Sprint 8        |
| Entradas y salidas manuales         | ⚠️ Parcial (solo vía Batch)          | —               |
| Ajustes de inventario auditados     | ❌ No existe                         | Sprint 8        |
| Traslados entre bodegas             | ❌ No existe                         | Sprint 8        |
| Decomisos (sanitario/residuo/merma) | ⚠️ Parcial (solo enum WarehouseType) | Sprint 8        |
| Control de lotes y vencimientos     | ❌ No existe                         | —               |
| Costeo PEPS + Yield Costing         | ⚠️ Parcial (solo Yield en Desposte)  | —               |

---

## Detalle por Feature

### 1. Presentaciones (Sprint 3) — ❌

Variantes de presentación de un producto (ej: 500ml y 1L del mismo producto).

- **No existe** entidad, dominio, DTO, caso de uso ni controlador
- Solo existe `UnitOfMeasure` como referencia, pero sin relación N:1 producto→presentaciones
- 0 archivos encontrados con "presentacion" o "presentation"

### 2. Fórmulas/Combos (Sprint 3) — ❌

Lista de materiales (BOM) para productos compuestos o combos.

- **No existe** entidad `Formula`, `Combo`, `BOM` o `Recipe`
- 0 hits en todo el código Java

### 3. Kardex — Historial de movimientos (Sprint 8) — ❌

Registro histórico de cada movimiento de inventario.

- `inventory_stock` es una tabla de **estado actual**, no de historia
- Cada mutación **sobrescribe** la fila existente
- No se puede responder: "¿cuánto stock había del producto X el día Y?"
- 0 hits para `kardex`, `StockMovement`, `InventoryMovement`

### 4. Entradas y salidas manuales — ⚠️ Parcial

| Mecanismo                                      | Existe |
| ---------------------------------------------- | ------ |
| Entrada vía recepción de compra (GoodsReceipt) | ✅     |
| Salida vía checkout POS                        | ✅     |
| Entrada vía faena (Slaughter)                  | ✅     |
| Entrada vía desposte (ManualDesposte)          | ✅     |
| Entrada/salida manual genérica                 | ❌     |
| Endpoint dedicado (`StockInController`)        | ❌     |

Solo se puede entrar stock indirectamente creando un `Batch` con `sourceReceiptId=null`. No hay mecanismo de salida manual.

### 5. Ajustes de inventario auditados (Sprint 8) — ❌

Ajustes por conteo físico con auditoría.

- **No existe** entidad `StockAdjustment`, `InventoryAdjustment` o `PhysicalCount`
- El único rastro es un mensaje de error en `BatchUseCase`: _"Un lote cerrado no puede modificarse. Usá un Ajuste de Inventario."_ — referencia a feature inexistente

### 6. Traslados entre bodegas (Sprint 8) — ❌

Transferencias de stock entre warehouses.

- **No existe** entidad `StockTransfer`, `TransferOrder` o `Remision`
- 0 hits para "traslado", "transfer" (en contexto inventario), "remision"

### 7. Decomisos (Sprint 8) — ⚠️ Parcial

| Elemento                                                         | Estado                         |
| ---------------------------------------------------------------- | ------------------------------ |
| `WarehouseType.DECOMISOS` (enum)                                 | ✅ Existe                      |
| Tipos: `DECOMISO_SANITARIO`, `RESIDUO_VENDIBLE`, `MERMA_PROCESO` | ❌ No existen                  |
| Merma en desposte (`wasteWeight`, `shrinkWeight`)                | ✅ Existe pero sin categorizar |
| Caso de uso `DisposalOrder` / `StockWriteOff`                    | ❌ No existe                   |
| Endpoint                                                         | ❌ No existe                   |

### 8. Control de lotes y vencimientos — ❌

- Batch solo tiene `entryDate`, sin `expirationDate` ni `dueDate`
- `Product.perishable` (booleano) existe pero **no tiene ninguna lógica asociada**
- Sin validaciones de vencimiento, sin alertas, sin bloqueo de productos vencidos

### 9. Costeo PEPS + Yield Costing — ⚠️ Parcial

| Método                      | Aceptado (string) |                   Lógica implementada                    |
| --------------------------- | :---------------: | :------------------------------------------------------: |
| `YIELD_COSTING`             |        ✅         | ✅ `ManualDesposteDomainService.calculateYieldCosting()` |
| `PEPS` (FIFO)               |        ✅         |             ❌ Sin lógica de capas de costo              |
| `PROMEDIO_PONDERADO`        |   ✅ (default)    |                     ❌ Sin recálculo                     |
| `ESTANDAR`                  |        ✅         |                      ❌ Sin lógica                       |
| `IDENTIFICACION_ESPECIFICA` |        ✅         |                      ❌ Sin lógica                       |

`Product.costPrice` es un valor fijo establecido al crear el producto, nunca se recalcula dinámicamente. `InventoryStock.unitCost` se setea al crear la fila de stock pero no se actualiza con movimientos posteriores.

---

## Priorización sugerida

| Prioridad | Feature                          | Razón                                                              |
| --------- | -------------------------------- | ------------------------------------------------------------------ |
| 🔴 Alta   | Kardex (historial movimientos)   | Requisito legal-contable. Sin esto no hay trazabilidad.            |
| 🔴 Alta   | Ajustes de inventario            | Requisito operativo diario. El sistema ya referencia esta feature. |
| 🟡 Media  | Entradas/salidas manuales        | Necesario para corregir discrepancias sin modificar DB.            |
| 🟡 Media  | Traslados entre bodegas          | Operación común en multi-bodega.                                   |
| 🟡 Media  | Costeo PEPS + Promedio Ponderado | Impacto en valoración de inventario y margen real.                 |
| 🟢 Baja   | Decomisos                        | El enum de WarehouseType ya existe, falta la lógica de negocio.    |
| 🟢 Baja   | Lotes y vencimientos             | Requiere `expirationDate` en Batch + lógica de alertas.            |
| 🟢 Baja   | Presentaciones                   | Útil pero no bloqueante.                                           |
| 🟢 Baja   | Fórmulas/Combos                  | Útil para retail pero no crítico para el core actual.              |

---

_Informe generado por revisión de código del backend `C:\POS_VTA\backend_pos-vta`._
