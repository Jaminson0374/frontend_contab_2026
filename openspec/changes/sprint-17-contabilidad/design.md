# Design: Sprint 17 — Contabilidad

## Architecture Decisions

### 1. Event-driven accounting entries

| Opción                                    | Tradeoff                                        | Decisión   |
| ----------------------------------------- | ----------------------------------------------- | ---------- |
| Spring Events (ApplicationEventPublisher) | Desacoplado, no toca use cases directamente     | ✅ Elegido |
| Llamada directa desde cada use case       | Simple pero acopla cada use case a contabilidad | ❌         |

Cada transacción publica un evento. Un AccountingEventListener escucha y crea el journal entry.

### 2. PUC account codes as enum

Los códigos PUC NIIF relevantes para asientos automáticos:

- 1105 Caja
- 1305 Clientes
- 1435 Inventario
- 2205 Proveedores
- 2365 Retefuente por pagar
- 2368 ICA por pagar
- 2408 IVA por pagar
- 41 Ingresos operacionales
- 51 Gastos de venta
- 61 Costo de ventas

Se mapean por `account_code` en puc_accounts, no por UUID. Las cuentas seed ya están en V58.

### 3. Events published at transaction confirmation time

| Evento             | Quién lo publica             | Cuándo               |
| ------------------ | ---------------------------- | -------------------- |
| InvoiceIssuedEvent | PosCheckoutUseCase           | Al confirmar venta   |
| PurchaseEvent      | CreateSupplierInvoiceUseCase | Al confirmar factura |
| AdjustmentEvent    | CreateAdjustmentUseCase      | Al guardar ajuste    |
| CashReceiptEvent   | CreateCashReceiptUseCase     | Al confirmar recibo  |
| PaymentOutEvent    | PaymentOutUseCase            | Al confirmar pago    |

### 4. Retenciones como cálculo automático

Tarifas en `withholding_config`: retefuente 2.5%, ICA 0.414% (Bogotá). Se calculan sobre el subtotal de la factura del proveedor si el proveedor es agente retenedor.

## Data Flow

```
Transaction confirmed
  │
  ├─ Publisher fires event
  │
  ├─ AccountingEventListener receives
  │
  ├─ Builds journal entry with lines (debit/credit)
  │
  ├─ Validates debit total == credit total
  │
  └─ Saves journal_entries + journal_entry_lines
```

## API Changes

### Nuevos

| Endpoint                                  | Descripción                               |
| ----------------------------------------- | ----------------------------------------- |
| POST /api/v1/journal-entries              | Asiento manual                            |
| GET /api/v1/journal-entries               | Lista con filtros (source_type, from, to) |
| GET /api/v1/journal-entries/ledger        | Libro mayor por cuenta                    |
| GET /api/v1/journal-entries/trial-balance | Balance de prueba                         |
| GET /api/v1/withholding-config            | Tarifas de retención                      |
| PUT /api/v1/withholding-config            | Actualizar tarifas                        |

### Modificados

Ningún endpoint existente cambia. Los eventos son internos.

## File Changes (~20 archivos)

### Backend

- V72\_\_create_journal_entries.sql
- V73\_\_create_withholding_config.sql
- V74\_\_seed_withholding_defaults.sql
- domain/model/JournalEntry.java + JournalEntryLine.java
- domain/model/SourceType.java enum
- domain/repository/JournalEntryRepository.java
- domain/repository/WithholdingConfigRepository.java
- infrastructure JPA entity/repo/mapper/adapter × 2
- application/service/AccountingEventListener.java
- application/usecase/CreateJournalEntryUseCase.java
- application/usecase/LedgerUseCase.java
- infrastructure controller/JournalEntryController.java
- Modificar: PosCheckoutUseCase, CreateSupplierInvoiceUseCase, CreateAdjustmentUseCase, CreateCashReceiptUseCase, PaymentOutUseCase (publicar eventos)

### Frontend

- core/models/journal-entry.model.ts
- core/services/journal-entry.service.ts
- features/contabilidad/accounting-shell.ts + .html
- features/contabilidad/journal-entry-list.ts + .html
- features/contabilidad/ledger.ts + .html
- app.routes.ts (+ /contabilidad routes)
- shell.ts (+ módulo Contabilidad)
