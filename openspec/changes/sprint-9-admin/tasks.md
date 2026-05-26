# Tasks: Sprint 9 — Administración

## Slice 1: Usuarios y Roles (Fundacional)

- [ ] [BE] Create `domain/model/User.java` + `domain/repository/UserRepository.java` (domain record + port)
- [ ] [BE] Create `infrastructure/adapters/out/persistence/UserEntity.java`, `UserJpaRepository.java`, `UserMapper.java`, `UserRepositoryAdapter.java`
- [ ] [BE] Create `application/dto/UserRequest.java` + `UserResponse.java` (no password in response)
- [ ] [BE] Create `application/usecase/UserUseCase.java`: CRUD, random temp password (12 chars) in 201, self-deactivation prevention, last-admin protection
- [ ] [BE] Create `infrastructure/adapters/in/rest/UserController.java` (GET/POST/PUT `/api/v1/admin/users`) + `RoleController.java` (GET `/api/v1/admin/roles` read-only)
- [ ] [FE] Create `core/auth/admin.guard.ts`: `CanActivateFn` checks `userRole() === 'ADMIN'`, silent redirect to `/dashboard`
- [ ] [FE] Create `features/admin/administracion/administracion-layout.ts` + `.html` + `.css`: MatTabs with `routerLink` + RouterOutlet, 5 tabs
- [ ] [FE] Modify `core/models/user.model.ts`: add `email`, `isActive` fields
- [ ] [FE] Create `core/services/user.service.ts`: HttpClient CRUD (no password in GET/PUT)
- [ ] [FE] Create `features/admin/users/user-list.ts`: MatTable with pagination, search, role/active filters
- [ ] [FE] Create `features/admin/users/user-form.ts`: ReactiveForm, role dropdown, create/edit modes
- [ ] [FE] Create `features/admin/roles/role-list.ts`: read-only MatTable showing permissions JSON
- [ ] [FE] Modify `app.routes.ts`: add `/administracion` lazy route with `adminGuard` + 5 children
- [ ] [FE] Modify `layout/shell/shell.ts`: remove `disabled:true` from 4 admin items, add "Catálogo PUC" as 5th child

## Slice 2: Configuración de Empresa

- [x] [BE] Create `db/migration/V51__create_company_config.sql`: single-row table, CHECK(id=1), FK to warehouses
- [x] [BE] Create `domain/model/CompanyConfig.java` + `domain/repository/CompanyConfigRepository.java`
- [x] [BE] Create `infrastructure/adapters/out/persistence/CompanyConfigEntity.java`, `CompanyConfigJpaRepository.java`, `CompanyConfigMapper.java`, `CompanyConfigRepositoryAdapter.java`
- [x] [BE] Create `application/usecase/CompanyConfigUseCase.java`: GET single row, PUT upsert id=1 with warehouse FK validation
- [x] [BE] Create `infrastructure/adapters/in/rest/CompanyConfigController.java`: GET/PUT `/api/v1/admin/company-config`
- [x] [FE] Create `core/services/company-config.service.ts`: HTTP GET + PUT
- [x] [FE] Create `features/admin/company/company-form.ts`: single form, GET-load + PUT-save, nit/email/currency validation

## Slice 3: Catálogo PUC/NIIF

- [x] [BE] Modify `application/usecase/PucAccountUseCase.java`: add `update()`, `deactivate()` (soft-delete with product-referenced check), `tree()` (flat list with parentCode)
- [x] [BE] Modify `infrastructure/adapters/in/rest/PucAccountController.java`: add PUT, DELETE, GET `/tree?search=` endpoints
- [x] [FE] Modify `core/services/puc-account.service.ts`: add `create()`, `update()`, `deactivate()`, `tree()` methods
- [x] [FE] Create `features/admin/puc/puc-list.ts`: hierarchical MatTable, expand/collapse, search filter, shows ALL accounts (active + inactive)
- [x] [FE] Create `features/admin/puc/puc-form.ts`: create/edit form, parent_code dropdown, PUC code validation

## Slice 4: Configuración de Precios

- [x] [BE] Modify `domain/repository/CustomPriceRepository.java` + adapter: add `save()`, `delete()`, `findAll()`, `findById()` methods
- [x] [BE] Create `application/dto/CustomPriceRequest.java` + `CustomPriceResponse.java`
- [x] [BE] Create `application/usecase/CustomPriceUseCase.java`: CRUD + filter by clientId/productId + duplicate client+product detection
- [x] [BE] Create `infrastructure/adapters/in/rest/CustomPriceController.java`: GET/POST/PUT/DELETE `/api/v1/admin/custom-prices` with query params
- [x] [FE] Create `core/models/custom-price.model.ts`
- [x] [FE] Create `core/services/custom-price.service.ts`: HTTP CRUD
- [x] [FE] Create `features/admin/prices/price-list-admin.ts`: wraps existing PriceListListComponent in admin tab (reuse PriceListService)
- [x] [FE] Create `features/admin/prices/custom-price-list.ts`: MatTable (client, product, price, tax) + filters
- [x] [FE] Create `features/admin/prices/custom-price-form.ts`: ReactiveForm with client + product selectors

## Slice 5: Auditoría

- [x] [BE] Create `db/migration/V52__create_audit_log.sql`: table with CHECK(action IN ...) + indexes
- [x] [BE] Create `domain/model/AuditLog.java` + `domain/repository/AuditLogRepository.java`
- [x] [BE] Create `infrastructure/adapters/out/persistence/AuditLogEntity.java`, `AuditLogJpaRepository.java`, `AuditLogMapper.java`, `AuditLogRepositoryAdapter.java`
- [x] [BE] Create `application/annotation/Auditable.java`: custom annotation
- [x] [BE] Create `infrastructure/aop/AuditAspect.java`: `@Around("@annotation(Auditable)")`, captures entity/action/old/new/user/ip, skips failed ops + GET methods
- [x] [BE] Create `infrastructure/adapters/in/rest/AuditLogController.java`: GET `/api/v1/admin/audit-logs` read-only with filters (entity_type, user_id, action, from, to)
- [x] [BE] Annotate `@Auditable` on mutations in: `ProductUseCase`, `ManageSalesDocumentUseCase`, `PurchaseOrderUseCase`, `CreateAdjustmentUseCase`, `UserUseCase`, `CustomPriceUseCase`, `CompanyConfigUseCase`, `ThirdPartyUseCase`
- [x] [FE] Create `core/models/audit-log.model.ts`
- [x] [FE] Create `core/services/audit-log.service.ts`: read-only HTTP with filter params
- [x] [FE] Create `features/admin/audit/audit-log-list.ts`: MatTable + filter bar (entity, user, action, date range), no create/edit UI

---

| Slice                 | BE Tasks | FE Tasks | Total  |
| --------------------- | -------- | -------- | ------ |
| 1. Usuarios y Roles   | 5        | 9        | 14     |
| 2. Config. de Empresa | 5        | 2        | 7      |
| 3. Catálogo PUC       | 2        | 3        | 5      |
| 4. Config. de Precios | 4        | 5        | 9      |
| 5. Auditoría          | 7        | 3        | 10     |
| **Total**             | **23**   | **22**   | **45** |

**Dependencies**: Slices must be built in order 1→2→3→4→5. Slice 1 is foundational (route, guard, layout). Slice 5 depends on Slice 1 (UserUseCase) and Slice 4 (CustomPriceUseCase) only for annotation — audit aspect can be built independently.
