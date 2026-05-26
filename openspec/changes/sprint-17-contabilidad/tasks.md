# Tasks: Sprint 17 — Contabilidad

## Phase 1: Slice 1 — journal_entries (Foundation)

- [ ] 1.1 [BE] V72\_\_create_journal_entries.sql — journal_entries + journal_entry_lines
- [ ] 1.2 [BE] domain/model/JournalEntry.java record + JournalEntryLine.java record
- [ ] 1.3 [BE] domain/model/SourceType.java enum (SALE,PURCHASE,INVENTORY,PAYMENT,MANUAL)
- [ ] 1.4 [BE] domain/repository/JournalEntryRepository.java interface
- [ ] 1.5 [BE] infrastructure persistence: JournalEntryEntity, JPA, Mapper, Adapter
- [ ] 1.6 [BE] CreateJournalEntryUseCase — validar invariante, guardar
- [ ] 1.7 [BE] JournalEntryController — POST manual, GET list

## Phase 2: Slice 2 — Asientos Automáticos

- [ ] 2.1 [BE] AccountingEventListener — listener central (@EventListener)
- [ ] 2.2 [BE] Modificar PosCheckoutUseCase — publicar InvoiceIssuedEvent tras confirmar
- [ ] 2.3 [BE] Listener crea asiento VENTA: débito Clientes / crédito Ventas + IVA
- [ ] 2.4 [BE] Modificar CreateSupplierInvoiceUseCase — publicar evento PurchaseEvent
- [ ] 2.5 [BE] Listener crea asiento COMPRA: débito Inventario / crédito Proveedores
- [ ] 2.6 [BE] Modificar CreateAdjustmentUseCase — publicar AdjustmentEvent cuando APPLIED
- [ ] 2.7 [BE] Listener crea asiento INVENTARIO (pérdida o sobrante)
- [ ] 2.8 [BE] Modificar CreateCashReceiptUseCase — publicar evento
- [ ] 2.9 [BE] Modificar PaymentOutUseCase — publicar evento

## Phase 3: Slice 3 — Ledger + Balance

- [ ] 3.1 [BE] GetJournalEntryLinesUseCase — ledger por cuenta (GET /ledger)
- [ ] 3.2 [BE] TrialBalanceUseCase — balance de prueba (GET /trial-balance)
- [ ] 3.3 [BE] JournalEntryController — agregar endpoints ledger y trial-balance

## Phase 4: Slice 4 — Retenciones

- [ ] 4.1 [BE] V73\_\_create_withholding_config.sql + V74 seed
- [ ] 4.2 [BE] domain/model/WithholdingConfig.java record
- [ ] 4.3 [BE] CRUD withholding config (repo + use case + controller)
- [ ] 4.4 [BE] Modificar CreateSupplierInvoiceUseCase — calcular retenciones
- [ ] 4.5 [BE] Listener incluye líneas de retención en asiento COMPRA

## Phase 5: Frontend

- [ ] 5.1 [FE] core/models/journal-entry.model.ts
- [ ] 5.2 [FE] core/services/journal-entry.service.ts
- [ ] 5.3 [FE] features/contabilidad/accounting-shell (tabs layout)
- [ ] 5.4 [FE] features/contabilidad/journal-entry-list + form manual
- [ ] 5.5 [FE] features/contabilidad/ledger (selector cuenta + tabla)
- [ ] 5.6 [FE] app.routes.ts + shell.ts

## Phase 6: Verify

- [ ] 6.1 gradlew compileJava BUILD SUCCESSFUL
- [ ] 6.2 npx tsc --noEmit 0 errores

**Total: ~35 tareas**
