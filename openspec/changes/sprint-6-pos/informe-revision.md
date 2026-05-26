# Informe de Revisión — Sprint 6: POS Core

**Fecha:** 2026-05-20  
**Proyecto:** posinvent  
**Origen:** `openspec/changes/sprint-6-pos/tasks.md`

---

## Resumen Ejecutivo

De 31 tareas definidas en el Sprint 6, **28 están implementadas (90%)** y **3 tienen brechas**. El archivo `tasks.md` no refleja la realidad — 20 tareas aparecen como `[ ]` pendientes pero ya están completas en código. Este informe detalla el estado real de cada slice.

---

## Slice 1: Turnos (Foundation)

| Task | Descripción                                   | Estado                                                                   |
| ---- | --------------------------------------------- | ------------------------------------------------------------------------ |
| 1.1  | V33 migration — `shifts` table                | ✅ `V33__create_shifts.sql`                                              |
| 1.2  | Domain — `Shift.java`, `ShiftRepository.java` | ✅ Ambos existen                                                         |
| 1.3  | Infrastructure — Entity, JPA, Mapper          | ✅ `ShiftEntity`, `ShiftJpaRepository`, `ShiftMapper`                    |
| 1.4  | Application — UseCases + DTOs                 | ✅ `CreateShiftUseCase`, `CloseShiftUseCase`, `ShiftRequest/Response`    |
| 1.5  | REST — `ShiftController.java` (5 endpoints)   | ✅ `POST /open`, `POST /{id}/close`, `GET /active`, `GET /`, `GET /{id}` |
| 1.6  | FE Model — `shift.model.ts`                   | ✅ `src/app/core/models/shift.model.ts`                                  |
| 1.7  | FE Service — `shift.service.ts`               | ✅ `src/app/core/services/shift.service.ts`                              |
| 1.8  | FE Feature — list + form                      | ✅ `shift-list.ts`, `shift-form.ts`                                      |

**Resultado:** 8/8 — COMPLETO

---

## Slice 2: Cotizaciones + Pedidos

| Task | Descripción                                                | Estado                               |
| ---- | ---------------------------------------------------------- | ------------------------------------ |
| 2.1  | V34 migration — `sales_documents`                          | ✅ `V34__create_sales_documents.sql` |
| 2.2  | V35 migration — `sales_items`                              | ✅ `V35__create_sales_items.sql`     |
| 2.3  | Domain — `SalesDocument`, `SaleItem` + enums               | ✅ Ambos records + tipos             |
| 2.4  | Infrastructure — Entities, JPA, Mappers                    | ✅ 4 archivos                        |
| 2.5  | Application — `ManageSalesDocumentUseCase` + state machine | ✅ Transiciones con guards           |
| 2.6  | REST — `SalesDocumentController.java`                      | ✅ CRUD + transition + items         |
| 2.7  | FE Model — `sale.model.ts`                                 | ✅ Tipos completos                   |
| 2.8  | FE Service — `sale.service.ts`                             | ✅ CRUD + transition                 |
| 2.9  | FE Feature — `quote-list.component.ts`                     | ✅ Lista + formulario (`quote-form`) |

**Resultado:** 9/9 — COMPLETO

---

## Slice 3: Venta POS + Factura

| Task | Descripción                                                 | Estado                                                       |
| ---- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| 3.1  | `PriceEngineService.java` — 3-tier price resolution         | ✅ `custom_prices` → `price_list` → `product.salePrice`      |
| 3.2  | `PosCheckoutUseCase.java` — ORDER→INVOICE + stock decrement | ✅ `@Transactional`, SELECT FOR UPDATE, cambio               |
| 3.3  | `PosController.java` — `POST /pos/checkout`                 | ✅ + bonus `GET /products/search`                            |
| 3.4  | `pos.service.ts` — frontend checkout                        | ✅ Con `searchProducts` y `checkout`                         |
| 3.5  | `pos-venta.component.ts` — 4-panel touch layout             | ✅ 902 líneas: categorías, productos, orden, totales, COBRAR |

**Resultado:** 5/5 — COMPLETO

---

## Slice 4: Báscula (Scale)

| Task | Descripción                                                                             | Estado                                                                                                                        |
| ---- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 4.1  | `scale.model.ts` — `ScaleReading`, `ScaleStatus`                                        | ✅ `src/app/core/models/scale.model.ts`                                                                                       |
| 4.2  | `scale.service.ts` (abstract) + `mock-scale.service.ts` + `web-serial-scale.service.ts` | ⚠️ `mock-scale.service.ts` existe. `scale.service.ts` es concreto (no abstracto). **`web-serial-scale.service.ts` NO EXISTE** |
| 4.3  | `ScaleController.java` — `GET /scale/status`                                            | ✅ Mock endpoint presente                                                                                                     |
| 4.4  | Integration — scale button en POS                                                       | ✅ `toggleScale()`, `captureWeight()` en pos-venta                                                                            |

**Resultado:** 3/4 — PENDIENTE: `web-serial-scale.service.ts`

---

## Slice 5: Cierre de Caja + Arqueo

| Task | Descripción                                                                                   | Estado                                                                                                                                                                           |
| ---- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.1  | `CloseShiftUseCase.java` — expected cash, actual count, Z-Report PDF (iText), journal entries | ⚠️ Z-Report existe como **texto plano** (StringBuilder). **No usa iText para PDF**. **No hay asientos contables** (no existe clase `Journal`, `Asiento`, `Ledger` en el backend) |
| 5.2  | `GET /shifts/{id}/z-report` PDF download                                                      | ⚠️ Endpoint existe pero retorna `text/plain`, no PDF                                                                                                                             |
| 5.3  | `cash-closing.component.ts` — cash count form + diff + Z-Report download                      | ✅ Componente implementado                                                                                                                                                       |

**Resultado:** 1/3 — PENDIENTE: PDF iText + asientos contables

---

## Cross-cutting

| Task | Descripción                                                      | Estado                                                                                                                             |
| ---- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 6.1  | JWT — agregar `whid` (warehouse) y `crid` (cash register) claims | ❌ `JwtService.generateToken()` solo tiene `sub`, `uid`, `role`. **No existe `whid` ni `crid`** en ningún archivo Java del backend |
| 6.2  | Routes — `/pos` lazy wrapper con children                        | ✅ `turnos`, `venta`, `cotizaciones`, `caja`, `arqueo`                                                                             |
| 6.3  | Menu — remover `disabled: true` del menú POS                     | ✅ Todos habilitados (excepto Devoluciones, fuera de scope)                                                                        |

**Resultado:** 2/3 — PENDIENTE: JWT claims

---

## Consolidado

```
Sprint 6 — 31 tareas totales
├── Completas:     28 (90%)  ← 20 aparecen como [ ] en tasks.md pero están hechas
├── Pendientes:     3 (10%)
│   ├── P1: web-serial-scale.service.ts    → Web Serial API para báscula real
│   ├── P2: JWT whid/crid claims           → Warehouse + Cash Register en token
│   └── P3: Z-Report PDF + asientos        → iText PDF + postear journal entries
└── tasks.md:       desactualizado         ← requiere marcar 20 tareas como [x]
```

## Recomendación

1. **Actualizar `tasks.md`** — marcar las 20 tareas implementadas como `[x]`
2. **P1 (web-serial-scale)** — Baja prioridad. Requiere hardware real con Web Serial API. Se puede postergar.
3. **P2 (JWT claims)** — Media prioridad. Necesario para que el POS sepa en qué bodega/caja está operando sin consultar APIs adicionales.
4. **P3 (Z-Report PDF + asientos)** — Media prioridad. El Z-Report en texto plano es funcional. Los asientos contables requieren crear el módulo de contabilidad (`Journal`, `Ledger`).

---

_Informe generado automáticamente por revisión de código. Backend: `C:\POS_VTA\backend_pos-vta`. Frontend: `C:\POS_VTA\posinvent`._
