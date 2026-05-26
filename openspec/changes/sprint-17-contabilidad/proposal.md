# Sprint 17 — Contabilidad (Asientos + Ledger + Retenciones)

## Intención

El PUC NIIF existe (V58, 50 cuentas seed, CRUD, tree view, productos linkeados). Pero no hay asientos contables, libro mayor, ni balance de prueba. Tampoco hay cálculo automático de retenciones (ICA, retefuente) en compras. Este sprint implementa contabilidad de doble partida con asientos automáticos por cada operación.

## Alcance

### Slice 1: journal_entries (Fundación)

Tabla y entidad de asientos de doble partida. Cada entry tiene N lines (débito/crédito). El total débitos = total créditos (invariante).

### Slice 2: Asientos automáticos por transacción

Cada use case emite un evento de dominio → listener crea el asiento. Compras, ventas, inventario, pagos.

### Slice 3: Libro mayor + Balance de prueba

Consultas contables: ledger por cuenta, balance de prueba (suma débitos/créditos/saldo), estado de resultados.

### Slice 4: Retenciones (ICA + ReteFuente)

En facturas de proveedor, calcular automáticamente retenciones según tarifas configuradas. Contabilizar en cuentas de pasivo.

### Fuera de alcance

- Cierre contable anual
- Ajustes por inflación
- Conciliación bancaria
- NIIF avanzado (deterioro, valor razonable)
- Reportes contables PDF (se deja para Sprint 13 Reportes)

## Impacto

| Módulo      | Archivos modificados                | Archivos nuevos                    |
| ----------- | ----------------------------------- | ---------------------------------- |
| Backend     | ~8 (use cases existentes + eventos) | ~12 (journal, ledger, retenciones) |
| Frontend    | ~4 (terceros, compras)              | ~6 (contabilidad views)            |
| Migraciones | —                                   | ~3 (V72-V74)                       |

## Dependencias

- ✅ PUC (V58) — catálogo de cuentas existe
- ✅ Ventas (S8) — transacciones para asientos de venta
- ✅ Compras (S5) — transacciones para asientos de compra
- ✅ Inventario (S3) — transacciones para asientos de inventario
