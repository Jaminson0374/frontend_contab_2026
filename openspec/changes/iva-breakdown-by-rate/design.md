# Design: IVA Tax Rate Breakdown

## Technical Approach

Extend `InvoiceIssuedEvent` with per-rate tax fields (`taxAmount0`–`taxAmount19`) while retaining `taxAmount()` as a computed sum for backward compatibility. Both callers (`PosCheckoutUseCase`, `PosDevolutionUseCase`) already compute per-rate totals — pass them directly into the event. Relax the `(template_id, event_type)` unique constraint to `(template_id, event_type, account_id)` so one template can have multiple `SALE_TAX` entries (one per rate). In the listener, iterate all `SALE_TAX` entries and post a journal line per non-zero rate.

## Architecture Decisions

### Decision 1: InvoiceIssuedEvent — class vs record

| Option                                     | Tradeoff                                                                                                  | Decision      |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------- |
| Convert to Java record                     | Clean, concise; but breaks existing accessor style (`field()` vs `getField()`); no derived getter support | ❌ Rejected   |
| Keep as regular class, add per-rate fields | Minimal diff; `taxAmount()` remains backward-compat computed sum; matches existing pattern                | ✅ **Chosen** |

### Decision 2: Rate-to-account mapping in listener

| Option                                  | Tradeoff                                                                                                    | Decision      |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------- |
| Use `Map<Integer, BigDecimal>` in event | Type-safe; but bloats event with rate map that duplicates per-field data                                    | ❌ Rejected   |
| Map via PUC account code suffix         | Pragmatic; leverages existing PUC hierarchy (2408**05**=5%, **10**=8%, **15**=19%); avoids new event fields | ✅ **Chosen** |

## Data Flow

```
PosCheckoutUseCase.calculateTotals()
  └─ Totals(tax0, tax5, tax8, tax19, …)
       └─ new InvoiceIssuedEvent(…, tax0, tax5, tax8, tax19, total)
            │
            ▼
AccountingEventListener.onInvoiceIssued(event)
  ├─ Template path: iterate template entries
  │    └─ SALE_TAX entries → pucRepo.findById(accountId)
  │         └─ switch(account.code):
  │              240805 → event.taxAmount5()
  │              240810 → event.taxAmount8()
  │              240815 → event.taxAmount19()
  │              └─ if > 0 → creditLine(accountId, amount, desc)
  │
  └─ Fallback path (no template):
       └─ findByCode("240805"/"240810"/"240815") → creditLine(…)
```

## File Changes

| File                                                           | Action | Description                                                                                         |
| -------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| `domain/model/InvoiceIssuedEvent.java`                         | Modify | Add `taxAmount0`–`taxAmount19` fields; 8-param constructor; `taxAmount()` as computed sum           |
| `application/usecase/PosCheckoutUseCase.java`                  | Modify | L204: pass `totals.tax0()…tax19()` directly to event                                                |
| `application/usecase/PosDevolutionUseCase.java`                | Modify | L225: pass `savedCreditNote.totalTax0()…totalTax19()` to event                                      |
| `application/service/AccountingEventListener.java`             | Modify | SALE_TAX: separate loop iterating entries; rate→amount via account code; fallback to 3 sub-accounts |
| `application/usecase/AccountingTemplateUseCase.java`           | Modify | Validate unique `(eventType, accountId)` instead of just `eventType`                                |
| `infrastructure/…/AccountingTemplateEntryEntity.java`          | Modify | Constraint: `(template_id, event_type, account_id)`                                                 |
| `db/migration/V79__relax_accounting_template_entry_unique.sql` | Create | Drop old constraint, add new                                                                        |
| `db/migration/V80__seed_sale_tax_by_rate.sql`                  | Create | Replace single 2408 SALE_TAX with 240805, 240810, 240815                                            |

## Interfaces / Contracts

### InvoiceIssuedEvent (modified constructor)

```java
public InvoiceIssuedEvent(Object source, UUID salesDocumentId, String invoiceNumber,
    BigDecimal subtotal,
    BigDecimal taxAmount0, BigDecimal taxAmount5,
    BigDecimal taxAmount8, BigDecimal taxAmount19,
    BigDecimal total)
```

### AccountingEventListener — rate resolver helper

```java
private BigDecimal resolveTaxAmount(
    InvoiceIssuedEvent event, PucAccount account) {
    return switch (account.code()) {
        case "240805" -> event.taxAmount5();
        case "240810" -> event.taxAmount8();
        case "240815" -> event.taxAmount19();
        default -> BigDecimal.ZERO;
    };
}
```

## Migration / Rollout

**V79**: `ALTER TABLE` drops old `UNIQUE(template_id, event_type)`, adds new `UNIQUE(template_id, event_type, account_id)`. No data conflict — current seed has single SALE_TAX per template. **V80**: `DELETE` old SALE_TAX→2408 entry, `INSERT` three per-rate entries. Backward-compatible: after V80 but before code deploy, listener still uses single SALE_TAX entry (only first matched entry in iteration); after code deploy, all three entries trigger.

## Open Questions

- [ ] Should V80 also seed DEFAULT_PURCHASE with per-rate PURCHASE_TAX entries (240820 → 2408205/10/15)? Proposal marks purchase as out of scope.
- [ ] Should the listener log a warning when a SALE_TAX entry references a non-standard account (not 240805/10/15)?

## Testing Strategy

| Layer       | What to Test                                                         | Approach                                                                                 |
| ----------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Unit        | `InvoiceIssuedEvent.taxAmount()` = sum of per-rate fields            | JUnit 5 assert                                                                           |
| Unit        | `AccountingTemplateUseCase` rejects duplicate (eventType, accountId) | Mock repo, verify BusinessException                                                      |
| Unit        | Listener produces N SALE_TAX lines for N non-zero rates              | Mock template with 3 entries, event with tax5=0, tax8>0, tax19>0 → expect 2 credit lines |
| Integration | End-to-end: mixed-rate invoice → correct journal sub-accounts        | Test via `PosCheckoutUseCase` with mocked event publisher                                |
