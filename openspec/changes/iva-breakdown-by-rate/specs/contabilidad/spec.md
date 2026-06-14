# Delta: Contabilidad — IVA Tax Rate Breakdown

## MODIFIED Requirements

| #               | Requirement                         | Strength | Description                                                                                                                                                                                                                                                                                          |
| --------------- | ----------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-ACC-010-MOD | Asiento de venta con IVA por tarifa | MUST     | Replaces REQ-ACC-010. One SALE_TAX credit journal line per non-zero IVA rate posting to: 240805 (5%), 240810 (8%), 240815 (19%). Zero-rate items produce no tax journal entry. `InvoiceIssuedEvent` carries per-rate fields `tax0`, `tax5`, `tax8`, `tax19` with `taxAmount` preserved as their sum. |

### Scenario: Mixed-rate invoice → multiple tax credit lines

- GIVEN invoice with items at 5% ($500 tax) and 19% ($1900 tax)
- WHEN `InvoiceIssuedEvent` publishes with tax5=500, tax19=1900
- THEN journal gets 2 SALE_TAX lines: Crédito $500 → 240805, Crédito $1900 → 240815
- AND no line emitted for 0% or 8% rates
- AND `taxAmount` = 2400 (sum of per-rate fields)

### Scenario: All zero-tax items → no tax journal entry

- GIVEN all invoice items taxed at 0% (exentos)
- WHEN `InvoiceIssuedEvent` publishes with tax5=tax8=tax19=0
- THEN no SALE_TAX journal lines are generated

### Scenario: Event carries complete per-rate data

- GIVEN `PosCheckoutUseCase` `Totals` record with tax0=0, tax5=500, tax8=0, tax19=1900
- WHEN `InvoiceIssuedEvent` is constructed
- THEN event fields are set from Totals: tax0=0, tax5=500, tax8=0, tax19=1900
- AND taxAmount = 2400

## ADDED Requirements

| #           | Requirement                                  | Strength | Description                                                                                                                                                                                  |
| ----------- | -------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-ACC-050 | Template multi-SALE_TAX por account          | MUST     | Template MAY contain multiple SALE_TAX entries with different `account_id` values, each mapping a specific rate to its PUC sub-account.                                                      |
| REQ-ACC-051 | Unicidad (template, event_type, account)     | MUST     | DB constraint and app validation enforce `UNIQUE(template_id, event_type, account_id)`. Same `event_type` + same `account_id` rejected; same `event_type` + different `account_id` accepted. |
| REQ-ACC-052 | Backward-compat taxAmount + legacy templates | MUST     | `taxAmount` preserved as sum. Templates with single SALE_TAX entry (old format) continue working — listener falls back to single-line posting.                                               |
| REQ-ACC-053 | Seed DEFAULT_SALE per-rate                   | MUST     | V78 seed: 3 SALE_TAX entries → 240805 (5%, CREDITO), 240810 (8%, CREDITO), 240815 (19%, CREDITO).                                                                                            |

### Scenario: Duplicate event_type+account rejected (REQ-ACC-051)

- GIVEN template has SALE_TAX entry pointing to account 240805
- WHEN adding another SALE_TAX entry also pointing to 240805
- THEN validation rejects with duplicate (event_type, account_id) error

### Scenario: Different accounts, same event_type accepted (REQ-ACC-051)

- GIVEN template has SALE_TAX + 240805
- WHEN adding SALE_TAX + 240810
- THEN entry is accepted (accounts differ)

### Scenario: Legacy single-entry template still works (REQ-ACC-052)

- GIVEN template with single SALE_TAX entry to account 2408 (old config, no per-rate)
- WHEN invoice issues with taxAmount=2400
- THEN single credit line to account 2408 with amount=2400
- AND no per-rate splitting occurs

### Scenario: Fresh install receives per-rate seed (REQ-ACC-053)

- GIVEN clean database with V78 migration executed
- WHEN DEFAULT_SALE template is seeded
- THEN entries include SALE_TAX → 240805, SALE_TAX → 240810, SALE_TAX → 240815
- AND each entry type is CREDITO with distinct priorities
