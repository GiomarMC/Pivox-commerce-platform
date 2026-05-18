# ARQUITECTURA — Lógica a preservar en el rediseño

Este documento describe la **fundación** del proyecto: configuración Angular, autenticación, capa HTTP, almacenamiento, guards, layout principal, y convenciones. Toda la lógica aquí descrita **debe preservarse intacta** durante el rediseño de páginas. Los componentes presentacionales pueden cambiar; los servicios, modelos, guards e interceptor son contrato.

Para cada **feature module** hay un archivo separado en este mismo directorio (`docs/feature-<modulo>.md`).

---

## 1. Stack y configuración

- **Angular 21**, standalone components (sin NgModules). Todo se importa directamente en el componente o se registra en `app.config.ts`.
- **SSR habilitado** vía `src/server.ts` (Express 5). Build produce dos bundles: `dist/management_system/browser/` y `dist/management_system/server/`.
- **Estado**: Angular Signals. NO hay NgRx. Patrón: `signal<State>()` privado + `state = _state.asReadonly()` público.
- **Estilos**: Tailwind CSS v4 (PostCSS) — `@tailwindcss/postcss`. Global en `src/styles.css`. Variables CSS custom: `var(--color-text-primary)`, `var(--color-text-secondary)`, `var(--color-primary)`, `var(--color-error)`.
- **Testing**: Vitest (no Karma/Jasmine), `@testing-library/angular`.
- **TypeScript estricto** con `noImplicitOverride`, `noImplicitReturns`, `noPropertyAccessFromIndexSignature`, plus Angular strict template/injection checks.
- **DI**: usar `inject()` (NO constructor injection).
- **Repositories** convierten Observables a Promises con `firstValueFrom()`.

### Environment

Archivo `src/environments/environment.ts`:
```ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://127.0.0.1:8000/api/',
  inviteBaseUrl: 'http://localhost:4200/invite',
};
```

**Regla**: nunca hardcodear URLs. Siempre `environment.apiBaseUrl` con sufijo `/` ya incluido — concatenar como `${this.api}auth/login/`.

### Bridge impresora ESC/POS

- Servicio HTTP local en `http://localhost:3000` (proyecto `printer-bridge/`).
- Endpoints: `/test-printer`, `/print`, `/print-pdf`, `/print-pdf-raw`, `/render-pdf`.

---

## 2. Configuración Angular (`app.config.ts`)

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideClientHydration(withEventReplay()),
  ],
};
```

**Características clave**:
- HttpClient con `withFetch()` (no XHR) + `authInterceptor` global.
- Client hydration con replay de eventos.
- SSR config (`app.config.server.ts`) hace `mergeApplicationConfig` con la versión browser y agrega `provideServerRendering(withRoutes(serverRoutes))`.
- **Todas las rutas SSR son `RenderMode.Client`** (no se prerenderiza nada — app autenticada).

---

## 3. Autenticación

### Modelos (`core/auth/auth.models.ts`)

```ts
interface AuthResponseModel { access: string; refresh: string; }
interface UserTiendaModel { tiendaId: number; tiendaNombre: string; }
interface UserMeModel {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  rol: string | null;          // 'DUENO' | 'ADMINISTRADOR' | 'TRABAJADOR' | null
  tiendas: UserTiendaModel[];
}

const Roles = {
  dueno:         'DUENO',
  administrador: 'ADMINISTRADOR',
  trabajador:    'TRABAJADOR',
} as const;

isProfileIncomplete(user): boolean   // firstName o lastName vacíos
isDueno(user): boolean
```

### `AuthService` (`core/auth/auth.service.ts`)

**Estado** (signal privado):
```ts
interface AuthState {
  isLoading: boolean;
  errorMessage: string | null;
  authData: AuthResponseModel | null;
  userMe: UserMeModel | null;
  selectedTiendaId: number | null;
}
```

**Signals públicos**:
- `state` (readonly del estado completo)
- `isAuthenticated` (computed: `authData !== null`)
- `userMe` (computed)
- `selectedTiendaId` (computed)
- `isDueno` (computed: rol === 'DUENO')
- `isAdmin` (computed: rol === 'ADMINISTRADOR')
- `canViewUsuarios` (computed: `isDueno || isAdmin`)

**API**:
- `login(username, password): Promise<void>` — POST `auth/login/` → guarda tokens en `StorageService`; luego GET `auth/me/` → mapea a `UserMeModel`. Pre-selecciona la última tienda usada (si está en `localStorage`) o la primera. En error: extrae `error.detail`, `error.non_field_errors[0]`, o mensaje genérico.
- `logout()` — limpia tokens + reset state.
- `selectTienda(tiendaId)` — persiste en localStorage + actualiza state.
- `clearTiendaSelection()` — limpia selectedTiendaId (para forzar re-selección).
- `updateUserMe(userMe)` — usado tras editar perfil/aceptar invitación.

**Mapping snake_case → camelCase** en `mapUserMe`: `first_name → firstName`, `last_name → lastName`, `tienda_id → tiendaId`, `tienda_nombre → tiendaNombre`. **Esto se aplica en TODOS los repositories del proyecto.**

### Endpoints API de auth

| Método | Endpoint            | Uso                                    |
|--------|---------------------|----------------------------------------|
| POST   | `auth/login/`       | Login con `{username, password}`        |
| POST   | `auth/refresh/`     | Refresh con `{refresh}` → `{access, refresh}` |
| GET    | `auth/me/`          | Datos del usuario actual                |

---

## 4. Capa HTTP

### `authInterceptor` (`core/http/api.interceptor.ts`)

Comportamiento:
1. Si hay token en storage → agrega `Authorization: Bearer <token>` a la request.
2. Si la respuesta es `401` y la URL **NO** es `auth/refresh/`:
   - Lee refresh token. Si no hay → `auth.logout()` y propaga error.
   - POST `auth/refresh/` con `{refresh}`. Si éxito: guarda nuevos tokens y reintenta la request original con el nuevo access token.
   - Si el refresh también falla → `auth.logout()`.
3. Otros errores se propagan.

**Importante**: el interceptor está registrado globalmente, así que **todas** las llamadas HTTP usan este flujo automáticamente. Los repositories no agregan tokens manualmente.

### `extractApiError(err)` (`core/http/api-error.handler.ts`)

Helper para sacar mensaje legible de errores DRF:
- Toma el primer `[key, value]` del `err.error`.
- Si la clave es genérica (`detail`, `non_field_errors`, `error`, `message`) → solo el mensaje.
- Caso contrario → `"<campo>: <mensaje>"`.
- Si `value` es array → `value[0]`.
- Fallback: `'Error en la operación'`.

Se usa en repositories/services para transformar `HttpErrorResponse` → string user-friendly antes de exponer al componente.

---

## 5. StorageService (`core/storage/storage.service.ts`)

Wrapper sobre `localStorage`:

| Key             | Helpers                                       |
|-----------------|-----------------------------------------------|
| `access_token`  | `saveToken(t)`, `getToken()`, `clearAuthTokens()` |
| `refresh_token` | `saveRefreshToken(t)`, `getRefreshToken()`, `clearAuthTokens()` |
| `last_tienda_id`| `setLastTiendaId(id)`, `getLastTiendaId()` (number\|null) |

**Reglas**: `trim()` se aplica a los tokens al guardar. Sólo se exponen estas tres claves; cualquier necesidad nueva debe pasar por aquí (no usar `localStorage` directo desde features).

---

## 6. Guards (`core/guards/auth.guard.ts`)

Tres `CanActivateFn`:

### `authGuard` (master guard del shell)

Flujo en orden:

1. **Path empieza con `/invite`** → permite (incluso sin sesión, para que el flujo de invitación funcione).
2. **No autenticado** → si path es `/login` permite, sino redirige a `/login`.
3. **Perfil incompleto** (`isProfileIncomplete`) → redirige a `/profile/complete` (excepto si ya estás ahí).
4. **Dueño sin tiendas** → redirige a `/setup` (excepto si ya estás ahí).
5. **No-admin intentando `/usuarios` o `/asistencia`** → redirige a `/home`.
6. **No-dueño intentando `/finanzas/gastos`** → redirige a `/finanzas`.
7. **Tienda no seleccionada (con tiendas disponibles)** → redirige a `/select-store`.
8. **Tienda ya seleccionada y path es `/select-store`** → redirige a `/home`.
9. **Si path es `/login`, `/profile/complete` o `/setup` y todo está OK** → redirige a `/home`.
10. **Default**: permite.

### `duenioGuard`
- `auth.isDueno() ? true : redirect('/finanzas')`.
- Aplicado en `/finanzas/gastos`.

### `adminGuard`
- `auth.canViewUsuarios() ? true : redirect('/home')`.
- Aplicado en `/usuarios` y `/asistencia`.

---

## 7. Routing (`app.routes.ts`)

### Rutas top-level (fuera del shell)

| Path                | Componente                          | Guards    |
|---------------------|-------------------------------------|-----------|
| `/login`            | LoginComponent                       | —         |
| `/invite`           | InvitationAcceptComponent            | —         |
| `/profile/complete` | ProfileCompleteComponent             | authGuard |
| `/setup`            | SetupComponent                       | authGuard |
| `/select-store`     | StoreSelectorComponent               | authGuard |
| `/invitation/new`   | InvitationFormComponent              | authGuard |
| `**`                | redirect a `/login`                  | —         |

### Rutas dentro del shell (path `''` → MainShellComponent + authGuard)

| Path                          | Componente                          | Guards       |
|-------------------------------|--------------------------------------|--------------|
| `home`                        | HomeComponent                        | —            |
| `inventario`                  | redirect → `inventario/productos`    | —            |
| `inventario/lotes`            | LoteListComponent                    | —            |
| `inventario/lotes/nuevo`      | LoteFormComponent                    | —            |
| `inventario/lotes/:id`        | LoteDetailComponent                  | —            |
| `inventario/productos`        | ProductosComponent                   | —            |
| `operaciones`                 | redirect → `operaciones/historial`   | —            |
| `operaciones/historial`       | OperacionesHistorialComponent        | —            |
| `ventas`                      | VentaComponent (multi-step wrapper)  | —            |
| `ventas/{catalogo,pedido,carrito,resumen}` | redirect → `ventas`     | —            |
| `ventas/propuesta-sunat`      | PropuestaSunatComponent              | —            |
| `ventas/comprobante`          | ComprobanteComponent                 | —            |
| `servicios`                   | ServicioComponent (multi-step)       | —            |
| `servicios/resumen`           | redirect → `servicios`               | —            |
| `servicios/comprobante`       | ComprobanteServicioComponent         | —            |
| `servicios/historial`         | ServicioHistorialComponent           | —            |
| `finanzas`                    | FinanzasHubComponent                 | —            |
| `finanzas/caja/resumen`       | CajaResumenComponent                 | —            |
| `finanzas/caja/cierre`        | CajaCierreComponent                  | —            |
| `finanzas/deudas`             | DeudasComponent                      | —            |
| `finanzas/pago-resumen`       | PagoResumenComponent                 | —            |
| `finanzas/gastos`             | GastosComponent                      | duenioGuard  |
| `usuarios`                    | UsuariosComponent                    | adminGuard   |
| `asistencia`                  | AsistenciaComponent                  | adminGuard   |
| `tiendas`                     | TiendasComponent                     | —            |
| `tiendas/form`                | TiendaFormComponent                  | —            |
| `config/impresora`            | ImpresoraConfigComponent             | —            |
| `''` (default child)          | redirect → `home`                    | —            |

**Observaciones para el rediseño**:
- Las rutas `ventas/{catalogo,pedido,carrito,resumen}` y `servicios/resumen` existen sólo como **redirects**; los flujos multi-step son una única página interna (`VentaComponent` / `ServicioComponent`) que renderiza sub-componentes según un step interno (signal). Si vas a rediseñar y prefieres URLs reales por step, hay que reorganizar las rutas y mover el state out of componente padre — pero ojo con `CarritoService` que es singleton.

---

## 8. Layout (`layout/main-shell/main-shell.component.ts`)

`MainShellComponent` es el contenedor que envuelve todas las rutas autenticadas. Provee:

- **Sidebar / menú** (signal `menuOpen`).
- **Dropdown de perfil** (signal `profileOpen`).
- **Panel de notificaciones** (signal `panelNotifs`) — se cierra con tecla `Escape`.
- Slot `<router-outlet>` para las páginas hijas.

### Signals/inyecciones expuestos al template

- `canViewUsuarios`, `isDueno`, `userMe` (de `AuthService`).
- `tiendaActiva` (de `TiendaService` — ver `docs/feature-tienda.md`).
- `notifSvc` (NotificacionService — alertas de stock/deudas).
- `menuOpen`, `profileOpen`, `panelNotifs` (UI state local).

### Acciones

- `toggleMenu()`, `closeMenu()`, `toggleProfile()`, `closeProfile()`.
- `toggleNotifs()` — abre el panel y, si las notificaciones no se han cargado, dispara `notifSvc.cargar(tiendaId)`.
- `irA(ruta)` — cierra panel + `router.navigate`.
- `logout()` — `auth.logout()` + navega a `/login`.
- `cambiarTienda()` — `auth.clearTiendaSelection()` + navega a `/select-store`.

**Para el rediseño**: el shell puede cambiar su look completamente, pero **los signals/acciones de arriba deben estar conectados a los mismos services**. La selección de tienda y el logout viven en `AuthService`; las notificaciones en `NotificacionService`; la tienda actual en `TiendaService`.

---

## 9. Core / Componentes utilitarios

### `EmptyStateComponent` (`core/components/empty-state`)
Inputs: `icon` (default `'📭'`), `title` (required), `message` (default `''`).
Uso: estados vacíos en listas / búsquedas.

### `ErrorStateComponent` (`core/components/error-state`)
Inputs: `message` (required), `showRetry` (default `true`).
Output: `retry` (`output<void>()`).
Uso: errores de carga con botón de reintento opcional.

### `StatusBadgeComponent` (`core/components/status-badge`)
Inputs: `label` (required), `type` (`'success' | 'error' | 'warning' | 'info'`).
Renderiza un pill con color según tipo.

### `CurrencyPePipe` (`core/pipes/currency-pe.pipe.ts`)
`{{ valor | currencyPe }}` → `"S/ 12.34"`. Acepta number, string o null/undefined. Siempre dos decimales.

**Estos cuatro elementos son utilities universales** — se usan en muchos features. Si rediseñas, puedes cambiar su look interno pero **mantén el contrato de inputs/outputs** porque otros componentes ya los consumen.

---

## 10. NotificacionService (`core/services/notificacion.service.ts`)

Servicio singleton que carga "alertas" del usuario.

### Estado
```ts
interface NotifState {
  items: NotifItem[];
  isLoading: boolean;
  error: string | null;
  cargado: boolean;
}

interface NotifItem {
  tipo: 'sin-stock' | 'stock-bajo' | 'deuda';
  titulo: string;
  detalle: string;
  ruta: string;   // ej. '/inventario', '/finanzas/deudas'
}
```

### Signals públicos
- `state` (readonly)
- `count` (computed: `items.length`)

### API
- `cargar(tiendaId?)` — concurrentemente (`Promise.allSettled`):
  - GET `inventory/stock/?tienda_id=<id>` → para cada producto con `cantidadDisponible <= 0` agrega "Sin stock"; con `cantidadDisponible <= 5` agrega "Stock bajo".
  - GET `finances/deudas/?estado=ACTIVA&page_size=1` → si `count > 0` agrega item "Créditos pendientes".
  - Acepta resultados paginados (`{results, count}`) o arrays directos.
- `dismiss(index)` — quita un item local (no impacta backend).
- `limpiar()` — reset.

### Endpoints
| Método | Endpoint                                     |
|--------|----------------------------------------------|
| GET    | `inventory/stock/?tienda_id=<id>`            |
| GET    | `finances/deudas/?estado=ACTIVA&page_size=1` |

**Nota**: los items se generan en cliente a partir del stock crudo. Si la API agrega un endpoint dedicado `notifications/`, sustituir la lógica.

---

## 11. Convenciones de código (a respetar en el rewrite)

### Estructura de feature module
```
features/<modulo>/
  pages/
    <pagina>/
      <pagina>.component.{ts,html,css}
  components/
    <comp>/<comp>.component.ts
  models/
    <entidad>.model.ts
  constants/
    <nombre>.ts
  validators/
    <modulo>.validators.ts
  <modulo>.service.ts
  <modulo>.repository.ts
```

### Repositorios
- Reciben `HttpClient` por `inject()`.
- Usan `firstValueFrom()` para devolver Promesas.
- Hacen **mapping snake_case → camelCase** ANTES de devolver al service.
- Centralizan las URLs de la API.
- Toleran respuestas paginadas (`{count, next, previous, results}`) cuando aplica.

### Servicios
- `signal<State>()` privado, `state = _state.asReadonly()` público.
- Computed signals para derivados.
- Mutaciones via `_state.update(s => ({...s, ...}))` o `_state.set(...)`.
- Mantienen una sola fuente de verdad por dominio (carrito, venta actual, etc.).
- Servicios singletons (default `@Injectable({ providedIn: 'root' })`) — el state vive durante toda la sesión.

### Componentes
- Standalone, `inject()`, NO constructor injection.
- Templates en archivos `.html` separados (excepto componentes pequeños inline).
- Signals como inputs (`input.required<T>()`, `input<T>(default)`).
- Outputs con `output<T>()`.
- Mínima lógica en componente — delegar a service.

### Models
- Interfaces `XxxModel` para el dominio.
- Funciones `xxxFromJson(json)` para mapear API → modelo si el shape difiere.
- Tipos derivados (DTOs de creación, payloads) en archivos `*-create.model.ts`, `*-read.model.ts`.

### Validators
- Funciones puras que reciben el dato y devuelven `string | null` (error message o null si válido).
- Composables: una página llama a varios.

### Constants
- Enums tipo `as const` + funciones `getXxxLabel(value): string` para mostrar.
- Listas como `const X_VALUES = [...]`.

---

## 12. Patrones de comportamiento

### Manejo de errores en UI
1. Service llama repository → repository lanza error o devuelve data.
2. Service hace `try/catch`, llama `extractApiError(err)`, guarda en `state.errorMessage` o similar.
3. Componente lee `state().errorMessage` y muestra `<app-error-state [message]="..." (retry)="...">`.

### Loading
- Service marca `isLoading: true` antes de la operación, `false` en `finally`.
- Componente lee `state().isLoading` para mostrar spinner.

### Paginación cursor (inventario, operaciones)
- Repository devuelve `{items, next, previous, count}` donde `next`/`previous` son URLs completas (DRF cursor pagination).
- Service mantiene `currentCursor`, `nextUrl`, `previousUrl`.
- `cargarSiguiente()` / `cargarAnterior()` usan las URLs absolutas.

### Selección de tienda
- Casi todos los endpoints requieren `tienda_id` como query param o body field.
- Se lee `auth.selectedTiendaId()` antes de cada operación.
- Si `selectedTiendaId === null` → no se puede operar; el guard ya forzó `/select-store`.

---

## 13. Resumen de endpoints API (top-level)

> Esta es una lista parcial. El detalle por feature está en cada `docs/feature-*.md`.

| Categoría    | Path base                  | Doc                          |
|--------------|----------------------------|------------------------------|
| Auth         | `auth/*`                   | Sección 3 (arriba)           |
| Inventario   | `inventory/*`              | `feature-inventario.md`      |
| Catálogo     | `catalog/*`                | `feature-inventario.md`      |
| Ventas       | `sales/*`                  | `feature-venta.md`           |
| Servicios    | `services/*`               | `feature-servicio.md`        |
| Finanzas     | `finances/*`               | `feature-finanzas.md`        |
| Asistencia   | `attendance/*`             | `feature-asistencia.md`      |
| Usuarios     | `users/*`                  | `feature-usuarios.md`        |
| Tiendas      | `stores/*`                 | `feature-tienda.md`          |
| Invitaciones | `invitations/*`            | `feature-invitation.md`      |
| Onboarding   | varios                     | `feature-onboarding.md`      |
| Operaciones  | (mezcla sales+services)    | `feature-operaciones.md`     |

---

## 14. Reglas para el rediseño

### Lo que NO se debe tocar
- `core/auth/*` — modelo de auth y service.
- `core/http/*` — interceptor y error handler.
- `core/storage/*` — storage service.
- `core/guards/*` — guards.
- `core/services/notificacion.service.ts` — lógica de notificaciones.
- `features/*/models/` — DTOs y modelos del dominio.
- `features/*/<feature>.repository.ts` — endpoints API.
- `features/*/<feature>.service.ts` — state management y lógica de dominio.
- `features/*/validators/` — reglas de validación.
- `features/*/constants/` — enums, labels.
- `environments/*`.
- `app.routes.ts` — el árbol de rutas puede simplificarse, pero los guards y la composición de redirects son intencionales.

### Lo que sí se rediseña
- `features/*/pages/**/*.component.{ts,html,css}` — todas las páginas.
- `features/*/components/**/*.component.{ts,html,css}` — componentes presentacionales.
- `layout/main-shell/*.component.{ts,html,css}` — el shell visual (pero conservando los signals/acciones).
- `core/components/*` — empty/error/badge: puede cambiar el look, NO el contrato de inputs/outputs.
- `src/styles.css`, tokens CSS.

### Lo que se podría reorganizar (con cuidado)
- Rutas: si quieres URLs separadas por step (`ventas/catalogo` real en vez de redirect), hay que mover state del componente padre a service global y respetar `CarritoService` como singleton.
- Componentes utilitarios (`flow-header`, `cliente-search`, etc.): pueden moverse a `shared/` si se reutilizan más; actualmente viven en sus features.

---

## 15. Próximos pasos (al rediseñar)

1. **Mantén un branch limpio** del estado actual antes de empezar.
2. **Empieza por una feature aislada** (ej. tiendas o usuarios) para validar tu nuevo sistema de design tokens / componentes base sin romper el flujo principal de venta.
3. **No alteres los modelos** durante el rediseño — cualquier cambio en `*.model.ts` implica también ajustar repository/service/backend.
4. **Para nuevas pantallas, consume los signals existentes** del service del feature. NO duplicar state en el componente.
5. **Si necesitas un endpoint nuevo**, agrégalo al repository correspondiente respetando el patrón de mapping snake_case → camelCase.
6. **Si renombras o quitas un componente utilitario** (empty-state, error-state, status-badge), busca todos los usos y migra antes de borrar.

---

Ver los archivos `docs/feature-*.md` para el detalle de cada módulo.
