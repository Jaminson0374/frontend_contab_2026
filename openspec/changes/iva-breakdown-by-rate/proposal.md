# Proposal: IVA Tax Rate Breakdown

## Intent

Current system collapses all IVA rates (0%, 5%, 8%, 19%) into a single `taxAmount` in `InvoiceIssuedEvent`, posting all tax to one PUC account (2408). Fix accounting to differentiate by rate so journal entries post to the correct sub-accounts (240805, 240810, 240815).

## Scope

### In Scope

- Extend `InvoiceIssuedEvent` with per-rate tax fields (`tax0`, `tax5`, `tax8`, `tax19`); retain `taxAmount` as convenience sum
- Modify `PosCheckoutUseCase` to pass per-rate totals from existing `Totals` record into the event
- Extend `AccountingEventListener` to generate one `SALE_TAX` journal line per non-zero rate
- Relax `AccountingTemplateEntry` unique constraint from `(template_id, event_type)` → `(template_id, event_type, account_id)` via DB migration
- Update `AccountingTemplateUseCase` validation to allow multiple same-event entries with different accounts
- Add seed data for DEFAULT_SALE template: one `SALE_TAX` entry per rate account

### Out of Scope

- Purchase side (`SupplierInvoice`, `PurchaseAccountedEvent`) — lacks per-rate tax data in model; needs separate change
- Rate 0% sub-account creation — 0%-rated items generate no tax journal entry
- Frontend changes

## Approach

1. **Domain event**: Add per-rate fields to `InvoiceIssuedEvent`. `taxAmount` stays as backward-compatible sum.
2. **UseCase**: `PosCheckoutUseCase.L203-204` already computes per-rate totals — pass them directly into event constructor.
3. **Constraint relaxation**: New DB migration drops old unique constraint, adds `(template_id, event_type, account_id)`. Entity annotation and use-case validation updated to match.
4. **Listener**: For each non-zero rate (5%, 8%, 19%), lookup template entry by `event_type` + `account_id` → generate journal line. Skip 0%.
5. **Seed data**: Replace single DEFAULT_SALE SALE_TAX entry with 3 entries (240805, 240810, 240815).

## Affected Areas

| Area                                                       | Impact        | Description                                          |
| ---------------------------------------------------------- | ------------- | ---------------------------------------------------- |
| `domain/model/InvoiceIssuedEvent.java`                     | Modified      | Add `tax0`, `tax5`, `tax8`, `tax19` fields           |
| `application/usecase/PosCheckoutUseCase.java`              | Modified      | Pass per-rate totals to event (L203-204)             |
| `application/service/AccountingEventListener.java`         | Modified      | Multi-entry `SALE_TAX` processing by rate            |
| `infrastructure/entity/AccountingTemplateEntryEntity.java` | Modified      | Constraint: `(template_id, event_type, account_id)`  |
| `application/usecase/AccountingTemplateUseCase.java`       | Modified      | Allow duplicate event_type across different accounts |
| `V75__create_accounting_templates.sql`                     | New migration | Relaxed unique constraint                            |
| `V78__seed_default_accounting_templates.sql`               | Modified      | Per-rate SALE_TAX entries                            |

## Risks

| Risk                                         | Likelihood | Mitigation                                                |
| -------------------------------------------- | ---------- | --------------------------------------------------------- |
| Existing templates break with new constraint | Low        | Migration safely drops old, adds new; backward-compatible |
| Duplicate (event_type, account_id) entries   | Low        | Validation rejects same event_type + account_id combo     |
| `taxAmount` backward-compatibility breaks    | Low        | Field preserved as read-only convenience sum              |

## Rollback Plan

1. Run migration script dropping revised constraint, restoring original `UNIQUE(template_id, event_type)`
2. Revert seed data to single SALE_TAX entry on account 2408
3. Revert `InvoiceIssuedEvent` to single `taxAmount` field
4. Revert listener to single-entry tax logic

## Dependencies

- PUC accounts 240805, 240810, 240815 exist (`V17__puc_accounts.sql`) with `allows_transactions=true`
- `Totals` record in `PosCheckoutUseCase` already has per-rate breakdown

## Success Criteria

- [ ] Invoice with mixed-rate items (e.g., 5% + 19%) produces 2 SALE_TAX journal entries
- [ ] Each entry posts to correct sub-account (240805, 240810, 240815)
- [ ] 0%-rated items generate no tax journal entry
- [ ] Template API allows multiple SALE_TAX entries with different accounts
- [ ] `taxAmount` field equals sum of per-rate fields
