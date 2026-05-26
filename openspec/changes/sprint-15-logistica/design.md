# Design: Sprint 15 — Logística (Cierre de Brechas)

## Technical Approach

Sprint de **pulido y completitud**, no greenfield. El backend hexagonal ya existe para los 4 sub-módulos (Kardex, Traslados, Decomisos, Ajustes). El trabajo es 70% frontend (reemplazar UUID inputs por pickers, agregar filtros) y 30% backend (enriquecer endpoints, aprobación, fix migraciones).

Seguimos el workflow documentado en `12-sdd_build_workflow.md`.

## Architecture Decisions

### 1. Reusable Pickers como Standalone Components

| Opción                                          | Tradeoff                          | Decisión   |
| ----------------------------------------------- | --------------------------------- | ---------- |
| Componentes standalone compartidos en `shared/` | DRY, 1 componente → 4 formularios | ✅ Elegido |
| Duplicar lógica en cada formulario              | Sin dependencia, pero 4x código   | ❌         |

Los pickers emiten `(selectedId)` como `EventEmitter<UUID>`. El formulario padre recibe el evento y actualiza su FormControl.

```
features/shared/
├── warehouse-picker.ts + .html    ← WarehousePickerComponent
├── product-search.ts + .html      ← ProductSearchComponent
└── batch-picker.ts + .html        ← BatchPickerComponent
```

### 2. ProductSearch Backend Endpoint

| Opción                                                      | Tradeoff                        | Decisión   |
| ----------------------------------------------------------- | ------------------------------- | ---------- |
| Reutilizar `GET /api/v1/products` existente con query param | Cero backend nuevo, ya paginado | ✅ Elegido |
| Nuevo endpoint dedicado                                     | Más control pero duplicación    | ❌         |

El ProductController ya tiene búsqueda. Solo necesitamos exponer un query param `?query=` en el frontend service.

### 3. Adjustment Approval Workflow

| Opción                                                     | Tradeoff                              | Decisión   |
| ---------------------------------------------------------- | ------------------------------------- | ---------- |
| Columna `status` en `stock_adjustments` + endpoint approve | Simple, audit trail en misma tabla    | ✅ Elegido |
| Tabla separada `adjustment_approvals`                      | Más complejo, overkill para este caso | ❌         |

Migración: `ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'APPLIED'`. Solo `PHYSICAL_COUNT` inicia en `PENDING`.

### 4. Expiration Monitoring

| Opción                                                     | Tradeoff                          | Decisión   |
| ---------------------------------------------------------- | --------------------------------- | ---------- |
| `@Scheduled` job diario que loggea lotes próximos a vencer | Simple, sin infraestructura extra | ✅ Elegido |
| Evento de dominio + listener                               | Más desacoplado pero overkill     | ❌         |

Se expone `GET /api/v1/disposals/expiring-soon?days=30` para consulta bajo demanda.

### 5. Migration Fix Strategy

| Opción                                              | Tradeoff                                         | Decisión   |
| --------------------------------------------------- | ------------------------------------------------ | ---------- |
| Nueva migración V68 con `ALTER TABLE` para corregir | No toca migraciones históricas (Flyway checksum) | ✅ Elegido |
| Editar V61 y V63 directamente                       | Rompe checksums si Flyway ya las ejecutó         | ❌         |

V68 hará: `ALTER TABLE production_batch_items DROP CONSTRAINT fk_production_batch_items_kardex`, recrear con FK correcta. Si no se ha ejecutado en prod, se puede editar el archivo original antes del primer deploy.

### 6. Kardex Delta Sign Fix

| Opción                                          | Tradeoff                                                                         | Decisión   |
| ----------------------------------------------- | -------------------------------------------------------------------------------- | ---------- |
| Eliminar `delta.abs()` y usar `delta` con signo | Cambia semántica de `quantity` en kardex. Requiere actualizar queries y frontend | ✅ Elegido |
| Agregar columna `delta_sign`                    | No rompe queries existentes pero agrega columna                                  | ❌         |

El campo `quantity` en `inventory_movements` actualmente siempre es positivo. Con el fix, será positivo para aumentos y negativo para disminuciones. Hay que verificar que las queries de agregación (SUM) sigan funcionando — y funcionan porque SUM de valores negativos resta correctamente.

## Data Flow

```
WarehousePicker ──(warehouseId)──→ Formulario padre (ej: transfer-form)
                                      │
ProductSearch ────(productId)────→ Formulario padre
                                      │
BatchPicker ──────(batchId)──────→ Formulario padre
                                      │
                                      ↓
                              POST /api/v1/transfers
```

## API Changes

### Modificados

| Endpoint                   | Cambio                                                       |
| -------------------------- | ------------------------------------------------------------ |
| `GET /api/v1/adjustments`  | +query params: `warehouseId`, `adjustmentType`, `from`, `to` |
| `GET /api/v1/disposals`    | +query params: `productId`, `disposalType`, `from`, `to`     |
| `POST /api/v1/adjustments` | Lógica de estado PENDING vs APPLIED según tipo               |
| `POST /api/v1/transfers`   | Validación de stock en origen al crear (422 si insuficiente) |

### Nuevos

| Endpoint                                      | Descripción             |
| --------------------------------------------- | ----------------------- |
| `GET /api/v1/disposals/expiring-soon?days=30` | Lotes próximos a vencer |
| `POST /api/v1/adjustments/{id}/approve`       | Aprobar ajuste PENDING  |
| `POST /api/v1/adjustments/{id}/reject`        | Rechazar ajuste PENDING |

## Component Tree (Frontend)

```
features/shared/                          ← NUEVO (reusable pickers)
├── warehouse-picker.ts + .html
├── product-search.ts + .html
└── batch-picker.ts + .html

features/inventario/kardex/               ← MODIFICADO
└── kardex-list.ts + .html                (+ dateRange, warehouseFilter, batchFilter, +4 movement types)

features/inventario/ajustes/              ← MODIFICADO
├── adjustment-list.ts + .html            (+ filtros warehouse, type, fecha)
└── adjustment-form.ts + .html            (WarehousePicker, ProductSearch, BatchPicker)

features/inventario/traslados/            ← MODIFICADO
├── transfer-list.ts + .html              (link a detail)
├── transfer-form.ts + .html              (WarehousePicker x2, ProductSearch, BatchPicker)
└── transfer-detail.ts + .html            ← NUEVO

features/inventario/decomisos/            ← MODIFICADO
├── disposal-list.ts + .html              (+ filtros product, type, fecha)
└── disposal-form.ts + .html              (WarehousePicker, ProductSearch, BatchPicker)
```

## File Changes

| File                                               | Action          | Description                                                  |
| -------------------------------------------------- | --------------- | ------------------------------------------------------------ |
| `features/shared/warehouse-picker.ts`              | Create          | AutoComplete de bodegas (GET /api/v1/warehouses)             |
| `features/shared/product-search.ts`                | Create          | AutoComplete de productos con debounce 300ms                 |
| `features/shared/batch-picker.ts`                  | Create          | Select de lotes filtrado por producto                        |
| `features/inventario/kardex/kardex-list.ts`        | Modify          | +dateRange, +warehousePicker, +batchPicker, +4 movementTypes |
| `features/inventario/kardex/kardex-list.html`      | Modify          | DateRange pickers, warehouse/batch filter rows               |
| `features/inventario/kardex/kardex.model.ts`       | Modify          | +4 tipos en MovementType union                               |
| `features/inventario/ajustes/adjustment-list.ts`   | Modify          | +filtros, +approve/reject buttons                            |
| `features/inventario/ajustes/adjustment-form.ts`   | Modify          | WarehousePicker, ProductSearch, BatchPicker                  |
| `features/inventario/traslados/transfer-form.ts`   | Modify          | WarehousePicker x2, ProductSearch, BatchPicker               |
| `features/inventario/traslados/transfer-detail.ts` | Create          | Vista de detalle de traslado                                 |
| `features/inventario/decomisos/disposal-list.ts`   | Modify          | +filtros, +expiring-soon badge                               |
| `features/inventario/decomisos/disposal-form.ts`   | Modify          | WarehousePicker, ProductSearch, BatchPicker                  |
| `core/services/warehouse.service.ts`               | Create o modify | Método search() para autocomplete                            |
| `app.routes.ts`                                    | Modify          | +ruta `/inventario/traslados/:id`                            |

### Backend

| File                             | Action | Description                               |
| -------------------------------- | ------ | ----------------------------------------- |
| `V68__fix_kardex_references.sql` | Create | Corrige FKs y constraints de V61/V63      |
| `AdjustmentController.java`      | Modify | +approve, +reject endpoints, +filtros GET |
| `DisposalController.java`        | Modify | +filtros GET, +expiring-soon endpoint     |
| `TransferController.java`        | Modify | +validación stock en create               |
| `CreateAdjustmentUseCase.java`   | Modify | Fix delta sign, +PENDING/APPLIED logic    |
| `CreateTransferUseCase.java`     | Modify | +stock validation                         |
| `ExpirationMonitorJob.java`      | Create | @Scheduled job para alerta vencimientos   |

## Testing Strategy

| Capa                    | Qué                                   | Cómo                                    |
| ----------------------- | ------------------------------------- | --------------------------------------- |
| Componentes picker      | Renderizado, eventos, filtrado        | TestBed.createComponent + mock services |
| Formularios modificados | Integración con pickers               | TestBed + fixture.detectChanges         |
| Backend endpoints       | Nuevos query params, approve workflow | MockMvc                                 |
| Migration fix           | FK correcta                           | Verificar que V68 compila sin errores   |

## Migration / Rollout

- **Rollback FE**: Los pickers son aditivos. Si fallan, se vuelve a UUID inputs.
- **Rollback BE**: V68 es idempotente (`IF EXISTS`). Los nuevos endpoints son aditivos.
- **Sin impacto en datos existentes**: Los ajustes existentes tienen status='APPLIED' por default.
