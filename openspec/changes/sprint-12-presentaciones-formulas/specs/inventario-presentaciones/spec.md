# Inventario — Presentaciones Specification

## Purpose

Enable products to be sold in multiple units of measure (presentations), each with its own conversion factor, optional sale price override, and a designated default. Extends the existing product catalog without modifying core inventory flows.

---

## ADDED Requirements

| ID          | Requirement                                                     | Strength |
| ----------- | --------------------------------------------------------------- | -------- |
| REQ-INV-100 | Table `product_presentations` with FK to products and UoMs      | MUST     |
| REQ-INV-101 | Full hexagonal stack: ProductPresentation                       | MUST     |
| REQ-INV-102 | Product entity includes `List<ProductPresentation>` (1→N)       | MUST     |
| REQ-INV-103 | Exactly one `is_default=true` per product enforced              | MUST     |
| REQ-INV-104 | GET `/api/v1/products/{id}` includes `presentations[]`          | MUST     |
| REQ-INV-105 | `PresentationsTabComponent` embedded in `product-form`          | MUST     |
| REQ-INV-106 | Inline CRUD: add, edit, delete presentations without navigation | MUST     |
| REQ-INV-107 | UI badge "precio personalizado" when `sale_price_override` set  | SHOULD   |
| REQ-INV-108 | `conversion_factor` relates presentation UoM to product base    | MUST     |
| REQ-INV-109 | Dual validation: backend constraint + frontend guard            | MUST     |

---

### REQ-INV-100 — Table `product_presentations`

The system MUST create table `product_presentations` with columns: `id` (PK), `product_id` (FK → products), `unit_of_measure_id` (FK → unit_of_measures), `conversion_factor` (DECIMAL(12,4)), `sale_price_override` (NUMERIC(15,2) nullable), `is_default` (BOOLEAN DEFAULT false), `created_at`, `updated_at`.

#### Scenario: Migración V58 crea la tabla

- GIVEN Flyway migration V58 runs
- WHEN the DB schema is applied
- THEN `product_presentations` exists with all 7 columns and both FKs
- AND `product_id` has ON DELETE CASCADE
- AND unique constraint on `(product_id, unit_of_measure_id)`

---

### REQ-INV-101 — Hexagonal Stack: ProductPresentation

The system MUST implement the full hexagonal stack: `ProductPresentation` (domain record/java 21 record), `ProductPresentationJpaEntity`, `ProductPresentationRepository` (interface + JPA impl), `ProductPresentationUseCase`, `ProductPresentationController`.

#### Scenario: Crear presentación via API

- GIVEN product P-001 exists with base UoM KG
- WHEN `POST /api/v1/products/P-001/presentations` with `{ unitOfMeasureId: BANDEJA_250G, conversionFactor: 0.25, isDefault: true }`
- THEN 201 — presentation created
- AND `GET /api/v1/products/P-001/presentations` returns the new presentation

#### Scenario: Eliminar presentación

- GIVEN product P-001 has 3 presentations
- WHEN `DELETE /api/v1/products/P-001/presentations/{id}`
- THEN 200 — presentation deleted; remaining 2 presentations persist

---

### REQ-INV-102 — Product Entity Extended

`ProductEntity` and `ProductRecord` MUST include `List<ProductPresentation> presentations` (mapped `@OneToMany` in JPA). Product API responses SHALL include presentations.

#### Scenario: Product DTO includes presentations array

- GIVEN product P-001 has 2 presentations (BANDEJA_250G, BANDEJA_500G)
- WHEN `GET /api/v1/products/P-001`
- THEN response includes `presentations: [{ uom: "BANDEJA_250G", conversionFactor: 0.25, ... }, { uom: "BANDEJA_500G", ... }]`

---

### REQ-INV-103 — Unique `is_default` per Product

The system MUST enforce exactly one `is_default=true` per product. Backend: use case validates before persist. DB: partial unique index `WHERE is_default = true` or application-level guard. Reject with 422 if violated.

#### Scenario: Validación backend rechaza duplicado

- GIVEN product P-001 already has presentation X with `is_default=true`
- WHEN `POST /api/v1/products/P-001/presentations` with `{ ... isDefault: true }`
- THEN 422: "Ya existe una presentación por defecto para este producto"
- AND X's `is_default` remains `true`

#### Scenario: Cambio de default permitido

- GIVEN P-001 has presentation A (is_default=true) and B (is_default=false)
- WHEN `PUT /api/v1/products/P-001/presentations/B` with `{ isDefault: true }`
- THEN 200 — B becomes default; A's `is_default` flips to false in the same transaction

---

### REQ-INV-104 — API Response Includes Presentations

`GET /api/v1/products/{id}` MUST include `presentations[]` in the response DTO. `GET /api/v1/products` SHOULD include presentations for list endpoints (or a summary count).

#### Scenario: Product detail with presentations

- GIVEN product P-001 has 3 presentations
- WHEN `GET /api/v1/products/P-001`
- THEN response `presentations` array has 3 items with full detail (id, uom, conversionFactor, salePriceOverride, isDefault)

---

### REQ-INV-105 — PresentationsTabComponent in Product Form

`product-form` MUST render a "Presentaciones" tab with `PresentationsTabComponent` embedded. The component SHALL be a standalone Angular component using signals and inject().

#### Scenario: Tab visible in product form

- GIVEN user opens `/inventario/productos/P-001/editar`
- WHEN product form loads
- THEN "Presentaciones" tab is visible and clickable
- AND selecting the tab renders the presentations sub-table

---

### REQ-INV-106 — Inline CRUD (Add/Edit/Delete)

`PresentationsTabComponent` MUST allow adding, editing, and deleting presentations without navigating away. Add: inline row or small dialog. Edit: inline row editing. Delete: confirmation dialog (Swal) then remove.

#### Scenario: Agregar presentación inline

- GIVEN user is on the "Presentaciones" tab
- WHEN user clicks "Agregar presentación"
- THEN an empty row appears with UoM dropdown, conversionFactor input, salePriceOverride input, isDefault checkbox
- AND filling + saving creates the presentation via `PresentationService`

#### Scenario: Eliminar con confirmación

- GIVEN 3 presentations exist in the table
- WHEN user clicks delete on row 2
- THEN Swal asks "¿Eliminar esta presentación?"
- AND confirming deletes it; row is removed from table

#### Scenario: Validación inline — campo requerido

- GIVEN user adds a new row and leaves conversionFactor empty
- WHEN user clicks save
- THEN inline error: "Factor de conversión requerido"
- AND the row is NOT persisted

---

### REQ-INV-107 — Badge "Precio Personalizado"

The presentations table SHOULD display a visible badge or icon on rows where `sale_price_override IS NOT NULL`, indicating the base product price is overridden.

#### Scenario: Badge visible

- GIVEN presentation BANDEJA_250G has `salePriceOverride = 8500` and BANDEJA_500G has `salePriceOverride = null`
- WHEN the presentations table renders
- THEN BANDEJA_250G row shows "⚡ Precio personalizado" badge
- AND BANDEJA_500G row shows no badge

---

### REQ-INV-108 — Conversion Factor Semantics

`conversion_factor` MUST represent the ratio: 1 unit of this presentation = X units of the product's base UoM. Example: product base UoM = KG, presentation = BANDEJA_500G → conversion_factor = 0.5.

#### Scenario: Cálculo de conversión a la base

- GIVEN product base UoM = KG, presentation conversionFactor = 0.5
- WHEN system computes base-equivalent qty for 3 bandejas
- THEN base equivalent = 3 × 0.5 = 1.5 KG

---

### REQ-INV-109 — Dual Validation (Backend + Frontend)

Validation rules (unique UoM per product, exactly one default, conversionFactor > 0, price override ≥ 0) MUST be enforced in both backend (422 responses) and frontend (inline form validation before submit).

#### Scenario: Backend validation gate

- GIVEN frontend bypassed and sends conversionFactor = -1
- WHEN `POST` hits the backend
- THEN 422: "conversionFactor must be > 0"

#### Scenario: Frontend validation gate

- GIVEN user enters conversionFactor = -1 in the inline form
- WHEN focus leaves the field
- THEN inline error "El factor debe ser mayor a 0"
- AND save button is disabled until corrected
