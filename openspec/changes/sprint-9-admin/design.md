# Design: Sprint 9 — Administración

## Technical Approach

Build the full administration module following existing hexagonal (backend) and standalone-signal (frontend) conventions. The five slices (Users/Roles, CompanyConfig, PUC, Prices, Audit) mount under a new `AdministracionLayoutComponent` at `/administracion`, protected by an ADMIN role guard. Backend writes are already guarded via `@PreAuthorize("hasRole('ADMIN')")`; the new frontend guard adds client-side redirect.

## Architecture Decisions

| #   | Decision                              | Option                                              | Tradeoff                                                                           | Choice                                                                                                                                                                      |
| --- | ------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Route structure for `/administracion` | A: Refactor dead AdminComponent                     | Deletes unused code but breaks nothing — it's not mounted anywhere                 | **B**: Create `AdministracionLayoutComponent` with MatTabs + routerLink + RouterOutlet                                                                                      |
|     |                                       | B: New layout component                             | Clean separation, follows InventarioComponent pattern but with tabs                |                                                                                                                                                                             |
|     |                                       | C: No shared layout                                 | Users lose tab navigation between admin sub-modules                                |                                                                                                                                                                             |
| 2   | adminGuard placement                  | A: Parent route only                                | One guard, all children protected. Simple, DRY                                     | **A**: Parent `/administracion` route only                                                                                                                                  |
|     |                                       | B: Each child individually                          | Redundant, error-prone if a child is forgotten                                     |                                                                                                                                                                             |
|     |                                       | C: Both                                             | Double checks waste cycles                                                         |                                                                                                                                                                             |
| 3   | CompanyConfig persistence             | Fixed id=1 upsert                                   | Breaks UUID convention but conceptually correct for singleton                      | **A**: Fixed `id=1` with `INSERT ... ON CONFLICT (id) DO UPDATE`                                                                                                            |
|     |                                       | Key-value pairs                                     | Over-complicates attribute access, no type safety                                  |                                                                                                                                                                             |
|     |                                       | JSONB column                                        | Loses type safety and indexability                                                 |                                                                                                                                                                             |
| 4   | AuditAspect                           | Hibernate interceptor                               | Couples audit to persistence layer                                                 | **B**: Spring AOP `@Around` on `@Auditable` annotated use case methods                                                                                                      |
|     |                                       | Spring AOP @Auditable                               | Captures business intent, clean separation. Proposal's stated approach             |                                                                                                                                                                             |
|     |                                       | Jackson DTO diff                                    | Only captures transport changes, misses domain logic                               |                                                                                                                                                                             |
| 5   | PUC tree endpoint                     | Flat list + parent_code                             | Backend stays simple, frontend handles display. Already have `parentCode` in model | **A**: `GET /api/v1/puc-accounts/tree` returns flat list with `parentCode`; frontend builds tree via `groupBy`                                                              |
|     |                                       | Backend nested tree                                 | Harder to paginate/filter                                                          |                                                                                                                                                                             |
|     |                                       | Indent levels                                       | Display concern in API is wrong                                                    |                                                                                                                                                                             |
| 6   | CustomPrices API                      | Separate `/api/v1/admin/custom-prices`              | Clean REST separation from price-lists                                             | **A**: Separate endpoint with `?clientId=&productId=` query params for filtering                                                                                            |
|     |                                       | Nested under price-lists                            | Custom prices ≠ price lists; confusing hierarchy                                   |                                                                                                                                                                             |
| 7   | User edit security                    | Editable: username, fullName, email, role, isActive | Password management is separate concern (out of scope)                             | Editable fields as specified; prevent self-deactivation; prevent removing ADMIN from last admin user                                                                        |
| 8   | Frontend service pattern              | Extend PucAccountService with write methods         | Reuse existing `httpResource` read paths; add `HttpClient` write methods           | **C**: Reuse PriceListService (full CRUD exists), extend PucAccountService with PUT/DELETE, create new services for users, roles, company-config, custom-prices, audit-logs |
|     |                                       | Separate admin services                             | Duplicates `httpResource` signal setup                                             |                                                                                                                                                                             |

## Data Model

### New Tables

**company_config** (V51)

```sql
CREATE TABLE company_config (
    id               BIGINT PRIMARY KEY DEFAULT 1,
    company_name     VARCHAR(255) NOT NULL,
    nit              VARCHAR(20)  NOT NULL,
    address          VARCHAR(255),
    phone            VARCHAR(30),
    email            VARCHAR(255),
    economic_activity VARCHAR(255),
    tax_regime       VARCHAR(100),
    currency         VARCHAR(3)   NOT NULL DEFAULT 'COP',
    main_warehouse_id UUID        REFERENCES warehouses(id),
    logo_url         VARCHAR(500),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CHECK (id = 1)
);
```

**audit_log** (V52)

```sql
CREATE TABLE audit_log (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type  VARCHAR(100) NOT NULL,
    entity_id    UUID,
    action       VARCHAR(10)  NOT NULL CHECK (action IN ('CREATE','UPDATE','DELETE')),
    field_name   VARCHAR(100),
    old_value    TEXT,
    new_value    TEXT,
    user_id      UUID         REFERENCES users(id),
    ip_address   VARCHAR(45),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user   ON audit_log(user_id);
CREATE INDEX idx_audit_date   ON audit_log(created_at);
```

### Modified Tables

None. All new tables.

## API Contract

### Slice 1: Users & Roles

| Method | Path                       | Auth  | Description                                   |
| ------ | -------------------------- | ----- | --------------------------------------------- |
| GET    | `/api/v1/admin/users`      | ADMIN | List all users (paginated)                    |
| POST   | `/api/v1/admin/users`      | ADMIN | Create user (username, email, fullName, role) |
| PUT    | `/api/v1/admin/users/{id}` | ADMIN | Edit user (excludes password)                 |
| GET    | `/api/v1/admin/roles`      | ADMIN | List roles (read-only)                        |

### Slice 2: Company Config

| Method | Path                           | Auth  | Description                       |
| ------ | ------------------------------ | ----- | --------------------------------- |
| GET    | `/api/v1/admin/company-config` | ADMIN | Fetch company config (single row) |
| PUT    | `/api/v1/admin/company-config` | ADMIN | Upsert company config (id=1)      |

### Slice 3: PUC Catalog

| Method | Path                        | Auth  | Description                          |
| ------ | --------------------------- | ----- | ------------------------------------ |
| GET    | `/api/v1/puc-accounts`      | Auth  | List all (existing)                  |
| GET    | `/api/v1/puc-accounts/tree` | Auth  | Flat tree with parentCode            |
| POST   | `/api/v1/puc-accounts`      | ADMIN | Create account (existing)            |
| PUT    | `/api/v1/puc-accounts/{id}` | ADMIN | Update account (**new**)             |
| DELETE | `/api/v1/puc-accounts/{id}` | ADMIN | Soft-delete (active=false) (**new**) |

### Slice 4: Prices

| Method | Path                               | Auth  | Description                                               |
| ------ | ---------------------------------- | ----- | --------------------------------------------------------- |
| GET    | `/api/v1/admin/custom-prices`      | ADMIN | List custom prices, filterable by `?clientId=&productId=` |
| POST   | `/api/v1/admin/custom-prices`      | ADMIN | Create custom price                                       |
| PUT    | `/api/v1/admin/custom-prices/{id}` | ADMIN | Update custom price                                       |
| DELETE | `/api/v1/admin/custom-prices/{id}` | ADMIN | Delete custom price                                       |
| \*     | `/api/v1/price-lists`              | mixed | Existing CRUD (reused as-is)                              |

### Slice 5: Audit Log

| Method | Path                       | Auth  | Description                                                             |
| ------ | -------------------------- | ----- | ----------------------------------------------------------------------- |
| GET    | `/api/v1/admin/audit-logs` | ADMIN | List audit logs, filterable by `?entityType=&userId=&action=&from=&to=` |

## Component Tree (Frontend)

```
AdministracionLayoutComponent          (features/admin/administracion/)
├── [tab] Usuarios y roles
│   ├── UserListComponent              (features/admin/users/)
│   ├── UserFormComponent              (features/admin/users/)
│   └── RoleListComponent              (features/admin/roles/)
├── [tab] Config. de empresa
│   └── CompanyFormComponent           (features/admin/company/)
├── [tab] Catálogo PUC
│   ├── PucListComponent               (features/admin/puc/)
│   └── PucFormComponent               (features/admin/puc/)
├── [tab] Config. de precios
│   ├── PriceListAdminComponent        (features/admin/prices/) — wraps existing PriceListListComponent
│   ├── CustomPriceListComponent       (features/admin/prices/)
│   └── CustomPriceFormComponent       (features/admin/prices/)
└── [tab] Auditoría
    └── AuditLogListComponent          (features/admin/audit/)
```

## File List (per slice)

### Slice 1: Users & Roles (Backend: 6 files, Frontend: 5 files)

| File                                          | Action | Description                                                       |
| --------------------------------------------- | ------ | ----------------------------------------------------------------- |
| `domain/model/User.java`                      | Create | User domain record                                                |
| `domain/repository/UserRepository.java`       | Create | Repository port                                                   |
| `infrastructure/.../UserJpaRepository.java`   | Create | JPA repo (users table exists)                                     |
| `application/usecase/UserUseCase.java`        | Create | CRUD + security rules                                             |
| `application/dto/UserRequest.java`            | Create | DTO                                                               |
| `application/dto/UserResponse.java`           | Create | DTO                                                               |
| `infrastructure/.../rest/UserController.java` | Create | REST endpoints                                                    |
| `infrastructure/.../rest/RoleController.java` | Create | Read-only roles                                                   |
| `core/auth/admin.guard.ts`                    | Create | Functional guard: `userRole() === 'ADMIN'`                        |
| `features/admin/administracion/`              | Create | Layout component + template + CSS                                 |
| `features/admin/users/user-list.ts`           | Create | MatTable + pagination                                             |
| `features/admin/users/user-form.ts`           | Create | ReactiveForm, role selector                                       |
| `features/admin/roles/role-list.ts`           | Create | Read-only MatTable                                                |
| `core/services/user.service.ts`               | Create | Admin user service                                                |
| `core/models/user.model.ts`                   | Modify | Add `email`, `isActive` to User interface                         |
| `app.routes.ts`                               | Modify | Add `/administracion` route with adminGuard + 5 children          |
| `layout/shell/shell.ts`                       | Modify | Unlock 4 admin items + add "Catálogo PUC", remove `disabled:true` |

### Slice 2: Company Config (Backend: 7 files, Frontend: 2 files)

| File                                                     | Action | Description           |
| -------------------------------------------------------- | ------ | --------------------- |
| `domain/model/CompanyConfig.java`                        | Create | Domain record         |
| `domain/repository/CompanyConfigRepository.java`         | Create | Repository port       |
| `infrastructure/.../CompanyConfigEntity.java`            | Create | JPA entity            |
| `infrastructure/.../CompanyConfigJpaRepository.java`     | Create | JPA repo              |
| `infrastructure/.../CompanyConfigRepositoryAdapter.java` | Create | Adapter               |
| `application/usecase/CompanyConfigUseCase.java`          | Create | GET + PUT upsert      |
| `infrastructure/.../rest/CompanyConfigController.java`   | Create | REST endpoints        |
| `db/migration/V51__create_company_config.sql`            | Create | Migration             |
| `features/admin/company/company-form.ts`                 | Create | Single form, no table |
| `core/services/company-config.service.ts`                | Create | HTTP service          |

### Slice 3: PUC Catalog (Backend: 1 file modified, Frontend: 3 files)

| File                                                | Action | Description                                                    |
| --------------------------------------------------- | ------ | -------------------------------------------------------------- |
| `application/usecase/PucAccountUseCase.java`        | Modify | Add `update()`, `deactivate()` (soft-delete), `tree()` methods |
| `infrastructure/.../rest/PucAccountController.java` | Modify | Add PUT, DELETE, GET `/tree` endpoints                         |
| `core/services/puc-account.service.ts`              | Modify | Add write methods (create, update, deactivate) + tree          |
| `features/admin/puc/puc-list.ts`                    | Create | Hierarchical MatTable with expand/collapse                     |
| `features/admin/puc/puc-form.ts`                    | Create | PUC account create/edit form                                   |

### Slice 4: Price Configuration (Backend: 5 files, Frontend: 5 files)

| File                                                   | Action | Description                                       |
| ------------------------------------------------------ | ------ | ------------------------------------------------- |
| `application/usecase/CustomPriceUseCase.java`          | Create | CRUD + filtering                                  |
| `application/dto/CustomPriceRequest.java`              | Create | DTO                                               |
| `application/dto/CustomPriceResponse.java`             | Create | DTO                                               |
| `infrastructure/.../rest/CustomPriceController.java`   | Create | REST endpoints                                    |
| `domain/repository/CustomPriceRepository.java`         | Modify | Add save, delete, findAll, findById               |
| `infrastructure/.../CustomPriceRepositoryAdapter.java` | Modify | Implement new methods                             |
| `core/services/custom-price.service.ts`                | Create | HTTP service                                      |
| `core/models/custom-price.model.ts`                    | Create | TypeScript interfaces                             |
| `features/admin/prices/price-list-admin.ts`            | Create | Wraps existing price-list-list with admin context |
| `features/admin/prices/custom-price-list.ts`           | Create | MatTable: client, product, price, tax             |
| `features/admin/prices/custom-price-form.ts`           | Create | ReactiveForm with client/product selectors        |

### Slice 5: Audit (Backend: 5 new + ~8 modified, Frontend: 2 files)

| File                                                | Action | Description                         |
| --------------------------------------------------- | ------ | ----------------------------------- |
| `domain/model/AuditLog.java`                        | Create | Domain record                       |
| `domain/repository/AuditLogRepository.java`         | Create | Repository port                     |
| `infrastructure/.../AuditLogEntity.java`            | Create | JPA entity                          |
| `infrastructure/.../AuditLogJpaRepository.java`     | Create | JPA repo                            |
| `infrastructure/.../AuditLogRepositoryAdapter.java` | Create | Adapter                             |
| `infrastructure/aop/AuditAspect.java`               | Create | `@Around("@annotation(Auditable)")` |
| `application/annotation/Auditable.java`             | Create | Custom annotation                   |
| `infrastructure/.../rest/AuditLogController.java`   | Create | Read-only with filters              |
| `db/migration/V52__create_audit_log.sql`            | Create | Migration                           |
| ~8 UseCases                                         | Modify | Add `@Auditable` annotation         |
| `core/models/audit-log.model.ts`                    | Create | TypeScript interfaces               |
| `core/services/audit-log.service.ts`                | Create | HTTP read-only service              |
| `features/admin/audit/audit-log-list.ts`            | Create | MatTable with filter bar            |

## Integration Points

| New Code                       | Touches Existing                                      | How                                                                     |
| ------------------------------ | ----------------------------------------------------- | ----------------------------------------------------------------------- |
| `adminGuard`                   | `AuthService.userRole`                                | Reads `userRole()` signal to check ADMIN                                |
| `UserUseCase`                  | `users` table, `roles` table                          | Queries existing tables; creates users with BCrypt default password     |
| `CompanyConfigUseCase`         | `warehouses` table                                    | `main_warehouse_id` FK reference                                        |
| `PucAccountUseCase` (modified) | `products.puc_account_id`                             | Soft-delete validation: cannot deactivate if referenced                 |
| `CustomPriceUseCase`           | `third_parties`, `products`                           | Validates client and product existence                                  |
| `AuditAspect`                  | ~8 use cases                                          | Annotates existing methods; reads `SecurityContextHolder` for user + IP |
| `AdministracionLayout`         | `app.routes.ts`, `shell.ts`                           | Added as lazy route parent; shell unlocks disabled items                |
| Custom prices UI               | `ThirdPartyService`, `ProductService`                 | Reuses existing services for client/product dropdowns                   |
| Price list admin UI            | `PriceListService`, existing `PriceListListComponent` | Reuses — wraps existing component in admin tab                          |

## Testing Strategy

| Layer               | What to Test                                                      | Approach                                 |
| ------------------- | ----------------------------------------------------------------- | ---------------------------------------- |
| Frontend unit       | adminGuard redirects non-ADMIN, passes ADMIN                      | Vitest + TestBed                         |
| Frontend unit       | UserForm validation (required fields, email format)               | Vitest, Testbed with ReactiveFormsModule |
| Frontend unit       | PucList tree expansion/collapse                                   | Vitest, mock PucAccountService           |
| Frontend unit       | CustomPriceForm: client+product uniqueness validation             | Vitest                                   |
| Backend unit        | UserUseCase: prevents self-deactivation, last-admin protection    | JUnit 5 + Mockito                        |
| Backend unit        | CompanyConfigUseCase: upsert id=1                                 | JUnit 5 + Mockito                        |
| Backend unit        | CustomPriceUseCase: duplicate client+product detection            | JUnit 5 + Mockito                        |
| Backend unit        | AuditAspect: captures CREATE/UPDATE/DELETE, skips GET             | JUnit 5 + Mockito                        |
| Backend integration | PucAccountUseCase: soft-delete blocks if product references       | Spring Boot Test + H2                    |
| Backend integration | AuditAspect: logs generated for annotated use cases               | Spring Boot Test + H2                    |
| E2E                 | Full admin flow: login as ADMIN → navigate tabs → CRUD operations | Playwright                               |

## Migration / Rollout

- **Backend**: Flyway V51 (company_config), V52 (audit_log). No seed data. Deploy migrations, then deploy code. Rollback: revert migrations + remove new classes.
- **Frontend**: Deploy after backend. Routes are lazy-loaded, no data migration needed. Rollback: revert routes.ts + shell.ts + delete new feature folders.

## Open Questions

- [ ] Password for new users: default temporary password (`PosInvent2025!`) or leave `password_hash` NULL requiring a separate reset flow?
- [ ] Should the admin Guard redirect to `/dashboard` with a toast/notification explaining access denied, or silent redirect?
- [ ] PUC tree: return ALL accounts (including inactive) or only active ones? Proposal mentions soft-delete, implying inactive visible in admin.
