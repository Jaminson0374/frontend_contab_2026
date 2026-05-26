# Tasks: Sprint 16 — Producción Avanzada

## Phase 1: Slice 1 — Sub-recetas (Multi-level BOM)

### Backend

- [ ] 1.1 [BE] Modificar `ProductFormulaUseCase.java` — remover validación que impide component_product_id FORMULA
- [ ] 1.2 [BE] Crear `BomExploder.java` en domain/service — clase pura con método `explode(UUID formulaId, BigDecimal qty)` que devuelve `Map<UUID, BigDecimal>` (materiaPrimaId → cantidad necesaria) con recursión limitada a 5 niveles
- [ ] 1.3 [BE] Agregar `detectCycle(UUID formulaId, UUID newComponentId)` en ProductFormulaUseCase — DFS desde newComponentId hacia arriba buscando formulaId
- [ ] 1.4 [BE] Validar ciclo en `POST /api/v1/products/{id}/formulas` — si se detecta, throw BusinessException
- [ ] 1.5 [BE] Modificar `FormulaProductionUseCase.produce()` — si la fórmula tiene sub-fórmulas, llamar a BomExploder, ejecutar producción de sub-fórmulas en orden bottom-up, luego consumir outputs como insumos de la fórmula padre
- [ ] 1.6 [BE] Acumular costs: MPD de sub-niveles suma al costo del nivel superior. MOD y CIF solo del nivel raíz (no se duplica)

### Frontend

- [ ] 1.7 [FE] Modificar `features/admin/products/formula-tab.ts` — permitir seleccionar productos FORMULA como componentes (ya funciona, solo verificar)
- [ ] 1.8 [FE] Agregar indicador visual "Sub-receta" en la tabla de componentes de fórmula

---

## Phase 2: Slice 2 — Órdenes de Producción

### Backend — Migrations

- [ ] 2.1 [BE] Crear `V69__create_production_orders.sql` — tabla production_orders con FK a products(formula_id), warehouses, machinery(nullable). CHECK status IN (PLANNED,APPROVED,IN_PROGRESS,COMPLETED,CANCELLED)
- [ ] 2.2 [BE] Crear `V70__extend_production_batches.sql` — ALTER TABLE production_batches ADD order_id UUID REFERENCES production_orders, ADD status VARCHAR DEFAULT 'OPEN'

### Backend — Domain + Persistence

- [ ] 2.3 [BE] Crear `domain/model/ProductionOrder.java` — record con 14 campos
- [ ] 2.4 [BE] Crear `domain/model/ProductionOrderStatus.java` — enum PLANNED,APPROVED,IN_PROGRESS,COMPLETED,CANCELLED
- [ ] 2.5 [BE] Crear `domain/repository/ProductionOrderRepository.java` — interface con save, findById, findAllFiltered, findByStatus
- [ ] 2.6 [BE] Crear `infrastructure/.../ProductionOrderEntity.java` — JPA entity
- [ ] 2.7 [BE] Crear `infrastructure/.../ProductionOrderJpaRepository.java` — Spring Data con @Query para findAllFiltered
- [ ] 2.8 [BE] Crear `infrastructure/.../ProductionOrderMapper.java` — MapStruct
- [ ] 2.9 [BE] Crear `infrastructure/.../ProductionOrderRepositoryAdapter.java` — adapter

### Backend — Use Cases + Controller

- [ ] 2.10 [BE] Crear `application/usecase/ManageProductionOrderUseCase.java` — create(PLANNED), approve, execute(→batch), cancel, list, getById
- [ ] 2.11 [BE] Crear `application/dto/ProductionOrderRequest.java` + `ProductionOrderResponse.java`
- [ ] 2.12 [BE] Crear `infrastructure/.../ProductionOrderController.java` — endpoints REST

### Frontend

- [ ] 2.13 [FE] Crear `core/models/production-order.model.ts` — interfaces
- [ ] 2.14 [FE] Crear `core/services/production-order.service.ts` — CRUD + approve/execute/cancel
- [ ] 2.15 [FE] Crear `features/production/orders/order-list.ts + .html` — tabla paginada, chips estado, filtros
- [ ] 2.16 [FE] Crear `features/production/orders/order-form.ts + .html` — ProductSearch (solo FORMULA), WarehousePicker, fecha, cantidad
- [ ] 2.17 [FE] Crear `features/production/orders/order-detail.ts + .html` — info orden + batch link + botones de acción
- [ ] 2.18 [FE] Modificar `app.routes.ts` — agregar `/produccion/ordenes` y `/produccion/ordenes/nuevo` y `/produccion/ordenes/:id`
- [ ] 2.19 [FE] Modificar `shell.ts` — agregar módulo "Producción" con sub-ítems "Órdenes" y "Maquinaria"

---

## Phase 3: Slice 3 — Cierre de Insumos

### Backend

- [ ] 3.1 [BE] Crear endpoint `POST /api/v1/production/batches/{id}/close` en ProductionController — valida que batch tenga items, cambia status a CLOSED
- [ ] 3.2 [BE] Crear endpoint `POST /api/v1/production/batches/{id}/shrinkage` — actualiza shrinkage_quantity y shrinkage_cost
- [ ] 3.3 [BE] Crear endpoint `GET /api/v1/production/batches/{id}/variance` — compara planned vs actual por item
- [ ] 3.4 [BE] Crear endpoint `GET /api/v1/production/batches/{id}/yield` — input_total, output_total, shrinkage_pct, yield_pct

### Frontend

- [ ] 3.5 [FE] Modificar `features/inventario/produccion/production-batch.ts` — agregar botón "Cerrar lote" + diálogo de confirmación
- [ ] 3.6 [FE] Modificar `features/inventario/produccion/production-list.ts` — mostrar columna status con chips
- [ ] 3.7 [FE] Crear sección de variance/yield en detalle de lote (si existe, o en batch component)

---

## Phase 4: Slice 4 — Maquinaria

### Backend

- [ ] 4.1 [BE] Crear `V71__create_machinery.sql` — tabla machinery con CHECK status IN (OPERATIONAL,MAINTENANCE,DECOMMISSIONED)
- [ ] 4.2 [BE] Crear `domain/model/Machinery.java` — record
- [ ] 4.3 [BE] Crear `domain/repository/MachineryRepository.java` — interface CRUD
- [ ] 4.4 [BE] Crear `infrastructure/.../MachineryEntity.java` + JPA + Mapper + Adapter
- [ ] 4.5 [BE] Crear `application/usecase/ManageMachineryUseCase.java` — CRUD + soft delete (status=DECOMMISSIONED)
- [ ] 4.6 [BE] Crear `infrastructure/.../MachineryController.java` — REST CRUD

### Frontend

- [ ] 4.7 [FE] Crear `core/models/machinery.model.ts`
- [ ] 4.8 [FE] Crear `core/services/machinery.service.ts`
- [ ] 4.9 [FE] Crear `features/production/machinery/machinery-list.ts + .html` — tabla con chips estado
- [ ] 4.10 [FE] Crear `features/production/machinery/machinery-form.ts + .html` — formulario código/nombre/tipo/estado
- [ ] 4.11 [FE] Modificar `app.routes.ts` — agregar `/produccion/maquinaria` y `/produccion/maquinaria/nuevo`

---

## Phase 5: Verify

- [ ] 5.1 [BE] `gradlew compileJava` → BUILD SUCCESSFUL
- [ ] 5.2 [FE] `npx tsc --noEmit` → 0 errores
- [ ] 5.3 [FE] `npx vitest run` → sin nuevos failures

---

## Resumen

| Fase                  | Tareas | Prioridad |
| --------------------- | ------ | --------- |
| 1. Sub-recetas        | 8      | MUST      |
| 2. Órdenes Producción | 19     | MUST      |
| 3. Cierre Insumos     | 7      | SHOULD    |
| 4. Maquinaria         | 11     | MUST      |
| 5. Verify             | 3      | MUST      |
| **Total**             | **48** |           |
