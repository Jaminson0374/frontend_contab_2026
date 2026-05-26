# Sprint 16 — Producción Avanzada

## Intención

Sprint 12 implementó Fórmulas/Combo (BOM 1 nivel) con costeo MPD/MOD/CIF y lotes de producción. Pero la planta cárnica necesita: (1) **sub-recetas** — una fórmula cuyo ingrediente es otra fórmula (ej: "Emulsión" → "Chorizo" → "Combo Parrillero"), (2) **órdenes de producción** — planificar antes de ejecutar con flujo de aprobación, (3) **cierre de insumos** — conciliar planeado vs consumido, (4) **maquinaria** — asignar equipos a órdenes.

## Alcance

### Slice 1: Sub-recetas (Multi-level BOM)

Una fórmula puede tener como componente otra fórmula. La explosión del BOM es recursiva. El costeo acumula MPD real de todos los niveles.

### Slice 2: Órdenes de Producción (Planificación)

Reemplazar el flujo ad-hoc "seleccionar fórmula → ejecutar" por "crear orden → aprobar → ejecutar → cerrar".

### Slice 3: Cierre de Insumos (Batch Closing)

Workflow de cierre de lote: registrar merma real con códigos de razón, conciliar planeado vs consumido, yield analysis.

### Slice 4: Maquinaria

Registro de equipos/activos de producción. Asignación a órdenes. Sin depreciación contable en este sprint.

### Fuera de alcance

- Tabulación de gastos línea por línea (solo overhead_rate como en S12)
- MOD desde nómina (sigue manual por lote)
- Cost sheets (hoja de costos PDF)
- Depreciación contable de maquinaria
- ABC (Activity-Based Costing)

## Impacto

| Módulo      | Archivos modificados                                   | Archivos nuevos                       |
| ----------- | ------------------------------------------------------ | ------------------------------------- |
| Backend     | ~10 (FormulaProductionUseCase, entidades, migraciones) | ~12 (orders, machinery, closing)      |
| Frontend    | ~6 (formula-tab, production-batch)                     | ~10 (order list/form, machinery CRUD) |
| Migraciones | —                                                      | ~4 (V69-V72)                          |

## Dependencias

- ✅ product_formulas (V59) — BOM 1 nivel existe
- ✅ production_batches (V60) — lotes de producción existen
- ✅ production_batch_items (V61) — items de lote existen
- ✅ inventory_movements (V39) — kardex existe
- ✅ products (V6) — productos existen
- ✅ warehouses (V3) — bodegas existen
