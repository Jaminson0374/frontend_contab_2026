# Exploration: Sprint 5 — Compras (Purchase Orders + Receipt + Invoices)

## Current State

**Cero código de compras.** El menú lateral tiene 8 items planeados pero TODOS `disabled: true`. La ruta `/compras` ni siquiera existe en `app.routes.ts`.

Lo que SÍ existe y se reutilizará:
| Recurso | Archivo | Rol en Compras |
|---------|---------|---------------|
| `purchaseCost` + `supplierId` en Batch | `batch.model.ts` | Kernel de recepción de mercancía |
| ThirdParty SUPPLIER con datos DIAN | `third-party.model.ts` | Proveedores con régimen fiscal completo |
| `ProductSupplier` con `unitCost`, `isMain` | `product.model.ts` | Precios de compra por producto/proveedor |
| Yield Costing requiere `purchaseCost > 0` | `desposte-slice.ts` | El costo fluye OC→Receipt→Batch→Desposte |

## Affected Areas

### Frontend (~40 archivos)

- `app.routes.ts` — agregar `/compras` + 8 rutas hijas
- `layout/shell/shell.ts` — habilitar 8 items del menú
- `core/models/` — 6 nuevos modelos
- `core/services/` — 6 nuevos servicios
- `core/domain/` — 1-2 pure functions (reconciliación OC vs Receipt)
- `features/compras/` — 8 feature dirs (~24 archivos de componentes)

### Backend (~49 archivos)

- `domain/model/` — 7 nuevos records Java
- `domain/repository/` — 7 puertos
- `domain/service/` — ReceiptDomainService
- `application/usecase/` — 5-6 casos de uso @Transactional
- `infrastructure/rest/` — 5-6 controladores
- `infrastructure/persistence/` — entities, mappers, JPA, adapters × 7
- `db/migration/` — V25-V30 (6 SQL)

## Approaches

### Approach A: Full OC → Receipt → Invoice (RECOMMENDED)

Ciclo completo: Orden de Compra → Recepción de Mercancía (crea batches + stock) → Factura Proveedor (CxP + retenciones DIAN) → Pagos.

- **Pros**: Trazabilidad ICA/INVIMA completa, matching con menú planeado, cost reconciliation, patrones ya establecidos
- **Cons**: Más archivos (~95 total)
- **Effort**: Medium-High

### Approach B: Simplified — Receipt without OC

Saltar OC, ir directo a Recepción con factura.

- **Pros**: Menos archivos, más rápido
- **Cons**: Sin planificación de compras, sin reconciliación OC vs Receipt, viola el menú ya planeado
- **Effort**: Medium

## Recommendation

**Approach A**. El menú ya tiene 8 items separados incluyendo "Órdenes de compra". La trazabilidad ICA/INVIMA y los requerimientos DIAN colombianos exigen el ciclo completo. Los patrones de código están 100% establecidos (Batch CRUD, Slaughter Process).

## Process Flow

```
1. OC (Purchase Order)
   → Line items: producto, cantidad, costo unitario, bodega
   → Status: PENDING → PARTIAL → RECEIVED → CANCELLED

2. Recepción (Goods Receipt)
   → Valida contra OC (cantidades, costos, proveedor)
   → Crea Batches + Stock por cada línea recibida
   → Actualiza OC.status
   → Costo real fluye al Batch.purchaseCost

3. Factura (Supplier Invoice)
   → Link a OC/Receipt
   → Campos DIAN: subtotal, IVA, retenciones, total
   → Actualiza CxP del proveedor
   → Status: PENDING → RECONCILED → DISPUTED → PAID

4. Pagos (Payment)
   → Aplica a factura(s)
   → Reduce CxP
   → Status: PARTIALLY_PAID → PAID
```

## Risks

| Risk                                     | Severity | Mitigation                                                   |
| ---------------------------------------- | -------- | ------------------------------------------------------------ |
| Backend en repo separado                 | HIGH     | Definir contrato API primero en design                       |
| Batch FK columns nuevos                  | MEDIUM   | NULL por default, backward-compatible                        |
| Cost reconciliation (3 costos distintos) | MEDIUM   | Receipt cost → Batch; Invoice vs Receipt deviation → warning |
| Retenciones DIAN complejas               | MEDIUM   | Entrada manual inicial, automatización futuro slice          |
| Recepciones parciales                    | LOW      | OC line items con orderedQty + receivedQty                   |

## Ready for Proposal

**Sí.** ~95 archivos estimados (40 frontend + 49 backend + 6 migrations).
