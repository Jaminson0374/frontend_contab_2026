# Sprint 12 — Presentaciones y Fórmulas/Combo

## Intención

El ERP carece de dos capacidades críticas para una planta cárnica: (1) **presentaciones** — un mismo producto se vende en múltiples unidades de medida (bandeja 250g, bandeja 500g, kilo granel), cada una con precio y costo distintos; (2) **fórmulas/combo** — productos compuestos (chorizo, combo promocional, producto manufacturado) que consumen materia prima del inventario vía kardex con rigor de costos industriales (MPD + MOD + CIF). Sin estas capacidades, el módulo de producción no puede operar y el catálogo de productos es artificialmente plano.

## Alcance

### Slice 1: Presentaciones 🟢 (~22 tasks)

- **Backend**: Migración V58 `product_presentations` (product_id FK, unit_of_measure_id FK, conversion_factor DECIMAL, sale_price_override DECIMAL, is_default BOOLEAN). Entidad hexagonal completa: `ProductPresentation` (domain record), `ProductPresentationJpaEntity`, `ProductPresentationRepository`, `ProductPresentationUseCase`, `ProductPresentationController`. Relación `Product → List<ProductPresentation>` en dominios ProductEntity/ProductRecord. Estimación de esfuerzo usando solo datos ya seedeados (19 UoMs).
- **Frontend**: `PresentationsTabComponent` embebido en `product-form`. Tabla de presentaciones con columnas: UoM, factor conversión, precio venta override, default. CRUD inline (add/edit/delete sin navegar a otra pantalla). `PresentationService` (`httpResource`). Validación: exactamente una presentación `is_default=true` por producto.
- **Rutas**: sin nuevas rutas — extiende `product-form` existente en `features/inventario/productos/`.
- **Shell**: sin cambios.

### Slice 2: Fórmulas/Combo 🔴 (~27 tasks)

- **Backend**: Migración V59 `product_formulas` (product_id FK, component_product_id FK, planned_quantity DECIMAL, unit_of_measure_id FK). Migración V60 `production_batches` (formula_id FK, quantity_produced, expected_quantity, direct_material_cost, direct_labor_cost, overhead_cost, total_cost, unit_cost, shrinkage_quantity, shrinkage_cost, notes, created_by, created_at). Migración V61 `production_batch_items` (batch_id FK, component_product_id FK, planned_quantity, actual_quantity, unit_cost_kardex, total_cost, kardex_movement_id FK). Migración V62 `ALTER TABLE company_config ADD costing_method VARCHAR(20) DEFAULT 'WEIGHTED_AVERAGE', ADD overhead_allocation_base VARCHAR(10) DEFAULT 'MOD', ADD overhead_rate NUMERIC(5,2) DEFAULT 0`. Migración V63 — remover `costing_method` de `products` si existe; centralizar en `company_config`.
- **Caso de uso central**: `FormulaProductionUseCase.produce()` — orquesta el batch completo:
  1. Valida fórmula y existencias de componentes
  2. Por cada componente: **SALIDA** kardex (`MovementType.PRODUCTION_CONSUMPTION`) al costo real del kardex (PEPS o Promedio Ponderado según `company_config.costing_method`)
  3. Calcula MPD = Σ(actual_quantity × unit_cost_kardex), MOD = campo capturado, CIF = MOD × overhead_rate
  4. Costo total lote = MPD + MOD + CIF, Costo unitario = total / quantity_produced
  5. **ENTRADA** kardex del producto terminado (`MovementType.PRODUCTION_OUTPUT`) al costo unitario calculado
  6. Si `actual_quantity < planned_quantity`: **MERMA** (`MovementType.PRODUCTION_SHRINKAGE`)
  7. Persiste `ProductionBatch` + `ProductionBatchItems`
- **Endpoints**: `POST /api/v1/production/batches` (crear lote), `GET /api/v1/production/batches/{id}` (detalle), `GET /api/v1/production/batches?formulaId=` (historial), `GET /api/v1/production/formulas/{productId}` (componentes de fórmula).
- **Frontend**: `ProductionBatchComponent` en `features/produccion/lotes/`. Flujo: seleccionar producto tipo FORMULA/COMBO → cargar componentes → campos MOD y notas → vista previa de costos → confirmar producción. `ProductionService` (`httpResource`). `formula-manager` tab en `product-form` para productos tipo FORMULA/COMBO (gestionar componentes).
- **Rutas**: `/produccion/lotes` (nueva).
- **Shell**: habilitar "Producción" (nuevo grupo de menú si no existe o agregar a existente).

## Fuera de alcance

- Costeo por actividad (ABC) — solo costeo por lote
- Integración con nómina para MOD automático — MOD se captura manualmente
- Varios niveles de BOM (explosión recursiva) — solo 1 nivel: componentes → producto
- Subproductos — solo producto principal + merma
- Presentaciones para productos tipo FORMULA/COMBO (fuera de alcance inmediato; se habilita en sprint futuro)
- Conversión automática entre presentaciones (ej: despiece de kilo a bandejas)
- Precios por presentación con impuestos diferenciados

## Enfoque técnico

- **Presentaciones extienden Product, no crean entidad independiente**: `ProductPresentation` es una entidad débil (FK a product). La relación `Product 1→N Presentation` se mapea con `@OneToMany` en JPA. El precio de venta base sigue en `products.sale_price`; `sale_price_override` en `product_presentations` pisa ese valor por presentación. `conversion_factor` relaciona la presentación con la UoM base (ej: 1 bandeja 500g = 0.5 kg, conversion_factor=0.5).
- **Fórmulas usan kardex real, no precio de compra**: `FormulaProductionUseCase` consulta `KardexRepository.getUnitCost(productId)` que devuelve el costo unitario según el método configurado (PEPS o Promedio Ponderado). Cada consumo de componente registra su `kardex_movement_id` en `production_batch_items` para trazabilidad completa.
- **company_config centraliza política de costeo**: `costing_method` se mueve de `products` a `company_config` (política de empresa, no de producto). `overhead_allocation_base` (MOD o MPD) y `overhead_rate` (%) definen cómo se prorratean los CIF.
- **Kardex extendido**: nuevo `MovementType.PRODUCTION_CONSUMPTION` (salida componente), `MovementType.PRODUCTION_OUTPUT` (entrada producto terminado), `MovementType.PRODUCTION_SHRINKAGE` (merma). Todos requieren modificar el enum y el CHECK constraint de `kardex_movements`.
- **Arquitectura hexagonal**: cada entidad nueva sigue el stack completo: domain record → JPA entity → repository interface + impl → use case → controller REST. Inyección por constructor. `@Auditable` en `FormulaProductionUseCase`.
- **Frontend**: standalone components, signals, `httpResource` con `untracked()`. `PresentationsTabComponent` sigue patrón de tabs existentes en `product-form`. `ProductionBatchComponent` es standalone con formulario reactivo.
- **Migraciones**: V58-V63, Flyway incremental. CHECK constraint de `kardex_movements.movement_type` se modifica en V63.

## Áreas afectadas

| Área                                                               | Impacto    | Descripción                                                        |
| ------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------ |
| `ProductPresentation` (domain + jpa + repo + usecase + controller) | Nuevo      | Stack hexagonal completo para presentaciones                       |
| `ProductEntity.java`, `ProductRecord.java`                         | Modificado | +`List<ProductPresentation>` (relación 1→N)                        |
| `product_presentations` table (V58)                                | Nuevo      | 5 columnas + FKs                                                   |
| `ProductFormula` (domain + jpa + repo + usecase + controller)      | Nuevo      | Stack hexagonal completo para fórmulas                             |
| `product_formulas` table (V59)                                     | Nuevo      | 4 columnas + FKs                                                   |
| `ProductionBatch` (domain + jpa + repo)                            | Nuevo      | Entidad de lote de producción                                      |
| `ProductionBatchItem` (domain + jpa)                               | Nuevo      | Entidad de ítem de lote                                            |
| `production_batches` table (V60)                                   | Nuevo      | 11 columnas                                                        |
| `production_batch_items` table (V61)                               | Nuevo      | 8 columnas + FKs                                                   |
| `FormulaProductionUseCase.java`                                    | Nuevo      | Orquestador de producción con kardex                               |
| `MovementType.java` (enum)                                         | Modificado | +PRODUCTION_CONSUMPTION, +PRODUCTION_OUTPUT, +PRODUCTION_SHRINKAGE |
| `kardex_movements` CHECK constraint                                | Modificado | +3 nuevos movement types                                           |
| `KardexRepository.java`                                            | Modificado | +`getUnitCost(productId)` según costing_method                     |
| `CompanyConfigEntity.java`                                         | Modificado | +costing_method, +overhead_allocation_base, +overhead_rate         |
| `company_config` table (V62)                                       | Modificado | +3 columnas                                                        |
| `products` table (V63)                                             | Modificado | -costing_method (si existe)                                        |
| `src/app/features/inventario/productos/product-form/`              | Modificado | +PresentationsTabComponent                                         |
| `src/app/features/produccion/lotes/`                               | Nuevo      | ProductionBatchComponent + ProductionService                       |
| `src/app/app.routes.ts`                                            | Modificado | +ruta `/produccion/lotes`                                          |
| `src/app/layout/shell/shell.ts`                                    | Modificado | Habilitar grupo Producción                                         |

## Riesgos

| #   | Riesgo                                                                                                                     | Prob  | Mitigación                                                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Mover `costing_method` de `products` a `company_config` rompe queries existentes que referencian `products.costing_method` | Media | Migración V63 con `ALTER TABLE products DROP COLUMN costing_method`; antes de borrar, verificar que ningún use case (compras, inventario) lo referencia directamente. Si existe, adaptar a `companyConfigUseCase.getCostingMethod()` |
| 2   | `KardexRepository.getUnitCost(productId)` con PEPS es computacionalmente costoso si el kardex tiene millones de registros  | Baja  | Filtrar solo movimientos de ENTRADA (compras) con stock remanente; índice `(product_id, movement_type, movement_date)` ya existe. Paginación y límite de 1000 registros en consulta PEPS                                             |
| 3   | Producción fallida a mitad del batch deja inventario inconsistente (componentes ya salieron pero producto no entró)        | Alta  | `@Transactional` en `FormulaProductionUseCase.produce()`. Si cualquier paso falla, rollback completo. Validación previa de existencias ANTES de iniciar salidas                                                                      |
| 4   | Concurrent batches sobre la misma fórmula compiten por el mismo stock de componentes                                       | Media | `SELECT ... FOR UPDATE` en `InventoryStockRepository` al validar existencias. Bloqueo pesimista dentro de la transacción                                                                                                             |
| 5   | `sale_price_override` en presentación puede divergir del precio base sin que el usuario lo note                            | Baja  | UI muestra badge "precio personalizado" cuando `sale_price_override IS NOT NULL`. Tooltip explica que pisa el precio base del producto                                                                                               |
| 6   | Nuevos `MovementType` en kardex requieren modificar CHECK constraint — no es atómico con la migración de datos             | Baja  | Misma estrategia que V34/V55: DROP + ADD en misma transacción Flyway. Bajo volumen transaccional durante migración                                                                                                                   |

## Rollback

- **Backend**: Revertir V58-V63 en orden inverso. `DROP TABLE production_batch_items, production_batches, product_formulas, product_presentations`. `ALTER TABLE company_config DROP costing_method, DROP overhead_allocation_base, DROP overhead_rate`. Restaurar `products.costing_method` si fue eliminado. Revertir `MovementType` enum (remover 3 nuevos tipos) y restaurar CHECK constraint original de `kardex_movements`. Eliminar todos los archivos nuevos del stack hexagonal (6 stacks nuevos = ~18 archivos). Revertir modificaciones en `ProductEntity`, `ProductRecord`, `KardexRepository`, `CompanyConfigEntity`.
- **Frontend**: Eliminar carpeta `features/produccion/`. Eliminar ruta `/produccion/lotes` de `app.routes.ts`. Revertir `product-form` (remover `PresentationsTabComponent`). Revertir `shell.ts` (deshabilitar/remover grupo Producción).

## Dependencias

- **Sprint 5 (Compras)** ✅ — `MovementType`, `RecordMovementUseCase`, kardex (ENTRY por compra, EXIT por venta)
- **Sprint 7 (Inventario)** ✅ — `InventoryStock`, `KardexRepository`, `MovementType` enum
- **Sprint 9 (Admin)** ✅ — `CompanyConfig` V51, `UnitOfMeasure` CRUD (19 UoMs seedeadas), `ProductType` enum (COMBO, FORMULA ya seedeados)
- **Sprint 10 (CxP/notas)** ✅ — Patrón de notas crédito/débito como referencia para documentos de producción (no se reutiliza directamente)
- **Sprint 11 (Devoluciones)** ✅ — `CREDIT_NOTE` en `SalesDocumentType`, `sourceDocumentId` FK (patrón de trazabilidad)

## Criterios de éxito

### Slice 1 — Presentaciones

- [ ] `product_presentations` acepta múltiples presentaciones por producto con UoM, factor de conversión y precio override
- [ ] `product-form` muestra pestaña "Presentaciones" con CRUD inline (add/edit/delete)
- [ ] Exactamente una presentación `is_default=true` por producto (validación backend + frontend)
- [ ] `GET /api/v1/products/{id}` incluye `presentations[]` en la respuesta
- [ ] `sale_price_override` pisa `products.sale_price` cuando la presentación se selecciona en POS (futuro Sprint 8/13)

### Slice 2 — Fórmulas/Combo

- [ ] `product_formulas` acepta componentes con cantidades planeadas y UoM para productos tipo FORMULA/COMBO
- [ ] `POST /api/v1/production/batches` ejecuta batch completo: valida stock, consume componentes del kardex al costo real, calcula MPD+MOD+CIF, ingresa producto terminado al costo unitario, registra merma
- [ ] Kardex registra 3 tipos de movimiento: `PRODUCTION_CONSUMPTION` (salida), `PRODUCTION_OUTPUT` (entrada), `PRODUCTION_SHRINKAGE` (merma)
- [ ] `production_batch_items.kardex_movement_id` enlaza cada consumo de componente con su movimiento kardex (trazabilidad)
- [ ] `company_config.costing_method` controla si el costo se calcula por WEIGHTED_AVERAGE o FIFO en toda la empresa
- [ ] `company_config.overhead_rate` y `overhead_allocation_base` configuran el prorrateo de CIF
- [ ] Transacción atómica: si cualquier paso falla, rollback completo (inventario consistente)
- [ ] `product-form` muestra pestaña "Fórmula" solo para productos tipo FORMULA/COMBO con gestión de componentes
- [ ] `ProductionBatchComponent` en `/produccion/lotes` permite crear lotes con vista previa de costos
- [ ] Menú Shell muestra "Producción" habilitado y navega correctamente

## Orden de slices

| #   | Slice          | Justificación                                                                                                                                                                                                                                                                                                                                                                           |
| --- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Presentaciones | Fundacional y de bajo riesgo: nueva tabla `product_presentations` sin impacto en kardex ni transacciones existentes. `conversion_factor` y `sale_price_override` son campos que solo se consultan, no modifican flujos core. Prepara el terreno para que en el futuro POS pueda seleccionar presentación. ~22 tasks, backend hexagonal completo + frontend tab.                         |
| 2   | Fórmulas/Combo | Alto riesgo, alta complejidad: modifica `MovementType` enum, extiende kardex, crea 3 tablas nuevas, centraliza `costing_method` en `company_config`. `FormulaProductionUseCase` es el use case más complejo del sistema hasta ahora (orquesta 7 pasos con transacción atómica). Debe ir segundo porque depende de que el inventario, kardex y company_config estén estables. ~27 tasks. |

## Esfuerzo estimado

| Slice               | Esfuerzo       | Backend                         | Frontend                      |
| ------------------- | -------------- | ------------------------------- | ----------------------------- |
| S1 — Presentaciones | 5-7 días       | 8 archivos (7 nuevos + 1 mod)   | 3 archivos (2 nuevos + 1 mod) |
| S2 — Fórmulas/Combo | 10-14 días     | 18 archivos (15 nuevos + 3 mod) | 5 archivos (4 nuevos + 1 mod) |
| **Total**           | **15-21 días** | **26 archivos**                 | **8 archivos**                |
