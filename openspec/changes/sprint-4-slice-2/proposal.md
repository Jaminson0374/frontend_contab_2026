# Proposal: Registro Animal (ICA/INVIMA) + Slaughter/Faena

## Intent

Add the animal registration and slaughter process that PRECEDES the desposte in the meat-plant workflow. Today, batches are created manually in CANAL warehouse with no upstream traceability. This slice enables the full chain: Animal Reception → Slaughter → Batch in CANAL → Desposte.

## Scope

### In Scope

- Animal CRUD: list, create, edit with ICA lot number, supplier, species, live weight, status (RECEIVED→IN_SLAUGHTER→SLAUGHTERED)
- Slaughter process: POST endpoint that validates animal, records carcass weight, computes yield%, generates a Batch in CANAL warehouse, upserts stock
- Frontend: Animal list/form screens and Slaughter process screen with live yield calculation
- Flyway migrations V23 (animals) and V24 (slaughters)
- Menu + routing: `/inventario/animales` and `/inventario/faena`
- Role access: CARNICERO full access, ADMIN full, AUXILIAR read-only

### Out of Scope

- AUTOMATIC source type (Web Serial API integration — deferred to future slice)
- Multi-animal batches (1 Animal = 1 Slaughter = 1 Batch enforced)
- INVIMA/Dian electronic certificate upload
- Animal purchase/supplier invoice registration and costing integration

## Approach

**Two-phase process (Approach A)** matching real meat-plant workflow:

| Phase               | Pattern                 | Backend                                   | Frontend                 |
| ------------------- | ----------------------- | ----------------------------------------- | ------------------------ |
| Animal registration | CRUD (like Batch)       | AnimalUseCase + AnimalController          | animal-list, animal-form |
| Slaughter execution | Process (like Desposte) | SlaughterDomainService + SlaughterUseCase | slaughter-process screen |

**Flow**: `POST /animals` → Animal(RECEIVED) → `POST /slaughters` → Batch(CANAL) + Stock.upsert → Animal→SLAUGHTERED

**Key design decisions**:

- 1:1:1 relationship enforced via DB UNIQUE constraints (Animal→Slaughter→Batch)
- Only MANUAL source type functional; AUTOMATIC rejected with clear error
- CANAL warehouse auto-selected (first active type=CANAL)

## Dependencies

- **Slice 1 (COMPLETED)**: Desposte manual with MVM, Yield Costing, batch closure. Slaughter-generated batches flow into existing desposte.
- **ThirdParties module**: Supplier dropdown uses existing `/suppliers` endpoint
- **Warehouses**: CANAL type must exist (seed or created by operator)

## Risks

| Risk                                                       | Severity | Mitigation                                                                                                                                                         |
| ---------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Slaughter batch has purchaseCost=0, breaking Yield Costing | **HIGH** | SlaughterRequest includes optional `purchaseCost` field. Operator inputs live animal cost. Propagation test (task #16) verifies desposte works on slaughter batch. |
| "Materia prima" product missing                            | MEDIUM   | Create CANAL product as seed in V23 (category CARNICO, is_transformable=true)                                                                                      |
| Concurrent slaughter of same animal                        | LOW      | UNIQUE on slaughters.animal_id → 409 Conflict on duplicate                                                                                                         |

## Rollback

1. Delete V24 + V23 Flyway migrations, run Flyway repair
2. Revert feature routes in `app.routes.ts`
3. Remove menu items from `shell.ts`
4. Drop `animals` and `slaughters` tables if already applied

## Success Criteria

- [ ] Animal CRUD: create, list, edit, status transitions visually confirmed
- [ ] Slaughter: select RECEIVED animal → input carcass weight → batch created in CANAL → animal status SLAUGHTERED
- [ ] Desposte compatibility: slaughter-generated batch can be selected and desposte runs successfully
- [ ] Yield% computed correctly and displayed in slaughter form
- [ ] Error: duplicate slaughter on same animal returns user-friendly error
- [ ] Menu items visible under Inventarios for roles CARNICERO and ADMIN
