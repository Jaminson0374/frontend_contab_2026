# Design: Sprint 6 — POS Core

## Technical Approach

Greenfield Angular 21 POS module — zero existing code. Feature-wrapper `/pos` with lazy-loaded routes. Five backend slices mirroring proposal: Shifts → Quotes/Orders → POS Invoice → Scale → Cash Close. Hexagonal arch on backend (Java 21 records, MapStruct, @Service @Transactional, thin @RestController). Frontend follows existing patterns: standalone components, signals, `httpResource`, `inject()`, ReactiveForms, mat-autocomplete `__create__`.

## Architecture Decisions

| Decision          | Choice                                                              | Rejected                   | Rationale                                                                                                    |
| ----------------- | ------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| State machine     | Enum-based `SalesDocumentStatus` + transition guard in use case     | Workflow engine (overkill) | Simple 8-state DAG, no parallel branches. Guard method per transition validates preconditions inline.        |
| Customer selector | mat-autocomplete `__create__` pattern (same as product-form)        | Separate dialog            | POS needs inline customer creation without context switch. Pattern already proven in product-form suppliers. |
| Order state       | In-memory signal-based order (no server round-trip per item)        | Direct API calls per row   | POS is latency-sensitive. Collect items locally, flush on COBRAR/Cotizar.                                    |
| Tax breakdown     | 4 explicit columns `total_tax_0/5/8/19`                             | Generic tax table          | Colombian tax system has exactly 4 rates. Columns = simpler queries, faster reports.                         |
| Scale integration | `MockScaleService` default + `WebSerialScaleService` (Chrome only)  | Web Serial only            | Web Serial API limited to Chrome/Edge desktop. MockScaleService enables all browsers and SSR.                |
| Stock reservation | `SELECT FOR UPDATE` on `inventory_stock` rows                       | Optimistic locking         | POS sales are write-heavy on stock. Pessimistic lock prevents stock going negative under concurrent sales.   |
| JWT context       | Extend JWT to include `whid` (warehouse) and `crid` (cash register) | Separate context API call  | POS auto-scoping needs warehouse/cashRegister on every request. JWT claims avoid extra lookups.              |
| Z-Report          | Server-generated PDF via GET endpoint                               | Client-side PDF gen        | Server has access to all shift data for accurate report. Atomic generation at close time.                    |

## Data Flow

```
Category tap ──→ productFilter ──→ productGrid (computed)
     │                                   │
     │                          tap product ──→ orderLines (signal)
     │                                   │
     │                          computed ──→ totals panel
     │                                   │
     └── barcode scan / search ──────────┘
                                          │
                              COBRAR ──→ PosService.checkout()
                                              │
                              backend: SELECT FOR UPDATE → decrement stock
                              backend: INSERT sales_documents + items
                              backend: INSERT journal entries
```

## File Changes

### Frontend (22 new files)

| File                                              | Action | Description                                     |
| ------------------------------------------------- | ------ | ----------------------------------------------- |
| `src/app/features/pos/pos.ts`                     | Create | Feature wrapper, `<router-outlet />`            |
| `src/app/features/pos/venta/pos-venta.ts`         | Create | 4-panel touch POS screen                        |
| `src/app/features/pos/turnos/shift-list.ts`       | Create | Shift list with pagination                      |
| `src/app/features/pos/turnos/shift-form.ts`       | Create | Open/close shift form                           |
| `src/app/features/pos/cotizaciones/quote-list.ts` | Create | Quote list (filters by status)                  |
| `src/app/features/pos/caja/cash-closing.ts`       | Create | Cash closing view with Z-Report                 |
| `src/app/core/models/shift.model.ts`              | Create | Shift + ShiftRequest interfaces                 |
| `src/app/core/models/sale.model.ts`               | Create | SalesDocument, SaleItem, SalesDocumentStatus    |
| `src/app/core/models/scale.model.ts`              | Create | ScaleReading, ScaleStatus                       |
| `src/app/core/services/shift.service.ts`          | Create | Shift CRUD + open/close                         |
| `src/app/core/services/sale.service.ts`           | Create | Document CRUD + items + transitions             |
| `src/app/core/services/pos.service.ts`            | Create | checkout() orchestration                        |
| `src/app/core/services/scale.service.ts`          | Create | WebSerialScaleService + MockScaleService        |
| `src/app/app.routes.ts`                           | Modify | Add `/pos` routes, enable shell.ts POS children |
| `src/app/layout/shell/shell.ts`                   | Modify | Remove `disabled: true` from POS children       |

### Backend (48 new files, Java)

| File                                                     | Action | Description                                               |
| -------------------------------------------------------- | ------ | --------------------------------------------------------- |
| `domain/model/SalesDocument.java`                        | Create | Record: id, type, status, totals, FK references           |
| `domain/model/SaleItem.java`                             | Create | Record: documentId, productId, qty, unitPrice, tax fields |
| `domain/model/Shift.java`                                | Create | Record: cashRegisterId, userId, times, amounts, status    |
| `domain/repository/SalesDocumentRepository.java`         | Create | Port interface                                            |
| `domain/repository/ShiftRepository.java`                 | Create | Port interface                                            |
| `application/usecase/CreateShiftUseCase.java`            | Create | Open shift with validation (one-per-register)             |
| `application/usecase/CloseShiftUseCase.java`             | Create | Close shift, calc totals, gen Z-Report                    |
| `application/usecase/ManageSalesDocumentUseCase.java`    | Create | Create, transition, add/remove items                      |
| `application/usecase/PosCheckoutUseCase.java`            | Create | Order→Invoice, stock decrement (SELECT FOR UPDATE)        |
| `application/usecase/PriceEngineService.java`            | Create | 3-tier price resolution (custom→priceList→product)        |
| `infrastructure/adapter/SalesDocumentJpaAdapter.java`    | Create | JPA impl of domain port                                   |
| `infrastructure/controller/ShiftController.java`         | Create | REST: /shifts/\*\*                                        |
| `infrastructure/controller/SalesDocumentController.java` | Create | REST: /sales/\*\*                                         |
| `infrastructure/controller/PosController.java`           | Create | REST: /pos/checkout                                       |
| `infrastructure/controller/ScaleController.java`         | Create | REST: /scale/status                                       |

## Interfaces / Contracts

### REST API

| Method | Path                                      | Description                                     |
| ------ | ----------------------------------------- | ----------------------------------------------- |
| POST   | `/api/v1/shifts/open`                     | Open shift (requires cashRegisterId)            |
| POST   | `/api/v1/shifts/{id}/close`               | Close shift, returns Z-Report URL               |
| GET    | `/api/v1/shifts/active?cashRegisterId=`   | Get active shift for register                   |
| GET    | `/api/v1/shifts`                          | Paginated shift list                            |
| GET    | `/api/v1/shifts/{id}`                     | Shift detail                                    |
| GET    | `/api/v1/shifts/{id}/z-report`            | Download Z-Report PDF                           |
| POST   | `/api/v1/sales/documents`                 | Create QUOTE or ORDER                           |
| POST   | `/api/v1/sales/documents/{id}/transition` | Advance state (body: `{targetStatus}`)          |
| GET    | `/api/v1/sales/documents`                 | Paginated list (filter: type, status, clientId) |
| GET    | `/api/v1/sales/documents/{id}`            | Document with items                             |
| POST   | `/api/v1/sales/documents/{id}/items`      | Add item to document                            |
| PUT    | `/api/v1/sales/items/{id}`                | Update item qty/price                           |
| DELETE | `/api/v1/sales/items/{id}`                | Remove item from document                       |
| POST   | `/api/v1/pos/checkout`                    | Create INVOICE from order, decrement stock      |
| GET    | `/api/v1/scale/status`                    | Current scale reading (mock or real)            |

### State Machine Transitions

```
QUOTE:  DRAFT ──→ SENT ──→ ACCEPTED
                     │         │
                     ├──→ REJECTED    └──→ ORDER (source_document_id)
                     └──→ EXPIRED

ORDER:  DRAFT ──→ CONFIRMED ──→ PARTIALLY_INVOICED ──→ INVOICED
                     │                                         │
                     └──→ CANCELLED                           │
                                                              │
INVOICE: DRAFT ──→ ISSUED ──→ PAID                            │
                     │                                         │
                     └──→ CANCELLED ←──────────────────────────┘
```

**Transition validation rules**:

- QUOTE: `SENT` requires items; `ACCEPTED` requires valid client; auto-expire after 30d
- ORDER: `CONFIRMED` increments `committed_quantity`; cancel releases it
- ORDER→INVOICE: creates new INVOICE doc, decrements `committed_quantity` + `stock_quantity`
- INVOICE: `ISSUED` generates invoice number; `PAID` records payment

### Key TypeScript Interfaces

```typescript
type SalesDocumentType = 'QUOTE' | 'ORDER' | 'INVOICE';
type SalesDocumentStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CONFIRMED'
  | 'PARTIALLY_INVOICED'
  | 'INVOICED'
  | 'ISSUED'
  | 'PAID'
  | 'CANCELLED';

interface SalesDocument {
  id: string;
  type: SalesDocumentType;
  status: SalesDocumentStatus;
  clientId: string | null;
  clientName: string | null;
  warehouseId: string;
  shiftId: string;
  cashRegisterId: string;
  documentNumber: string;
  sourceDocumentId: string | null;
  totalNet: number;
  totalTax0: number;
  totalTax5: number;
  totalTax8: number;
  totalTax19: number;
  totalAmount: number;
  items: SaleItem[];
  createdAt: string;
}

interface SaleItem {
  id: string;
  documentId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxType: TaxType;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  lineNumber: number;
  batchId: string | null;
}
```

## Testing Strategy

| Layer          | What                                                               | Approach                         |
| -------------- | ------------------------------------------------------------------ | -------------------------------- |
| Unit FE        | State machine guards, price calculation, tax breakdown             | Vitest + signal assertions       |
| Unit BE        | Transition validators, PriceEngine, stock reservation logic        | JUnit 5 + Mockito                |
| Integration FE | POS service orchestration (checkout flow)                          | TestBed + HttpClientTesting      |
| Integration BE | Shift open/close cycle, document lifecycle, stock decrement        | @SpringBootTest + Testcontainers |
| E2E            | Complete POS sale: open shift → add items → checkout → close shift | Playwright                       |

## Migration / Rollout

- V33 (shifts), V34 (sales_documents), V35 (sales_items): Flyway migrations in order
- JWT migration: backward-compatible — existing tokens work, new tokens include `whid`+`crid`
- Shell.ts POS menu: flip `disabled: false` as each slice delivers
- Rollout order: Turnos (S1) → Cotizaciones/Pedidos (S2) → Venta POS (S3) → Báscula (S4) → Cierre de Caja (S5)

## Open Questions

- [ ] Scale hardware: confirm which RS-232/USB scale model for Web Serial PID/VID
- [ ] Z-Report: confirm exact format (DIAN requirements for Colombian POS)
- [ ] Invoice numbering: confirm resolution range and authorization from DIAN
- [ ] Credit sales: S6 scope says "warn, not block" — confirm no S6 credit limit enforcement
