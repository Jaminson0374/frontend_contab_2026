# Design: Sprint 10 — Anticipos y Notas débito/crédito

## Technical Approach

Extiende el ecosistema CxP existente (payments V29 + supplier_invoices V28) con dos módulos financieros. **Slice 1** añade anticipos como especialización de pagos (`isAdvance` flag en tabla `payments`) y tabla `advance_applications` para aplicar saldo a facturas. Extrae `SupplierBalanceService` del código duplicado en `PaymentUseCase`/`SupplierInvoiceUseCase`. **Slice 2** crea stack hexagonal completo para `debit_credit_notes` como entidad independiente con FK opcional a factura, reutilizando el `SupplierBalanceService` extraído.

## Architecture Decisions

### 1. Advance as Payment specialization

| Option                                       | Tradeoff                                                                               | Decision   |
| -------------------------------------------- | -------------------------------------------------------------------------------------- | ---------- |
| Flag `is_advance`                            | Simple, backward-compatible, no Hibernate inheritance                                  | **Chosen** |
| Inheritance (AdvancePayment extends Payment) | Cleaner OOP, but requires SINGLE_TABLE/JOINED strategy change, breaks existing queries | Rejected   |

**Rationale**: Existing `Payment` record already has nullable `invoicePayments` — an advance is semantically a payment without invoice breakdown. Flag avoids migration complexity and aligns with proposal.

### 2. remainingAdvance tracking

| Option                           | Tradeoff                                                       | Decision   |
| -------------------------------- | -------------------------------------------------------------- | ---------- |
| Denormalized field + @Version    | Fast reads, atomic updates with optimistic locking             | **Chosen** |
| Computed (amount - SUM(applied)) | Always consistent, but expensive subquery on every list render | Rejected   |

**Rationale**: Meat plant advance lists are high-frequency reads. CHECK `remaining_advance >= 0` + `@Version` + `@Transactional` provide consistency. Matches proposal.

### 3. advance_applications uniqueness

| Option                                          | Tradeoff                                          | Decision   |
| ----------------------------------------------- | ------------------------------------------------- | ---------- |
| Allow multiple (no UNIQUE) + `application_date` | Supports incremental application to same invoice  | **Chosen** |
| UNIQUE(advance_id, invoice_id)                  | Simpler, but blocks partial application scenarios | Rejected   |

**Rationale**: $10M advance applied $3M today, $7M next week to the same invoice is realistic. `application_date` timestamp enables audit trail.

### 4. DebitCreditNote vs modifying invoices

| Option                                     | Tradeoff                                                           | Decision   |
| ------------------------------------------ | ------------------------------------------------------------------ | ---------- |
| Independent entity, optional FK to invoice | DIAN-compliant (invoices immutable), flexible standalone notes     | **Chosen** |
| Modify invoice totals directly             | Simpler accounting, but violates DIAN immutability and audit trail | Rejected   |

**Rationale**: Notas arise from post-facto adjustments (peso, calidad, fletes) — the original invoice must remain unchanged. Optional FK supports both invoice-linked and standalone notes (e.g., global freight credit).

### 5. SupplierBalanceService

| Option                                                 | Tradeoff                                                               | Decision   |
| ------------------------------------------------------ | ---------------------------------------------------------------------- | ---------- |
| Domain service `domain.service.SupplierBalanceService` | Single source of truth, already has precedent (`PaymentDomainService`) | **Chosen** |
| Private method in each UseCase (current)               | DRY violation — 2 copies exist, would become 4                         | Rejected   |
| Static utility                                         | No DI, harder to test                                                  | Rejected   |

**Rationale**: `updateSupplierBalance()` is duplicated verbatim in `PaymentUseCase` (L151-203) and `SupplierInvoiceUseCase` (L210-259). `ApplyAdvanceUseCase` and `ManageDebitCreditNoteUseCase` would add 2 more copies. Extract now in Slice 1.

### 6. Frontend component reuse (AdvanceFormComponent)

| Option                              | Tradeoff                                               | Decision   |
| ----------------------------------- | ------------------------------------------------------ | ---------- |
| Standalone, copy pago-form patterns | Clean separation, no brittle inheritance               | **Chosen** |
| Extend PagoFormComponent            | Shared template, but inheritance is fragile in Angular | Rejected   |

**Rationale**: Advance form lacks invoice selection (core of pago-form), has different validation, different save logic. Copy the supplier autocomplete pattern and form layout styling — that's service reuse, not component inheritance.

### 7. ApplyAdvanceDialog

| Option                                           | Tradeoff                                                                     | Decision   |
| ------------------------------------------------ | ---------------------------------------------------------------------------- | ---------- |
| MatDialog                                        | Modal UX fits "apply now" action, already used (`QuickCreateSupplierDialog`) | **Chosen** |
| Dedicated route `/compras/anticipos/:id/aplicar` | Full page, but overkill for selecting invoices                               | Rejected   |
| Inline in list                                   | Clutters list component                                                      | Rejected   |

**Rationale**: Applying an advance is a focused action — select invoices, enter amounts, confirm. A dialog keeps context (advance list visible behind).

### 8. Menu placement

| Option                                | Tradeoff                                     | Decision   |
| ------------------------------------- | -------------------------------------------- | ---------- |
| Direct children of "Compras"          | Consistent with "Pagos", "Retenciones" peers | **Chosen** |
| Sub-items under "Pagos a proveedores" | Confusing UX — anticipos ≠ pagos             | Rejected   |

## Data Model

### V53: Anticipos (ALTER + CREATE)

```sql
ALTER TABLE payments ADD COLUMN is_advance BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE payments ADD COLUMN remaining_advance NUMERIC(15,2);
ALTER TABLE payments ADD CONSTRAINT chk_advance_remaining
    CHECK (is_advance = FALSE OR remaining_advance IS NOT NULL);
ALTER TABLE payments ADD CONSTRAINT chk_advance_remaining_non_negative
    CHECK (remaining_advance IS NULL OR remaining_advance >= 0);

CREATE TABLE advance_applications (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    advance_id       UUID           NOT NULL REFERENCES payments(id),
    invoice_id       UUID           NOT NULL REFERENCES supplier_invoices(id),
    applied_amount   NUMERIC(15,2)  NOT NULL CHECK (applied_amount > 0),
    application_date TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    version          BIGINT         NOT NULL DEFAULT 0
);
CREATE INDEX idx_adv_app_advance ON advance_applications(advance_id);
CREATE INDEX idx_adv_app_invoice ON advance_applications(invoice_id);
```

### V54: Notas débito/crédito (CREATE)

```sql
CREATE TABLE debit_credit_notes (
    id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id   UUID           NOT NULL REFERENCES third_parties(id),
    invoice_id    UUID           REFERENCES supplier_invoices(id),
    type          VARCHAR(20)    NOT NULL CHECK (type IN ('DEBIT_NOTE','CREDIT_NOTE')),
    amount        NUMERIC(15,2)  NOT NULL CHECK (amount > 0),
    reason        TEXT           NOT NULL,
    reference     VARCHAR(100),
    created_by    UUID           NOT NULL REFERENCES users(id),
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    version       BIGINT         NOT NULL DEFAULT 0
);
CREATE INDEX idx_dcn_supplier ON debit_credit_notes(supplier_id);
CREATE INDEX idx_dcn_invoice  ON debit_credit_notes(invoice_id);
```

## API Contract

### Slice 1 — Anticipos (extends existing `/api/v1/payments`)

| Method | Endpoint                          | Description                                        |
| ------ | --------------------------------- | -------------------------------------------------- |
| `GET`  | `/api/v1/payments?isAdvance=true` | Lista anticipos (filtro nuevo)                     |
| `POST` | `/api/v1/payments`                | Crea pago/anticipo (body con `isAdvance: boolean`) |
| `POST` | `/api/v1/payments/{id}/apply`     | Aplica anticipo a facturas                         |

**ApplyAdvanceRequest**:

```java
record ApplyAdvanceRequest(
    @NotNull List<ApplicationInput> applications
) {
    record ApplicationInput(
        @NotNull UUID invoiceId,
        @NotNull @DecimalMin("0.01") BigDecimal amount
    ) {}
}
```

### Slice 2 — Notas (nuevo `/api/v1/debit-credit-notes`)

| Method   | Endpoint                                             | Description    |
| -------- | ---------------------------------------------------- | -------------- |
| `GET`    | `/api/v1/debit-credit-notes?supplierId=&page=&size=` | Lista paginada |
| `GET`    | `/api/v1/debit-credit-notes/{id}`                    | Detalle        |
| `POST`   | `/api/v1/debit-credit-notes`                         | Crea nota      |
| `PUT`    | `/api/v1/debit-credit-notes/{id}`                    | Edita          |
| `DELETE` | `/api/v1/debit-credit-notes/{id}`                    | Elimina        |

## Component Tree

```
ShellComponent (shell.ts)                     ← +2 menu items
└── ComprasComponent (compras.ts)
    ├── AdvanceListComponent                  ← NEW: /compras/anticipos
    ├── AdvanceFormComponent                  ← NEW: /compras/anticipos/nuevo
    │   └── ApplyAdvanceDialog (MatDialog)    ← NEW: opened from list row
    ├── DebitCreditNoteListComponent          ← NEW: /compras/notas
    └── DebitCreditNoteFormComponent          ← NEW: /compras/notas/nuevo
```

## File Changes

### Backend — Slice 1 (Anticipos)

| File                                                   | Action | Description                                                                        |
| ------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------- |
| `.../db/migration/V53__add_advance_to_payments.sql`    | Create | ALTER payments + CREATE advance_applications                                       |
| `domain/model/AdvanceApplication.java`                 | Create | Record: id, advanceId, invoiceId, appliedAmount, date, version                     |
| `domain/service/SupplierBalanceService.java`           | Create | Extracted balance update logic (used by 3+ use cases)                              |
| `application/usecase/ApplyAdvanceUseCase.java`         | Create | Apply advance to invoices, update remainingAdvance, update invoice status          |
| `application/dto/ApplyAdvanceRequest.java`             | Create | Request DTO with List<ApplicationInput>                                            |
| `application/dto/ApplyAdvanceResponse.java`            | Create | Response with updated remainingAdvance and applications list                       |
| `domain/model/Payment.java`                            | Modify | +`Boolean isAdvance`, +`BigDecimal remainingAdvance`                               |
| `application/usecase/PaymentUseCase.java`              | Modify | isAdvance path: skip invoice validation, extract balance to SupplierBalanceService |
| `application/usecase/SupplierInvoiceUseCase.java`      | Modify | Replace private `updateSupplierBalance` with `SupplierBalanceService`              |
| `application/dto/PaymentRequest.java`                  | Modify | +`@NotNull Boolean isAdvance` (default false for backward compat)                  |
| `application/dto/PaymentResponse.java`                 | Modify | +`isAdvance`, +`remainingAdvance`                                                  |
| `.../rest/PaymentController.java`                      | Modify | isAdvance filter param, + `POST /{id}/apply` endpoint, + `@Auditable` on apply     |
| `.../persistence/PaymentEntity.java`                   | Modify | +`isAdvance`, +`remainingAdvance` columns                                          |
| `.../persistence/PaymentJpaRepository.java`            | Modify | +`findByIsAdvanceTrue(Pageable)`                                                   |
| `domain/repository/PaymentRepository.java`             | Modify | +`findByIsAdvanceTrue(Pageable)`                                                   |
| `.../persistence/AdvanceApplicationEntity.java`        | Create | JPA entity for advance_applications table                                          |
| `.../persistence/AdvanceApplicationJpaRepository.java` | Create | Spring Data JPA for advance_applications                                           |

### Backend — Slice 2 (Notas)

| File                                                    | Action | Description                                                                                                                  |
| ------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `.../db/migration/V54__create_debit_credit_notes.sql`   | Create | CREATE TABLE debit_credit_notes                                                                                              |
| `domain/model/DebitCreditNote.java`                     | Create | Record: id, supplierId, invoiceId?, type (DEBIT/CREDIT), amount, reason, reference, createdBy, createdAt, updatedAt, version |
| `domain/repository/DebitCreditNoteRepository.java`      | Create | Port: save, findById, findAll, findBySupplierId, deleteById                                                                  |
| `.../persistence/DebitCreditNoteEntity.java`            | Create | JPA entity                                                                                                                   |
| `.../persistence/DebitCreditNoteJpaRepository.java`     | Create | Spring Data JPA                                                                                                              |
| `.../persistence/DebitCreditNoteMapper.java`            | Create | MapStruct toDomain/toEntity                                                                                                  |
| `.../persistence/DebitCreditNoteRepositoryAdapter.java` | Create | Implements port, delegates to JPA                                                                                            |
| `application/usecase/ManageDebitCreditNoteUseCase.java` | Create | CRUD + balance update via SupplierBalanceService, + `@Auditable(entityType="DEBIT_CREDIT_NOTE")`                             |
| `application/dto/DebitCreditNoteRequest.java`           | Create | Validation: type CHECK, amount > 0                                                                                           |
| `application/dto/DebitCreditNoteResponse.java`          | Create | Response with supplierName resolved                                                                                          |
| `.../rest/DebitCreditNoteController.java`               | Create | CRUD endpoints + `@PreAuthorize`                                                                                             |

### Frontend — Both Slices

| File                                                                    | Action | Description                                                                                                |
| ----------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| `.../anticipos/advance-list/advance-list.{ts,html,css}`                 | Create | MatTable: proveedor, monto, saldo, fecha; filter por proveedor; "Aplicar" button opens dialog              |
| `.../anticipos/advance-form/advance-form.{ts,html,css}`                 | Create | ReactiveForms pattern from pago-form (no invoice selection); `isAdvance=true` automatically                |
| `.../anticipos/apply-advance-dialog/apply-advance-dialog.{ts,html}`     | Create | MatDialog: selector de facturas PENDING/RECONCILED del proveedor con montos                                |
| `core/services/advance.service.ts`                                      | Create | `httpResource` for GET advances, Observables for POST create/apply                                         |
| `core/models/advance.model.ts`                                          | Create | AdvancePayment, AdvanceApplication, ApplyAdvanceRequest interfaces                                         |
| `.../notas/debit-credit-note-list/debit-credit-note-list.{ts,html,css}` | Create | MatTable: tipo, proveedor, factura, monto, motivo; actions: editar, eliminar                               |
| `.../notas/debit-credit-note-form/debit-credit-note-form.{ts,html,css}` | Create | ReactiveForms: tipo (select DEBIT/CREDIT), proveedor autocomplete, factura opcional, monto, motivo         |
| `core/services/supplier-note.service.ts`                                | Create | `httpResource` for GET list, Observables for create/update/delete                                          |
| `core/models/debit-credit-note.model.ts`                                | Create | DebitCreditNote, DebitCreditNoteRequest interfaces                                                         |
| `app.routes.ts`                                                         | Modify | +`/compras/anticipos` + `anticipos/nuevo`; +`/compras/notas` + `notas/nuevo` (lazy children of `/compras`) |
| `layout/shell/shell.ts`                                                 | Modify | +2 NavChild entries: "Anticipos" → `/compras/anticipos`, "Notas débito/crédito" → `/compras/notas`         |

## Integration Points

- **PaymentUseCase.create()**: New guard: if `isAdvance=true` AND `invoicePayments` not empty → `BusinessException("ADVANCE_WITH_INVOICES")`. If advance: set `remainingAdvance=amount`, skip invoice status update, skip invoice validation.
- **SupplierBalanceService**: Injected into `PaymentUseCase`, `SupplierInvoiceUseCase`, `ApplyAdvanceUseCase`, `ManageDebitCreditNoteUseCase`. Single method: `updateBalance(UUID supplierId, BigDecimal delta)`.
- **ApplyAdvanceUseCase**: Loads invoice statuses (must be PENDING/RECONCILED, not already PAID). Creates `advance_applications`. Updates invoice status if fully covered. Decrements `remainingAdvance` atomically.
- **ManageDebitCreditNoteUseCase**: On create/delete, calls `SupplierBalanceService.updateBalance(supplierId, ±amount)` where DEBIT_NOTE → +delta (increases debt), CREDIT_NOTE → -delta (decreases debt).
- **Audit**: `@Auditable(entityType="ADVANCE_APPLICATION", action="CREATE")` on `ApplyAdvanceUseCase.apply()`. `@Auditable(entityType="DEBIT_CREDIT_NOTE")` on `ManageDebitCreditNoteUseCase` CRUD methods.

## Testing Strategy

| Layer                  | What                                     | Approach                                                                                                                                                     |
| ---------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Domain Service**     | `SupplierBalanceService.updateBalance()` | Unit: mock ThirdPartyRepository, verify balance arithmetic                                                                                                   |
| **Domain Service**     | `PaymentDomainService` new validations   | Unit: test advance-with-invoices throws, advance-without-invoices passes                                                                                     |
| **Use Case**           | `ApplyAdvanceUseCase.apply()`            | Integration: `@DataJpaTest`, verify remainingAdvance decrement, advance_applications insert, invoice status transition, balance update in single transaction |
| **Use Case**           | `PaymentUseCase.create()` advance path   | Integration: create advance, assert no invoice_payments, assert remainingAdvance=amount, assert supplier balance unchanged                                   |
| **Use Case**           | `ManageDebitCreditNoteUseCase` CRUD      | Integration: create DEBIT increases balance, CREDIT decreases, delete reverts                                                                                |
| **Controller**         | All endpoints                            | `@WebMvcTest`: verify 201 on create, 400 on validation errors, 404 on missing resources                                                                      |
| **Migration**          | V53, V54                                 | Verify Flyway applies cleanly on existing DB, CHECK constraints enforced                                                                                     |
| **Frontend Service**   | `AdvanceService`, `SupplierNoteService`  | Vitest: mock `HttpClient`, verify correct URL construction, signal updates                                                                                   |
| **Frontend Component** | Lists, Forms, Dialog                     | Vitest + TestBed: verify form validation, dialog opens/closes, table renders data                                                                            |

## Migration / Rollout

Flyway incremental — V53 runs before V54, both are idempotent (CREATE IF NOT EXISTS not used; clean rollout expected). No data migration needed (new columns default FALSE/NULL). Rollback per proposal §Rollback.

## Open Questions

- None — all 8 architecture decisions resolved above.
