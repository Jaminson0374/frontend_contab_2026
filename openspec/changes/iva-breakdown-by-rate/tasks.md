# Tasks: IVA Tax Rate Breakdown

## Implementation

- [x] 1. V79 migration — relax unique constraint (template_id, event_type) → (template_id, event_type, account_id)
- [x] 2. V80 seed migration — replace single SALE_TAX→2408 with 3 per-rate entries (240805, 240810, 240815)
- [x] 3. InvoiceIssuedEvent.java — add taxAmount0/taxAmount5/taxAmount8/taxAmount19 fields, keep taxAmount() as computed sum, retain backward-compat constructor
- [x] 4. AccountingTemplateEntryEntity.java — update @UniqueConstraint to (template_id, event_type, account_id)
- [x] 5. PosCheckoutUseCase.java — pass totals.tax0()…tax19() directly to InvoiceIssuedEvent constructor
- [x] 6. PosDevolutionUseCase.java — pass per-rate amounts from savedCreditNote to InvoiceIssuedEvent
- [x] 7. AccountingTemplateUseCase.java — validate unique (eventType, accountId) combos instead of just eventType
- [x] 8. AccountingEventListener.java — template path: iterate all SALE_TAX entries, post per-rate credit lines
- [x] 9. AccountingEventListener.java — fallback path: post to sub-accounts 240805/240810/240815

## Verification

- [x] 10. Build passes (`gradlew build -x test`)
- [x] 11. V79 and V80 migrations present in db/migration/
- [x] 12. InvoiceIssuedEvent has all 4 per-rate accessors + taxAmount() sum
- [x] 13. PosCheckoutUseCase passes individual rate amounts
- [x] 14. AccountingEventListener iterates all SALE_TAX entries
- [x] 15. Fallback path uses per-rate sub-accounts
- [x] 16. AccountingTemplateUseCase allows same event_type with different account_id
