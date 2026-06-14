# Delta for POS — Devoluciones

## ADDED Requirements

| ID          | Requirement                                                                           | Strength |
| ----------- | ------------------------------------------------------------------------------------- | -------- |
| REQ-POS-080 | Tipo de documento CREDIT_NOTE aceptado por SalesDocumentType y DB                     | MUST     |
| REQ-POS-081 | Devolución total: nota crédito con items negativos, sourceDocumentId, stock reversado | MUST     |
| REQ-POS-082 | Devolución parcial: solo items y cantidades especificadas se revierten                | MUST     |
| REQ-POS-083 | Ajuste de CxC si la factura original fue a crédito                                    | MUST     |
| REQ-POS-084 | Validación de factura origen: existe, ISSUED, sin nota crédito previa                 | MUST     |
| REQ-POS-085 | Validación de items: pertenecen a la factura, cantidad <= original                    | MUST     |
| REQ-POS-086 | Reversión de stock vía kardex (ENTRY + DEVOLUTION) con costo de factura original      | MUST     |
| REQ-POS-087 | Frontend: buscar factura, mostrar items, campos devolverCantidad y motivo, submit     | MUST     |
| REQ-POS-088 | Shell POS: menú Devoluciones habilitado, ruta /pos/devoluciones                       | MUST     |

---

### REQ-POS-080 — Tipo de Documento Nota Crédito

The system MUST accept `CREDIT_NOTE` as a `SalesDocumentType`. The DB CHECK constraint on `sales_documents.type` MUST include `CREDIT_NOTE`.

#### Scenario: Persistir nota crédito

- GIVEN `SalesDocumentType` includes `CREDIT_NOTE`
- WHEN a `SalesDocument` with `type=CREDIT_NOTE`, negative amounts, and `sourceDocumentId` is persisted
- THEN the database accepts it without constraint violation

---

### REQ-POS-081 — Devolución Total

`PosDevolutionUseCase` MUST create a credit note with all items from an ISSUED invoice, amounts negated, stock fully reversed. The credit note MUST link `sourceDocumentId` to the original invoice.

#### Scenario: Reversión completa de factura

- GIVEN invoice INV-001 (status=ISSUED) with items A(5u × $10k) and B(3u × $20k)
- WHEN a full devolution is submitted for INV-001
- THEN a CREDIT_NOTE is created with A(−5u, −$50k) and B(−3u, −$60k)
- AND `creditNote.sourceDocumentId == INV-001.id`
- AND stock A increases by 5u, B by 3u
- AND kardex records `MovementType.ENTRY` with reason `DEVOLUTION` per item

---

### REQ-POS-082 — Devolución Parcial

The system MUST allow specifying which items and what quantities to return. Items excluded from the request MUST NOT be modified.

#### Scenario: Subset de ítems y cantidades

- GIVEN invoice with items A(5u), B(3u), C(10u)
- WHEN devolución requests A(2u) and B(1u), omitting C
- THEN credit note contains A(−2u), B(−1u) only
- AND stock A increases by 2u, B by 1u, C unchanged

#### Scenario: Cantidad cero en un ítem

- GIVEN invoice with item A(5u)
- WHEN devolución requests A(0u)
- THEN item A is excluded from the credit note (treated as not returned)

---

### REQ-POS-083 — Ajuste de Cuentas por Cobrar

If the original invoice was a credit sale, the devolution MUST reduce `AccountsReceivable.outstanding` and `ThirdParty.currentBalance`.

#### Scenario: Reducción de saldo pendiente

- GIVEN INV-001 with AR(total=500k, paid=0, outstanding=500k)
- WHEN full devolución creates credit note for −500k
- THEN AR.outstanding = 0 and ThirdParty.currentBalance decreases by 500k

#### Scenario: Factura parcialmente pagada

- GIVEN INV-001 with AR(paid=200k, outstanding=300k)
- WHEN full devolución for −500k
- THEN AR.outstanding = 0; paidAmount stays 200k (money already collected is unaffected)

---

### REQ-POS-084 — Validación de Factura Origen

The system MUST reject devolutions when the invoice does not exist, is not ISSUED, or already has a linked credit note.

#### Scenario: Factura inexistente

- GIVEN invoice number "INV-999" does not exist
- WHEN devolución is submitted
- THEN HTTP 422: "Factura no encontrada"

#### Scenario: Factura ya acreditada

- GIVEN INV-001 already linked to an existing CREDIT_NOTE
- WHEN another devolución is submitted for INV-001
- THEN HTTP 422: "La factura ya tiene una nota crédito asociada"

#### Scenario: Factura no emitida

- GIVEN an ORDER (status ≠ ISSUED) with items
- WHEN devolución is requested against it
- THEN HTTP 422: "Solo se pueden devolver facturas emitidas"

---

### REQ-POS-085 — Validación de Ítems y Cantidades

Items in the devolution request MUST belong to the invoice. Quantities MUST NOT exceed the original invoiced quantity.

#### Scenario: Cantidad excede la original

- GIVEN invoice item A with original qty 5u
- WHEN devolución requests A qty 7u
- THEN HTTP 422: "Cantidad a devolver excede la facturada"

#### Scenario: Ítem no pertenece a la factura

- GIVEN invoice has items A and B only
- WHEN devolución includes item C
- THEN HTTP 422: "El ítem C no pertenece a la factura"

---

### REQ-POS-086 — Reversión de Stock vía Kardex

Stock MUST be restored via `MovementType.ENTRY` with reason `DEVOLUTION`. The unit cost MUST come from the original invoice item, not the current stock cost.

#### Scenario: Entrada por devolución

- GIVEN product P with stock=10u, original invoice unit cost=$5,000
- WHEN 2u of P are returned via devolution
- THEN stock P = 12u
- AND kardex entry: type=ENTRY, reason=DEVOLUTION, qty=2, unitCost=$5,000

---

### REQ-POS-087 — Componente Frontend de Devolución

`PosDevolutionComponent` MUST provide: invoice search field, item table with original quantities, editable `devolverCantidad` per item, `motivo` text field, and submit button.

#### Scenario: Búsqueda y carga de factura

- GIVEN user navigates to `/pos/devoluciones`
- WHEN user enters an existing invoice number and triggers search
- THEN item grid loads with original qty column, editable `devolverCantidad` inputs, and `motivo` field

#### Scenario: Factura no encontrada en UI

- GIVEN user searches "INV-999" which does not exist
- WHEN search completes
- THEN UI displays "Factura no encontrada"; no item grid is shown

#### Scenario: Submit exitoso

- GIVEN items loaded, devolverCantidad > 0 for some items, motivo filled
- WHEN user clicks "Crear nota crédito"
- THEN `POST /api/v1/pos/devolutions` is called and success confirmation (Swal) is shown

---

### REQ-POS-088 — Shell y Ruta

The POS menu item "Devoluciones" MUST be enabled (`disabled: false`) and route to `/pos/devoluciones`, lazy-loading `PosDevolutionComponent`.

#### Scenario: Navegación desde menú POS

- GIVEN an authenticated user on the POS shell
- WHEN "Devoluciones" is clicked
- THEN navigation goes to `/pos/devoluciones` and `PosDevolutionComponent` renders
