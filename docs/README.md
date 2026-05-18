# Documentación del proyecto

Documentación de la **lógica a preservar** durante el rediseño total de páginas. Cubre la capa de datos, services, repositories, modelos, validators y comportamiento de páginas — sin detalle UI (que se rediseña libremente).

## Cómo usar este directorio

1. **Empieza por `ARQUITECTURA.md`** — fundación, convenciones, auth, http, routing, layout. Aplica a todo el proyecto.
2. **Consulta el feature específico** que vayas a rediseñar para conocer qué services consume, qué endpoints toca, qué validaciones aplica y qué edge cases existen.
3. **Antes de tocar algo de `core/` o `features/<x>/{models,repository,service,validators,constants}.ts`** — relee la sección "Notas para el rediseño" del doc correspondiente para entender qué es intocable.

## Índice

### Fundación
- [**ARQUITECTURA.md**](ARQUITECTURA.md) — stack Angular 21, signals, SSR, auth (AuthService + interceptor + guards), routing, layout, convenciones, componentes utilitarios (`empty-state`, `error-state`, `status-badge`, `currencyPe`), `NotificacionService`, environments.

### Auth / Onboarding
- [**feature-auth.md**](feature-auth.md) — `LoginComponent` (`/login`) y `StoreSelectorComponent` (`/select-store`). El `AuthService` core está en ARQUITECTURA.md.
- [**feature-invitation.md**](feature-invitation.md) — crear invitación (`/invitation/new`) + aceptar invitación pública (`/invite?token=...`). `InvitationService`, validators de password.
- [**feature-onboarding.md**](feature-onboarding.md) — completar perfil (`/profile/complete`) + setup inicial empresa+tienda (`/setup`). `OnboardingService`.

### Operativa diaria
- [**feature-venta.md**](feature-venta.md) — **el feature más complejo**. Flujo multi-step (catálogo → carrito → resumen → propuesta SUNAT → comprobante). `CarritoService` (crítico), `VentaService`, `ResumenVentaService`. Integración SUNAT, notas de crédito, anulación.
- [**feature-servicio.md**](feature-servicio.md) — similar a venta pero para servicios. Flujo formulario → resumen → comprobante. `ServicioService`, `ServicioFormService`, notas de crédito de servicio (efímeras).
- [**feature-inventario.md**](feature-inventario.md) — lotes, productos, catálogo, stock. `InventarioService` + `CatalogoService`. Paginación cursor. Consumido por venta y home.
- [**feature-finanzas.md**](feature-finanzas.md) — caja (resumen, cierre), deudas (búsqueda por documento/comprobante, pagos), pagos, gastos fijos y variables. `FinanzasService` (state amplio), `PagoPdfService`.

### Operaciones / Soporte
- [**feature-operaciones.md**](feature-operaciones.md) — historial unificado ventas+servicios con filtros. Acciones: anular, cancelar, emitir NC (venta y servicio con sub-flujos). `OperacionesService`.
- [**feature-impresora.md**](feature-impresora.md) — bridge ESC/POS local (`localhost:3000`). `ImpresoraService`, `TicketConverter`, `PrintPreviewComponent` universal. Modos WiFi (TCP) y USB/CUPS.
- [**feature-home.md**](feature-home.md) — dashboard. Charts (ApexCharts), KPIs, alertas de inventario, ranking, tendencia 7 días. `HomeStatsService` + consume `FinanzasService`, `CatalogoService`.

### Administración
- [**feature-tienda.md**](feature-tienda.md) — CRUD tiendas. `TiendaService` (expone `tiendaActiva` consumido por shell).
- [**feature-usuarios.md**](feature-usuarios.md) — usuario-tienda, edición, toggle activo, reenviar invitación. `UsuariosService`. Sólo dueño/admin.
- [**feature-asistencia.md**](feature-asistencia.md) — marcación entrada/salida + resumen mensual. `AsistenciaService`. Sólo dueño/admin.

## Reglas globales para el rediseño

1. **Componentes en `pages/` y `components/` se rediseñan libremente**.
2. **NO tocar**: `core/auth/*`, `core/http/*`, `core/storage/*`, `core/guards/*`, `core/services/notificacion.service.ts`, `features/*/models/`, `features/*/<feature>.repository.ts`, `features/*/<feature>.service.ts`, `features/*/validators/`, `features/*/constants/`, `environments/*`, `app.routes.ts` (guards y redirects son intencionales).
3. **Cualquier `<feature>.repository.ts` es contrato API**: cambiar paths o request bodies implica coordinar con backend.
4. **Mapping snake_case → camelCase**: convención del proyecto. Está en los `*FromJson` de cada modelo. No quitar.
5. **Signals son la única fuente de verdad**: los componentes los consumen; las mutaciones pasan por los services.
6. **Validators custom** (`features/*/validators/`) implementan reglas de negocio (SUNAT, etc.). NO tocar sin revisar el doc del feature.

## Patrones recurrentes a respetar

- **Paginación cursor DRF**: `next` URL con query `?cursor=<x>` → extraer cursor y guardarlo. Aparece en inventario, venta, operaciones, servicio.
- **State con loading flags** (`isLoading`, `isSaving`, `isLoadingMore`): los componentes los consumen para mostrar spinners/skeletons.
- **`extractApiError(err)`**: convertir `HttpErrorResponse` → string user-friendly. Usar en TODOS los catch de repository.
- **Pre-fetch silencioso**: services que cargan catálogos auxiliares (roles, tipos de gasto, productos del lote-form) hacen swallow de errores — UI no debe romperse si el catálogo no carga.
- **Confirmación destructiva**: `confirm()` nativo del browser para acciones irreversibles (desactivar lote, cerrar caja, cerrar mes, eliminar servicio, etc.). Considera reemplazar por modal custom en el rediseño manteniendo el flujo.

## Cómo se generó esta documentación

Esta documentación se construyó analizando exhaustivamente el código fuente del proyecto el 2026-05-15. Cubre **toda la lógica que debe sobrevivir** un rediseño total de las páginas. No incluye detalle del look-and-feel actual (que se reemplaza por completo).
