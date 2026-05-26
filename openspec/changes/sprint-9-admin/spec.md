# Administración Specification

## Purpose

Admin module for a Colombian meat plant ERP: user/role management, company config, PUC/NIIF accounting catalog, price administration, and automated audit trail. Access restricted to ADMIN role exclusively.

## Architecture

```
/administracion (adminGuard: ADMIN only)
 ├── /usuarios      → User CRUD (list + form)
 ├── /roles         → Role read-only table
 ├── /empresa       → Single-form company config
 ├── /puc           → Hierarchical PUC tree CRUD
 ├── /precios       → Sub-tabs: Price Lists + Custom Prices
 └── /auditoria     → Read-only audit log viewer
```

---

## Slice 1 — Usuarios y Roles

| ID          | Requirement   | Strength | Core Behavior                                                                                          |
| ----------- | ------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| REQ-ADM-001 | List Users    | MUST     | GET `/api/v1/admin/users?page=&size=&search=&role=&active=` returns paginated users with role name     |
| REQ-ADM-002 | Get User      | MUST     | GET `/api/v1/admin/users/{id}` returns full user detail (no password field)                            |
| REQ-ADM-003 | Create User   | MUST     | POST `/api/v1/admin/users` with username, fullName, email, roleId, isActive → 201                      |
| REQ-ADM-004 | Update User   | MUST     | PUT `/api/v1/admin/users/{id}` updates username, fullName, email, roleId, isActive (no password) → 200 |
| REQ-ADM-005 | List Roles    | MUST     | GET `/api/v1/admin/roles` returns all roles with their permissions JSON. Read-only, no mutations       |
| REQ-ADM-006 | Admin Guard   | MUST     | `adminGuard` blocks non-ADMIN from `/administracion/*`, redirects to `/dashboard`                      |
| REQ-ADM-007 | Menu & Routes | MUST     | `/administracion` route with AdminComponent layout; "Usuarios y roles" menu item unlocked              |

### REQ-ADM-001 Scenarios

- **Happy**: GIVEN 10 users exist → WHEN GET `/api/v1/admin/users?page=0&size=10` → THEN 200, 10 items, pagination metadata
- **Filter by role**: GIVEN 3 ADMIN users → WHEN GET `?role=ADMIN` → THEN 200, only ADMIN users returned
- **Search**: GIVEN user "jaminson" exists → WHEN GET `?search=jami` → THEN 200, user "jaminson" returned
- **Empty results**: GIVEN no user matching search → WHEN GET `?search=xyz` → THEN 200, empty array, totalElements=0

### REQ-ADM-002 Scenarios

- **Happy**: GIVEN user id=X → WHEN GET `/api/v1/admin/users/X` → THEN 200, user object without `password` field
- **Not found**: GIVEN non-existent id → WHEN GET → THEN 404, "User not found"

### REQ-ADM-003 Scenarios

- **Happy**: GIVEN valid username/email/roleId → WHEN POST → THEN 201, user created with `isActive=true`
- **Duplicate username**: GIVEN username already exists → WHEN POST → THEN 409, "Username already taken"
- **Invalid role**: GIVEN roleId does not exist → WHEN POST → THEN 400, "Role not found"
- **Missing field**: GIVEN username=null → WHEN POST → THEN 400, "username is required"

### REQ-ADM-004 Scenarios

- **Happy**: GIVEN existing user → WHEN PUT with new fullName → THEN 200, fullName updated
- **Not found**: GIVEN non-existent id → WHEN PUT → THEN 404
- **Role change**: GIVEN user with role=CAJERO → WHEN PUT roleId=ADMIN → THEN 200, userRole→ADMIN

### REQ-ADM-005 Scenarios

- **Happy**: GIVEN 3 roles exist → WHEN GET `/api/v1/admin/roles` → THEN 200, array with names and permissions
- **No roles**: GIVEN role table is empty → WHEN GET → THEN 200, empty array

### REQ-ADM-006 Scenarios

- **ADMIN access**: GIVEN userRole=ADMIN → WHEN navigate to `/administracion` → THEN granted, component renders
- **Non-ADMIN denied**: GIVEN userRole=CAJERO → WHEN navigate to `/administracion` → THEN redirected to `/dashboard`
- **Unauthenticated**: GIVEN no JWT token → WHEN navigate to `/administracion` → THEN redirected to `/login`

### REQ-ADM-007 Scenarios

- **Route active**: GIVEN ADMIN logged in → WHEN navigate to `/administracion/usuarios` → THEN user-list renders
- **Menu enabled**: GIVEN ADMIN logged in → WHEN shell renders → THEN "Usuarios y roles" NOT disabled
- **Menu hidden for others**: GIVEN userRole=CAJERO → WHEN shell renders → THEN "Administración" module NOT visible

---

## Slice 2 — Configuración de Empresa

| ID          | Requirement           | Strength | Core Behavior                                                                                                                                                             |
| ----------- | --------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-ADM-010 | Get Company Config    | MUST     | GET `/api/v1/admin/company-config` returns single config row (id=1) or 404                                                                                                |
| REQ-ADM-011 | Upsert Company Config | MUST     | PUT `/api/v1/admin/company-config` upserts id=1 with company_name, nit, address, phone, email, economic_activity, tax_regime, currency, main_warehouse_id, logo_url → 200 |
| REQ-ADM-012 | Form Validation       | MUST     | nit required, company_name required, email format valid, currency defaults to COP                                                                                         |
| REQ-ADM-013 | Menu & Route          | MUST     | `/administracion/empresa` loads company-form; menu "Config. de empresa" unlocked                                                                                          |

### REQ-ADM-010 Scenarios

- **Happy**: GIVEN company config exists → WHEN GET → THEN 200, full config object with all fields
- **Not configured**: GIVEN no config row → WHEN GET → THEN 404, "Company config not found"

### REQ-ADM-011 Scenarios

- **First save**: GIVEN no config exists → WHEN PUT with valid data → THEN 200, id=1 row created
- **Update**: GIVEN config exists → WHEN PUT with new phone → THEN 200, phone updated, other fields preserved
- **Invalid warehouse**: GIVEN main_warehouse_id not in DB → WHEN PUT → THEN 400, "Warehouse not found"

### REQ-ADM-012 Scenarios

- **Missing NIT**: GIVEN nit=null → WHEN PUT → THEN 400, "nit is required"
- **Invalid email**: GIVEN email="not-an-email" → WHEN PUT → THEN 400, "email format invalid"
- **Default currency**: GIVEN currency not provided → WHEN PUT → THEN 200, currency saved as "COP"

### REQ-ADM-013 Scenarios

- **Route access**: GIVEN ADMIN logged in → WHEN navigate to `/administracion/empresa` → THEN company-form renders with GET-loaded data
- **Menu item**: GIVEN ADMIN logged in → WHEN shell renders → THEN "Config. de empresa" enabled and clickable

---

## Slice 3 — Catálogo PUC/NIIF

| ID          | Requirement           | Strength | Core Behavior                                                                                                                        |
| ----------- | --------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| REQ-ADM-020 | List PUC Hierarchical | MUST     | GET `/api/v1/puc-accounts?accountClass=` returns flat list; frontend renders hierarchical tree by `level` + `parent_code`            |
| REQ-ADM-021 | PUC Tree Search       | MUST     | GET `/api/v1/puc-accounts/tree?search=` returns accounts matching code or name, preserving parent-child structure                    |
| REQ-ADM-022 | Create PUC Account    | MUST     | POST `/api/v1/puc-accounts` with code, name, level, parent_code, account_class, account_nature, allows_transactions → 201            |
| REQ-ADM-023 | Update PUC Account    | MUST     | PUT `/api/v1/puc-accounts/{id}` updates account fields → 200                                                                         |
| REQ-ADM-024 | Soft-Delete PUC       | MUST     | DELETE `/api/v1/puc-accounts/{id}` sets `active=false`. MUST NOT delete if referenced by products (`ON DELETE RESTRICT`)             |
| REQ-ADM-025 | PUC Validation        | MUST     | code format validates against PUC structure (class-group-account-subaccount). parent_code MUST reference existing account at level-1 |
| REQ-ADM-026 | Menu & Route          | MUST     | `/administracion/puc` loads puc-list; new menu item "Catálogo PUC" as 5th child of Administración                                    |

### REQ-ADM-020 Scenarios

- **Happy**: GIVEN 50 PUC accounts → WHEN GET `/api/v1/puc-accounts` → THEN 200, flat list with parent_code; frontend groups by level (1→2→3→4)
- **Filter by class**: GIVEN accountClass=1 → WHEN GET `?accountClass=1` → THEN 200, only "Activo" accounts
- **Tree expansion**: GIVEN tree rendered → WHEN user clicks expand on level-1 account → THEN its children (level-2) become visible

### REQ-ADM-021 Scenarios

- **Search by code**: GIVEN account "1105" exists → WHEN GET `/api/v1/puc-accounts/tree?search=1105` → THEN 200, account + ancestors returned
- **Search by name**: GIVEN "Caja" accounts exist → WHEN GET `?search=Caja` → THEN 200, all matching accounts with parents
- **No match**: GIVEN no account matches → WHEN GET → THEN 200, empty array

### REQ-ADM-022 Scenarios

- **Happy**: GIVEN valid PUC fields → WHEN POST → THEN 201, account created
- **Duplicate code**: GIVEN code already exists → WHEN POST → THEN 409, "PUC code already exists"
- **Invalid parent**: GIVEN parent_code does not exist → WHEN POST → THEN 400, "Parent account not found"

### REQ-ADM-023 Scenarios

- **Happy**: GIVEN existing account → WHEN PUT with new name → THEN 200, name updated
- **Not found**: GIVEN non-existent id → WHEN PUT → THEN 404

### REQ-ADM-024 Scenarios

- **Happy**: GIVEN account not referenced by products → WHEN DELETE → THEN 200, active=false
- **Referenced**: GIVEN account is `puc_account_id` for product X → WHEN DELETE → THEN 409, "Account referenced by products"
- **Already inactive**: GIVEN account already active=false → WHEN DELETE → THEN 409, "Already inactive"

### REQ-ADM-025 Scenarios

- **Invalid code**: GIVEN code="99" (too short) → WHEN POST → THEN 400, "Invalid PUC code format"
- **Level mismatch**: GIVEN parent is level=2, new account level=4 → WHEN POST → THEN 400, "Level must be parent level + 1"
- **Remove transactions**: GIVEN account has transactions → WHEN PUT allows_transactions=false → THEN 400, "Account has posted transactions"

### REQ-ADM-026 Scenarios

- **Route**: GIVEN ADMIN logged in → WHEN navigate to `/administracion/puc` → THEN puc-list renders with tree
- **Menu new item**: GIVEN ADMIN logged in → WHEN shell renders → THEN "Catálogo PUC" visible in Administración children

---

## Slice 4 — Configuración de Precios

| ID          | Requirement             | Strength | Core Behavior                                                                                                  |
| ----------- | ----------------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| REQ-ADM-030 | List Price Lists        | MUST     | GET `/api/v1/price-lists` returns all lists (exists, reuse)                                                    |
| REQ-ADM-031 | CRUD Price Lists        | MUST     | POST/PUT `/api/v1/price-lists` + DELETE deactivate (exists, reuse in admin UI)                                 |
| REQ-ADM-032 | List Custom Prices      | MUST     | GET `/api/v1/admin/custom-prices?clientId=&productId=` returns filtered custom prices                          |
| REQ-ADM-033 | Create Custom Price     | MUST     | POST `/api/v1/admin/custom-prices` with clientId, productId, price, tax_type, tax_rate → 201                   |
| REQ-ADM-034 | Update Custom Price     | MUST     | PUT `/api/v1/admin/custom-prices/{id}` updates price fields → 200                                              |
| REQ-ADM-035 | Delete Custom Price     | MUST     | DELETE `/api/v1/admin/custom-prices/{id}` removes custom price → 200                                           |
| REQ-ADM-036 | Custom Price Uniqueness | MUST     | One custom price per client+product pair. Duplicate → 409                                                      |
| REQ-ADM-037 | Menu & Route            | MUST     | `/administracion/precios` with sub-tabs "Listas" and "Precios por cliente"; menu "Config. de precios" unlocked |

### REQ-ADM-030 Scenarios

- **Happy**: GIVEN 5 price lists → WHEN GET → THEN 200, all lists with name, markup%, active flag

### REQ-ADM-031 Scenarios

- **Create**: GIVEN valid name + markup% → WHEN POST → THEN 201, active=true
- **Update**: GIVEN existing list → WHEN PUT with new markup → THEN 200
- **Deactivate**: GIVEN active list → WHEN DELETE → THEN 200, active=false

### REQ-ADM-032 Scenarios

- **Happy**: GIVEN 10 custom prices → WHEN GET `/api/v1/admin/custom-prices` → THEN 200, all with client name + product name
- **Filter by client**: GIVEN client X has 3 custom prices → WHEN GET `?clientId=X` → THEN 200, 3 results
- **Filter by product**: GIVEN product Y has 2 custom prices → WHEN GET `?productId=Y` → THEN 200, 2 results

### REQ-ADM-033 Scenarios

- **Happy**: GIVEN valid client+product+price → WHEN POST → THEN 201
- **Missing client**: GIVEN clientId=null → WHEN POST → THEN 400, "clientId is required"
- **Negative price**: GIVEN price=-1 → WHEN POST → THEN 400, "price must be > 0"
- **Invalid tax_type**: GIVEN tax_type="INVALID" → WHEN POST → THEN 400, "invalid tax_type"

### REQ-ADM-034 Scenarios

- **Happy**: GIVEN existing custom price → WHEN PUT with new price → THEN 200

### REQ-ADM-036 Scenarios

- **Duplicate**: GIVEN custom price exists for client X + product Y → WHEN POST same pair → THEN 409, "Custom price already exists for this client and product"

### REQ-ADM-037 Scenarios

- **Sub-tab Listas**: GIVEN at `/administracion/precios` → WHEN click "Listas" tab → THEN price-list-admin renders
- **Sub-tab Cliente**: GIVEN at `/administracion/precios` → WHEN click "Precios por cliente" tab → THEN custom-price-list renders
- **Menu**: GIVEN ADMIN logged in → WHEN shell renders → THEN "Config. de precios" enabled

---

## Slice 5 — Auditoría

| ID          | Requirement     | Strength | Core Behavior                                                                                                                                                                                                                 |
| ----------- | --------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-ADM-040 | Audit Mutations | MUST     | `@Auditable` methods in annotated use cases log: entity_type, entity_id, action (CREATE/UPDATE/DELETE), field_name, old_value, new_value, user_id, ip_address, created_at                                                     |
| REQ-ADM-041 | Audit Aspect    | MUST     | Spring AOP `@Around("@annotation(Auditable)")` captures BEFORE/AFTER state. Only logs successful operations. Never audits reads (GET)                                                                                         |
| REQ-ADM-042 | List Audit Logs | MUST     | GET `/api/v1/admin/audit-logs?entity_type=&user_id=&action=&from=&to=&page=&size=` returns paginated read-only log                                                                                                            |
| REQ-ADM-043 | Audit Filtering | MUST     | Filters by entity_type, user_id, action, date range. All filters optional and combinable                                                                                                                                      |
| REQ-ADM-044 | Coverage        | MUST     | `@Auditable` applied to: ManageProductUseCase, ManageSalesDocumentUseCase, ManagePurchaseOrderUseCase, InventoryAdjustmentUseCase, ManageUserUseCase, CustomPriceUseCase, ManageCompanyConfigUseCase, ManageThirdPartyUseCase |
| REQ-ADM-045 | Viewer & Menu   | MUST     | `/administracion/auditoria` renders read-only audit-log-list. Menu "Auditoría" unlocked. No create/edit/delete UI                                                                                                             |

### REQ-ADM-040 Scenarios

- **CREATE audit**: GIVEN admin creates user → WHEN user persisted → THEN audit_log INSERT with action=CREATE, entity_type=USER, entity_id={newUser.id}, new_value={user data}
- **UPDATE audit**: GIVEN admin edits product name from "Res" to "Res Fresca" → WHEN product updated → THEN audit_log INSERT with action=UPDATE, field_name=name, old_value="Res", new_value="Res Fresca"
- **DELETE audit**: GIVEN admin deletes custom price → WHEN custom_price deleted → THEN audit_log INSERT with action=DELETE

### REQ-ADM-041 Scenarios

- **Successful operation**: GIVEN @Auditable method completes without exception → WHEN returns → THEN audit log persisted
- **Failed operation**: GIVEN @Auditable method throws exception → WHEN exception propagates → THEN NO audit log created
- **GET exclusion**: GIVEN @Auditable class with GET method → WHEN GET called → THEN NOT intercepted by aspect

### REQ-ADM-042 Scenarios

- **Happy**: GIVEN 50 audit logs exist → WHEN GET `/api/v1/admin/audit-logs?page=0&size=20` → THEN 200, 20 results, pagination metadata
- **No logs**: GIVEN no audit logs → WHEN GET → THEN 200, empty array

### REQ-ADM-043 Scenarios

- **Filter by entity**: GIVEN logs for USER and PRODUCT → WHEN GET `?entity_type=USER` → THEN only USER logs
- **Filter by action**: GIVEN mixed actions → WHEN GET `?action=DELETE` → THEN only DELETE logs
- **Date range**: GIVEN logs from May 1-20 → WHEN GET `?from=2026-05-10&to=2026-05-15` → THEN only logs in that range
- **Combined**: GIVEN mixed logs → WHEN GET `?entity_type=PRODUCT&action=UPDATE&from=2026-05-01` → THEN only PRODUCT UPDATEs from May 1 onward

### REQ-ADM-044 Scenarios

- **Product mutation**: GIVEN ManageProductUseCase.create() → WHEN invoked → THEN audit log captured
- **System reads not audited**: GIVEN ManageProductUseCase.findById() → WHEN invoked → THEN NO audit log

### REQ-ADM-045 Scenarios

- **Route**: GIVEN ADMIN logged in → WHEN navigate to `/administracion/auditoria` → THEN audit-log-list renders with filter bar
- **Read-only**: GIVEN audit-log-list rendered → WHEN no create/edit/delete buttons visible → THEN UI is purely read-only
- **Menu**: GIVEN ADMIN logged in → WHEN shell renders → THEN "Auditoría" enabled

---

## Success Criteria

- [ ] `/administracion` accessible ONLY for ADMIN role; others redirected to `/dashboard`
- [ ] CRUD users: create, list, edit (username, email, fullName, role, isActive). No password management
- [ ] Role list read-only with visible permissions
- [ ] Company config: single form loads via GET, saves via PUT
- [ ] PUC: hierarchical tree with expand/collapse, create/edit form, soft-delete with referential integrity
- [ ] Price lists: CRUD (name, markup%, active)
- [ ] Custom prices: CRUD with client+product uniqueness constraint and filter
- [ ] Audit: read-only log table with entity, user, action, date-range filters
- [ ] Audit logs auto-generated on create/update/delete in all annotated modules
- [ ] 5 menu items enabled: Usuarios y roles, Catálogo PUC, Config. de precios, Config. de empresa, Auditoría
