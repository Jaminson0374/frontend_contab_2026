# Design: Sprint 14 — Facturación Electrónica DIAN

## Technical Approach

Sprint puramente **frontend Angular 21** (backend Spring Boot hexagonal externo, accesible vía `/api` proxy). El enfoque es consumir endpoints REST del backend que implementa Provider C (Carvajal/HKA/Facture) — este frontend no habla SOAP DIAN directamente. Seguimos el patrón del proyecto: modelos en `core/models/`, servicios `inject(HttpClient)` en `core/services/`, componentes standalone con signals y lazy loading en `features/dian/`.

## Architecture Decisions (Backend — Definidos Aquí para Contrato API)

### 1. Provider C Abstracción

| Opción                                                       | Tradeoff                                        | Decisión       |
| ------------------------------------------------------------ | ----------------------------------------------- | -------------- |
| Interface `ElectronicInvoiceProvider` + adapter por provider | Swap sin tocar el core. Más boilerplate inicial | ✅ **Elegido** |
| Implementación concreta directa                              | Simple, pero acoplada                           | ❌             |

**API contract**: Frontend solo ve endpoints REST — el backend expone `/api/v1/dian/config`, `/api/v1/dian/invoices`, `/api/v1/dian/dashboard`. El adapter es transparente para el FE.

### 2. Async Hook Post-Checkout

| Opción                                          | Tradeoff                                            | Decisión       |
| ----------------------------------------------- | --------------------------------------------------- | -------------- |
| `ApplicationEventPublisher` + `@Async` listener | Checkout no bloquea, fallback a sync queue si falla | ✅ **Elegido** |
| Direct call síncrono post-checkout              | Checkout bloqueado 2-5s por latencia provider       | ❌             |

**API contract**: El FE llama `POST /api/v1/pos/checkout` y recibe inmediatamente `{ documentNumber, invoiceId }`. El backend encola `ElectronicInvoiceJob` asíncrono. El FE consulta estado vía `GET /api/v1/dian/invoices/{invoiceId}`.

### 3. Sync Queue

| Opción                               | Tradeoff                             | Decisión       |
| ------------------------------------ | ------------------------------------ | -------------- |
| Tabla `dian_sync_queue` (PostgreSQL) | Persistente, no requiere infra extra | ✅ **Elegido** |
| RabbitMQ / Redis                     | No disponible en este proyecto       | ❌             |
| In-memory                            | Se pierde en crash                   | ❌             |

### 4. electronic_invoices FK 1:1 con sales_documents

| Opción                                                              | Tradeoff                                                        | Decisión       |
| ------------------------------------------------------------------- | --------------------------------------------------------------- | -------------- |
| FK en `electronic_invoices` → `sales_documents.id` (unidireccional) | Una factura puede existir sin DIAN. Sales_documents sin cambios | ✅ **Elegido** |
| FK bidireccional (ambos lados)                                      | Acoplamiento circular, rollback complejo                        | ❌             |

### 5. Certificado .p12

| Opción                                       | Tradeoff                           | Decisión       |
| -------------------------------------------- | ---------------------------------- | -------------- |
| BYTEA en `company_config` + password VARCHAR | Simple, backup incluido en dump DB | ✅ **Elegido** |
| Filesystem                                   | Backup separado, permisos OS       | ❌             |

### 6. CUFE Uniqueness

| Opción                  | Tradeoff                                       | Decisión       |
| ----------------------- | ---------------------------------------------- | -------------- |
| DB UNIQUE constraint    | Garantía atómica, evita duplicados por reenvío | ✅ **Elegido** |
| Application-level check | Race condition posible                         | ❌             |

### 7. Nota Crédito DIAN

| Opción                                                                       | Tradeoff                                                     | Decisión       |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------- |
| Reusar `electronic_invoices` + `source_document_id` FK a la factura original | Una sola tabla, consultas simples. FK self-referencing claro | ✅ **Elegido** |
| Tabla separada `dian_credit_notes`                                           | Duplica columnas innecesariamente                            | ❌             |

### 8. Document Number vs DIAN Number

| Opción                                                                    | Tradeoff                                            | Decisión       |
| ------------------------------------------------------------------------- | --------------------------------------------------- | -------------- |
| `documentNumber` interno sigue igual + `dian_resolution.prefix` para DIAN | Cero impacto en ventas existentes. Rollback trivial | ✅ **Elegido** |
| Cambiar a rango DIAN                                                      | Rompe documentos históricos no DIAN                 | ❌             |

## Data Flow

```
POS Checkout (FE)                           Backend (API)
─────────────────                           ─────────────
pos-venta.ts
  │ POST /api/v1/pos/checkout  ──────────→  PosCheckoutUseCase.checkout()
  │ ←── { documentNumber, invoiceId }        │ publica InvoiceIssuedEvent
  │                                          ↓
  │                                     @Async listener
  │                                          │ POST JSON a Provider C
  │                                          │ recibe CUFE+QR+status
  │                                          ↓
  │                                     electronic_invoices
  │                                         (PENDING→SENT→ACCEPTED/REJECTED)

SalesDocumentDetail (FE)
  │ GET /api/v1/dian/invoices/{id} ───────→ electronic_invoices JOIN sales_documents
  │ ←── { cufe, qrBase64, status, sentAt }
  │ Render badge + QR

Dashboard DIAN (FE)
  │ GET /api/v1/dian/dashboard  ──────────→ COUNT + GROUP BY status
  │ ←── { today, pending, rejected }
```

## API Contracts (Backend Rest — Consumido por FE)

### V64 — dian_resolutions

```
GET    /api/v1/dian/resolutions          → Page<DianResolutionResponse>
POST   /api/v1/dian/resolutions          → DianResolutionResponse
PUT    /api/v1/dian/resolutions/{id}     → DianResolutionResponse
DELETE /api/v1/dian/resolutions/{id}     → 204
```

### V65 — company_config cert fields

```
GET  /api/v1/company-config              → CompanyConfigResponse (+certificateExpiry, hasCertificate: boolean)
PUT  /api/v1/company-config              → multipart/form-data (+digitalCertificate: file, certificatePassword)
```

### V66 — electronic_invoices

```
GET  /api/v1/dian/invoices?page=&size=&status=  → Page<ElectronicInvoiceResponse>
GET  /api/v1/dian/invoices/{invoiceId}           → ElectronicInvoiceResponse (cufe, qrBase64, status, sentAt, providerResponse)
POST /api/v1/dian/invoices/{id}/retry            → ElectronicInvoiceResponse (reintenta envío)
```

### V67 — dian_sync_queue (backend interno)

```
GET  /api/v1/dian/queue?page=&size=    → Page<DianSyncQueueResponse> (admin)
POST /api/v1/dian/queue/reprocess      → 202 (reprocesa todos PENDING_SEND)
```

### Electronic Invoice (Nota Crédito)

```
POST /api/v1/pos/devolutions  → (existente, ya vinculado en backend vía sourceDocumentId)
```

Para nota crédito electrónica, el backend reutiliza `electronic_invoices` con `source_document_id` FK a la factura original. FE consume mismo endpoint `GET /api/v1/dian/invoices/{id}`.

### Dashboard KPI

```
GET /api/v1/dian/dashboard → { todayCount, pendingCount, rejectedCount, acceptedCount }
```

## File Changes (~20 BE contract / ~7 FE real)

| File                                                                 | Action     | Description                                                           |
| -------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------- |
| `src/app/core/models/dian-resolution.model.ts`                       | **Create** | `DianResolution`, `DianResolutionRequest` interfaces                  |
| `src/app/core/models/electronic-invoice.model.ts`                    | **Create** | `ElectronicInvoice`, `DianDashboard` interfaces                       |
| `src/app/core/models/company-config.model.ts`                        | **Modify** | +`certificateExpiry: string \| null`, +`hasCertificate: boolean`      |
| `src/app/core/services/dian-resolution.service.ts`                   | **Create** | CRUD `/api/v1/dian/resolutions`                                       |
| `src/app/core/services/electronic-invoice.service.ts`                | **Create** | GET invoice status, dashboard `/api/v1/dian/*`                        |
| `src/app/core/services/company-config.service.ts`                    | **Modify** | +`uploadCertificate(file: File, password: string)` multipart          |
| `src/app/features/dian/dian-layout.ts`                               | **Create** | Layout wrapper para feature DIAN                                      |
| `src/app/features/dian/dian-layout.html`                             | **Create** | Template con tabs (Resoluciones, Dashboard)                           |
| `src/app/features/dian/resolution-list.ts`                           | **Create** | CRUD tabla de resoluciones DIAN                                       |
| `src/app/features/dian/resolution-list.html`                         | **Create** | Template con MatTable + acciones                                      |
| `src/app/features/dian/resolution-form.ts`                           | **Create** | Formulario crear/editar resolución                                    |
| `src/app/features/dian/resolution-form.html`                         | **Create** | Template: número, fecha, prefijo, rango desde/hasta, PIN, vencimiento |
| `src/app/features/dian/dian-dashboard.ts`                            | **Create** | KPIs DIAN (hoy, pendientes, rechazadas)                               |
| `src/app/features/dian/dian-dashboard.html`                          | **Create** | Template con 4 KPI cards (estilo dashboard existente)                 |
| `src/app/features/admin/company/company-form.ts`                     | **Modify** | +sección upload certificado .p12 + password                           |
| `src/app/features/ventas/document-detail/sales-document-detail.ts`   | **Modify** | +inject ElectronicInvoiceService, +`dianStatus` signal, +badge DIAN   |
| `src/app/features/ventas/document-detail/sales-document-detail.html` | **Modify** | +sección DIAN status badge + QR si `status=ACCEPTED_BY_DIAN`          |
| `src/app/app.routes.ts`                                              | **Modify** | +ruta lazy `dian` con children `resoluciones`, `dashboard`            |
| `src/app/layout/shell/shell.ts`                                      | **Modify** | +módulo nav "DIAN" (roles: ADMIN, CONTADOR)                           |

## Component Tree (FE)

```
ShellComponent (shell.ts)
└── NavModule "DIAN" → /dian
    └── DianLayoutComponent (dian-layout.ts)
        ├── ResolutionListComponent (resolution-list.ts)
        │   └── ResolutionFormComponent (resolution-form.ts) — dialog o ruta hija
        └── DianDashboardComponent (dian-dashboard.ts)
            └── 4 KPI cards (mat-card estilo dashboard existente)

SalesDocumentDetailComponent (modificado)
└── Sección DIAN (embebida, no componente separado)
    ├── Badge estado (PENDING_SEND / SENT / ACCEPTED_BY_DIAN / REJECTED_BY_DIAN)
    └── QR image (si ACCEPTED_BY_DIAN) — <img [src]="qrBase64" />

CompanyFormComponent (modificado)
└── Sección "Certificado DIAN"
    ├── Input file .p12
    └── Input password
```

## Integration Points

| Punto          | Dónde                                    | Qué cambia                                                                 |
| -------------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| POS Checkout   | `pos-venta.ts` → `PosService.checkout()` | Sin cambios — backend encola DIAN asíncrono. FE no toca.                   |
| Detalle venta  | `sales-document-detail.ts`               | Llama `ElectronicInvoiceService.getByInvoiceId(doc.id)` y renderiza badge. |
| Company config | `company-form.ts`                        | Añade sección upload certificado. Usa `FormData` multipart.                |
| Menú lateral   | `shell.ts`                               | Nuevo NavModule "DIAN" para ADMIN/CONTADOR, ruta `/dian`.                  |

## Testing Strategy

| Capa        | Qué                                                                   | Cómo                                                        |
| ----------- | --------------------------------------------------------------------- | ----------------------------------------------------------- |
| Modelos     | Interfaces completas y correctas                                      | `tsc --noEmit` verifica tipos                               |
| Servicios   | Llamadas HTTP correctas a `/api/v1/dian/*`                            | Spec con `HttpTestingController`, verificar URL + método    |
| Componentes | Renderizado condicional (loading/error/datos/QR)                      | `TestBed.createComponent` + señales + fixture.detectChanges |
| Integración | Flujo completo: resolución CRUD + dashboard + detalle venta con badge | Mock HTTP backend, verificar transiciones de estado         |
| Snapshot    | Ninguno — no usamos snapshots en este proyecto                        |

## Migration / Rollout

- **V64-V67 SQL** son migraciones del backend, no de este repositorio
- FE: feature DIAN comienza con `dian-layout` vacío si no hay resoluciones configuradas
- Rollback FE: eliminar `features/dian/`, revertir 4 modificaciones (shell, routes, detail, company-form)
- Sin impacto en ventas existentes

## Open Questions

- [ ] Disponibilidad del SDK Provider C (endpoint staging) — ¿fecha estimada?
- [ ] ¿El QR se renderiza como `<img src="data:image/png;base64,...">` o el backend devuelve URL?
