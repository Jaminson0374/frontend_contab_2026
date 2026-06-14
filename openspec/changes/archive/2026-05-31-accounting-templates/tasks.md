# Tasks: Accounting Templates — Plantillas Contables Configurables

## Phase 1: Database (Migrations)

- [ ] 1.1 [BE] V75\_\_create_accounting_templates.sql — accounting_templates + accounting_template_entries tables
- [ ] 1.2 [BE] V76\_\_add_auto_generate_flag.sql — ALTER company_config ADD auto_generate_journal_entries BOOLEAN DEFAULT true
- [ ] 1.3 [BE] V77\_\_add_template_fks.sql — ALTER product_groups + products ADD accounting_template_id UUID FK
- [ ] 1.4 [BE] Seed data — INSERT default templates (Venta General, Compra General) with entries for all 14 event types

## Phase 2: Backend Domain + Persistence

- [ ] 2.1 [BE] Domain records: AccountingTemplate, AccountingTemplateEntry, TemplateResolution, ResolutionSource
- [ ] 2.2 [BE] JPA entities: AccountingTemplateEntity, AccountingTemplateEntryEntity with relationship mappings
- [ ] 2.3 [BE] JPA repos: AccountingTemplateJpaRepository, AccountingTemplateEntryJpaRepository
- [ ] 2.4 [BE] Mappers: AccountingTemplateMapper.toDomain() / toEntity(), AccountingTemplateEntryMapper
- [ ] 2.5 [BE] Adaptadores: AccountingTemplateRepositoryAdapter implements AccountingTemplateRepository

## Phase 3: Backend Use Case + API

- [ ] 3.1 [BE] DTOs: AccountingTemplateRequest, AccountingTemplateResponse, EntryRequest/Response with Jakarta validation
- [ ] 3.2 [BE] AccountingTemplateUseCase — CRUD with validations (duplicate code, empty entries, invalid PUC, duplicate event_type)
- [ ] 3.3 [BE] AccountingTemplateController — GET list, GET by id, POST create, PUT update, DELETE soft-deactivate
- [ ] 3.4 [BE] TemplateResolverService — resolve(productId) chain: product.templateId → productGroup.templateId → null
- [ ] 3.5 [BE] Update ProductGroupUseCase + ProductUseCase — accept accountingTemplateId in create/update

## Phase 4: Backend Integration

- [ ] 4.1 [BE] Refactor AccountingEventListener — inject TemplateResolverService, use resolved entries for sale/purchase events
- [ ] 4.2 [BE] AccountingEventListener guard — skip all journal generation when autoGenerateJournalEntries=false
- [ ] 4.3 [BE] Fix SupplierInvoiceUseCase — inject ApplicationEventPublisher, publish PurchaseAccountedEvent after save
- [ ] 4.4 [BE] Extend CompanyConfig record + adapter — add autoGenerateJournalEntries field (default true)
- [ ] 4.5 [BE] Wire fallback — when TemplateResolver returns null, use hardcoded PUC accounts (backward compat R6)

## Phase 5: Frontend Admin UI

- [ ] 5.1 [FE] Model: src/app/core/models/accounting-template.model.ts — interfaces for template, entry, event types
- [ ] 5.2 [FE] Service: src/app/core/services/accounting-template.service.ts — httpResource list, Observable CRUD to /api/v1/accounting-templates
- [ ] 5.3 [FE] List: src/app/features/admin/accounting-templates/accounting-template-list.ts (+ .html, .css) — table with create/edit/delete
- [ ] 5.4 [FE] Form: src/app/features/admin/accounting-templates/accounting-template-form.ts (+ .html, .css) — reactive form with entries matrix per event_type
- [ ] 5.5 [FE] Routes: app.routes.ts — add /administracion/plantillas + /administracion/plantillas/nuevo + /:id (lazy, after auditoria)
- [ ] 5.6 [FE] Navigation: shell.ts — add children entry for Plantillas under Administración; administracion-layout.ts — add tab

## Phase 6: Frontend Integration

- [ ] 6.1 [FE] Product form: add mat-select for accountingTemplateId in product-form.ts (load templates via service, optional field)
- [ ] 6.2 [FE] Product group dialog: add mat-select for accountingTemplateId in quick-create-product-group.dialog.ts
- [ ] 6.3 [FE] Extend ProductRequest + ProductGroup service — include optional accountingTemplateId field in create/update payloads
- [ ] 6.4 [FE] Update product.model.ts — add optional accountingTemplateId to Product + ProductRequest interfaces

**Total: 28 tasks** | V: gradlew compileJava + npx tsc --noEmit 0 errors
