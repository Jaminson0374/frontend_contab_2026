# Tasks: Sprint 14 — Facturación Electrónica DIAN

## Phase 1: DB Migrations

- [ ] [BE] 1.1 `src/main/resources/db/migration/V64__create_dian_resolutions.sql` — table: id PK, resolution_number, date, prefix, range_from/to, software_pin, expiry, created_at
- [ ] [BE] 1.2 `src/main/resources/db/migration/V65__create_electronic_invoices_and_sync_queue.sql` — electronic_invoices (id, sales_document_id FK UNIQUE, cufe UNIQUE, qr_base64 TEXT, json_payload JSONB, provider_response JSONB, status ENUM, sent_at, response_at) + dian_sync_queue (id, electronic_invoice_id FK, document_id FK, attempts INT DEFAULT 0, last_error TEXT, next_retry_at TIMESTAMP, created_at)
- [ ] [BE] 1.3 `src/main/resources/db/migration/V66__add_digital_certificates.sql` — table digital_certificates (id, company_config_id FK, certificate_data BYTEA, certificate_password VARCHAR, certificate_expiry TIMESTAMP, created_at) + ALTER company_config if needed
- [ ] [BE] 1.4 `src/main/resources/db/migration/V67__extend_sales_documents.sql` — add DIAN columns to sales_documents if needed (sourceDocumentId already exists for credit notes)

## Phase 2: BE Domain Layer

- [ ] [BE] 2.1 `domain/model/DianResolution.java` — record: id, resolutionNumber, date, prefix, rangeFrom, rangeTo, softwarePin, expiry, createdAt
- [ ] [BE] 2.2 `domain/model/ElectronicInvoice.java` — record: id, salesDocumentId, cufe, qrBase64, jsonPayload, providerResponse, status (PENDING_SEND/SENT/ACCEPTED_BY_DIAN/REJECTED_BY_DIAN), sentAt, responseAt
- [ ] [BE] 2.3 `domain/model/DianSyncQueue.java` — record: id, electronicInvoiceId, documentId, attempts, lastError, nextRetryAt, createdAt
- [ ] [BE] 2.4 `domain/model/DigitalCertificate.java` — record: id, companyConfigId, certificateData (byte[]), certificatePassword, certificateExpiry, createdAt
- [ ] [BE] 2.5 `domain/event/InvoiceIssuedEvent.java` — record(UUID salesDocumentId) extending ApplicationEvent
- [ ] [BE] 2.6 `domain/port/ElectronicInvoiceProvider.java` — interface: sendInvoice(ElectronicInvoiceRequest) → ElectronicInvoiceResponse (DTOs in application/dto/)
- [ ] [BE] 2.7 `domain/repository/DianResolutionRepository.java` + `ElectronicInvoiceRepository.java` + `DianSyncQueueRepository.java` + `DigitalCertificateRepository.java` — ports

## Phase 3: BE Persistence Layer

- [ ] [BE] 3.1 `infrastructure/adapters/out/persistence/DianResolutionEntity.java` + `DianResolutionMapper.java` + `DianResolutionJpaRepository.java` + `DianResolutionRepositoryAdapter.java`
- [ ] [BE] 3.2 `infrastructure/adapters/out/persistence/ElectronicInvoiceEntity.java` + `ElectronicInvoiceMapper.java` + `ElectronicInvoiceJpaRepository.java` + `ElectronicInvoiceRepositoryAdapter.java`
- [ ] [BE] 3.3 `infrastructure/adapters/out/persistence/DianSyncQueueEntity.java` + `DianSyncQueueMapper.java` + `DianSyncQueueJpaRepository.java` + `DianSyncQueueRepositoryAdapter.java`
- [ ] [BE] 3.4 `infrastructure/adapters/out/persistence/DigitalCertificateEntity.java` + `DigitalCertificateMapper.java` + `DigitalCertificateJpaRepository.java` + `DigitalCertificateRepositoryAdapter.java`

## Phase 4: BE Use Cases & Adapters

- [ ] [BE] 4.1 `application/usecase/DianResolutionUseCase.java` — CRUD + range conflict validation (409), active resolution lookup, expiry check
- [ ] [BE] 4.2 `application/usecase/ElectronicInvoiceUseCase.java` — status transitions (PENDING→SENT→ACCEPTED/REJECTED), CUFE uniqueness check, QR storage, credit note validation (original must be ACCEPTED_BY_DIAN)
- [ ] [BE] 4.3 `infrastructure/adapters/out/provider/ProviderCAdapter.java` — implements ElectronicInvoiceProvider; builds JSON payload, calls Provider C API, parses response
- [ ] [BE] 4.4 `application/job/ElectronicInvoiceJob.java` — @Async + @TransactionalEventListener(AFTER_COMMIT) on InvoiceIssuedEvent; reads sales doc → builds JSON via provider → updates status → enqueues on failure
- [ ] [BE] 4.5 `application/job/DianSyncScheduler.java` — @Scheduled(fixedDelay=30000); picks queue entries (next_retry_at ≤ now, attempts < 5); exponential backoff 30s/1m/2m/4m/8m; marks DEAD at 5 attempts
- [ ] [BE] 4.6 Modify `PosCheckoutUseCase.checkout()` — inject ApplicationEventPublisher; publish InvoiceIssuedEvent after INVOICE saved for type=INVOICE
- [ ] [BE] 4.7 Modify `PosDevolutionUseCase.processDevolution()` — after CREDIT_NOTE saved, if source is electronic invoice, create electronic_invoices row (CREDIT_NOTE type)
- [ ] [BE] 4.8 Modify `CompanyConfigUseCase` — support multipart cert upload via `updateCertificate(Long companyConfigId, MultipartFile certFile, String password)`, parse expiry from .p12

## Phase 5: BE Controllers

- [ ] [BE] 5.1 `infrastructure/adapters/in/rest/DianResolutionController.java` — GET/POST/PUT/DELETE `/api/v1/dian/resolutions`, @PreAuthorize ADMIN
- [ ] [BE] 5.2 `infrastructure/adapters/in/rest/DianInvoiceController.java` — GET `/api/v1/dian/invoices` (page), GET `/{invoiceId}`, POST `/{id}/retry`
- [ ] [BE] 5.3 `infrastructure/adapters/in/rest/DianDashboardController.java` — GET `/api/v1/dian/dashboard` → {todayCount, pendingCount, rejectedCount, acceptedCount}
- [ ] [BE] 5.4 Modify `CompanyConfigController.java` — PUT multipart endpoint for cert upload; extend CompanyConfigResponse with certificateExpiry + hasCertificate
- [ ] [BE] 5.5 Enable @Async — add `@EnableAsync` + `@EnableScheduling` to PosInventApplication

## Phase 6: FE Foundation

- [ ] [FE] 6.1 Create `src/app/core/models/dian-resolution.model.ts` — DianResolution, DianResolutionRequest interfaces
- [ ] [FE] 6.2 Create `src/app/core/models/electronic-invoice.model.ts` — ElectronicInvoice, DianDashboard interfaces + ElectronicInvoiceStatus enum
- [ ] [FE] 6.3 Create `src/app/core/services/dian-resolution.service.ts` — CRUD via `/api/v1/dian/resolutions`
- [ ] [FE] 6.4 Create `src/app/core/services/electronic-invoice.service.ts` — GET invoice status, dashboard summary, retry
- [ ] [FE] 6.5 Modify `company-config.model.ts` — add `certificateExpiry`, `hasCertificate`; Modify `company-config.service.ts` — add `uploadCertificate(file, password)` multipart

## Phase 7: FE Components

- [ ] [FE] 7.1 Create `src/app/features/dian/dian-layout.ts` + `.html` — layout wrapper with tabs: Resoluciones, Dashboard
- [ ] [FE] 7.2 Create `src/app/features/dian/resolution-list.ts` + `.html` — MatTable CRUD with acciones (editar/eliminar)
- [ ] [FE] 7.3 Create `src/app/features/dian/resolution-form.ts` + `.html` — form: número, fecha, prefijo, rango desde/hasta, PIN, vencimiento
- [ ] [FE] 7.4 Create `src/app/features/dian/dian-dashboard.ts` + `.html` — 4 KPI cards (emitidas hoy, pendientes, aceptadas, rechazadas), skeleton loading, auto-refresh 60s
- [ ] [FE] 7.5 Modify `sales-document-detail.ts` + `.html` — inject ElectronicInvoiceService, add dianStatus signal, render colored badge + QR modal if ACCEPTED_BY_DIAN
- [ ] [FE] 7.6 Modify `features/admin/company/company-form.ts` + `.html` — add .p12 file input + password field, expiry preview
- [ ] [FE] 7.7 Modify `src/app/app.routes.ts` — add lazy route `/dian` → DianLayoutComponent; children: `resoluciones`, `dashboard`
- [ ] [FE] 7.8 Modify `src/app/layout/shell/shell.ts` — add NavModule "DIAN" (roles: ADMIN, CONTADOR) under Dashboard

## Phase 8: Testing

- [ ] [BE] 8.1 Unit test `DianResolutionUseCase` — CRUD + range conflict + expiry validation
- [ ] [BE] 8.2 Unit test `ElectronicInvoiceUseCase` — status transitions + CUFE uniqueness + credit note chain
- [ ] [BE] 8.3 Unit test `ElectronicInvoiceJob` — @Async listener, provider mock, enqueue on failure
- [ ] [BE] 8.4 Unit test `DianSyncScheduler` — retry logic, backoff, dead after 5 attempts
- [ ] [FE] 8.5 Service spec for `dian-resolution.service.ts` — HttpTestingController verifies URL + method
- [ ] [FE] 8.6 Service spec for `electronic-invoice.service.ts` — HttpTestingController verifies URL + method
- [ ] [FE] 8.7 Component spec for `dian-dashboard.ts` — render KPIs, loading state, error state
- [ ] [FE] 8.8 Component spec for `sales-document-detail.ts` — badge rendering per status, QR modal
