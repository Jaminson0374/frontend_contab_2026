# Sprint 9 — Administración: Usuarios, PUC, Precios, Empresa, Auditoría

## Intención

El módulo Administración está **completamente ausente** del frontend: 4 items de menú inhabilitados en `shell.ts`, rutas `/administracion/*` inexistentes en `app.routes.ts`, sin componentes de administración. El backend tiene soporte parcial (PUC y PriceList CRUD existen, users/roles como tablas sin API de administración) y carece por completo de configuración de empresa y auditoría. Este sprint construye el módulo de administración completo para el rol ADMIN: gestionar usuarios/roles, editar el catálogo PUC/NIIF, administrar listas de precios y precios personalizados, configurar parámetros de la empresa, y auditar todas las mutaciones del sistema.

## Alcance

### Slice 1: Usuarios y roles 🔴

- **Backend**: Nuevo `UserUseCase` + `UserController` (`GET/POST/PUT /api/v1/admin/users`) para CRUD de usuarios (crear, listar, editar username/email/fullName/role/isActive, NO gestión de contraseñas). Nuevo `RoleUseCase` + `RoleController` (`GET /api/v1/admin/roles`) solo lectura de roles existentes.
- **Frontend**: `user-list` (MatTable + paginación con `httpResource`) + `user-form` (ReactiveFormsModule, MatFormField outline, selector de rol) en `features/admin/users/`. `role-list` (solo lectura) en `features/admin/roles/`.
- **Ruta**: activar `/administracion` con layout `AdminComponent`, y rutas hijas `/usuarios`, `/roles`.
- **Shell**: desbloquear "Usuarios y roles" (remover `disabled: true`).
- **Guard**: `adminGuard` (`CanActivateFn`) que verifica `userRole === 'ADMIN'`, redirige a `/dashboard` si no.

### Slice 2: Configuración de empresa 🔴

- **Backend**: TODO nuevo. `company_config` table (V51 migration, single-row: id=1, company_name, nit, address, phone, email, economic_activity, tax_regime, currency DEFAULT='COP', main_warehouse FK, logo_url, created_at, updated_at). Dominio → repositorio → entity → adapter → `ManageCompanyConfigUseCase` → `CompanyConfigController` (`GET/PUT /api/v1/admin/company-config`). Solo PUT (upsert en id=1), no POST/DELETE.
- **Frontend**: `company-form` (ReactiveFormsModule, single-form sin tabla, carga inicial con GET, guarda con PUT) en `features/admin/company/`.
- **Ruta**: `/administracion/empresa`.
- **Shell**: desbloquear "Config. de empresa".

### Slice 3: Catálogo PUC/NIIF 🟡

- **Backend**: YA EXISTE (PucAccountUseCase full CRUD + ~50 cuentas seed V17). Solo verificar que endpoints de escritura (POST/PUT/DELETE) estén expuestos y documentados. Agregar endpoint de búsqueda tree: `GET /api/v1/puc/tree?search=`.
- **Frontend**: `puc-list` (MatTable jerárquico con expansión por nivel, filtro por código/nombre, botón nuevo/editar/activar-desactivar) + `puc-form` (formulario con campos: código, nombre, nivel, parent_code dropdown, clase, naturaleza, permite_transacciones). En `features/admin/puc/`.
- **Ruta**: `/administracion/puc`.
- **Nota**: el menú de shell NO tiene item "Catálogo PUC" — se agrega como 5to hijo del módulo Administración (o se integra en un futuro sub-módulo Contabilidad). Para este sprint: se agrega como "Catálogo PUC" en el menú Administración.

### Slice 4: Configuración de precios 🟡

- **Backend**: PriceList CRUD YA EXISTE. CustomPrices: tabla `custom_prices` YA EXISTE (V36). Falta API CRUD para custom prices. Nuevo `CustomPriceUseCase` + `CustomPriceController` (`GET/POST/PUT/DELETE /api/v1/admin/custom-prices`). Filtro por cliente y producto.
- **Frontend**: Reutilizar `PriceListService` existente. `price-list-admin` (CRUD tablas de listas de precios: nombre, markup%, activa) en `features/admin/prices/`. `custom-price-list` (MatTable: cliente, producto, precio custom, tax_type, tax_rate) + `custom-price-form` (selector de cliente + producto + campos de precio).
- **Ruta**: `/administracion/precios` con sub-tabs: "Listas" y "Precios por cliente".
- **Shell**: desbloquear "Config. de precios".

### Slice 5: Auditoría 🟢

- **Backend**: TODO nuevo. `audit_log` table (V52): id, entity_type, entity_id, action (CREATE/UPDATE/DELETE), field_name, old_value, new_value, user_id FK, ip_address, created_at. `AuditAspect` (Spring AOP `@Around` sobre métodos `@Auditable` en use cases). `AuditLogController` solo-lectura (`GET /api/v1/admin/audit-logs` con filtros: entity_type, user_id, date_range, action). NO se auditan lecturas (GET).
- **Frontend**: `audit-log-list` (MatTable con filtros avanzados: entidad, usuario, acción, rango de fechas) en `features/admin/audit/`. Solo-lectura, sin formularios. Columnas: fecha, usuario, entidad, acción, campo, valor anterior, valor nuevo.
- **Ruta**: `/administracion/auditoria`.
- **Shell**: desbloquear "Auditoría".
- **AOP**: aplicar `@Auditable` en: `ManageProductUseCase`, `ManageSalesDocumentUseCase`, `ManagePurchaseOrderUseCase`, `InventoryAdjustmentUseCase`, `ManageUserUseCase`, `CustomPriceUseCase`, `ManageCompanyConfigUseCase`, `ManageThirdPartyUseCase`. Excluir GET/lectura.

## Fuera de alcance

- Gestión de contraseñas (reset, cambio, políticas de complejidad)
- Permisos granulares por rol (solo lectura del JSONB `permissions` en tabla roles, sin UI de edición)
- Reglas de pricing (volumen, estacionalidad, descuentos por cliente)
- Impresión/exportación de logs de auditoría
- Dashboard de actividad (gráficos de auditoría)
- Módulo de contabilidad completo (solo catálogo PUC, sin asientos contables)
- Integración DIAN para configuración de empresa

## Enfoque técnico

- **Backend hexagonal**: domain record → repository port → JPA entity + adapter (MapStruct) → use case → controller + DTO. Consistente con el resto del proyecto.
- **Frontend**: standalone components, signals, `httpResource` con `untracked()`, ReactiveFormsModule + MatFormField appearance="outline". Patrón ya establecido en Compras/Inventario/Ventas.
- **Admin layout**: extender `AdminComponent` existente (`features/admin/admin.ts`) con tabs dinámicos para los 5 sub-módulos. Usar `MatTabsModule` con `routerLink` al estilo del admin.html actual (tabs: Usuarios, PUC, Precios, Empresa, Auditoría).
- **adminGuard**: nuevo guard que envuelve la ruta `/administracion`, verifica `userRole() === 'ADMIN'`. El `authGuard` existente solo verifica autenticación (no rol).
- **Audit AOP**: `@Around("@annotation(Auditable)")` captura método, parámetros, y resultado. Extrae `entityType` y `entityId` via reflection o convención de nombres. NO audita si el método lanza excepción (solo operaciones exitosas). Usa `RequestContextHolder` para obtener IP y usuario del token JWT.
- **Company config single-row**: `PUT /api/v1/admin/company-config` hace upsert con `id=1`. `GET` retorna el registro único o 404 si no configurado.

## Áreas afectadas

| Área                                                | Impacto              | Descripción                                              |
| --------------------------------------------------- | -------------------- | -------------------------------------------------------- |
| `src/app/app.routes.ts`                             | Modificado           | +ruta `/administracion` con adminGuard + 5 hijos lazy    |
| `src/app/layout/shell/shell.ts`                     | Modificado           | Desbloquear 4 items + agregar "Catálogo PUC"             |
| `src/app/features/admin/`                           | Modificado/Extendido | AdminComponent ampliado con tabs; +5 sub-carpetas nuevas |
| `src/app/core/auth/admin.guard.ts`                  | Nuevo                | Guard de rol ADMIN                                       |
| `UserUseCase.java` + controller                     | Nuevo                | CRUD usuarios                                            |
| `RoleController.java`                               | Nuevo                | Solo-lectura roles                                       |
| `company_config` (V51)                              | Nuevo                | Tabla, entity, domain, repo, use case, controller        |
| `CustomPriceUseCase.java` + controller              | Nuevo                | CRUD custom prices                                       |
| `PucAccountController.java`                         | Modificado           | Verificar/agregar POST/PUT/DELETE + tree endpoint        |
| `audit_log` (V52) + `AuditAspect.java` + controller | Nuevo                | Tabla, AOP aspect, controller solo-lectura               |
| Múltiples UseCases                                  | Modificado           | Anotar `@Auditable` en ~8 use cases existentes           |

## Riesgos

| #   | Riesgo                                                                                                           | Probabilidad | Mitigación                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | AuditAspect captura operaciones batch y genera volumen excesivo de logs                                          | Alta         | Configurar sampling/threshold en el aspecto; `entity_type` + `action` indexados en BD; el aspecto captura solo campos modificados (no el objeto completo)                        |
| 2   | PUC modify rompe referencias en productos que ya usan `puc_account_id`                                           | Media        | Validar que no se pueda eliminar una cuenta PUC si está referenciada por productos (`ON DELETE RESTRICT`); soft-delete con flag `active=false` para cuentas en uso               |
| 3   | Custom price podría crear conflictos con price list existente                                                    | Baja         | El `PriceEngineService` ya maneja la prioridad 3-tier (custom → price_list → product). Solo se agrega UI admin.                                                                  |
| 4   | Company config single-row podría ser sobrescrito accidentalmente                                                 | Baja         | `PUT` con upsert id=1; opcionalmente bloqueo optimista con `updated_at`                                                                                                          |
| 5   | El AdminComponent actual tiene tabs duros para products/third-parties; agregar admin tabs podría duplicar layout | Media        | Refactorizar AdminComponent: hacerlo genérico con tabs dinámicos desde un array configurable, o crear un nuevo `AdministracionLayoutComponent` específico para `/administracion` |

## Rollback

- **Backend**: revertir migraciones V51-V52 (`DROP TABLE company_config, audit_log`). Eliminar clases nuevas (UserUseCase, RoleController, CompanyConfig*, CustomPrice*, AuditAspect). Remover anotaciones `@Auditable` de use cases existentes. Despliegue con `flyway:migrate` reverso.
- **Frontend**: revertir `app.routes.ts` (eliminar `/administracion` y rutas hijas). Revertir `shell.ts` (re-deshabilitar 4 items + remover "Catálogo PUC"). Eliminar carpetas `features/admin/users/`, `features/admin/company/`, `features/admin/puc/`, `features/admin/prices/`, `features/admin/audit/`. Eliminar `admin.guard.ts`. Despliegue estático de `dist/`.

## Dependencias

- **Sprint 8 (Ventas)** — en progreso. El módulo Administración es independiente funcionalmente de Ventas. Solo comparte: `ThirdParty` (lectura para selector de cliente en custom prices), `Warehouse` (lectura para company config). Sin dependencia de features de Ventas.
- **Sprint 7 (Inventario)** ✅ completado — `Product`, `Warehouse`, `PriceList` existen.
- **Sprint 6 (POS Core)** ✅ completado — `SalesDocument`, `ThirdParty`, JWT auth existen.
- **PUC backend** ✅ — PucAccountUseCase existe (full CRUD verificado por exploración).
- **PriceList backend** ✅ — PriceListUseCase existe (full CRUD verificado por exploración).
- **JWT + AuthService** ✅ — `userRole` signal disponible para adminGuard.

## Criterios de éxito

- [ ] Ruta `/administracion` accesible SOLO para rol ADMIN; otros roles redirigidos a `/dashboard`
- [ ] CRUD de usuarios: crear, listar, editar (username, email, fullName, rol, isActive). Sin gestión de contraseñas.
- [ ] Lista de roles (solo lectura) con permisos visibles
- [ ] Configuración de empresa: formulario único que carga/guarda datos con `PUT`
- [ ] Catálogo PUC: listado jerárquico con expansión por niveles, formulario crear/editar, soft-delete
- [ ] Listas de precios: CRUD tablas (nombre, markup%, activa)
- [ ] Precios por cliente: CRUD (cliente, producto, precio, tax_type, tax_rate)
- [ ] Auditoría: tabla de logs con filtros (entidad, usuario, acción, rango de fechas). Solo-lectura.
- [ ] Logs de auditoría se generan automáticamente al crear/editar/eliminar en módulos anotados
- [ ] Los 5 items del menú Administración están habilitados y navegan correctamente

## Orden de slices

| #   | Slice                    | Justificación                                                                                                                                                                               |
| --- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Usuarios y roles         | Fundacional: activa la ruta `/administracion`, crea `adminGuard`, establece el layout base. Sin esto, los demás slices no tienen dónde montarse. Backend nuevo requerido.                   |
| 2   | Configuración de empresa | Backend nuevo + frontend simple (1 formulario). Bajo acoplamiento, se puede paralelizar con Slice 3. Rápido de construir.                                                                   |
| 3   | Catálogo PUC/NIIF        | Backend existe → solo frontend. Mayor complejidad de UI (tabla jerárquica). Depende de Slice 1 (ruta base).                                                                                 |
| 4   | Configuración de precios | Backend parcialmente existe (PriceList). Requiere nuevo CustomPriceUseCase. UI con sub-tabs (listas + precios por cliente). Depende de Slice 1.                                             |
| 5   | Auditoría                | Mayor impacto transversal: toca ~8 use cases existentes con `@Auditable`. Requiere que los módulos a auditar estén estables. Va al final para no interferir con desarrollo de otros slices. |

## Esfuerzo estimado

| Slice                   | Esfuerzo       | Backend                          | Frontend        |
| ----------------------- | -------------- | -------------------------------- | --------------- |
| S1 — Usuarios y roles   | 4-6 días       | 6 archivos                       | 5 archivos      |
| S2 — Config. de empresa | 2-3 días       | 7 archivos                       | 2 archivos      |
| S3 — Catálogo PUC       | 2-3 días       | 1 archivo (tree endpoint)        | 3 archivos      |
| S4 — Config. de precios | 3-4 días       | 6 archivos (CustomPrice)         | 5 archivos      |
| S5 — Auditoría          | 4-5 días       | 5 archivos + ~8 modificados      | 2 archivos      |
| **Total**               | **15-21 días** | **25 archivos + ~8 modificados** | **17 archivos** |
