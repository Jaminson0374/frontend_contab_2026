# Accounting Templates — Plantillas contables configurables

## Intención

Los asientos automáticos de venta/compra asignan cuentas PUC hardcodeadas en `AccountingEventListener`. No hay forma de que un grupo de productos (ej: "Cárnicos") use cuentas de ingreso distintas a otro (ej: "Lácteos"). Este cambio reemplaza el mapeo hardcodeado por **plantillas contables configurables** asignables a grupos de producto (con override por producto individual).

## Alcance

### Slice 1: Dominio + Persistencia

- Tablas `accounting_templates` (id, name, description) + `accounting_template_entries` (template_id, event_type, account_id, is_debit)
- 14 event types: SALE*{INCOME,COGS,INVENTORY_OUT,TAX,RECEIVABLE,RETENTION} + PURCHASE*{INVENTORY,EXPENSE,TAX,PAYABLE,RETENTION,DISCOUNT,COST}
- Hexagonal stack: domain record → jpa entity → mapper → adapter → use case → controller

### Slice 2: Asignación

- Nuevo FK `accounting_template_id` en `product_groups` (V77) y `products` (override opcional, V77)
- Resolución: product.template → productGroup.template → null (sin plantilla = sin asiento)

### Slice 3: Integración backend

- Refactor `AccountingEventListener`: reemplazar PUC hardcodeados por resolución vía template
- **Fix gap compras**: publicar `PurchaseAccountedEvent` desde `SupplierInvoiceUseCase`
- Flag `auto_generate_journal_entries` en `company_config` (V76)

### Slice 4: Frontend admin

- CRUD de plantillas: lista + formulario (template + entries por event_type) bajo `/administracion/plantillas`
- Pickers de plantilla en formularios de producto y grupo de producto

### Fuera de alcance

- Eventos de Inventario/Producción/Tesorería (iteración futura)
- Migrar asientos existentes (backward compat con hardcodeado actual)
- Override manual de asiento por transacción individual
- Extender `InvoiceIssuedEvent` con datos por ítem (se resuelve con query aparte en el listener)

## Enfoque

Template-driven event→account mapping. Dos tablas nuevas. Resolución encadenada (producto → grupo). Arquitectura hexagonal siguiendo patrón `PucAccountUseCase`. Frontend como tab adicional en admin shell existente.

## Impacto

| Área                   | Archivos                                                                  | Tipo       |
| ---------------------- | ------------------------------------------------------------------------- | ---------- |
| Backend domain         | AccountingTemplate, AccountingTemplateEntry, AccountingTemplateRepository | Nuevo      |
| Backend infrastructure | Entity, JpaRepository, Mapper, Adapter × 2 tablas                         | Nuevo      |
| Backend application    | AccountingTemplateUseCase, DTOs, Controller                               | Nuevo      |
| Backend application    | AccountingEventListener (refactor)                                        | Modificado |
| Backend application    | SupplierInvoiceUseCase (publish event)                                    | Modificado |
| Migraciones            | V75 (templates), V76 (config flag), V77 (FKs)                             | Nuevo      |
| Frontend admin         | accounting-template-list, form, service, model                            | Nuevo      |
| Frontend productos     | Template picker en product-form, product-group-form                       | Modificado |
| Frontend shell/routes  | Sidebar + routing para /administracion/plantillas                         | Modificado |

## Riesgos

| Riesgo                                                                                    | Probabilidad | Mitigación                                                      |
| ----------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------- |
| `InvoiceIssuedEvent` solo tiene totales agregados, no datos por ítem para COGS/inventario | Alta         | El listener consulta sale_items aparte; no se bloquea el cambio |
| Conflicto entre hardcodeado actual y resolución por template durante transición           | Media        | Se mantiene fallback hardcodeado si no hay template asignado    |
| `flyway.repair-on-migrate=true` puede requerir limpieza si V75 falla                      | Baja         | Ejecutar `flyway repair` antes de migrar si es necesario        |

## Rollback

1. Revertir commits de migraciones V75-V77 + backend + frontend
2. Ejecutar `DROP TABLE IF EXISTS accounting_template_entries, accounting_templates CASCADE`
3. `ALTER TABLE product_groups DROP COLUMN accounting_template_id`
4. `ALTER TABLE products DROP COLUMN accounting_template_id`
5. `ALTER TABLE company_config DROP COLUMN auto_generate_journal_entries`
6. Redeploy — el listener hardcodeado original sigue intacto durante la transición

## Dependencias

- ✅ PUC accounts (V17) — catálogo de cuentas
- ✅ journal_entries (V72) — infraestructura de asientos
- ✅ products + product_groups — entidades a extender
- ✅ company_config (V51) — tabla a extender con flag
- ✅ SalesDocument, SupplierInvoice — productores de eventos

## Criterios de éxito

- [ ] CRUD de plantillas funcional desde `/administracion/plantillas`
- [ ] Una venta de producto con plantilla asignada → asiento con cuentas de la plantilla (no hardcodeadas)
- [ ] Una compra confirma → se publica `PurchaseAccountedEvent` + se genera asiento
- [ ] Producto sin plantilla (ni grupo) → no genera asiento (o usa fallback hardcodeado si `autoGenerateJournalEntries=true`)
- [ ] `auto_generate_journal_entries=false` → ningún evento genera asiento
