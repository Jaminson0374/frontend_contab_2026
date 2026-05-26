# Logística Specification — Sprint 15

## Slice 1: Reusable Pickers (Foundation)

### REQ-LOG-001: WarehousePickerComponent (MUST)

Un componente standalone reutilizable que reemplace inputs UUID crudos de bodega.

- **GIVEN** el componente se renderiza en un formulario
- **WHEN** el usuario hace focus en el campo
- **THEN** se muestra un MatAutocomplete con bodegas filtrables por nombre
- **AND** al seleccionar una bodega se emite el `warehouseId` (UUID)

### REQ-LOG-002: ProductSearchComponent (MUST)

Autocomplete de productos reutilizable con búsqueda por código, nombre o código de barras.

- **GIVEN** el componente se renderiza con debounce de 300ms
- **WHEN** el usuario escribe al menos 2 caracteres
- **THEN** se consulta `GET /api/v1/products?query=` y se muestran resultados
- **AND** al seleccionar un producto se emite `productId` + `productName`

### REQ-LOG-003: BatchPickerComponent (SHOULD)

Selector de lote filtrable por producto seleccionado.

- **GIVEN** se ha seleccionado un producto en el formulario padre
- **WHEN** el usuario abre el dropdown de lotes
- **THEN** se muestran solo lotes del producto seleccionado con stock > 0

---

## Slice 2: Kardex — Filtros y Tipos

### REQ-LOG-010: Date range filters (MUST)

- **GIVEN** el usuario está en la vista de kardex
- **WHEN** selecciona fecha desde y fecha hasta en los datepickers
- **THEN** la tabla se recarga con movimientos en ese rango

### REQ-LOG-011: Warehouse filter (MUST)

- **GIVEN** el usuario está en la vista de kardex
- **WHEN** selecciona una bodega del WarehousePicker
- **THEN** la tabla se filtra por movimientos de esa bodega

### REQ-LOG-012: Batch filter (SHOULD)

- **GIVEN** el usuario está en la vista de kardex
- **WHEN** selecciona un lote del BatchPicker
- **THEN** la tabla muestra solo movimientos de ese lote

### REQ-LOG-013: Missing movement types in dropdown (MUST)

- **GIVEN** el dropdown de tipo de movimiento en kardex-list
- **WHEN** el usuario lo abre
- **THEN** muestra los 10 tipos: ENTRY, EXIT, ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT, DISPOSAL, RETURN, PRODUCTION_CONSUMPTION, PRODUCTION_OUTPUT, PRODUCTION_SHRINKAGE

### REQ-LOG-014: Product name resolution in table (SHOULD)

- **GIVEN** una fila del kardex muestra `productId` como UUID
- **WHEN** la tabla se renderiza
- **THEN** muestra el nombre del producto resuelto en lugar del UUID

---

## Slice 3: Traslados — UX + Validación

### REQ-LOG-020: WarehousePicker en transfer-form (MUST)

- **GIVEN** el formulario de nuevo traslado
- **WHEN** el usuario selecciona bodega origen y destino
- **THEN** usa WarehousePickerComponent en lugar de inputs UUID texto

### REQ-LOG-021: ProductSearch en transfer items (MUST)

- **GIVEN** el formulario de items del traslado
- **WHEN** el usuario agrega una línea
- **THEN** usa ProductSearchComponent para seleccionar producto

### REQ-LOG-022: Stock validation on create (SHOULD)

- **GIVEN** el usuario intenta crear un traslado con cantidad mayor al stock en origen
- **WHEN** se llama a `POST /api/v1/transfers`
- **THEN** el backend rechaza con 422 y mensaje "Stock insuficiente en bodega origen para producto X"

### REQ-LOG-023: Transfer detail view (SHOULD)

- **GIVEN** el usuario hace click en una fila de transfer-list
- **WHEN** se navega a `/inventario/traslados/:id`
- **THEN** se muestra: bodegas origen/destino con nombres, estado, items con producto/cantidad/costo, fechas

### REQ-LOG-024: BatchPicker en transfer items (MAY)

- **GIVEN** un producto tiene múltiples lotes en bodega origen
- **WHEN** el usuario selecciona el producto
- **THEN** puede elegir el lote específico a trasladar

---

## Slice 4: Decomisos — UX + Monitoreo Vencimientos

### REQ-LOG-030: Pickers en disposal-form (MUST)

- **GIVEN** el formulario de nuevo decomiso
- **WHEN** el usuario llena los campos
- **THEN** usa WarehousePickerComponent y ProductSearchComponent

### REQ-LOG-031: Disposal list filters (MUST)

- **GIVEN** `GET /api/v1/disposals`
- **WHEN** se envía `?productId=&disposalType=&from=&to=`
- **THEN** el backend filtra por esos parámetros
- **AND** el frontend expone los filtros en disposal-list

### REQ-LOG-032: Expiration monitoring job (SHOULD)

- **GIVEN** existen lotes con `expiration_date` próximo (≤ 30 días)
- **WHEN** se ejecuta el job diario `@Scheduled(cron = "0 0 6 * * *")`
- **THEN** se loggean los lotes próximos a vencer con producto, bodega, cantidad
- **AND** opcionalmente se expone `GET /api/v1/disposals/expiring-soon?days=30`

### REQ-LOG-033: Expiration dashboard alert (MAY)

- **GIVEN** el dashboard principal
- **WHEN** hay lotes próximos a vencer
- **THEN** se muestra un KPI card "Lotes por vencer" con conteo

---

## Slice 5: Ajustes — UX + Flujo Aprobación

### REQ-LOG-040: Pickers en adjustment-form (MUST)

- **GIVEN** el formulario de nuevo ajuste
- **WHEN** el usuario llena los campos
- **THEN** usa WarehousePickerComponent y ProductSearchComponent

### REQ-LOG-041: Adjustment list filters (MUST)

- **GIVEN** `GET /api/v1/adjustments`
- **WHEN** se envía `?warehouseId=&adjustmentType=&from=&to=`
- **THEN** el backend filtra por esos parámetros
- **AND** el frontend expone los filtros en adjustment-list

### REQ-LOG-042: Approval workflow (SHOULD)

- **GIVEN** un ajuste se crea
- **WHEN** el `AdjustmentType` es `PHYSICAL_COUNT`
- **THEN** queda en estado `PENDING`
- **AND** un ADMIN o CONTADOR puede aprobarlo vía `POST /api/v1/adjustments/{id}/approve`
- **WHEN** se aprueba
- **THEN** se aplica el delta de stock y se registra en kardex
- **AND** ajustes de tipo DAMAGE, EXPIRATION, THEFT se aplican inmediatamente (sin aprobación)

### REQ-LOG-043: Kardex delta sign fix (MUST)

- **GIVEN** un ajuste aumenta stock (ej: physical count +5)
- **WHEN** se registra en kardex
- **THEN** el `quantity` en inventory_movements es +5 (positivo)
- **GIVEN** un ajuste disminuye stock (ej: damage -3)
- **WHEN** se registra en kardex
- **THEN** el `quantity` en inventory_movements es -3 (negativo)
- **NOT** se usa `delta.abs()` que pierde el signo

---

## Slice 6: Bug Fix Migraciones V61/V63

### REQ-LOG-050: Fix V61 FK reference (MUST)

- **GIVEN** la migración V61 crea `production_batch_items` con FK a `kardex(id)`
- **WHEN** se corrige
- **THEN** la FK referencia `inventory_movements(id)`

### REQ-LOG-051: Fix V63 ALTER TABLE (MUST)

- **GIVEN** la migración V63 hace `ALTER TABLE kardex DROP CONSTRAINT ...`
- **WHEN** se corrige
- **THEN** hace `ALTER TABLE inventory_movements DROP CONSTRAINT ...`
- **AND** recrea el CHECK constraint sobre `inventory_movements`

### REQ-LOG-052: Verify no other broken references (MUST)

- **GIVEN** todas las migraciones V1-V67
- **WHEN** se auditan referencias a la tabla `kardex`
- **THEN** no quedan referencias a `kardex` que no sean la tabla real `inventory_movements`
