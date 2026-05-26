# Sprint 14 — Facturación Electrónica DIAN

## Intención

Colombia exige facturación electrónica ante la DIAN. Este sprint implementa la capa de integración con **Provider C** (Carvajal/The Factory HKA/Facture): enviamos JSON, el provider genera XML UBL 2.1, calcula CUFE (SHA-384), firma digitalmente (XMLDsig) y comunica con DIAN. Recibimos CUFE+QR+status. El ERP no habla SOAP directamente con DIAN — delega en el provider.

## Alcance

### Fase 1: Configuración DIAN

- Tabla `dian_resolutions`: número, fecha, prefijo, rango desde/hasta, software PIN, vencimiento
- `company_config` +3 columnas: `digital_certificate` (BYTEA `.p12`), `certificate_password` (VARCHAR), `certificate_expiry` (DATE)
- Admin form CRUD de resoluciones + upload certificado

### Fase 2: Modelo `electronic_invoices`

- Tabla `electronic_invoices` (1:1 `sales_documents`): `cufe` VARCHAR(100), `qr_base64` TEXT, `json_payload` JSONB, `provider_response` JSONB, `status` enum (PENDING_SEND, SENT, ACCEPTED_BY_DIAN, REJECTED_BY_DIAN), `sent_at`, `response_at`
- Tabla `dian_sync_queue`: cola offline con `document_id`, `attempts`, `last_error`

### Fase 3: Integración POS Checkout

- Post-checkout hook: tras `PosCheckoutUseCase` crear INVOICE → enqueue `ElectronicInvoiceJob` asíncrono → enviar JSON al provider → recibir CUFE/QR → actualizar `electronic_invoices`
- Asíncrono (no bloquea checkout)

### Fase 4: Nota crédito electrónica

- CREDIT_NOTE (Sprint 11) vinculada a `electronic_invoices` de la factura original
- Generar JSON nota crédito electrónica con referencia al CUFE original

### Fase 5: UI + Dashboard

- Visualizar estado DIAN en detalle de documento de venta
- QR display + badge de estado
- Dashboard KPI: electrónicas hoy, pendientes, rechazadas

### Fuera de alcance

- Integración SOAP directa con DIAN (usa provider)
- Cola offline batch (provider SDK maneja retry)
- Documentos electrónicos lado proveedor/compras (solo ventas)
- Manejo de eventos DIAN (aceptación/rechazo — provider gestiona)

## Enfoque técnico

- **Provider C abstracción**: `ElectronicInvoiceProvider` (interface) → `Adapter` provider concreto. Envía JSON con: emisor (NIT, resolución), receptor (NIT, régimen), items (código, cantidad, precio, impuestos 0/5/8/19%), totales. Recibe: CUFE, QR base64, estado DIAN.
- **Async job**: `@Async` + `ApplicationEventPublisher` en Spring. Tras `PosCheckoutUseCase.checkout()`, publica `InvoiceIssuedEvent` → listener encola `ElectronicInvoiceJob`.
- **Backend hexagonal**: `ElectronicInvoice` domain record + entity, `ElectronicInvoiceUseCase`, `ElectronicInvoiceRepository` (port), `JpaElectronicInvoiceRepository` (adapter), `DianResolutionController` + `DianResolutionUseCase`.
- **Frontend**: standalone components, signals, `httpResource`. Carpeta `features/dian/` con: `dian-config`, `electronic-invoice-detail` (embebido en detalle venta), `dian-dashboard` (sección KPI).
- **Migraciones**: V64 (dian_resolutions), V65 (company_config cert fields), V66 (electronic_invoices), V67 (dian_sync_queue).

## Áreas afectadas

| Área                                         | Impacto    | Descripción                              |
| -------------------------------------------- | ---------- | ---------------------------------------- |
| `dian_resolutions` table (V64)               | Nuevo      | Resoluciones DIAN por prefijo/rango      |
| `company_config` + V65                       | Modificado | +certificado .p12, password, vencimiento |
| `electronic_invoices` table (V66)            | Nuevo      | 1:1 con sales_documents, CUFE/QR/status  |
| `dian_sync_queue` table (V67)                | Nuevo      | Cola reintentos offline                  |
| `ElectronicInvoice.java` (domain + entity)   | Nuevo      | Domain record + JPA entity               |
| `ElectronicInvoiceProvider.java` + adapter   | Nuevo      | Abstracción provider C                   |
| `ElectronicInvoiceUseCase.java` + controller | Nuevo      | Lógica de negocio DIAN                   |
| `DianResolutionUseCase.java` + controller    | Nuevo      | CRUD resoluciones                        |
| `PosCheckoutUseCase.java`                    | Modificado | +evento InvoiceIssuedEvent               |
| `SalesDocumentService.java`                  | Modificado | +lectura electronic_invoices             |
| `src/app/features/dian/`                     | Nuevo      | 3 componentes standalone                 |
| `src/app/features/pos/checkout/`             | Modificado | Hook post-checkout                       |
| `src/app/features/ventas/detail/`            | Modificado | Badge estado DIAN + QR                   |
| `src/app/layout/shell/shell.ts`              | Modificado | Habilitar menú DIAN (si aplica)          |

## Riesgos

| #   | Riesgo                                         | Prob  | Mitigación                                                      |
| --- | ---------------------------------------------- | ----- | --------------------------------------------------------------- |
| 1   | Provider C no disponible / latencia alta       | Alta  | `dian_sync_queue` + retry automático; checkout no bloquea       |
| 2   | Certificado .p12 vencido no detectado a tiempo | Media | `certificate_expiry` + dashboard alerta 30 días antes           |
| 3   | Rango de numeración DIAN se agota              | Media | Validación `documentNumber > hasta` pre-checkout                |
| 4   | Provider cambia contrato/API (sin SDK estable) | Media | Abstracción `ElectronicInvoiceProvider` permite swap de adapter |
| 5   | CUFE duplicado por reenvío                     | Baja  | `electronic_invoices.cufe UNIQUE` constraint                    |

## Rollback

- **Backend**: Eliminar `ElectronicInvoiceUseCase.java`, `ElectronicInvoiceProvider.java`, adapter, `DianResolutionUseCase.java`, controllers. Revertir `PosCheckoutUseCase.java` (remover evento). Revertir migraciones V64-V67 (DROP TABLE + DROP COLUMN). Sin impacto en ventas existentes — `sales_documents` sin cambios.
- **Frontend**: Eliminar carpeta `features/dian/`. Revertir `shell.ts`, detalle venta. Sin rutas nuevas que rompan lazy loading.

## Dependencias

- **Sprint 8 (Ventas)** ✅ — `SalesDocument`, `sales_documents`, documentNumber, totales, impuestos
- **Sprint 9 (Admin)** ✅ — `CompanyConfig` V51 (NIT, economic_activity, tax_regime)
- **Sprint 6 (POS)** ✅ — `PosCheckoutUseCase`, flujo checkout
- **Sprint 11 (Devoluciones)** ✅ — `CREDIT_NOTE` enum, `sourceDocumentId`
- **Provider C SDK** 🔲 — Contratar/licenciar SDK provider. Endpoint staging + producción.

## Criterios de éxito

- [ ] Admin puede crear/editar resoluciones DIAN con rango, prefijo, PIN y fecha
- [ ] Admin puede subir certificado .p12 y se almacena como BYTEA en company_config
- [ ] `electronic_invoices` registra 1:1 cada factura electrónica con status PENDING_SEND
- [ ] Post-checkout, `ElectronicInvoiceJob` envía JSON al provider y recibe CUFE+QR
- [ ] `electronic_invoices.status` transiciona: PENDING_SEND → SENT → ACCEPTED_BY_DIAN
- [ ] Si provider rechaza, status → REJECTED_BY_DIAN con provider_response almacenado
- [ ] Nota crédito electrónica genera JSON con referencia al CUFE de la factura original
- [ ] Detalle de venta muestra badge estado DIAN + QR renderizado
- [ ] Dashboard KPI: conteo electrónicas hoy, pendientes, rechazadas
- [ ] Cola `dian_sync_queue` reintenta documentos PENDING_SEND hasta 5 veces

## Orden de fases

| #   | Fase                     | Justificación                                                              |
| --- | ------------------------ | -------------------------------------------------------------------------- |
| 1   | Configuración DIAN       | Fundacional: sin resolución y certificado, no hay facturación electrónica. |
| 2   | Modelo ElectronicInvoice | Tabla + dominio. Sin esto no hay dónde guardar CUFE/QR/status.             |
| 3   | Integración POS Checkout | Core: hook post-checkout + provider adapter + async job.                   |
| 4   | Nota crédito electrónica | Depende de Fase 3 (electronic_invoices existentes con CUFE).               |
| 5   | UI + Dashboard           | Depende de Fase 3 (datos en electronic_invoices para mostrar).             |

## Esfuerzo estimado

| Fase                          | Esfuerzo       | Backend                                                               | Frontend                                        |
| ----------------------------- | -------------- | --------------------------------------------------------------------- | ----------------------------------------------- |
| F1 — Configuración DIAN       | 3-4 días       | 5 archivos (entity, record, use case, controller, repository)         | 2 componentes (resolutions CRUD, cert upload)   |
| F2 — Modelo ElectronicInvoice | 2-3 días       | 5 archivos (entity, record, use case, controller, repository)         | —                                               |
| F3 — Integración POS Checkout | 5-7 días       | 6 archivos (provider interface, adapter, job, event, PosCheckout mod) | 1 archivo modificado (hook)                     |
| F4 — Nota crédito electrónica | 3-4 días       | 3 archivos (use case, controller, event listener)                     | —                                               |
| F5 — UI + Dashboard           | 4-5 días       | 1 archivo (dashboard endpoint)                                        | 4 componentes (detail badge, QR, dashboard KPI) |
| **Total**                     | **17-23 días** | **20 archivos**                                                       | **7 archivos**                                  |
