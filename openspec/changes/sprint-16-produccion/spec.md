# Producción Specification — Sprint 16

## Slice 1: Sub-recetas (Multi-level BOM)

### REQ-PROD-001: Fórmula como componente de otra fórmula (MUST)

- **GIVEN** una fórmula "Mezcla de condimentos" (FORMULA) y una fórmula "Chorizo" (FORMULA)
- **WHEN** se agrega "Mezcla de condimentos" como componente de "Chorizo" en product_formulas
- **THEN** el sistema permite que un producto tipo FORMULA sea component_product_id en otra fórmula
- **AND** al ejecutar producción de "Chorizo", se explota recursivamente: primero produce "Mezcla de condimentos", luego la consume como insumo de "Chorizo"

### REQ-PROD-002: Explosión recursiva del BOM (MUST)

- **GIVEN** "Combo Parrillero" (FORMULA) → "Chorizo" (FORMULA) → "Mezcla condimentos" (FORMULA) → "Orégano" (MATERIA_PRIMA)
- **WHEN** se ejecuta producción de "Combo Parrillero" con cantidad Q
- **THEN** el sistema calcula las cantidades necesarias de cada nivel
- **AND** ejecuta producción de "Mezcla condimentos", luego "Chorizo", luego "Combo Parrillero"
- **AND** los costos se acumulan de abajo hacia arriba (leaf → root)

### REQ-PROD-003: Detección de ciclos en BOM (MUST)

- **GIVEN** se intenta agregar "Chorizo" como componente de "Mezcla de condimentos" cuando "Mezcla de condimentos" ya es componente de "Chorizo"
- **WHEN** se valida la fórmula
- **THEN** el backend rechaza con error "Ciclo detectado en BOM: producto X ya es ancestro de Y"

### REQ-PROD-004: Máximo 5 niveles de profundidad (SHOULD)

- **GIVEN** un BOM de más de 5 niveles
- **WHEN** se intenta ejecutar producción
- **THEN** el backend rechaza con error "Profundidad máxima de BOM excedida (5 niveles)"

---

## Slice 2: Órdenes de Producción

### REQ-PROD-010: Tabla production_orders (MUST)

- **GIVEN** la tabla production_orders
- **WHEN** se crea
- **THEN** contiene: id, order_number (auto), formula_id, planned_quantity, planned_date, status (PLANNED/APPROVED/IN_PROGRESS/COMPLETED/CANCELLED), warehouse_id, assigned_machinery_id, notes, created_by, approved_by, created_at, approved_at

### REQ-PROD-011: Flujo de estados (MUST)

- **GIVEN** una orden en PLANNED
- **WHEN** un ADMIN/CONTADOR aprueba → APPROVED
- **WHEN** se inicia ejecución → IN_PROGRESS (crea production_batch)
- **WHEN** el lote se cierra → COMPLETED
- **WHEN** se cancela en PLANNED o APPROVED → CANCELLED

### REQ-PROD-012: CRUD de órdenes (MUST)

- **GIVEN** el endpoint `POST /api/v1/production-orders`
- **WHEN** se crea una orden con formula_id, planned_quantity, planned_date, warehouse_id
- **THEN** queda en PLANNED con auto-number PO-{YYYYMMDD}-{SEQ}
- **AND** `GET /api/v1/production-orders` lista paginada con filtros status, warehouse, date

### REQ-PROD-013: Ejecutar orden → lote de producción (MUST)

- **GIVEN** una orden APPROVED
- **WHEN** se llama `POST /api/v1/production-orders/{id}/execute`
- **THEN** se crea un production_batch vinculado a la orden
- **AND** se ejecuta FormulaProductionUseCase.produce()
- **AND** la orden pasa a IN_PROGRESS
- **AND** el batch tiene FK a production_order_id

### REQ-PROD-014: Frontend — order list + form (MUST)

- **GIVEN** la ruta `/produccion/ordenes`
- **WHEN** se accede
- **THEN** muestra lista de órdenes con chips de estado, filtros, botón crear
- **AND** `/produccion/ordenes/nuevo` muestra formulario con FormulaSearch, WarehousePicker, fecha planificada, cantidad
- **AND** botones Approve/Execute/Cancel según estado

---

## Slice 3: Cierre de Insumos

### REQ-PROD-020: Estado CLOSED en production_batches (MUST)

- **GIVEN** un lote en estado IN_PROGRESS (nuevo status)
- **WHEN** se registran todas las mermas y se concilian insumos
- **AND** se llama `POST /api/v1/production/batches/{id}/close`
- **THEN** el lote pasa a CLOSED
- **AND** no se permiten más modificaciones

### REQ-PROD-021: Registro de merma con código de razón (SHOULD)

- **GIVEN** un lote en IN_PROGRESS
- **WHEN** se registra merma vía `POST /api/v1/production/batches/{id}/shrinkage`
- **THEN** se actualiza shrinkage_quantity y shrinkage_cost con reason_code (EVAPORATION, TRIMMING, SPILLAGE, REWORK, OTHER)

### REQ-PROD-022: Conciliación planeado vs real (SHOULD)

- **GIVEN** production_batch_items con planned_quantity y actual_quantity
- **WHEN** se consulta `GET /api/v1/production/batches/{id}/variance`
- **THEN** devuelve por componente: planned, actual, variance, variance_pct

### REQ-PROD-023: Yield analysis (SHOULD)

- **GIVEN** un lote cerrado
- **WHEN** se consulta yield
- **THEN** devuelve: input_total_kg, output_total_kg, shrinkage_kg, shrinkage_pct, yield_pct

---

## Slice 4: Maquinaria

### REQ-PROD-030: Tabla machinery (MUST)

- **GIVEN** la tabla machinery
- **WHEN** se crea
- **THEN** contiene: id, code, name, machinery_type (MOLINO, MEZCLADORA, EMBUTIDORA, AHUMADOR, EMPACADORA, SELLADORA, BASCULA, OTHER), status (OPERATIONAL/MAINTENANCE/DECOMMISSIONED), created_at

### REQ-PROD-031: CRUD maquinaria (MUST)

- **GIVEN** endpoints `/api/v1/machinery`
- **WHEN** se usa POST/GET/PUT/DELETE
- **THEN** CRUD completo con listado paginado y filtro por tipo

### REQ-PROD-032: Asignar maquinaria a orden (SHOULD)

- **GIVEN** una production_order
- **WHEN** se asigna machinery_id
- **THEN** la orden queda vinculada a esa máquina
- **AND** al ejecutar la orden, se registra la máquina usada en el production_batch

### REQ-PROD-033: Frontend maquinaria (MUST)

- **GIVEN** ruta `/produccion/maquinaria`
- **WHEN** se accede
- **THEN** lista de equipos con chips de estado, botón crear
- **AND** formulario con código, nombre, tipo, estado
