# Sprint 4 Slice 2 — Documento Consolidado

**Cambio**: Registro Animal (ICA/INVIMA) + Faena/Slaughter
**Estado**: ✅ COMPLETO (Frontend + Backend)
**Última actualización**: 2026-05-17T17:00

---

## 1. Exploration

### Current State (post-Slice 1)

- **Batches**: CRUD completo con status OPEN|PROCESSING|CLOSED
- **ThirdParties**: CRUD completo con type CLIENT|SUPPLIER|BOTH
- **Warehouses**: CANAL, CORTES, VISCERAS, EMBUTIDOS, DECOMISOS, GENERAL
- **Desposte manual**: Proceso completo con MVM (0.5%), Yield Costing, cierre de lote
- **No existen tablas** `animals` ni `slaughters`
- **Menú lateral** no incluye "Registro Animal" ni "Faena"

### Approach: Two-phase (Animal registration → Slaughter)

Flujo: `POST /animals` → Animal(RECEIVED) → `POST /slaughters` → Batch(CANAL) + Stock → Animal(SLAUGHTERED) → Desposte

---

## 2. Proposal

### Intent

Add animal registration and slaughter process that PRECEDES desposte. Enables full chain: Animal Reception → Slaughter → Batch in CANAL → Desposte.

### Scope

| Phase       | Backend                                   | Frontend                 |
| ----------- | ----------------------------------------- | ------------------------ |
| Animal CRUD | AnimalUseCase + AnimalController          | animal-list, animal-form |
| Slaughter   | SlaughterDomainService + SlaughterUseCase | faena/slaughter-form     |

**Out of Scope**: Web Serial API, multi-animal batches, INVIMA certificates, purchase invoices

### Risks

| Risk                                        | Severity | Mitigation                                       |
| ------------------------------------------- | -------- | ------------------------------------------------ |
| Batch sin purchaseCost → Yield Costing roto | HIGH     | purchaseCost MANDATORIO (>0) en SlaughterRequest |
| Producto "CANAL" inexistente                | MEDIUM   | Seed en V23                                      |
| Concurrent slaughter of same animal         | LOW      | UNIQUE constraint + @Transactional               |

### Success Criteria

- [x] Animal CRUD: create, list, edit, status transitions
- [x] Slaughter: RECEIVED animal → carcass weight → batch CANAL → SLAUGHTERED
- [x] Desposte compatibility: slaughter batch → desposte runs
- [x] Yield% computed and displayed in slaughter form
- [x] Error: duplicate slaughter → user-friendly error
- [x] Menu items visible for CARNICERO and ADMIN

---

## 3. Specification

### R-001: Animal Registration

Register animals with unique ICA lot number, supplier FK, species (PORCINO|BOVINO|OVINO), live weight (>0). Status defaults to RECEIVED.

**Scenarios**:

- ✅ Register valid animal → 201 with animal ID
- ✅ Duplicate ICA lot → 409 ICA_LOT_DUPLICATE

### R-002: Slaughter Execution

Transactional unit: validate RECEIVED, record carcass weight, compute yield%, create CANAL batch + stock, transition to SLAUGHTERED. 1:1:1 enforced via DB UNIQUE.

**Scenarios**:

- ✅ Happy path → batch created, stock upserted, animal SLAUGHTERED
- ✅ Double-slaughter → 409 ANIMAL_ALREADY_SLAUGHTERED

### R-003: Slaughter Validation

carcassWeight > 0, ≤ liveWeight, yield% = (carcass/live)\*100, animal must be RECEIVED.

**Scenarios**:

- ✅ Carcass > live → 422 CARCASS_EXCEEDS_LIVE_WEIGHT
- ✅ Zero/negative carcass → 422 INVALID_CARCASS_WEIGHT

### R-004: Source Type Gate

Only MANUAL functional. AUTOMATIC rejected. MANUAL requires non-blank justification.

**Scenarios**:

- ✅ MANUAL with justification → proceeds
- ✅ MANUAL without justification → 422 MANUAL_JUSTIFICATION_REQUIRED
- ✅ AUTOMATIC → 422 AUTOMATIC_SOURCE_NOT_AVAILABLE

### R-005: CANAL Batch and Stock

Auto-select first active CANAL warehouse. Create batch with initialWeight=carcassWeight, supplierId from animal. Upsert stock for product "CANAL".

**Scenarios**:

- ✅ Batch + stock created → response includes batchId
- ✅ No CANAL warehouse → 422 CANAL_WAREHOUSE_NOT_FOUND

### R-006: Animal Status Lifecycle

RECEIVED → IN_SLAUGHTER → SLAUGHTERED. SLAUGHTERED is terminal.

**Scenarios**:

- ✅ Normal transition → status progresses
- ✅ Edit after SLAUGHTERED → 409 ANIMAL_ALREADY_SLAUGHTERED

---

## 4. Design

### Architecture Decisions

| Decision           | Choice              | Rationale                           |
| ------------------ | ------------------- | ----------------------------------- |
| purchaseCost       | **Mandatory (>0)**  | Prevents broken desposte downstream |
| CANAL warehouse    | **Auto-select**     | Eliminates UI complexity            |
| Status enforcement | **Domain level**    | Keeps domain pure                   |
| Source type        | **Only MANUAL now** | AUTOMATIC returns clear error       |

### Data Flow

```
POST /api/v1/slaughters { animalId, sourceType=MANUAL, justification, carcassWeight, purchaseCost }
  ├─1─ AnimalRepository.findById(animalId) → animal (must be RECEIVED)
  ├─2─ SlaughterDomainService.validate() → yield%, BusinessException if invalid
  ├─3─ WarehouseRepository.findFirstActiveByType(CANAL) → canalWarehouse
  ├─4─ ProductRepository.findByCode("CANAL") → canalProduct
  ├─5─ BatchRepository.save(Batch) → new batch (OPEN)
  ├─6─ StockRepository.save(InventoryStock) → stock upsert
  ├─7─ SlaughterRepository.save(Slaughter)
  ├─8─ AnimalRepository.save(animal.withStatus(SLAUGHTERED))
  └─→ SlaughterResponse { batchId, yield%, ... }
```

### Technical Patterns (Copy-From)

| New                    | Pattern to Copy             |
| ---------------------- | --------------------------- |
| Animal record          | Batch / ThirdParty          |
| AnimalUseCase          | BatchUseCase                |
| AnimalController       | BatchController             |
| animal-list            | batch-list                  |
| animal-form            | batch-form                  |
| Slaughter record       | ManualDespostePlan.Command  |
| SlaughterDomainService | ManualDesposteDomainService |
| SlaughterUseCase       | ManualDesposteUseCase       |
| SlaughterController    | DesposteController          |
| faena page             | desposte-manual             |
| animal.service         | batch.service               |
| slaughter.service      | desposte.service            |

### Backend Files (25 files)

| #   | File                                                             | Action |
| --- | ---------------------------------------------------------------- | ------ |
| 1   | `domain/model/Animal.java`                                       | Create |
| 2   | `domain/repository/AnimalRepository.java`                        | Create |
| 3   | `domain/model/Slaughter.java`                                    | Create |
| 4   | `domain/repository/SlaughterRepository.java`                     | Create |
| 5   | `domain/service/SlaughterDomainService.java`                     | Create |
| 6   | `application/dto/AnimalRequest.java`                             | Create |
| 7   | `application/dto/AnimalResponse.java`                            | Create |
| 8   | `application/usecase/AnimalUseCase.java`                         | Create |
| 9   | `application/dto/SlaughterRequest.java`                          | Create |
| 10  | `application/dto/SlaughterResponse.java`                         | Create |
| 11  | `application/usecase/ProcessSlaughterUseCase.java`               | Create |
| 12  | `infrastructure/.../persistence/AnimalEntity.java`               | Create |
| 13  | `infrastructure/.../persistence/AnimalJpaRepository.java`        | Create |
| 14  | `infrastructure/.../persistence/AnimalMapper.java`               | Create |
| 15  | `infrastructure/.../persistence/AnimalRepositoryAdapter.java`    | Create |
| 16  | `infrastructure/.../rest/AnimalController.java`                  | Create |
| 17  | `infrastructure/.../persistence/SlaughterEntity.java`            | Create |
| 18  | `infrastructure/.../persistence/SlaughterJpaRepository.java`     | Create |
| 19  | `infrastructure/.../persistence/SlaughterMapper.java`            | Create |
| 20  | `infrastructure/.../persistence/SlaughterRepositoryAdapter.java` | Create |
| 21  | `infrastructure/.../rest/SlaughterController.java`               | Create |
| 22  | `db/migration/V23__create_animals.sql`                           | Create |
| 23  | `db/migration/V24__create_slaughters.sql`                        | Create |
| 24  | `domain/repository/WarehouseRepository.java`                     | Modify |
| 25  | `infrastructure/.../persistence/WarehouseJpaRepository.java`     | Modify |
| 26  | `infrastructure/.../persistence/WarehouseRepositoryAdapter.java` | Modify |

### Frontend Files (14 files) ✅ COMPLETO

| #     | File                                         | Status |
| ----- | -------------------------------------------- | ------ |
| 1     | `core/models/animal.model.ts`                | ✅     |
| 2     | `core/models/slaughter.model.ts`             | ✅     |
| 3     | `core/services/animal.service.ts`            | ✅     |
| 4     | `core/services/slaughter.service.ts`         | ✅     |
| 5-7   | `features/inventario/animales/animal-list/*` | ✅     |
| 8-9   | `features/inventario/animales/animal-form/*` | ✅     |
| 10-12 | `features/inventario/animales/faena/*`       | ✅     |
| 13    | `app.routes.ts` (modify)                     | ✅     |
| 14    | `layout/shell/shell.ts` (modify)             | ✅     |

---

## 5. Tasks

### Hito 1: Animal CRUD funcional

| #    | Task                                            | Layer       | Dependencies |
| ---- | ----------------------------------------------- | ----------- | ------------ |
| 1.1  | V23\_\_create_animals.sql                       | DB          | —            |
| 2.1  | Animal.java (record)                            | Domain      | 1.1          |
| 2.2  | AnimalRepository.java (port)                    | Domain      | 2.1          |
| 3.1  | AnimalRequest.java + AnimalResponse.java (DTOs) | Application | 2.1          |
| 3.2  | AnimalUseCase.java (@Service CRUD)              | Application | 3.1          |
| 4.1  | AnimalEntity.java                               | Infra       | 2.1          |
| 4.2  | AnimalJpaRepository + Mapper + Adapter          | Infra       | 4.1          |
| 4.3  | AnimalController.java (@RestController)         | Infra REST  | 3.2, 4.2     |
| 5.1  | WarehouseRepository + JPA + Adapter changes     | Modify      | —            |
| 9.1  | animal.model.ts                                 | Frontend    | 4.3          |
| 9.3  | animal.service.ts                               | Frontend    | 9.1          |
| 10.1 | animal-list (3 files)                           | Frontend    | 9.3          |
| 10.2 | animal-form (2 files)                           | Frontend    | 9.3          |
| 11.1 | app.routes.ts (animales routes)                 | Frontend    | 10.1         |
| 11.2 | shell.ts (menu item)                            | Frontend    | 10.1         |

### Hito 2: Slaughter E2E funcional

| #     | Task                                           | Layer       | Dependencies  |
| ----- | ---------------------------------------------- | ----------- | ------------- |
| 1.2   | V24\_\_create_slaughters.sql                   | DB          | 1.1           |
| 6.1   | Slaughter.java (record)                        | Domain      | 1.2           |
| 6.2   | SlaughterRepository.java (port)                | Domain      | 6.1           |
| 6.3   | SlaughterDomainService.java                    | Domain      | 6.1, 2.1      |
| 7.1   | SlaughterRequest.java + SlaughterResponse.java | Application | 6.1           |
| 7.2   | ProcessSlaughterUseCase.java (@Transactional)  | Application | 7.1, 6.3, 5.1 |
| 8.1   | SlaughterEntity.java                           | Infra       | 6.1           |
| 8.2   | SlaughterMapper + JPA + Adapter                | Infra       | 8.1           |
| 8.3   | SlaughterController.java (@RestController)     | Infra REST  | 7.2, 8.2      |
| 9.2   | slaughter.model.ts                             | Frontend    | 7.1           |
| 9.4   | slaughter.service.ts                           | Frontend    | 9.2           |
| 10.3  | faena page (3 files)                           | Frontend    | 9.4           |
| 11.2b | shell.ts (faena route — included above)        | Frontend    | —             |
| 16    | Verify desposte on slaughter batch             | Integration | All           |

---

## 6. Estado Actual (2026-05-17)

### ✅ Frontend — COMPLETO (14/14 archivos)

- Modelos, servicios, 3 componentes, rutas, menú
- `tsc --noEmit` pasa sin errores

### ✅ Backend — COMPLETO (26/26 archivos)

- 20 archivos nuevos, 3 modificaciones, 2 migraciones Flyway, 1 seed
- SlaughterDomainService con todas las validaciones (RECEIVED gate, weight bounds, source type)
- ProcessSlaughterUseCase @Transactional con 9-step flow
- CANAL product seed en V23, UNIQUE constraints en V24

### Desviaciones del diseño

- V24 slaughters tiene campos adicionales: `slaughter_date`, `invima_plant`, `inspector_id FK` — más completos que el diseño original
- `justification` es VARCHAR(300) en vez de VARCHAR(500) — aceptable
