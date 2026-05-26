# Design: Registro Animal + Slaughter (Sprint 4, Slice 2)

## Technical Approach

Two-phase process mirroring the meat plant: **Animal CRUD** (register incoming animals) → **Slaughter execution** (faena creates a CANAL batch). Phase 1 copies the `Batch` CRUD pattern (10 files per layer). Phase 2 copies the `ManualDesposteDomainService + ManualDesposteUseCase` process pattern. All-or-nothing transaction: create batch → upsert stock → persist slaughter → close animal.

## Architecture Decisions

| Decision                         | Options                                                         | Tradeoff                                                                                                                                                                           | Choice                                                                                                    |
| -------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| purchaseCost on SlaughterRequest | A: Mandatory (>0) B: Optional default 0                         | A prevents broken desposte downstream (Yield Costing requires costo>0), operator forced to input cost. B requires modifying Slice 1 code to handle zero-cost uniform distribution. | **A (Mandatory)** — simpler, no regression risk on completed Slice 1                                      |
| CANAL warehouse resolution       | A: Auto-select first active CANAL B: UI picker                  | A eliminates UI complexity, slaughter is always CANAL. B adds flexibility but overkill.                                                                                            | **A** — Query `findFirstByActiveTrueAndWarehouseType(CANAL)`                                              |
| Animal status enforcement        | A: Enforce at domain level B: Enforce at controller             | A keeps domain pure. B couples validation to HTTP layer.                                                                                                                           | **A** — `SlaughterDomainService.ensureProcessableAnimal(animal)` throws BusinessException if not RECEIVED |
| Slaughter source type            | A: Only MANUAL functional now B: Both MANUAL/AUTOMATIC in model | A: AUTOMATIC returns clear error "Próximamente (Web Serial API)". B adds dead fields.                                                                                              | **A** — Model defines both; domain service rejects AUTOMATIC                                              |

## Data Flow

```
POST /api/v1/slaughters  { animalId, sourceType=MANUAL, justification, carcassWeight, purchaseCost }
         │
         ▼
ProcessSlaughterUseCase.process(request)  [@Transactional]
  │
  ├─1─ AnimalRepository.findById(animalId)                               → animal (must be RECEIVED)
  ├─2─ SlaughterDomainService.validate(animal, carcassWeight, purchaseCost)
  │      → yield% = carcassWeight / animal.liveWeight * 100
  │      → BusinessException if: animal SLAUGHTERED, carcassWeight>liveWeight, sourceType!=MANUAL
  │
  ├─3─ WarehouseRepository.findFirstActiveByType(CANAL)                  → canalWarehouse
  ├─4─ ProductRepository.findByCode("CANAL")                             → canalProduct
  │                                                                (seed in V23)
  ├─5─ BatchRepository.save(new Batch(..., canalWarehouse, carcassWeight, purchaseCost, OPEN))
  ├─6─ StockRepository.save(new InventoryStock(canalProduct, newBatch, canalWarehouse, carcassWeight, ...))
  ├─7─ SlaughterRepository.save(new Slaughter(animalId, newBatch.id, yield%, ...))
  ├─8─ AnimalRepository.save(animal.withStatus(SLAUGHTERED))
  │
         ▼
  SlaughterResponse { batchId, yield%, massBalance, ... }
```

## File Changes

### Backend (20 files)

| File                                                             | Action | Description                                                                                                                         |
| ---------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `domain/model/Animal.java`                                       | Create | Record: id, supplierId, icaLotNumber, species(enum), liveWeight, status(enum), notes, createdAt                                     |
| `domain/repository/AnimalRepository.java`                        | Create | Port: findByStatus, findById, save, findAll paginated                                                                               |
| `domain/model/Slaughter.java`                                    | Create | Record: id, animalId, batchId, sourceType(enum), carcassWeight, liveWeight, yieldPct, justification, purchaseCost, notes, createdAt |
| `domain/repository/SlaughterRepository.java`                     | Create | Port: save, findById, findByAnimalId                                                                                                |
| `domain/service/SlaughterDomainService.java`                     | Create | Pure validation: ensure animal RECEIVED, carcassWeight ≤ liveWeight, sourceType=MANUAL, yield% calculation                          |
| `application/dto/AnimalRequest.java`                             | Create | Record: supplierId, icaLotNumber, species, liveWeight, notes — jakarta validation                                                   |
| `application/dto/AnimalResponse.java`                            | Create | Record with static `from(Animal)` factory                                                                                           |
| `application/usecase/AnimalUseCase.java`                         | Create | `@Service`: CRUD, status filtering (copy BatchUseCase)                                                                              |
| `application/dto/SlaughterRequest.java`                          | Create | Record: animalId, sourceType, justification, carcassWeight, purchaseCost (>0), notes                                                |
| `application/dto/SlaughterResponse.java`                         | Create | Record: id, animalId, batchId, yieldPct, carcassWeight, liveWeight, createdAt                                                       |
| `application/usecase/ProcessSlaughterUseCase.java`               | Create | `@Service @Transactional`: orchestrates 8-step flow                                                                                 |
| `infrastructure/.../persistence/AnimalEntity.java`               | Create | JPA with @PrePersist/@PreUpdate (copy BatchEntity)                                                                                  |
| `infrastructure/.../persistence/AnimalJpaRepository.java`        | Create | Spring Data: findByStatus, extends JpaRepository                                                                                    |
| `infrastructure/.../persistence/AnimalMapper.java`               | Create | MapStruct @Mapper(componentModel="spring")                                                                                          |
| `infrastructure/.../persistence/AnimalRepositoryAdapter.java`    | Create | Implements AnimalRepository, delegates to JPA+Mapper                                                                                |
| `infrastructure/.../rest/AnimalController.java`                  | Create | GET/POST/PATCH on /api/v1/animals, @PreAuthorize                                                                                    |
| `infrastructure/.../persistence/SlaughterEntity.java`            | Create | JPA with @PrePersist/@PreUpdate                                                                                                     |
| `infrastructure/.../persistence/SlaughterJpaRepository.java`     | Create | Spring Data JPA                                                                                                                     |
| `infrastructure/.../persistence/SlaughterMapper.java`            | Create | MapStruct                                                                                                                           |
| `infrastructure/.../persistence/SlaughterRepositoryAdapter.java` | Create | Adapter                                                                                                                             |
| `infrastructure/.../rest/SlaughterController.java`               | Create | POST /api/v1/slaughters, @PreAuthorize(ADMIN, CARNICERO)                                                                            |
| `db/migration/V23__create_animals.sql`                           | Create | CREATE TABLE animals + species_enum + animal_status_enum + seed CANAL product                                                       |
| `db/migration/V24__create_slaughters.sql`                        | Create | CREATE TABLE slaughters + UNIQUE(animal_id) + FKs                                                                                   |
| `domain/repository/WarehouseRepository.java`                     | Modify | Add `findFirstActiveByType(WarehouseType)`                                                                                          |
| `infrastructure/.../persistence/WarehouseJpaRepository.java`     | Modify | Add query method `findFirstByWarehouseTypeAndActiveTrue`                                                                            |
| `infrastructure/.../persistence/WarehouseRepositoryAdapter.java` | Modify | Implement new port method                                                                                                           |

### Frontend (12 files)

| File                                                   | Action | Description                                                                                                                                       |
| ------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core/models/animal.model.ts`                          | Create | Interface: Animal, AnimalRequest, AnimalStatus, Species                                                                                           |
| `core/models/slaughter.model.ts`                       | Create | Interface: Slaughter, SlaughterRequest, SlaughterResponse                                                                                         |
| `core/services/animal.service.ts`                      | Create | httpResource for paginated list, HttpClient for mutations (copy batch.service)                                                                    |
| `core/services/slaughter.service.ts`                   | Create | HttpClient POST for slaughter process (copy desposte.service)                                                                                     |
| `features/inventario/registro-animal/animal-list/*`    | Create | 3 files: ts (mat-table, status filter, dialog form), html, css (copy batch-list)                                                                  |
| `features/inventario/registro-animal/animal-form/*`    | Create | 3 files: ts (ReactiveForms, supplier autocomplete), html, css (copy batch-form)                                                                   |
| `features/inventario/registro-animal/slaughter-form/*` | Create | 3 files: ts (animal selector, carcass weight, live yield calc, submit), html, css (simplified desposte-manual)                                    |
| `app.routes.ts`                                        | Modify | Add routes: `/inventario/registro-animal` (list), `/inventario/registro-animal/nuevo` (form), `/inventario/registro-animal/:id/faena` (slaughter) |
| `layout/shell/shell.ts`                                | Modify | Add `Registro animal` nav child under Inventarios module                                                                                          |

## Interfaces / Contracts

### SlaughterRequest (required field for purchaseCost)

```java
public record SlaughterRequest(
    @NotNull UUID animalId,
    @NotNull SlaughterSourceType sourceType,
    @NotBlank @Size(max=500) String manualJustification,
    @NotNull @DecimalMin("0.001") BigDecimal carcassWeight,
    @NotNull @DecimalMin("0.001") BigDecimal purchaseCost,  // MANDATORY — desposte's Yield Costing requires >0
    @Size(max=500) String notes
) {}
```

### V24 slaughters table constraints

```sql
CONSTRAINT uq_slaughter_animal UNIQUE(animal_id)  -- 1:1 guarantee
```

## Testing Strategy

| Layer       | What                                                                           | How                                                                           |
| ----------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Unit        | `SlaughterDomainService` validation (RECEIVED gate, weight bounds, yield calc) | JUnit 5, pure unit — no Spring                                                |
| Unit        | `AnimalUseCase` CRUD with repository mocks                                     | Mockito, verify pagination and FK validation                                  |
| Integration | `ProcessSlaughterUseCase` full transaction                                     | @SpringBootTest with @Transactional, verify all-or-nothing rollback           |
| E2E         | Slaughter form → batch appears in CANAL → desposte works                       | Playwright: register animal → slaughter → verify batch list → desposte manual |
| Unit        | `BatchUseCase.create` keeps working with slaughter-generated batch IDs         | Existing tests + integration                                                  |

## Migration / Rollout

1. Run V23 (animals table + CANAL product seed) + V24 (slaughters table)
2. Backend restart picks up new controllers
3. Frontend: menu item + routes appear for CARNICERO and ADMIN roles
4. Rollback: delete V24+V23, Flyway repair, revert routes/menu

## Open Questions

- None — all decisions resolved. The only design tradeoff (mandatory purchaseCost) prevents breaking desposte's Yield Costing.
