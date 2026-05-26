# Contabilidad Specification — Sprint 17

## Slice 1: journal_entries (Foundation)

### REQ-ACC-001: Tabla journal_entries + journal_entry_lines (MUST)

- **GIVEN** se migra V72
- **WHEN** se crean las tablas
- **THEN** journal_entries tiene: id, entry_number (auto JE-YYYYMMDD-SEQ), entry_date, description, source_type (SALE/PURCHASE/INVENTORY/PAYMENT/MANUAL), source_id, created_at
- **AND** journal_entry_lines tiene: id, entry_id FK, account_id FK → puc_accounts, debit (>=0), credit (>=0), description
- **AND** CHECK: debit + credit no pueden ser ambos > 0 en la misma línea

### REQ-ACC-002: Invariante débitos = créditos (MUST)

- **GIVEN** un journal entry
- **WHEN** se guarda
- **THEN** SUM(debit) == SUM(credit)
- **AND** si no coinciden, el backend rechaza con error

### REQ-ACC-003: Crear asiento manual (SHOULD)

- **GIVEN** `POST /api/v1/journal-entries`
- **WHEN** se envía entry_date, description, lines[{account_id, debit, credit, description}]
- **THEN** se crea con source_type = MANUAL
- **AND** se valida el invariante

---

## Slice 2: Asientos Automáticos

### REQ-ACC-010: Asiento de venta (MUST)

- **GIVEN** se genera una factura de venta (SalesDocument)
- **WHEN** el estado cambia a CONFIRMED (evento InvoiceIssuedEvent)
- **THEN** se crea automáticamente:
  - Débito: Clientes (1305) = total venta
  - Crédito: Ingresos operacionales (41) = subtotal
  - Crédito: IVA por pagar (2408) = impuesto

### REQ-ACC-011: Asiento de compra (MUST)

- **GIVEN** se registra una factura de proveedor (SupplierInvoice) confirmada
- **WHEN** se emite evento PurchaseEvent
- **THEN** se crea:
  - Débito: Inventario (1435) o Gasto (51/52) = subtotal
  - Débito: IVA descontable (2408) = impuesto
  - Crédito: Proveedores (2205) = total

### REQ-ACC-012: Asiento de ajuste de inventario (SHOULD)

- **GIVEN** un StockAdjustment APPLIED
- **WHEN** el delta es negativo (pérdida)
- **THEN** Débito: Pérdida de inventario (51) / Crédito: Inventario (1435)
- **WHEN** el delta es positivo (sobrante)
- **THEN** Débito: Inventario (1435) / Crédito: Ingreso por sobrante (42)

### REQ-ACC-013: Asiento de pago recibido (SHOULD)

- **GIVEN** un CashReceipt (recibo de caja)
- **WHEN** se confirma
- **THEN** Débito: Caja (1105) / Crédito: Clientes (1305)

### REQ-ACC-014: Asiento de pago a proveedor (SHOULD)

- **GIVEN** un PaymentOut (pago a proveedor)
- **WHEN** se confirma
- **THEN** Débito: Proveedores (2205) / Crédito: Caja (1105)

---

## Slice 3: Libro mayor + Balance

### REQ-ACC-020: Libro mayor (MUST)

- **GIVEN** `GET /api/v1/journal-entries/ledger?accountId=&from=&to=`
- **WHEN** se consulta
- **THEN** devuelve todas las líneas de esa cuenta en el rango, con saldo acumulado

### REQ-ACC-021: Balance de prueba (MUST)

- **GIVEN** `GET /api/v1/journal-entries/trial-balance?from=&to=`
- **WHEN** se consulta
- **THEN** devuelve por cuenta: código, nombre, débitos, créditos, saldo débito, saldo crédito

### REQ-ACC-022: Frontend contabilidad (MUST)

- **GIVEN** la ruta `/contabilidad`
- **WHEN** se accede
- **THEN** tabs: Asientos | Libro mayor | Balance de prueba
- **AND** Asientos: tabla con filtros, botón nuevo asiento manual
- **AND** Libro mayor: selector de cuenta + date range + tabla con saldo acumulado
- **AND** Balance: date range + tabla resumen

---

## Slice 4: Retenciones

### REQ-ACC-030: Configuración de tarifas de retención (MUST)

- **GIVEN** tabla `withholding_config`
- **WHEN** se configura
- **THEN** contiene: withholding_type (ICA/RETEFUENTE), rate (%), account_id (cuenta de pasivo), active

### REQ-ACC-031: Cálculo automático en factura de proveedor (MUST)

- **GIVEN** una SupplierInvoice con subtotal > base mínima
- **WHEN** se registra
- **THEN** se calcula: retefuente = subtotal _ rate_rf, ica = subtotal _ rate_ica
- **AND** se descuentan del valor a pagar

### REQ-ACC-032: Asiento de retenciones (MUST)

- **GIVEN** una factura de proveedor con retenciones
- **WHEN** se contabiliza
- **THEN** Crédito: Retefuente por pagar (2365) / Crédito: ICA por pagar (2368)
- **AND** el neto a pagar al proveedor es total - retenciones

### REQ-ACC-033: Frontend retenciones (SHOULD)

- **GIVEN** formulario de factura de proveedor
- **WHEN** se llena
- **THEN** muestra campos calculados de retefuente e ICA (solo lectura)
- **AND** en el detalle de factura se muestran las retenciones aplicadas

---

## Resumen requisitos

| Slice                   | Requisitos | Prioridad        |
| ----------------------- | ---------- | ---------------- |
| 1. Journal entries      | 3          | MUST             |
| 2. Asientos automáticos | 6          | 3 MUST, 3 SHOULD |
| 3. Ledger + Balance     | 3          | MUST             |
| 4. Retenciones          | 4          | MUST             |
| **Total**               | **16**     |                  |
