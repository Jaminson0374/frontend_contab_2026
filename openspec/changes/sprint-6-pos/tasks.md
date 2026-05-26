# Tasks: Sprint 6 — POS Core

## Slice 1: Turnos (Foundation)

- [ ] [BE] 1.1 V33 migration — `shifts` table with `status`, FK `cash_register_id`, `started_by`, `started_amount`, partial unique index `(cash_register_id) WHERE status='OPEN'` (2 files: V33\_\_create_shifts.sql + rollback)
- [ ] [BE] 1.2 Domain — `Shift.java` record (`ShiftStatus` enum), `ShiftRepository.java` port interface (2 files)
- [ ] [BE] 1.3 Infrastructure — `ShiftEntity.java`, `ShiftJpaRepository.java`, `ShiftMapper.java` (3 files)
- [ ] [BE] 1.4 Application — `CreateShiftUseCase.java` (validate one-open-per-register), `CloseShiftUseCase.java`, `ShiftRequest/Response` DTOs (4 files)
- [ ] [BE] 1.5 REST — `ShiftController.java`: `POST /open`, `POST /{id}/close`, `GET /active`, `GET /`, `GET /{id}` (1 file)
- [ ] [FE] 1.6 Model — `shift.model.ts` (`Shift`, `ShiftRequest`, `ShiftStatus` type) (1 file)
- [ ] [FE] 1.7 Service — `shift.service.ts` with `httpResource` paginated list + `open()`/`close()`/`getActive()` methods (1 file)
- [ ] [FE] 1.8 Feature — `pos.ts` wrapper, `shift-list.component.ts` (MatTable + paginator), `shift-form.component.ts` (open/close UI with register selector) (3 files)

## Slice 2: Cotizaciones + Pedidos

- [x] [BE] 2.1 V34 migration — `sales_documents` table with type, status, 5 FK references, 4 tax total columns (1 file)
- [x] [BE] 2.2 V35 migration — `sales_items` table with FK `document_id`, `product_id`, qty, unit_price, 4 tax columns, `batch_id` FK (1 file)
- [x] [BE] 2.3 Domain — `SalesDocument.java`, `SaleItem.java` records + enums (`SalesDocumentType`, `SalesDocumentStatus`), repository interfaces (4 files)
- [x] [BE] 2.4 Infrastructure — `SalesDocumentEntity.java`, `SaleItemEntity.java`, JPA repositories, MapStruct mappers (4 files)
- [x] [BE] 2.5 Application — `ManageSalesDocumentUseCase.java` with state machine transitions (validate guards: SENT req items, ACCEPTED req client, CONFIRMED→reserve stock, cancel→release) + DTOs (3 files)
- [x] [BE] 2.6 REST — `SalesDocumentController.java`: CRUD, `POST /{id}/transition`, `POST /{id}/items`, `PUT/DELETE /items/{id}` (1 file)
- [x] [FE] 2.7 Model — `sale.model.ts` (`SalesDocument`, `SaleItem`, `SalesDocumentType`, `SalesDocumentStatus` types) (1 file)
- [x] [FE] 2.8 Service — `sale.service.ts` with document CRUD, item add/update/remove, `transition()` method (1 file)
- [x] [FE] 2.9 Feature — `quote-list.component.ts` (filterable by type+status, MatTable + paginator), credit warning display (1 file)

## Slice 3: Venta POS + Factura

- [ ] [BE] 3.1 Application — `PriceEngineService.java`: 3-tier resolution custom_prices→price_list→product.salePrice (1 file)
- [ ] [BE] 3.2 Application — `PosCheckoutUseCase.java`: ORDER→INVOICE, SELECT FOR UPDATE stock, decrement committed+real, `@Transactional` atomic (1 file)
- [ ] [BE] 3.3 REST — `PosController.java`: `POST /pos/checkout` with request (orderId, paymentInfo) → invoice JSON (1 file)
- [ ] [FE] 3.4 Service — `pos.service.ts`: `checkout(orderId, payment)` orchestrating checkout flow (1 file)
- [ ] [FE] 3.5 Feature — `pos-venta.component.ts` 4-panel touch layout: LEFT categories+product grid, CENTER customer comboBox(**create**)+line items table (qty+/-, delete), RIGHT totals (subtotal, IVA 0/5/8/19, total) + COBRAR button, BOTTOM search+scale+keypad (1 file)

## Slice 4: Báscula (Scale)

- [ ] [FE] 4.1 Model — `scale.model.ts` (`ScaleReading`, `ScaleStatus` interfaces) (1 file)
- [ ] [FE] 4.2 Service — `scale.service.ts` abstract interface, `mock-scale.service.ts` (simulated stable readings), `web-serial-scale.service.ts` (Web Serial API with port open/read/close) (3 files)
- [ ] [BE] 4.3 REST — `ScaleController.java`: `GET /scale/status` returns mock/real weight reading (1 file)
- [ ] [FE] 4.4 Integration — wire scale button in POS bottom bar, auto-capture stable weight into active order line (modify pos-venta.component.ts)

## Slice 5: Cierre de Caja + Arqueo

- [ ] [BE] 5.1 Application — enhance `CloseShiftUseCase.java`: calculate expected cash (sum INVOICE payments), accept actual cash count, generate Z-Report PDF (iText), post journal entries (modify 1 file)
- [ ] [BE] 5.2 REST — add `GET /shifts/{id}/z-report` PDF download endpoint to `ShiftController.java` (modify 1 file)
- [ ] [FE] 5.3 Feature — `cash-closing.component.ts`: cash count form (denominations + totals), expected vs actual diff, Z-Report download button (1 file)

## Cross-cutting

- [ ] [BE] 6.1 JWT — add `whid` (warehouse) and `crid` (cash register) claims to token generation, backward-compatible (null defaults) (1 file modify)
- [ ] [FE] 6.2 Routes — add `/pos` lazy wrapper with children: `venta`, `cotizaciones`, `turnos` (list+form), `caja` to `app.routes.ts` (1 file modify)
- [ ] [FE] 6.3 Menu — remove `disabled: true` from POS children in `shell.ts` as each slice delivers (1 file modify)
