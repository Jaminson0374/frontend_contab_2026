# Proposal: Sprint 6 — POS Core

## Intent

Sprint 6 implements the complete POS sales lifecycle: **Shifts → Quotes/Orders → POS Sale → Invoice → Scale → Cash Closing**.
Zero POS code exists today; all 8 `/pos` and `/ventas` menu items are disabled, no routes, no components.
This sprint delivers the touch-screen POS frontend, stock reservation/decrement, price engine, and fiscal closing required for a Colombian meat plant retail operation.

## Scope

### In Scope

- Shift CRUD with "one register = one OPEN shift" rule + V33 migration
- Sales_Documents unified table (V34): Quotes, SalesOrders, Invoices
- Sales_Items (V35) with committed_stock reservation
- Custom Prices (V36) per client+product
- POS frontend: 4-panel touch layout (categories+grid, order, totals, bottom bar)
- Invoice from POS with real stock decrement (SELECT FOR UPDATE) + Price Engine
- Web Serial ScaleService + MockScaleService fallback
- Shift CLOSE: cash calculation, Z-Report, journal entries
- JWT enhancement: whid (warehouse) + crid (cash register)
- Menu/routes enablement for all POS/Ventas items

### Out of Scope

- Thermal printer integration (deferred — print via browser)
- Barcode scanner (deferred — keyboard wedge compatibility)
- Credit limit enforcement (validate + warn, no block)
- Fiscal printer / DIAN e-invoice (Sprint 7)
- Customer loyalty / points
- Returns and credit notes
- Multi-currency

## Slice Breakdown

| Slice | Name                    | Core Concern                                                                           | FE Files | BE Files |
| ----- | ----------------------- | -------------------------------------------------------------------------------------- | -------- | -------- |
| S1    | Turnos (Shifts)         | V33 migration, Shift CRUD, OPEN/CLOSE lifecycle, one-open-per-register rule            | 8        | 12       |
| S2    | Cotizaciones + Pedidos  | V34+V35+V36 migrations, Sales_Documents state machine, committed_stock reservation     | 14       | 18       |
| S3    | Venta POS + Factura     | 4-panel touch POS, Invoice creation, real stock decrement, Price Engine                | 22       | 14       |
| S4    | Báscula (Scale)         | Web Serial API ScaleService, MockScaleService, auto/manual weight capture              | 6        | 4        |
| S5    | Cierre de Caja + Arqueo | Shift CLOSE, cash calculation, Z-Report, journal entries, cash register reconciliation | 8        | 10       |

## API Contract Summary

| Slice | Key Endpoints                                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------------------------------- |
| S1    | `POST/GET/PUT /api/shifts`, `PATCH /api/shifts/{id}/close`, `GET /api/cash-registers/{id}/current-shift`                  |
| S2    | `POST/GET/PUT /api/sales-documents`, `POST/GET /api/sales-documents/{id}/items`, `PATCH /api/sales-documents/{id}/status` |
| S3    | `POST /api/pos/checkout` (atomic: stock decrement + invoice), `GET /api/price-engine?productId=&clientId=&qty=`           |
| S4    | `GET /api/scale/weight`, `POST /api/scale/connect`, `POST /api/scale/disconnect`                                          |
| S5    | `POST /api/shifts/{id}/close`, `GET /api/shifts/{id}/z-report`, `GET /api/cash-registers/{id}/closure-summary`            |

## POS Frontend Architecture

4-panel touch layout (min 48px tap targets):

| Panel  | Content                                                                                |
| ------ | -------------------------------------------------------------------------------------- |
| LEFT   | Category carousel (mat-chip-set) + Product grid (cards with image/name/price, tap=add) |
| CENTER | Customer comboBox (**create**), line items table (qty +/-), notes                      |
| RIGHT  | Totals: subtotal, IVA breakdown (0%/5%/19%), total, COBRAR button                      |
| BOTTOM | Search bar, PESAR (scale) button, numeric keypad                                       |

## Dependencies

- **Cash Register** (V4 — 4 seed data entries, must exist before Shift)
- **Warehouse** (whid for stock operations, auto-scoped by shift's register)
- **ThirdParty** (CLIENT type, credit_limit/current_balance)
- **Product** + **ProductPrice** + **PriceList** (Price Engine inputs)
- **Stock** (committed_quantity field, SELECT FOR UPDATE for decrements)
- **JWT** (needs whid + crid claims — must enhance before S3)
- **Sprint 5 Compras** ✅ (completed)

## Risks & Mitigations

| #   | Risk                                   | Mitigation                                                                                  |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | Web Serial API Chrome-only             | MockScaleService as fallback; manual weight entry always available                          |
| 2   | Stock race conditions (concurrent POS) | SELECT FOR UPDATE on stock rows during checkout; transactional commit                       |
| 3   | Credit limit bypass at POS             | Validate credit_limit before checkout; warn cashier, do NOT block (supervisor override)     |
| 4   | Touch UX on desktop screens            | 48px minimum tap targets; CSS media queries for 1024px+; test on 1366×768 and 1920×1080     |
| 5   | JWT enhancement breaks existing tokens | Add claims with defaults (whid=null, crid=null); backward-compatible; refresh on shift open |
| 6   | Backend API drift (separate repo)      | Contract-first: publish OpenAPI spec before parallel development                            |

## Success Criteria

- [ ] Open and close a shift per cash register; reject opening a second OPEN shift
- [ ] Create Quote → convert to SalesOrder → reserve committed_stock
- [ ] Perform POS sale: add products, adjust qty, input weight, COBRAR → stock decremented, invoice created
- [ ] Price Engine returns correct price (list price, customer price, manual override)
- [ ] Scale captures weight via Web Serial (Chrome) or manual entry (mock/fallback)
- [ ] Close shift: cash calculated, Z-Report generated, journal entries posted
- [ ] All POS/Ventas menu items enabled and navigable
- [ ] JWT carries whid + crid; all POS endpoints scoped to warehouse + register

## Estimated Effort

| Slice                        | Effort (dev-days) | Criticality        |
| ---------------------------- | ----------------- | ------------------ |
| S1 — Turnos                  | 3–5 days          | Foundation         |
| S2 — Cotizaciones + Pedidos  | 5–7 days          | Core complexity    |
| S3 — Venta POS + Factura     | 7–10 days         | Highest complexity |
| S4 — Báscula                 | 3–4 days          | Hardware risk      |
| S5 — Cierre de Caja + Arqueo | 4–6 days          | Fiscal compliance  |

**Total**: 22–32 dev-days (~110 files)
