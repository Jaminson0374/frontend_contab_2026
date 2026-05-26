# Proposal: Sprint 5 — Compras

## Intent

Sprint 5 implements the full purchase lifecycle: **Purchase Order → Goods Receipt → Supplier Invoice → Payments**.
Zero purchase code exists today; the 8 `/compras` menu items are all disabled, and no route exists.
This sprint delivers the ICA/INVIMA traceability and DIAN compliance required for a Colombian meat plant.

## Scope

### In Scope

- Purchase Order CRUD with line items (product, qty, unit cost, warehouse)
- Goods Receipt: validates OC → auto-creates Batches + Stock → reconciles OC status
- Supplier Invoice with DIAN fields (subtotal, IVA, retenciones, total) + CxP update
- Payment application to invoices + CxC reduction
- Menu/routes enablement for all 8 planned items
- Backend: 7 records, 6 controllers, 7 repos, 5 use cases, 6 migrations (V25–V30)
- Frontend: 6 models, 6 services, 24 feature components, 8 routes

### Out of Scope

- Auto-calculation of DIAN retentions (manual entry only)
- E-invoice PDF generation
- Supplier price catalogs (existing ProductSupplier covers this)
- PO approval workflow (single-step creation)
- POS/Facturación/Ventas modules

## Slice Breakdown

| Slice | Name                                    | Core Concern                                                                 | FE Files | BE Files |
| ----- | --------------------------------------- | ---------------------------------------------------------------------------- | -------- | -------- |
| S1    | Purchase Order CRUD                     | OC model, line items, PENDING→RECEIVED→CANCELLED lifecycle                   | 12       | 16       |
| S2    | Goods Receipt                           | Validate OC → create Batches + Stock → OC reconciliation → purchaseCost flow | 10       | 14       |
| S3    | Supplier Invoice + CxP                  | DIAN invoice fields, CxP balance, invoice lifecycle PENDING→RECONCILED→PAID  | 8        | 10       |
| S4    | Payments + Menu Enablement + Retentions | Payment application, retenciones view, all 8 routes/menu items enabled       | 10       | 9        |

## API Contract Summary

| Slice | Key Endpoints                                                                                                                                        |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1    | `POST/GET/PUT/DELETE /api/purchase-orders`, `GET /api/purchase-orders/{id}/lines`                                                                    |
| S2    | `POST /api/goods-receipts` (validates OC, creates batches, upserts stock), `GET /api/goods-receipts?ocId=`, `PATCH /api/purchase-orders/{id}/status` |
| S3    | `POST/GET /api/supplier-invoices`, `GET /api/suppliers/{id}/balance` (CxP), `PATCH /api/supplier-invoices/{id}/status`                               |
| S4    | `POST /api/payments`, `GET /api/retenciones?supplierId=&period=` (read-only), `GET /api/purchase-history?from=&to=&supplierId=`                      |

## Dependencies

- **ThirdParty** (SUPPLIER type, DIAN fields, `currentBalance` for CxP)
- **Batch** (`supplierId`, `purchaseCost` — receipt kernel)
- **Product** (`ProductSupplier.unitCost` for OC line defaults)
- **Warehouse** (OC lines target warehouse, receipt creates stock there)
- **Stock** (Goods Receipt upserts stock per batch)
- **Yield Costing** (coso flows OC→Receipt→Batch→Desposte)

## Risks & Mitigations

| #   | Risk                                                                    | Mitigation                                                                                      |
| --- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | Backend in separate repo — API drift                                    | Publish OpenAPI contract BEFORE parallel development; contract-first                            |
| 2   | Batch FK columns (`sourceReceiptId`, `ocId`)                            | Add as nullable; backward-compatible migrations                                                 |
| 3   | Cost reconciliation conflicts (OC cost vs Receipt cost vs Invoice cost) | Receipt cost = source of truth for Batch; Invoice vs Receipt deviation → warning log, not block |
| 4   | DIAN retenciones complexity                                             | Manual entry for S3/S4; auto-calculation deferred to Sprint 6                                   |
| 5   | Partial receipts over multiple sessions                                 | OC line items track `orderedQty` + `receivedQty`; receipt validates against remaining           |

## Success Criteria

- [ ] Create, view, edit, cancel a Purchase Order with line items
- [ ] Receive goods against an OC → auto-creates Batches with `sourceReceiptId` and Stock updated
- [ ] Register supplier invoice with DIAN fields → supplier `currentBalance` updated
- [ ] Apply payment to invoice → invoice status = PAID, CxP reduced
- [ ] All 8 `/compras` submenu items enabled and navigable
- [ ] Batch.`purchaseCost` flows from receipt → visible in Yield Costing (existing flow)

## Estimated Effort

| Slice                             | Effort (dev-days) | Criticality     |
| --------------------------------- | ----------------- | --------------- |
| S1 — Purchase Order CRUD          | 5–7 days          | Foundation      |
| S2 — Goods Receipt                | 6–8 days          | Core complexity |
| S3 — Supplier Invoice + CxP       | 4–6 days          | DIAN compliance |
| S4 — Payments + Menu + Retentions | 3–5 days          | Integration     |

**Total**: 18–26 dev-days (~95 files)
