# Exploration: Registro Animal (ICA/INVIMA) + Slaughter/Faena — Sprint 4 Slice 2

## Current State (post-Slice 1)

- **Batches**: CRUD completo con status OPEN|PROCESSING|CLOSED. Creación valida proveedor existente y bodega tipo CANAL.
- **ThirdParties**: CRUD completo con type CLIENT|SUPPLIER|BOTH. Endpoint `/suppliers` para opciones rápidas.
- **Warehouses**: CANAL, CORTES, VISCERAS, EMBUTIDOS, DECOMISOS, GENERAL. Solo CANAL acepta lotes de entrada.
- **Desposte manual**: Proceso completo con MVM (0.5%), Yield Costing, cierre de lote y upsert de stock. Fuente MANUAL con justificación. Modelo `DesposteSourceType { MANUAL }`.
- **No existen tablas** `animals` ni `slaughters` — hay que crearlas vía Flyway.
- **Menú lateral**: "Inventarios" no incluye "Registro Animal" ni "Faena" — hay que agregarlos.
- **Domain logic §4**: Define `source_type` (AUTOMATIC/MANUAL), requiere bit de estabilidad para automático, justificación obligatoria para manual.
- **Data model §8**: Define Animals y Slaughters con estructura canónica.

## Affected Areas

### Backend (`backend_pos-vta`)

| Layer                             | Files                                                 | Pattern                                        |
| --------------------------------- | ----------------------------------------------------- | ---------------------------------------------- |
| `domain/model/`                   | `Animal.java`, `Slaughter.java`                       | Java Records (como ThirdParty, Batch)          |
| `domain/service/`                 | `SlaughterDomainService.java`                         | Lógica pura (como ManualDesposteDomainService) |
| `domain/repository/`              | `AnimalRepository`, `SlaughterRepository`             | Interfaces puerto                              |
| `application/usecase/`            | `AnimalUseCase`, `SlaughterUseCase`                   | CRUD + Proceso @Transactional                  |
| `application/dto/`                | `AnimalRequest/Response`, `SlaughterRequest/Response` | Jakarta Validation                             |
| `infrastructure/.../rest/`        | `AnimalController`, `SlaughterController`             | @RestController @PreAuthorize                  |
| `infrastructure/.../persistence/` | 8 archivos (Entity, Mapper, JPA, Adapter × 2)         | MapStruct + Spring Data JPA                    |
| `db/migration/`                   | V23 (animals), V24 (slaughters)                       | PostgreSQL Flyway                              |

### Frontend (`posinvent`)

| Area                            | Files                                                    | Pattern                   |
| ------------------------------- | -------------------------------------------------------- | ------------------------- |
| `core/models/`                  | `animal.model.ts`, `slaughter.model.ts`                  | TypeScript interfaces     |
| `core/services/`                | `animal.service.ts`, `slaughter.service.ts`              | httpResource + HttpClient |
| `features/inventario/animales/` | `animal-list/`, `animal-form/` (6 archivos)              | batch-list/form pattern   |
| `features/inventario/faena/`    | `slaughter-process/` (3-4 archivos)                      | desposte-manual pattern   |
| `app.routes.ts`                 | Nuevas rutas `/inventario/animales`, `/inventario/faena` | Lazy loading              |
| `layout/shell/shell.ts`         | Nuevos items en menú                                     | NavChild entries          |

## Approaches

### Approach A: Full Animal registration → then Slaughter as separate step (RECOMMENDED)

Animal CRUD first (list + form), then a separate slaughter process screen that selects a RECEIVED animal and executes the faena.

- **Pros**: Clear separation of concerns, natural workflow (registro → faena → desposte), each step can be tested independently, aligns with existing patterns (Animal = CRUD like Batch, Slaughter = Process like Desposte)
- **Cons**: Two screens to build, two backend modules
- **Effort**: ~11-12 hours

### Approach B: Single unified Animal+Slaughter form

One screen that captures animal data AND slaughter data simultaneously.

- **Pros**: Fewer screens, less navigation, "one-shot" for the operator
- **Cons**: Violates the real-world process (animals are registered when they arrive, days/hours before slaughter), mixes CRUD and Process patterns, harder to validate, no separation of receipt vs processing
- **Effort**: ~8 hours but MUCH harder to extend later

## Recommendation

**Approach A** — Two-phase process (Animal registration → Slaughter). This matches the real-world workflow of a meat processing plant: animals arrive and are registered, then later sent to slaughter. The separation enables:

- Inventory tracking of animals before slaughter (status = RECEIVED)
- ICA traceability from the moment of receipt
- Independent auditing of registration vs slaughter steps

### Technical Patterns to Use

| Component                | Pattern to Copy               | Why                                                |
| ------------------------ | ----------------------------- | -------------------------------------------------- |
| `Animal` record          | `Batch` / `ThirdParty`        | Java record with enums, FK references              |
| `AnimalUseCase`          | `BatchUseCase`                | CRUD with status filtering, FK validation          |
| `AnimalController`       | `BatchController`             | REST with pagination, status filter                |
| `animal-list`            | `batch-list`                  | mat-table, status chips, dialog for create         |
| `animal-form`            | `batch-form`                  | mat-dialog, ReactiveForms, autocomplete suppliers  |
| `Slaughter` record       | `ManualDespostePlan.Command`  | Process command with nested records                |
| `SlaughterDomainService` | `ManualDesposteDomainService` | Pure domain logic, plan generation                 |
| `SlaughterUseCase`       | `ManualDesposteUseCase`       | @Transactional, multi-repo coordination            |
| `SlaughterController`    | `DesposteController`          | Single POST endpoint for the process               |
| `slaughter-process`      | `desposte-manual`             | Form with live calculations (yield%), mass display |
| `animal.service`         | `batch.service`               | httpResource for list, HttpClient for mutations    |
| `slaughter.service`      | `desposte.service`            | HttpClient for process POST                        |

## Process Flow

```
1. REGISTRO ANIMAL
   POST /api/v1/animals
   → Animal con status = RECEIVED

2. FAENA/SLAUGHTER
   POST /api/v1/slaughters
   → SlaughterDomainService:
     a. Valida animal RECEIVED
     b. Valida carcassWeight ≤ liveWeight
     c. Calcula yield% = carcass/live * 100
     d. Valida source_type (solo MANUAL por ahora)
     e. Crea Batch en CANAL warehouse (initialWeight = carcassWeight)
     f. Upsert InventoryStock en CANAL con producto materna prima
     g. Animal.status → SLAUGHTERED
     h. Slaughter.batchId = nuevo batch
   → Slaughter registrado + Lote creado en CANAL

3. DESPOSTE (Slice 1, existente)
   POST /api/v1/despostes/manual
   → Selecciona el batch del slaughter
   → Ejecuta desposte manual con MVM + Yield Costing
```

## Risk Assessment

| Risk                                                                                                                   | Severity | Mitigation                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Batch sin purchaseCost** — Slaughter crea batch con costo 0. Yield Costing requiere costo > 0.                       | HIGH     | Agregar `purchaseCost` al request de slaughter (campo opcional, default 0). El operador ingresa el costo del animal. Alternativa: modificar Yield Costing para aceptar costo 0 (distribución uniforme). |
| **Producto "materia prima" inexistente** — La faena crea stock de un producto genérico. Si no existe, falla.           | MEDIUM   | Crear producto "CANAL" como seed en V23 o verificar existencia en V20. Usar category CARNICO, is_transformable=true.                                                                                    |
| **Concurrencia** — Dos operadores faenando el mismo animal.                                                            | LOW      | UNIQUE en slaughters.animal_id + @Transactional garantiza atomicidad. El segundo request recibe 409 Conflict mapeado a BusinessException.                                                               |
| **Yield atípico** — Operador ingresa mal el peso en canal.                                                             | LOW      | Warning visual en frontend (verde/amarillo según rango típico). No bloquea submit (dominio solo valida > 0 y ≤ 100%).                                                                                   |
| **Cambio en BatchUseCase.create()** — Valida warehouse.type == CANAL. Nuestro slaughter también usa CANAL, compatible. | LOW      | Sin riesgo. La validación existente nos beneficia.                                                                                                                                                      |

## Implementation Order

| #                                      | Qué                                                            | Capa        | Depende de |
| -------------------------------------- | -------------------------------------------------------------- | ----------- | ---------- |
| 1                                      | Flyway V23: animals table                                      | DB          | —          |
| 2                                      | Domain: Animal record + AnimalRepository port                  | Domain      | 1          |
| 3                                      | Infrastructure: AnimalEntity, Mapper, JPA, Adapter             | Infra       | 2          |
| 4                                      | Application: AnimalUseCase, DTOs                               | App         | 3          |
| 5                                      | Controller: AnimalController                                   | Infra REST  | 4          |
| 6                                      | Frontend: Animal model, service, list + form                   | Frontend    | 5          |
| 7                                      | Route + menu item for animales                                 | Frontend    | 6          |
| **HITO 1: Animal CRUD funcional** ✅   |                                                                |             |
| 8                                      | Flyway V24: slaughters table                                   | DB          | 1          |
| 9                                      | Domain: Slaughter, SlaughterDomainService, SlaughterRepository | Domain      | 8          |
| 10                                     | Infrastructure: SlaughterEntity, Mapper, JPA, Adapter          | Infra       | 9          |
| 11                                     | Application: SlaughterUseCase, DTOs                            | App         | 10         |
| 12                                     | Controller: SlaughterController                                | Infra REST  | 11         |
| 13                                     | Frontend: Slaughter model, service                             | Frontend    | 12         |
| 14                                     | Frontend: Slaughter process screen                             | Frontend    | 13         |
| 15                                     | Route + menu item for faena                                    | Frontend    | 14         |
| **HITO 2: Slaughter E2E funcional** ✅ |                                                                |             |
| 16                                     | Verify desposte works on slaughter-generated batch             | Integration | 15         |

## Key Design Decisions

1. **1 Animal = 1 Slaughter = 1 Batch**: UNIQUE constraints enforced at DB level. No multi-animal batches in this slice.
2. **Source type**: Only MANUAL is functional now. AUTOMATIC is defined in model but rejected at controller level with clear error. UI shows AUTOMATIC as disabled with tooltip "Próximamente (Web Serial API)".
3. **purchaseCost for slaughter batch**: Field added to SlaughterRequest as optional (`@DecimalMin("0")`). When > 0, propagated to Batch. When 0, batch is created with costo 0 — usable for desposte if Yield Costing is updated to handle zero cost (uniform distribution) OR the operator MUST input the animal cost.
4. **CANAL warehouse auto-selection**: SlaughterUseCase queries the first active warehouse with type=CANAL. If none exists, throws BusinessException. No warehouse selection in the slaughter form.
5. **Roles**: CARNICERO can create animals and execute slaughters. ADMIN everything. AUXILIAR read-only.

## Ready for Proposal

**Yes**. All entities, contracts, patterns, and risks are identified. The implementation order is laid out. The only open design decision is the purchaseCost handling (risk #1), which can be resolved during the design phase (sdd-design).
