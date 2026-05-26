# Sprint 15 — Logística: Cierre de Brechas

## Intención

El módulo Logística (Kardex, Traslados, Decomisos, Ajustes) tiene el backend hexagonal **completo** (migraciones V39-V43 + V61 + V63, 4 use cases transaccionales, kardex integrado con producción). Pero el frontend usa inputs de UUID crudos en lugar de pickers, los filtros están incompletos, y hay un **bug de migración crítico** (V61/V63 referencian tabla `kardex` que no existe). Este sprint cierra todas las brechas.

## Alcance

### Slice 1: Reusable Pickers (foundation)

Componentes genéricos que reemplacen UUID inputs en **4 formularios** (ajustes, traslados, decomisos, kardex).

### Slice 2: Kardex — Filtros y tipos

Completar el frontend de kardex con filtros de fecha, bodega, lote y los 4 tipos de movimiento faltantes.

### Slice 3: Traslados — UX + validación stock

Pickers de bodega/producto/lote en transfer-form. Validación de stock en creación (no solo en confirm). Vista de detalle.

### Slice 4: Decomisos — UX + monitoreo vencimientos

Pickers en disposal-form. Backend: job de alerta de lotes próximos a vencer. Filtros en endpoint GET.

### Slice 5: Ajustes — UX + flujo aprobación

Pickers en adjustment-form. Backend: workflow de 2 pasos (PENDING → APPROVED). Fix: signo del delta en kardex.

### Slice 6: Bug Fix V61/V63

Corregir migraciones que referencian tabla `kardex` inexistente. Deben apuntar a `inventory_movements`.

### Fuera de alcance

- Confirmación parcial de traslados (solo all-or-nothing)
- Reversión de decomisos y ajustes (se deja para futuro)
- Reportes de logística (se integrarán en Sprint 13 Reportes existente)
- Impresión/PDF de documentos de traslado

## Impacto

| Módulo      | Archivos modificados                    | Archivos nuevos                        |
| ----------- | --------------------------------------- | -------------------------------------- |
| Backend     | ~8 (use cases, controllers, migrations) | ~3 (pickers endpoints, expiration job) |
| Frontend    | ~12 (4 forms + 4 lists + kardex)        | ~3 (picker components)                 |
| Migraciones | V61, V63 (fix)                          | ~2 (si se necesita alter table)        |

## Dependencias

- ✅ warehouses (V3) — bodegas existen con seed data
- ✅ products (V6) — productos existen
- ✅ batches (V9) — lotes existen
- ✅ inventory_movements (V39) — kardex existe
- ✅ stock_adjustments (V40) — ajustes existen
- ✅ stock_transfers (V41) — traslados existen
- ✅ stock_disposals (V43) — decomisos existen
