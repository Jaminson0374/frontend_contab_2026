# Tasks: Sprint 15 — Logística (Cierre de Brechas)

## Phase 1: Slice 1 — Reusable Pickers (Foundation)

### Backend — Warehouse endpoint para autocomplete

- [ ] 1.1 [BE] Crear `GET /api/v1/warehouses/search?query=` en WarehouseController — búsqueda ILIKE por nombre, paginado
- [ ] 1.2 [BE] Verificar que `GET /api/v1/products` soporte query param `?query=` para búsqueda por nombre/código

### Frontend — Pickers

- [ ] 1.3 [FE] Crear `core/services/warehouse.service.ts` — método `search(query: string)` con httpResource
- [ ] 1.4 [FE] Crear `features/shared/warehouse-picker.ts` — MatAutocomplete standalone, emite `(selected)` con warehouseId
- [ ] 1.5 [FE] Crear `features/shared/warehouse-picker.html` — template con input + autocomplete panel
- [ ] 1.6 [FE] Crear `features/shared/product-search.ts` — MatAutocomplete con debounce 300ms, emite `(selected)` con productId + name
- [ ] 1.7 [FE] Crear `features/shared/product-search.html` — template con input + autocomplete panel + loading spinner
- [ ] 1.8 [FE] Crear `features/shared/batch-picker.ts` — MatSelect filtrable por productId, emite `(selected)` con batchId
- [ ] 1.9 [FE] Crear `features/shared/batch-picker.html` — template con dropdown de lotes (solo con stock > 0)

---

## Phase 2: Slice 2 — Kardex (Filtros + Tipos)

### Frontend

- [ ] 2.1 [FE] Modificar `core/models/kardex.model.ts` — agregar `RETURN`, `PRODUCTION_CONSUMPTION`, `PRODUCTION_OUTPUT`, `PRODUCTION_SHRINKAGE` al union type `MovementType`
- [ ] 2.2 [FE] Modificar `features/inventario/kardex/kardex-list.ts` — agregar date range signals (from, to), warehouseId, batchId
- [ ] 2.3 [FE] Modificar `features/inventario/kardex/kardex-list.html` — agregar fila de filtros: datepicker desde/hasta, WarehousePicker, BatchPicker
- [ ] 2.4 [FE] Modificar `features/inventario/kardex/kardex-list.ts` — agregar los 4 tipos faltantes al dropdown de movementType
- [ ] 2.5 [FE] Modificar `features/inventario/kardex/kardex-list.ts` — resolver productName desde productId en la tabla (inyectar ProductService o enriquecer desde backend)
- [ ] 2.6 [FE] Modificar `core/services/kardex.service.ts` — agregar query params: from, to, warehouseId, batchId en buildParams()

---

## Phase 3: Slice 3 — Traslados (UX + Validación + Detalle)

### Backend

- [ ] 3.1 [BE] Modificar `CreateTransferUseCase.java` — validar stock en origen: si `inventory_stock.qty < transferItem.quantity` → throw BusinessException("Stock insuficiente")

### Frontend

- [ ] 3.2 [FE] Modificar `features/inventario/traslados/transfer-form.ts` — reemplazar sourceWarehouseId/targetWarehouseId inputs por WarehousePickerComponent
- [ ] 3.3 [FE] Modificar `features/inventario/traslados/transfer-form.html` — integrar `app-warehouse-picker` y `app-product-search`
- [ ] 3.4 [FE] Modificar `features/inventario/traslados/transfer-form.ts` — reemplazar productId input en items por ProductSearchComponent
- [ ] 3.5 [FE] Crear `features/inventario/traslados/transfer-detail.ts` — componente standalone de detalle
- [ ] 3.6 [FE] Crear `features/inventario/traslados/transfer-detail.html` — template: bodegas origen/destino (nombres), estado chip, tabla items, fechas
- [ ] 3.7 [FE] Modificar `app.routes.ts` — agregar ruta `/inventario/traslados/:id` con lazy load a TransferDetailComponent
- [ ] 3.8 [FE] Modificar `features/inventario/traslados/transfer-list.html` — hacer clickeable cada fila con routerLink a detalle

### Backend — Enriquecer transfer response

- [ ] 3.9 [BE] Modificar `TransferResponse.java` — agregar sourceWarehouseName, targetWarehouseName
- [ ] 3.10 [BE] Modificar transfer controller o use case — resolver nombres de bodega en respuesta

---

## Phase 4: Slice 4 — Decomisos (UX + Monitoreo Vencimientos)

### Backend

- [ ] 4.1 [BE] Modificar `DisposalController.java` — agregar query params `productId`, `disposalType`, `from`, `to` en GET list
- [ ] 4.2 [BE] Crear `ExpirationMonitorJob.java` — @Scheduled(cron="0 0 6 \* \* \*"), query batches WHERE expiration_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
- [ ] 4.3 [BE] Crear `GET /api/v1/disposals/expiring-soon?days=30` en DisposalController — lista lotes próximos a vencer con producto, bodega, cantidad, días restantes

### Frontend

- [ ] 4.4 [FE] Modificar `features/inventario/decomisos/disposal-form.ts` — reemplazar productId/warehouseId inputs por pickers
- [ ] 4.5 [FE] Modificar `features/inventario/decomisos/disposal-form.html` — integrar `app-warehouse-picker`, `app-product-search`, `app-batch-picker`
- [ ] 4.6 [FE] Modificar `features/inventario/decomisos/disposal-list.ts` — agregar filtros productId, disposalType, dateRange
- [ ] 4.7 [FE] Modificar `features/inventario/decomisos/disposal-list.html` — agregar fila de filtros con pickers y chips de colores por tipo
- [ ] 4.8 [FE] Modificar `core/services/disposal.service.ts` — agregar query params en buildParams() y método `getExpiringSoon(days)`

---

## Phase 5: Slice 5 — Ajustes (UX + Flujo Aprobación)

### Backend — Migration

- [ ] 5.1 [BE] Crear `V69__adjustment_approval_workflow.sql` — `ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'APPLIED'`, `ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100)`, `ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ`

### Backend — Approval workflow

- [ ] 5.2 [BE] Modificar `CreateAdjustmentUseCase.java` — si adjustmentType == PHYSICAL_COUNT → status = PENDING (no aplica stock aún); otros tipos → APPLIED (aplica inmediato)
- [ ] 5.3 [BE] Modificar `CreateAdjustmentUseCase.java` — FIX delta sign: usar `delta` (con signo) en lugar de `delta.abs()` para kardex quantity
- [ ] 5.4 [BE] Crear `POST /api/v1/adjustments/{id}/approve` en AdjustmentController — cambia status PENDING → APPLIED, aplica delta stock, registra kardex
- [ ] 5.5 [BE] Crear `POST /api/v1/adjustments/{id}/reject` en AdjustmentController — cambia status PENDING → REJECTED, no aplica stock

### Backend — Filtros

- [ ] 5.6 [BE] Modificar `AdjustmentController.java` GET list — agregar query params `warehouseId`, `adjustmentType`, `from`, `to`
- [ ] 5.7 [BE] Modificar `ListAdjustmentsUseCase.java` — filtrar por warehouseId, adjustmentType, date range

### Frontend

- [ ] 5.8 [FE] Modificar `features/inventario/ajustes/adjustment-form.ts` — reemplazar productId/warehouseId/batchId inputs por pickers
- [ ] 5.9 [FE] Modificar `features/inventario/ajustes/adjustment-form.html` — integrar `app-warehouse-picker`, `app-product-search`, `app-batch-picker`
- [ ] 5.10 [FE] Modificar `features/inventario/ajustes/adjustment-list.ts` — agregar filtros warehouseId, adjustmentType, dateRange
- [ ] 5.11 [FE] Modificar `features/inventario/ajustes/adjustment-list.html` — columna status con chips: PENDING (amarillo), APPLIED (verde), REJECTED (rojo)
- [ ] 5.12 [FE] Modificar `features/inventario/ajustes/adjustment-list.ts` — botones Approve/Reject para filas PENDING (solo ADMIN/CONTADOR)
- [ ] 5.13 [FE] Modificar `core/services/adjustment.service.ts` — métodos `approve(id)`, `reject(id)`, query params en buildParams()

---

## Phase 6: Slice 6 — Bug Fix Migraciones V61/V63

### Backend — Investigation

- [ ] 6.1 [BE] Verificar si V61 y V63 ya se ejecutaron en la BD actual — `SELECT * FROM flyway_schema_history WHERE version IN ('61','63')`
- [ ] 6.2 [BE] Auditar TODAS las migraciones V1-V67 buscando referencias a `kardex` (no `inventory_movements`)

### Backend — Fix

- [ ] 6.3 [BE] Si V61/V63 NO se han ejecutado: editar `V61__create_production_batch_items.sql` — cambiar `REFERENCES kardex(id)` → `REFERENCES inventory_movements(id)`
- [ ] 6.4 [BE] Si V61/V63 NO se han ejecutado: editar `V63__add_production_movement_types.sql` — cambiar `ALTER TABLE kardex` → `ALTER TABLE inventory_movements`
- [ ] 6.5 [BE] Si V61/V63 YA se ejecutaron: crear `V68__fix_kardex_references.sql` con ALTER TABLE para corregir FKs y constraints existentes

---

## Phase 7: Verify

- [ ] 7.1 [BE] `gradlew compileJava` → BUILD SUCCESSFUL
- [ ] 7.2 [FE] `npx tsc --noEmit` → 0 errores
- [ ] 7.3 [FE] `npx vitest run` → sin nuevos failures
- [ ] 7.4 [FE] Verificar que los 4 menús de logística en shell.ts están habilitados y navegan correctamente
- [ ] 7.5 [FE] Verificar visualmente: formularios con pickers en lugar de UUID inputs en ajustes, traslados, decomisos

---

## Resumen

| Fase                    | Tareas | Prioridad |
| ----------------------- | ------ | --------- |
| 1. Pickers (Foundation) | 9      | MUST      |
| 2. Kardex               | 6      | MUST      |
| 3. Traslados            | 10     | MUST      |
| 4. Decomisos            | 8      | MUST      |
| 5. Ajustes              | 13     | MUST      |
| 6. Bug Fix Migraciones  | 5      | MUST      |
| 7. Verify               | 5      | MUST      |
| **Total**               | **56** |           |
