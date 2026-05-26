# Facturación Electrónica DIAN Specification

## Purpose

Colombian DIAN electronic invoicing via Provider C (Carvajal/The Factory HKA/Facture). ERP sends JSON → provider generates XML UBL 2.1 with CUFE (SHA-384) and XMLDsig signature → returns CUFE + QR + DIAN status. Asynchronous, non-blocking POS checkout. 5 sequential phases.

## Fase 1 — Configuración DIAN

| ID           | Requirement                        | Strength | Key Scenarios                                                                                                                                                                                                                                                                                                                                |
| ------------ | ---------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-DIAN-001 | Table `dian_resolutions` + CRUD    | MUST     | **Happy**: POST resolution with number, date, prefix, range from/to, software PIN, expiry → 201. **Range conflict**: overlapping numeric range with same prefix → 409 "El rango se solapa con otra resolución". **Expired**: GET resolutions filter → expired shown with warning badge. **Delete**: resolución sin facturas asociadas → 200. |
| REQ-DIAN-002 | `company_config` cert fields (V65) | MUST     | **Upload**: POST `.p12` cert + password → stored as BYTEA + VARCHAR, `certificate_expiry` parsed from cert. **Expiry alert**: cert expires ≤30 days → dashboard alert "Certificado vence en N días". **Invalid**: corrupted `.p12` or wrong password → 400 "Certificado inválido o contraseña incorrecta".                                   |
| REQ-DIAN-003 | Admin form CRUD + cert upload      | MUST     | **Form**: `/administracion/dian-config` renders resolution table + cert upload panel. **Create**: fill number/prefix/range/PIN → POST → table refresh. **Cert panel**: file input `.p12`, password field, expiry preview. **Access**: ADMIN role only (`adminGuard`).                                                                        |
| REQ-DIAN-004 | Pre-checkout resolution validation | MUST     | **Range exhausted**: `documentNumber > resolution.hasta` → 422 "Resolución DIAN agotada — configure una nueva". **No resolution**: no active resolution for today → 422 "No hay resolución DIAN vigente". **Expired**: resolution.expiry < today → same 422.                                                                                 |

## Fase 2 — Modelo `electronic_invoices`

| ID           | Requirement                            | Strength | Key Scenarios                                                                                                                                                                                                                                                                                                                                            |
| ------------ | -------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-DIAN-010 | Table `electronic_invoices` (V66)      | MUST     | **Schema**: `id` PK, `sales_document_id` FK UNIQUE (1:1), `cufe` VARCHAR(100) UNIQUE, `qr_base64` TEXT, `json_payload` JSONB, `provider_response` JSONB, `status` ENUM (PENDING_SEND, SENT, ACCEPTED_BY_DIAN, REJECTED_BY_DIAN), `sent_at`, `response_at`. **Insert**: post-INVOICE ISSUED → row created status=PENDING_SEND.                            |
| REQ-DIAN-011 | Table `dian_sync_queue` (V67)          | MUST     | **Schema**: `id`, `electronic_invoice_id` FK, `document_id` FK sales_documents, `attempts` INT DEFAULT 0, `last_error` TEXT, `next_retry_at` TIMESTAMP, `created_at`. **Enqueue**: failed provider call → row inserted with `attempts=1`. **Max 5 retries**: `attempts ≥ 5` → DEAD status, no further retries. **Backoff**: exponential 30s/1m/2m/4m/8m. |
| REQ-DIAN-012 | `ElectronicInvoice` domain + hex stack | MUST     | **Hexagonal**: `ElectronicInvoice` (domain record) → `ElectronicInvoiceJpaEntity` → `ElectronicInvoiceRepository` (port) → `JpaElectronicInvoiceRepository` (adapter). **Use case**: `ElectronicInvoiceUseCase` handles status transitions, CUFE assignment, provider response storage.                                                                  |
| REQ-DIAN-013 | CUFE uniqueness + QR storage           | MUST     | **Duplicate CUFE**: provider returns CUFE already in DB → 409 logged, existing record referenced. **QR**: stored as base64 PNG in `qr_base64`. **Retrieval**: `GET /api/v1/electronic-invoices/{salesDocumentId}` returns full record including QR base64 ready for `<img src="data:image/png;base64,...">`.                                             |

## Fase 3 — Integración POS Checkout

| ID           | Requirement                           | Strength | Key Scenarios                                                                                                                                                                                                                                                                                                                                         |
| ------------ | ------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-DIAN-020 | `ElectronicInvoiceProvider` interface | MUST     | **Contract**: `sendInvoice(ElectronicInvoiceRequest) → ElectronicInvoiceResponse`. Request: issuer (NIT, resolution), receiver (NIT, regime), items (code, qty, price, tax 0/5/8/19%), totals. Response: CUFE, QR base64, DIAN status. **Adapter**: single `ProviderCAdapter` implementing interface; swap via DI config. **Mock** for dev/test env.  |
| REQ-DIAN-021 | `InvoiceIssuedEvent` post-checkout    | MUST     | **Publish**: `PosCheckoutUseCase.checkout()` for INVOICE type → `ApplicationEventPublisher.publishEvent(new InvoiceIssuedEvent(salesDocumentId))`. **Listener**: `@TransactionalEventListener(phase=AFTER_COMMIT)` → ensures DB committed before enqueue. **Non-blocking**: checkout completes before DIAN call — customer not delayed.               |
| REQ-DIAN-022 | `ElectronicInvoiceJob` async send     | MUST     | **Happy**: job reads SalesDocument + resolution → builds JSON → calls provider → receives CUFE+QR → updates `electronic_invoices` status=SENT then ACCEPTED_BY_DIAN. **Provider rejects**: status=REJECTED_BY_DIAN, `provider_response` stored, `dian_sync_queue` entry created. **Timeout**: provider >30s → status stays PENDING_SEND, queue retry. |
| REQ-DIAN-023 | Status transitions                    | MUST     | **Valid**: PENDING_SEND → SENT → ACCEPTED_BY_DIAN. **Rejection path**: PENDING_SEND → SENT → REJECTED_BY_DIAN (provider rejects after accepting). **Re-queue**: PENDING_SEND → SENT again on retry (idempotent via CUFE UNIQUE). **Immutable final**: ACCEPTED_BY_DIAN and REJECTED_BY_DIAN are terminal — no further transitions.                    |
| REQ-DIAN-024 | `dian_sync_queue` retry scheduler     | MUST     | **Scheduled**: `@Scheduled(fixedDelay=30000)` picks `next_retry_at ≤ now` with `attempts < 5`. **Retry**: re-invokes provider → success clears queue, failure increments `attempts` + updates `last_error` + `next_retry_at`. **Dead**: attempts reach 5 → logged, excluded from future picks. **Alert**: dashboard shows dead queue count.           |

## Fase 4 — Nota Crédito Electrónica

| ID           | Requirement                       | Strength | Key Scenarios                                                                                                                                                                                                                                                                                                                                  |
| ------------ | --------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-DIAN-030 | Electronic credit note generation | MUST     | **Trigger**: CREDIT_NOTE ISSUED with `sourceDocumentId` referencing invoice → enqueue electronic credit note. **Payload**: includes `creditNoteReference` → original CUFE, `creditNoteReason`, negative item amounts. **Status**: `electronic_invoices` row created with same status flow as invoices.                                         |
| REQ-DIAN-031 | CUFE reference chain              | MUST     | **Link**: credit note's `electronic_invoices` row has FK to original's row (or `sourceDocumentId`). **Validation**: original invoice MUST have ACCEPTED_BY_DIAN status before credit note can be sent → 422 "Factura original no ha sido aceptada por DIAN". **Chain query**: `GET .../credit-notes` returns all notes referencing an invoice. |

## Fase 5 — UI + Dashboard

| ID           | Requirement                           | Strength | Key Scenarios                                                                                                                                                                                                                                                                                      |
| ------------ | ------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-DIAN-040 | DIAN status badge in sales doc detail | MUST     | **Badge**: detail view renders colored badge: PENDING_SEND=yellow "Pendiente", SENT=blue "Enviado", ACCEPTED_BY_DIAN=green "Aceptado DIAN", REJECTED_BY_DIAN=red "Rechazado". **QR**: ACCEPTED_BY_DIAN → "Ver QR" button renders `<img>` from `qr_base64` in modal. **Tooltip**: hover shows CUFE. |
| REQ-DIAN-041 | Dashboard KPI: DIAN status            | MUST     | **KPIs**: cards showing: "Emitidas hoy" (count today), "Pendientes" (PENDING_SEND+SENT), "Rechazadas" (REJECTED_BY_DIAN), "Aceptadas" (ACCEPTED_BY_DIAN). **Endpoint**: `GET /api/v1/dian/dashboard/summary` returns counts filtered by current date. **Loading**: skeleton placeholders.          |
| REQ-DIAN-042 | `dian-dashboard` standalone component | MUST     | **Route**: `/dashboard/dian` lazy-loads `DianDashboardComponent`. **Access**: ADMIN + CONTADOR roles. **Menu**: "Facturación Electrónica" child under Dashboard. **Refresh**: manual "Actualizar" button + auto-refresh every 60s.                                                                 |
| REQ-DIAN-043 | Error feedback on rejected invoices   | MUST     | **List**: rejected invoices panel in dashboard shows: invoice number, client, provider error message (from `provider_response`), rejection date, retry button (if attempts < 5). **Retry**: button calls `POST /api/v1/dian/retry/{electronicInvoiceId}` → resets to PENDING_SEND + re-enqueues.   |

## Success Criteria

- [ ] Admin crea/edita resoluciones DIAN con rango, prefijo, PIN y fecha
- [ ] Admin sube certificado `.p12` como BYTEA en `company_config`
- [ ] `electronic_invoices` registra 1:1 cada INVOICE con status PENDING_SEND
- [ ] Post-checkout, `ElectronicInvoiceJob` envía JSON al provider — checkout no bloquea
- [ ] Status transiciona: PENDING_SEND → SENT → ACCEPTED_BY_DIAN (o REJECTED_BY_DIAN)
- [ ] `electronic_invoices.cufe UNIQUE` + `qr_base64` almacenado
- [ ] Nota crédito electrónica referencia CUFE original
- [ ] Detalle venta muestra badge DIAN + QR renderizado
- [ ] Dashboard KPI: conteo emitidas hoy, pendientes, rechazadas
- [ ] `dian_sync_queue` reintenta hasta 5 veces con backoff exponencial
- [ ] Validación pre-checkout: resolución vigente + rango no agotado
- [ ] `adminGuard` protege config DIAN + certificado solo para ADMIN

## Rollback

Backend: eliminar `ElectronicInvoiceUseCase`, `ElectronicInvoiceProvider` + adapter, `DianResolutionUseCase`, controllers. Revertir `PosCheckoutUseCase` (remover evento). Drop migraciones V64-V67. Frontend: eliminar `features/dian/`, revertir shell + detalle venta.
