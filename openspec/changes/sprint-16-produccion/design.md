# Design: Sprint 16 — Producción Avanzada

## Architecture Decisions

### 1. Sub-recetas: Recursive BOM via product_formulas

| Opción                                          | Tradeoff                             | Decisión   |
| ----------------------------------------------- | ------------------------------------ | ---------- |
| Misma tabla `product_formulas`, auto-referencia | Simple, sin migración nueva          | ✅ Elegido |
| Tabla separada `bom_levels`                     | Más flexible pero duplica estructura | ❌         |

Ya existe: `product_formulas(parent_product_id, component_product_id, quantity)`. Solo falta remover la restricción que evita que un `component_product_id` sea FORMULA, y agregar validación de ciclos en backend.

**Algoritmo de explosión**:

```
explode(formulaId, qty):
  componentes = findComponents(formulaId)
  for each c in componentes:
    if isFormula(c.productId):
      explode(c.productId, qty * c.quantity)  // recursivo
    else:
      totalNeeded[rawMaterialId] += qty * c.quantity
```

**Detección de ciclos**: DFS desde el nuevo componente hacia arriba. Si se encuentra el mismo producto en el camino, es un ciclo.

### 2. Production Orders como capa sobre production_batches

| Opción                                                          | Tradeoff                                                    | Decisión   |
| --------------------------------------------------------------- | ----------------------------------------------------------- | ---------- |
| Nueva tabla `production_orders` + FK desde `production_batches` | Separa planificación de ejecución. No toca código existente | ✅ Elegido |
| Extender `production_batches` con columnas de orden             | Más simple pero mezcla conceptos                            | ❌         |

Estado actual: `production_batches` no tiene FK a orders. Se agrega `order_id` nullable.

### 3. Batch Status Workflow

```
OPEN → IN_PROGRESS → CLOSED
  ↓
CANCELLED
```

Los lotes actuales (sin orden) se crean en OPEN. Los lotes creados desde una orden se crean en IN_PROGRESS.

### 4. Machinery como catálogo simple

Sin depreciación en este sprint. Solo registro y asignación a órdenes.

## Data Flow

```
ProductionOrder (PLANNED)
  │ POST /approve → APPROVED
  │ POST /execute
  ↓
FormulaProductionUseCase.produce()
  │ Si sub-recetas → explode BOM recursivo
  │ Crea production_batch + items + kardex
  ↓
ProductionBatch (IN_PROGRESS)
  │ POST /shrinkage → registra merma
  │ POST /close → concilia → CLOSED
  ↓
Variance + Yield analysis disponible
```

## API Changes

### Nuevos

| Endpoint                                         | Descripción                                           |
| ------------------------------------------------ | ----------------------------------------------------- |
| `POST /api/v1/production-orders`                 | Crear orden (PLANNED)                                 |
| `GET /api/v1/production-orders`                  | Listar órdenes (filtros: status, warehouse, from, to) |
| `GET /api/v1/production-orders/{id}`             | Detalle de orden                                      |
| `POST /api/v1/production-orders/{id}/approve`    | Aprobar (PLANNED→APPROVED)                            |
| `POST /api/v1/production-orders/{id}/execute`    | Ejecutar (APPROVED→IN_PROGRESS, crea batch)           |
| `POST /api/v1/production-orders/{id}/cancel`     | Cancelar                                              |
| `POST /api/v1/production/batches/{id}/close`     | Cerrar lote                                           |
| `POST /api/v1/production/batches/{id}/shrinkage` | Registrar merma                                       |
| `GET /api/v1/production/batches/{id}/variance`   | Conciliación planeado vs real                         |
| `GET /api/v1/production/batches/{id}/yield`      | Yield analysis                                        |
| `POST /api/v1/machinery`                         | Crear equipo                                          |
| `GET /api/v1/machinery`                          | Listar equipos                                        |
| `PUT /api/v1/machinery/{id}`                     | Actualizar equipo                                     |
| `DELETE /api/v1/machinery/{id}`                  | Desactivar equipo                                     |

### Modificados

| Endpoint                              | Cambio                                                    |
| ------------------------------------- | --------------------------------------------------------- |
| `POST /api/v1/production/batches`     | Acepta orderId opcional. Si hay sub-recetas, explota BOM. |
| `POST /api/v1/products/{id}/formulas` | Validación de ciclos en BOM                               |
| `production_batches` table            | +order_id FK nullable, +status VARCHAR                    |

## File Changes

### Backend (~22 archivos)

| File                                                       | Action                                      |
| ---------------------------------------------------------- | ------------------------------------------- |
| `V69__create_production_orders.sql`                        | Create                                      |
| `V70__extend_production_batches.sql`                       | Create (+order_id, +status)                 |
| `V71__create_machinery.sql`                                | Create                                      |
| `domain/model/ProductionOrder.java`                        | Create                                      |
| `domain/model/ProductionOrderStatus.java`                  | Create                                      |
| `domain/model/Machinery.java`                              | Create                                      |
| `domain/repository/ProductionOrderRepository.java`         | Create                                      |
| `domain/repository/MachineryRepository.java`               | Create                                      |
| `infrastructure/.../ProductionOrderEntity.java`            | Create                                      |
| `infrastructure/.../ProductionOrderJpaRepository.java`     | Create                                      |
| `infrastructure/.../ProductionOrderRepositoryAdapter.java` | Create                                      |
| `infrastructure/.../ProductionOrderMapper.java`            | Create                                      |
| `infrastructure/.../MachineryEntity.java`                  | Create                                      |
| `infrastructure/.../MachineryJpaRepository.java`           | Create                                      |
| `infrastructure/.../MachineryRepositoryAdapter.java`       | Create                                      |
| `infrastructure/.../MachineryMapper.java`                  | Create                                      |
| `application/usecase/ManageProductionOrderUseCase.java`    | Create                                      |
| `application/usecase/ManageMachineryUseCase.java`          | Create                                      |
| `infrastructure/.../ProductionOrderController.java`        | Create                                      |
| `infrastructure/.../MachineryController.java`              | Create                                      |
| `application/usecase/FormulaProductionUseCase.java`        | Modify (+recursive BOM, +order integration) |
| `application/usecase/ProductFormulaUseCase.java`           | Modify (+cycle detection)                   |

### Frontend (~10 archivos)

| File                                                      | Action                      |
| --------------------------------------------------------- | --------------------------- |
| `core/models/production-order.model.ts`                   | Create                      |
| `core/models/machinery.model.ts`                          | Create                      |
| `core/services/production-order.service.ts`               | Create                      |
| `core/services/machinery.service.ts`                      | Create                      |
| `features/production/orders/order-list.ts + .html`        | Create                      |
| `features/production/orders/order-form.ts + .html`        | Create                      |
| `features/production/orders/order-detail.ts + .html`      | Create                      |
| `features/production/machinery/machinery-list.ts + .html` | Create                      |
| `features/production/machinery/machinery-form.ts + .html` | Create                      |
| `app.routes.ts`                                           | Modify (+producción routes) |
| `shell.ts`                                                | Modify (+módulo Producción) |
