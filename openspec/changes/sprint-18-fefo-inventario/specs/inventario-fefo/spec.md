# Spec: FEFO + PEPS + Trazabilidad Batch→Venta

## REQ-FEFO-001: Captura de expirationDate en recepción

**Given** un producto con `perishable = true` y `manageLots = true`
**When** se registra una recepción de mercancía contra una orden de compra
**Then** el `GoodsReceiptRequest` DEBE incluir `expirationDate` por cada línea
**And** `ReceiptDomainService.validateLines()` DEBE rechazar con `EXPIRATION_DATE_REQUIRED` si `expirationDate` es null
**And** `CreateGoodsReceiptUseCase` DEBE crear el `Batch` con `expirationDate` poblado

**Given** un producto con `perishable = false`
**When** se registra una recepción
**Then** `expirationDate` ES opcional y se ignora si viene

**Given** un producto con `perishable = true` y `expirationDate` en el pasado
**When** se valida la recepción
**Then** DEBE rechazar con `EXPIRATION_DATE_IN_PAST`

---

## REQ-FEFO-002: Algoritmo FefoPicker

**Given** un producto con 3 lotes en la misma bodega:

- Lote A: 2 kg, vence 2026-07-15, costo $8,000/kg
- Lote B: 8 kg, vence 2026-07-20, costo $8,500/kg
- Lote C: 5 kg, vence 2026-08-01, costo $8,200/kg
  **When** se requiere consumir 5 kg mediante `FefoPicker.pick(productId, warehouseId, 5kg)`
  **Then** DEBE retornar `[(Lote A, 2 kg, $8,000), (Lote B, 3 kg, $8,500)]`
  **And** NO DEBE tocar el Lote C

**Given** un producto con lotes sin `expirationDate` (producto no perecedero)
**When** se llama a `FefoPicker.pick()`
**Then** DEBE ordenar por `entryDate ASC` (FIFO puro)
**And** los lotes con `expirationDate = null` van al final (NULLS LAST)

**Given** un producto con stock total insuficiente (requerido > disponible)
**When** se llama a `FefoPicker.pick()`
**Then** DEBE lanzar `BusinessException` con código `INSUFFICIENT_STOCK`

**Given** un producto sin ningún lote con stock disponible
**When** se llama a `FefoPicker.pick()`
**Then** DEBE lanzar `BusinessException` con código `NO_STOCK_AVAILABLE`

**Given** un producto cuyo primer lote tiene stock exactamente igual al requerido
**When** se llama a `FefoPicker.pick()`
**Then** DEBE retornar una lista con un solo `BatchAllocation`

---

## REQ-FEFO-003: Trazabilidad batch→venta por Kardex

**Given** una venta de 5 kg que consume Lote A (2 kg) + Lote B (3 kg)
**When** `PosCheckoutUseCase` procesa la venta
**Then** DEBE crear 2 `InventoryMovement` (EXIT), uno por cada lote consumido
**And** cada movimiento DEBE tener `referenceType = "SALE"` y `referenceId = {invoiceId}`
**And** `SaleItem.batchId` DEBE quedar como `null`
**And** la consulta `SELECT * FROM inventory_movements WHERE reference_id = '{invoiceId}' AND movement_type = 'EXIT'` DEBE retornar ambos lotes con sus cantidades

**Given** una venta manual (no POS) procesada por `ManageSalesDocumentUseCase.decrementStock()`
**When** la venta se confirma a estado ISSUED
**Then** DEBE usar FefoPicker (misma lógica que POS)
**And** DEBE registrar `InventoryMovement` para cada lote consumido (fix del bug actual donde no se registra)

---

## REQ-FEFO-004: Consumo de producción con FEFO

**Given** una orden de producción que requiere materias primas
**When** `FormulaProductionUseCase` consume stock de materias primas
**Then** DEBE usar `FefoPicker` para seleccionar lotes
**And** DEBE decrementar `InventoryStock` real por cada lote consumido
**And** el `batchId` en `InventoryMovement` NO DEBE ser null

**Given** stock insuficiente de materias primas
**When** se intenta ejecutar producción
**Then** DEBE fallar con `INSUFFICIENT_STOCK` ANTES de crear el batch de producto terminado

---

## REQ-FEFO-005: Costeo PEPS alineado con FEFO

**Given** una venta que consume Lote A (2 kg × $8,000) + Lote B (3 kg × $8,500)
**When** se registra el costo de venta
**Then** `CostingService` DEBE consumir `CostLayer` en el mismo orden FEFO
**And** el costo total de venta DEBE ser $41,500 (2×8000 + 3×8500)
**And** cada `InventoryMovement` DEBE registrar el `unitCost` real del lote consumido

---

## REQ-FEFO-006: Auto-disposición por vencimiento

**Given** un lote con `expirationDate < NOW()` y `currentQuantity > 0`
**When** se ejecuta `ExpirationMonitorJob` (cron 6 AM) con `app.inventory.auto-dispose = true`
**Then** DEBE crear `InventoryMovement` tipo `DISPOSAL` por la cantidad restante
**And** DEBE setear `InventoryStock.currentQuantity = 0`
**And** DEBE setear `Batch.status = CLOSED`

**Given** `app.inventory.auto-dispose = false`
**When** se ejecuta el cron
**Then** SOLO DEBE loguear los lotes vencidos, sin modificar stock

**Given** un lote con `expirationDate` dentro de N días (configurable, default 30)
**When** se ejecuta el cron
**Then** DEBE loguear advertencia de lote próximo a vencer
**And** NO DEBE disponerlo (solo los YA vencidos se disponen)

**Given** un lote YA vencido con `currentQuantity = 0`
**When** se ejecuta el cron
**Then** DEBE setear `Batch.status = CLOSED` sin crear movimiento (stock ya estaba en 0)
