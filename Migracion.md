# Plan de Migración Flutter → Angular

## Índice
1. [Estructura del proyecto Angular](#1-estructura-del-proyecto-angular)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Mapa de equivalencias Flutter → Angular](#3-mapa-de-equivalencias-flutter--angular)
4. [Fases de migración](#4-fases-de-migración)
   - [Fase 0: Setup y configuración base](#fase-0--setup-y-configuración-base-días-1-3)
   - [Fase 1: Core (auth, interceptor, guards, storage)](#fase-1--core-auth-interceptor-guards-storage-días-4-10)
   - [Fase 2: Módulos simples](#fase-2--módulos-simples-home-tienda-usuarios-asistencia-días-11-17)
   - [Fase 3: Inventario (lotes, paginación)](#fase-3--inventario-lotes-paginación-cursor-catálogo-días-18-25)
   - [Fase 4: Ventas (flujo complejo + SUNAT)](#fase-4--ventas-flujo-multi-paso--sunat-días-26-38)
   - [Fase 5: Servicios](#fase-5--servicios-días-39-44)
   - [Fase 6: Finanzas](#fase-6--finanzas-días-45-55)
   - [Fase 7: Impresora](#fase-7--impresora-días-56-61)
   - [Fase 8: Invitation + Onboarding](#fase-8--invitation--onboarding-días-62-67)
   - [Fase 9: UI global + tokens de color](#fase-9--ui-global-componentes-compartidos-días-68-73)
   - [Fase 10: Testing](#fase-10--testing-días-74-80)
5. [API endpoints de referencia](#5-api-endpoints-de-referencia)
6. [Decisiones de diseño](#6-decisiones-de-diseño)

---

## 1. Estructura del Proyecto Angular

Esta estructura es más organizada que la de Flutter porque aprovecha el sistema de módulos lazy-loaded y separa `models`, `services`, `guards` y `components` de forma explícita:

```
management-system-web/
├── src/
│   ├── app/
│   │   ├── core/                          ← Equivale a lib/core/
│   │   │   ├── auth/
│   │   │   │   ├── auth.service.ts        ← auth_provider.dart + auth_repository.dart
│   │   │   │   ├── auth.models.ts         ← auth_response_model.dart + user_me_model.dart
│   │   │   │   └── auth.guard.ts          ← _resolveRedirect() en router.dart
│   │   │   ├── http/
│   │   │   │   ├── api.interceptor.ts     ← auth_interceptor.dart
│   │   │   │   └── api-error.handler.ts   ← _extractErrorMessage() en repositories
│   │   │   ├── storage/
│   │   │   │   └── storage.service.ts     ← storage_service.dart
│   │   │   ├── guards/
│   │   │   │   ├── auth.guard.ts
│   │   │   │   └── role.guard.ts
│   │   │   ├── models/
│   │   │   │   └── store.model.ts         ← store_model.dart
│   │   │   ├── constants/
│   │   │   │   ├── roles.ts               ← constants.dart (Roles)
│   │   │   │   └── api.ts                 ← constants.dart (apiBaseUrl)
│   │   │   └── components/                ← lib/core/widgets/
│   │   │       ├── top-bar/               ← custom_app_bar.dart
│   │   │       ├── empty-state/           ← empty_state.dart
│   │   │       ├── error-state/           ← error_state.dart
│   │   │       ├── status-badge/          ← status_badge.dart
│   │   │       ├── loading-overlay/       ← loading_overlay.dart
│   │   │       └── sidebar-nav/           ← MainShell en router.dart
│   │   │
│   │   ├── features/
│   │   │   ├── auth/                      ← features/auth/
│   │   │   │   ├── login/
│   │   │   │   │   ├── login.component.ts
│   │   │   │   │   └── login.component.html
│   │   │   │   └── store-selector/        ← tienda_selection_page.dart
│   │   │   │
│   │   │   ├── onboarding/                ← features/onboarding/
│   │   │   │   ├── profile-complete/
│   │   │   │   ├── setup/
│   │   │   │   ├── onboarding.service.ts  ← profile_provider + setup_provider
│   │   │   │   └── onboarding.models.ts   ← empresa_model.dart
│   │   │   │
│   │   │   ├── home/
│   │   │   │   └── home.component.ts
│   │   │   │
│   │   │   ├── inventario/                ← features/lote/ (renombrado)
│   │   │   │   ├── pages/
│   │   │   │   │   ├── inventario-hub/    ← inventario_page.dart
│   │   │   │   │   ├── lote-list/         ← lote_list_page.dart
│   │   │   │   │   ├── lote-detail/       ← lote_detail_page.dart
│   │   │   │   │   ├── lote-form/         ← lote_form_page.dart
│   │   │   │   │   └── productos/         ← productos_page.dart
│   │   │   │   ├── components/
│   │   │   │   │   ├── producto-detail-sheet/
│   │   │   │   │   └── producto-catalogo-detail-sheet/
│   │   │   │   ├── models/
│   │   │   │   │   ├── lote.model.ts
│   │   │   │   │   ├── producto.model.ts
│   │   │   │   │   └── stock.model.ts
│   │   │   │   ├── inventario.service.ts  ← lote_provider.dart
│   │   │   │   └── inventario.repository.ts ← lote_repository.dart
│   │   │   │
│   │   │   ├── operaciones/               ← features/operaciones/
│   │   │   │   ├── operaciones-hub/
│   │   │   │   └── operaciones-historial/
│   │   │   │
│   │   │   ├── venta/                     ← features/venta/
│   │   │   │   ├── pages/
│   │   │   │   │   ├── catalogo/          ← venta_catalogo_page.dart
│   │   │   │   │   ├── carrito/           ← venta_carrito_page.dart
│   │   │   │   │   ├── resumen/           ← venta_resumen_page.dart
│   │   │   │   │   ├── propuesta-sunat/   ← venta_propuesta_sunat_page.dart
│   │   │   │   │   └── comprobante/       ← venta_comprobante_page.dart
│   │   │   │   ├── components/
│   │   │   │   │   ├── flow-header/       ← venta_flow_header.dart
│   │   │   │   │   └── cliente-search/    ← cliente_search_field.dart
│   │   │   │   ├── models/
│   │   │   │   │   ├── venta-create.model.ts
│   │   │   │   │   ├── venta-read.model.ts
│   │   │   │   │   └── cliente.model.ts
│   │   │   │   ├── constants/
│   │   │   │   │   ├── tipo-venta.ts
│   │   │   │   │   ├── metodo-pago.ts
│   │   │   │   │   ├── tipo-comprobante.ts
│   │   │   │   │   └── estado-sunat.ts
│   │   │   │   ├── validators/
│   │   │   │   │   └── venta.validators.ts ← venta_validator.dart
│   │   │   │   ├── carrito.service.ts      ← CarritoNotifier
│   │   │   │   ├── venta.service.ts        ← VentaNotifier
│   │   │   │   └── venta.repository.ts     ← venta_repository.dart
│   │   │   │
│   │   │   ├── servicio/                  ← features/servicio/
│   │   │   │   ├── pages/
│   │   │   │   │   ├── formulario/
│   │   │   │   │   ├── resumen/
│   │   │   │   │   └── comprobante/
│   │   │   │   ├── models/
│   │   │   │   │   ├── servicio-create.model.ts
│   │   │   │   │   ├── servicio-read.model.ts
│   │   │   │   │   └── nota-credito.model.ts
│   │   │   │   ├── servicio.service.ts
│   │   │   │   └── servicio.repository.ts
│   │   │   │
│   │   │   ├── finanzas/                  ← features/finanzas/
│   │   │   │   ├── pages/
│   │   │   │   │   ├── finanzas-hub/
│   │   │   │   │   ├── caja-resumen/
│   │   │   │   │   ├── caja-cierre/
│   │   │   │   │   ├── deudas/
│   │   │   │   │   ├── pago-resumen/
│   │   │   │   │   └── gastos/
│   │   │   │   ├── components/
│   │   │   │   │   └── deuda-card/        ← deuda_card.dart
│   │   │   │   ├── models/
│   │   │   │   │   ├── caja-resumen.model.ts
│   │   │   │   │   ├── deuda.model.ts
│   │   │   │   │   ├── pago.model.ts
│   │   │   │   │   ├── gasto-fijo.model.ts
│   │   │   │   │   ├── gasto-variable.model.ts
│   │   │   │   │   └── gasto-tipo.model.ts
│   │   │   │   ├── constants/
│   │   │   │   │   └── estados-deuda.ts   ← estados_deuda.dart
│   │   │   │   ├── finanzas.service.ts    ← finanzas_provider.dart
│   │   │   │   └── finanzas.repository.ts ← finanzas_repository.dart
│   │   │   │
│   │   │   ├── impresora/                 ← features/impresora/
│   │   │   │   ├── impresora-config/
│   │   │   │   ├── impresora.service.ts   ← impresora_provider.dart
│   │   │   │   └── ticket.converter.ts    ← ticket_converter.dart
│   │   │   │
│   │   │   ├── tienda/                    ← features/tienda/
│   │   │   │   ├── pages/
│   │   │   │   │   ├── tiendas/
│   │   │   │   │   └── tienda-form/
│   │   │   │   ├── components/
│   │   │   │   │   ├── tienda-edit-sheet/
│   │   │   │   │   └── tienda-switcher/
│   │   │   │   ├── tienda.service.ts
│   │   │   │   └── tienda.repository.ts
│   │   │   │
│   │   │   ├── usuarios/                  ← features/users/
│   │   │   │   ├── usuarios.component.ts
│   │   │   │   ├── usuarios.service.ts
│   │   │   │   └── models/
│   │   │   │       └── usuario-tienda.model.ts
│   │   │   │
│   │   │   ├── asistencia/                ← features/asistencia/
│   │   │   │   ├── asistencia.component.ts
│   │   │   │   ├── asistencia.service.ts
│   │   │   │   └── models/
│   │   │   │
│   │   │   └── invitation/                ← features/invitation/
│   │   │       ├── pages/
│   │   │       │   ├── invitation-form/
│   │   │       │   └── invitation-accept/
│   │   │       ├── invitation.service.ts
│   │   │       └── models/
│   │   │
│   │   ├── layout/
│   │   │   └── main-shell/                ← MainShell en router.dart
│   │   │       ├── main-shell.component.ts
│   │   │       └── main-shell.component.html
│   │   │
│   │   ├── app.routes.ts                  ← core/router.dart
│   │   ├── app.component.ts
│   │   └── app.config.ts
│   │
│   ├── styles/
│   │   ├── tokens.scss                    ← app_colors.dart
│   │   ├── components.scss
│   │   └── styles.scss
│   │
│   └── environments/
│       ├── environment.ts                 ← constants.dart (dev)
│       └── environment.prod.ts            ← constants.dart (prod)
```

---

## 2. Stack Tecnológico

| Necesidad | Librería | Versión | Equivalente Flutter |
|---|---|---|---|
| Framework | Angular | 18+ | Flutter |
| Lenguaje | TypeScript 5.x | strict mode | Dart |
| Estado global | Angular Signals | built-in (v17+) | Riverpod Notifier |
| HTTP | HttpClient + Interceptors | built-in | Dio + AuthInterceptor |
| Routing | Angular Router | built-in | GoRouter |
| Formularios | Reactive Forms | built-in | Dart form + validators |
| UI Components | Angular Material 18 | `@angular/material` | Flutter Material |
| Estilos | SCSS + CSS Variables | — | AppColors + Theme |
| PDF | jsPDF + html2canvas | `jspdf` | printing package |
| Notificaciones | Angular CDK Overlay (Snackbar) | built-in | SnackBar |
| Storage | localStorage wrapper service | nativo | SharedPreferences |
| Internacionalización | Pipe `date` + `currency` | built-in (intl) | intl package |
| Testing | Jest + Angular Testing Library | `jest`, `@testing-library/angular` | flutter_test |

```bash
ng new management-system-web \
  --routing \
  --style=scss \
  --strict \
  --standalone
```

```bash
npm install @angular/material @angular/cdk
npm install jspdf
npm install --save-dev jest @testing-library/angular @testing-library/jest-dom
```

---

## 3. Mapa de Equivalencias Flutter → Angular

### Estado (Riverpod → Angular Signals)

| Flutter (Riverpod) | Angular |
|---|---|
| `NotifierProvider<X, State>` | `@Injectable() service` con `signal<State>()` |
| `state = state.copyWith(...)` | `this._state.update(s => ({...s, ...cambios}))` |
| `ref.watch(provider)` | `inject(Service).stateSignal()` en template |
| `ref.read(provider.notifier).method()` | `inject(Service).method()` |
| `FutureProvider` | `computed()` + llamada async en `ngOnInit` |
| `FutureProvider.family` | método del service con parámetro |
| `ref.onDispose()` | `DestroyRef` + `takeUntilDestroyed()` |

### Repositorios

| Flutter | Angular |
|---|---|
| `final repo = Provider((ref) { final dio = ref.watch(dioProvider); return Repo(dio); })` | `@Injectable({ providedIn: 'root' }) class Repo { constructor(private http: HttpClient) {} }` |
| `on DioException catch (e) { _extractErrorMessage(e); }` | `catchError(err => throwError(() => this.extractError(err)))` |
| `response.data as Map<String, dynamic>` | `response as ApiModel` (tipado por HttpClient) |

### Navegación

| Flutter (GoRouter) | Angular Router |
|---|---|
| `context.go('/ruta')` | `router.navigate(['/ruta'])` |
| `context.push('/ruta')` | `router.navigate(['/ruta'])` |
| `context.pop()` | `location.back()` |
| `state.extra as T` | `router.getCurrentNavigation()?.extras.state` |
| `redirect: (context, state) => ...` | `canActivate: [authGuard]` + `CanActivateFn` |
| `ShellRoute` | `component: MainShellComponent` con `<router-outlet>` |
| `state.pathParameters['id']` | `route.snapshot.paramMap.get('id')` |
| `state.uri.queryParameters['token']` | `route.snapshot.queryParamMap.get('token')` |

---

## 4. Fases de Migración

---

### Fase 0 — Setup y Configuración Base (Días 1-3)

**0.1 Crear el proyecto**

```bash
ng new management-system-web --routing --style=scss --strict --standalone
cd management-system-web
ng add @angular/material  # Seleccionar tema: Custom
npm install jspdf
```

**0.2 Environments (equivale a `constants.dart`)**

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://127.0.0.1:8000/api/',
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiBaseUrl: 'https://tu-dominio.com/api/',
};
```

**0.3 Configurar HttpClient con interceptor en `app.config.ts`**

```typescript
// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { authInterceptor } from './core/http/api.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
  ],
};
```

**0.4 Tokens de color (equivale a `app_colors.dart`)**

```scss
// src/styles/tokens.scss
:root {
  --color-primary:          #2F3A8F;
  --color-primary-light:    #3949AB;
  --color-accent:           #1565C0;

  --color-text-primary:     #1A1A1A;
  --color-text-secondary:   #555555;
  --color-text-tertiary:    #888888;

  --color-bg-light:         #F5F7FA;
  --color-bg-white:         #FFFFFF;

  --color-border-light:     #E0E0E0;
  --color-border-medium:    #BDBDBD;

  --color-success:          #2E7D32;
  --color-error:            #C62828;
  --color-warning:          #F57F17;
  --color-info:             #0277BD;

  font-family: 'Roboto', sans-serif;
}
```

---

### Fase 1 — Core: Auth, Interceptor, Guards, Storage (Días 4-10)

Esta fase es el cimiento. No avanzar a otras fases hasta que auth funcione completamente.

**1.1 StorageService (equivale a `storage_service.dart`)**

En web no hay `FlutterSecureStorage`. Usamos `localStorage` para los tokens y la tienda activa:

```typescript
// src/app/core/storage/storage.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly TOKEN_KEY       = 'access_token';
  private readonly REFRESH_KEY     = 'refresh_token';
  private readonly LAST_TIENDA_KEY = 'last_tienda_id';

  saveToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token.trim());
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  saveRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_KEY, token.trim());
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  clearAuthTokens(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
  }

  setLastTiendaId(id: number): void {
    localStorage.setItem(this.LAST_TIENDA_KEY, String(id));
  }

  getLastTiendaId(): number | null {
    const val = localStorage.getItem(this.LAST_TIENDA_KEY);
    return val ? parseInt(val, 10) : null;
  }
}
```

**1.2 Auth Models (equivale a `auth_response_model.dart` + `user_me_model.dart`)**

```typescript
// src/app/core/auth/auth.models.ts
export interface AuthResponseModel {
  access:  string;
  refresh: string;
}

export interface UserTiendaModel {
  tiendaId:     number;
  tiendaNombre: string;
}

export interface UserMeModel {
  id:        number;
  username:  string;
  email:     string;
  firstName: string;
  lastName:  string;
  rol:       string | null;
  tiendas:   UserTiendaModel[];
}

export function isProfileIncomplete(user: UserMeModel): boolean {
  return !user.firstName.trim() || !user.lastName.trim();
}

export function isDueno(user: UserMeModel): boolean {
  return user.rol === 'dueno';
}

export const Roles = {
  dueno:         'dueno',
  administrador: 'administrador',
  trabajador:    'trabajador',
} as const;
```

**1.3 AuthService (equivale a `auth_provider.dart` + `auth_repository.dart`)**

```typescript
// src/app/core/auth/auth.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService } from '../storage/storage.service';
import { AuthResponseModel, UserMeModel } from './auth.models';

export interface AuthState {
  isLoading:        boolean;
  errorMessage:     string | null;
  authData:         AuthResponseModel | null;
  userMe:           UserMeModel | null;
  selectedTiendaId: number | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http    = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly base    = environment.apiBaseUrl;

  private readonly _state = signal<AuthState>({
    isLoading: false, errorMessage: null,
    authData: null, userMe: null, selectedTiendaId: null,
  });

  readonly state            = this._state.asReadonly();
  readonly isAuthenticated  = computed(() => this._state().authData !== null);
  readonly userMe           = computed(() => this._state().userMe);
  readonly selectedTiendaId = computed(() => this._state().selectedTiendaId);
  readonly isDueno          = computed(() => this._state().userMe?.rol === 'dueno');
  readonly isAdmin          = computed(() => this._state().userMe?.rol === 'administrador');
  readonly canViewUsuarios  = computed(() => this.isDueno() || this.isAdmin());

  async login(username: string, password: string): Promise<void> {
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null }));
    try {
      const authData = await firstValueFrom(
        this.http.post<AuthResponseModel>(`${this.base}auth/login/`, { username, password })
      );
      this.storage.saveToken(authData.access);
      this.storage.saveRefreshToken(authData.refresh);

      const raw      = await firstValueFrom(this.http.get<any>(`${this.base}auth/me/`));
      const userData = this.mapUserMe(raw);

      let selectedTiendaId: number | null = null;
      if (userData.tiendas.length > 0) {
        const lastId = this.storage.getLastTiendaId();
        const existe = userData.tiendas.some(t => t.tiendaId === lastId);
        selectedTiendaId = existe ? lastId : userData.tiendas[0].tiendaId;
      }

      this._state.set({ isLoading: false, errorMessage: null, authData, userMe: userData, selectedTiendaId });
    } catch (err: any) {
      const msg = err?.error?.detail ?? err?.error?.non_field_errors?.[0] ?? 'Error al iniciar sesión';
      this._state.update(s => ({ ...s, isLoading: false, errorMessage: msg }));
    }
  }

  logout(): void {
    this.storage.clearAuthTokens();
    this._state.set({ isLoading: false, errorMessage: null, authData: null, userMe: null, selectedTiendaId: null });
  }

  selectTienda(tiendaId: number): void {
    this.storage.setLastTiendaId(tiendaId);
    this._state.update(s => ({ ...s, selectedTiendaId: tiendaId }));
  }

  updateUserMe(userMe: UserMeModel): void {
    this._state.update(s => ({ ...s, userMe }));
  }

  private mapUserMe(json: any): UserMeModel {
    return {
      id:        json.id,
      username:  json.username,
      email:     json.email,
      firstName: json.first_name ?? '',
      lastName:  json.last_name  ?? '',
      rol:       json.rol ?? null,
      tiendas:   (json.tiendas as any[]).map(t => ({
        tiendaId:     t.tienda_id,
        tiendaNombre: t.tienda_nombre,
      })),
    };
  }
}
```

**1.4 API Interceptor (equivale a `auth_interceptor.dart`)**

Replica exactamente la lógica: inject token → si 401 → refresh → retry → si falla → logout:

```typescript
// src/app/core/http/api.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { StorageService } from '../storage/storage.service';
import { AuthService }   from '../auth/auth.service';
import { environment }   from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(StorageService);
  const auth    = inject(AuthService);
  const http    = inject(HttpClient);

  const token   = storage.getToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || req.url.includes('auth/refresh/')) {
        return throwError(() => err);
      }

      const refreshToken = storage.getRefreshToken();
      if (!refreshToken) {
        auth.logout();
        return throwError(() => err);
      }

      return http.post<{ access: string; refresh: string }>(
        `${environment.apiBaseUrl}auth/refresh/`,
        { refresh: refreshToken }
      ).pipe(
        switchMap(tokens => {
          storage.saveToken(tokens.access);
          storage.saveRefreshToken(tokens.refresh);
          const retryReq = req.clone({
            setHeaders: { Authorization: `Bearer ${tokens.access}` }
          });
          return next(retryReq);
        }),
        catchError(refreshErr => {
          auth.logout();
          return throwError(() => refreshErr);
        })
      );
    })
  );
};
```

**1.5 Guards de ruta (equivale a `_resolveRedirect()` en `router.dart`)**

```typescript
// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { isProfileIncomplete, isDueno as checkDueno } from '../auth/auth.models';

export const authGuard: CanActivateFn = (route, state) => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const path   = state.url.split('?')[0];

  if (path.startsWith('/invite')) return true;

  if (!auth.isAuthenticated()) {
    return path === '/login' ? true : router.createUrlTree(['/login']);
  }

  const user    = auth.userMe()!;
  const tiendas = user.tiendas;

  if (isProfileIncomplete(user)) {
    return path === '/profile/complete' ? true : router.createUrlTree(['/profile/complete']);
  }

  if (checkDueno(user) && tiendas.length === 0) {
    return path === '/setup' ? true : router.createUrlTree(['/setup']);
  }

  const hasTienda = auth.selectedTiendaId() !== null;
  if (!hasTienda && tiendas.length > 0) {
    return path === '/select-store' ? true : router.createUrlTree(['/select-store']);
  }

  if (hasTienda && path === '/select-store') {
    return router.createUrlTree(['/home']);
  }

  if (['/login', '/profile/complete', '/setup'].includes(path)) {
    return router.createUrlTree(['/home']);
  }

  return true;
};

export const duenioGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return auth.isDueno() ? true : router.createUrlTree(['/finanzas']);
};

export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return auth.canViewUsuarios() ? true : router.createUrlTree(['/home']);
};
```

**1.6 Helper de errores API (equivale a `_extractErrorMessage` en repositories)**

```typescript
// src/app/core/http/api-error.handler.ts
import { HttpErrorResponse } from '@angular/common/http';

export function extractApiError(err: HttpErrorResponse): string {
  const data = err.error;
  if (!data) return 'Error en la operación';

  if (typeof data === 'object') {
    const values = Object.values(data);
    if (values.length > 0) {
      const first = values[0];
      if (Array.isArray(first)) return String(first[0]);
      return String(first);
    }
  }

  return 'Error en la operación';
}
```

---

### Fase 2 — Módulos Simples: Home, Tienda, Usuarios, Asistencia (Días 11-17)

**2.1 Router principal (equivale a `router.dart` completo)**

```typescript
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, adminGuard, duenioGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login',            loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'invite',           loadComponent: () => import('./features/invitation/pages/invitation-accept/invitation-accept.component').then(m => m.InvitationAcceptComponent) },
  { path: 'profile/complete', loadComponent: () => import('./features/onboarding/profile-complete/profile-complete.component').then(m => m.ProfileCompleteComponent), canActivate: [authGuard] },
  { path: 'setup',            loadComponent: () => import('./features/onboarding/setup/setup.component').then(m => m.SetupComponent), canActivate: [authGuard] },
  { path: 'select-store',     loadComponent: () => import('./features/auth/store-selector/store-selector.component').then(m => m.StoreSelectorComponent), canActivate: [authGuard] },

  {
    path: '',
    loadComponent: () => import('./layout/main-shell/main-shell.component').then(m => m.MainShellComponent),
    canActivate: [authGuard],
    children: [
      { path: 'home',        loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent) },

      { path: 'inventario',             loadComponent: () => import('./features/inventario/pages/inventario-hub/inventario-hub.component').then(m => m.InventarioHubComponent) },
      { path: 'inventario/lotes',       loadComponent: () => import('./features/inventario/pages/lote-list/lote-list.component').then(m => m.LoteListComponent) },
      { path: 'inventario/lotes/nuevo', loadComponent: () => import('./features/inventario/pages/lote-form/lote-form.component').then(m => m.LoteFormComponent) },
      { path: 'inventario/lotes/:id',   loadComponent: () => import('./features/inventario/pages/lote-detail/lote-detail.component').then(m => m.LoteDetailComponent) },
      { path: 'inventario/productos',   loadComponent: () => import('./features/inventario/pages/productos/productos.component').then(m => m.ProductosComponent) },

      { path: 'operaciones',           loadComponent: () => import('./features/operaciones/operaciones-hub/operaciones-hub.component').then(m => m.OperacionesHubComponent) },
      { path: 'operaciones/historial', loadComponent: () => import('./features/operaciones/operaciones-historial/operaciones-historial.component').then(m => m.OperacionesHistorialComponent) },
      { path: 'ventas',                loadComponent: () => import('./features/venta/pages/catalogo/catalogo.component').then(m => m.CatalogoComponent) },
      { path: 'ventas/carrito',        loadComponent: () => import('./features/venta/pages/carrito/carrito.component').then(m => m.CarritoComponent) },
      { path: 'ventas/resumen',        loadComponent: () => import('./features/venta/pages/resumen/resumen.component').then(m => m.ResumenComponent) },
      { path: 'ventas/propuesta-sunat',loadComponent: () => import('./features/venta/pages/propuesta-sunat/propuesta-sunat.component').then(m => m.PropuestaSunatComponent) },
      { path: 'ventas/comprobante',    loadComponent: () => import('./features/venta/pages/comprobante/comprobante.component').then(m => m.ComprobanteComponent) },
      { path: 'servicios',             loadComponent: () => import('./features/servicio/pages/formulario/formulario.component').then(m => m.FormularioComponent) },
      { path: 'servicios/resumen',     loadComponent: () => import('./features/servicio/pages/resumen/resumen.component').then(m => m.ResumenServicioComponent) },
      { path: 'servicios/comprobante', loadComponent: () => import('./features/servicio/pages/comprobante/comprobante.component').then(m => m.ComprobanteServicioComponent) },

      { path: 'finanzas',              loadComponent: () => import('./features/finanzas/pages/finanzas-hub/finanzas-hub.component').then(m => m.FinanzasHubComponent) },
      { path: 'finanzas/caja/resumen', loadComponent: () => import('./features/finanzas/pages/caja-resumen/caja-resumen.component').then(m => m.CajaResumenComponent) },
      { path: 'finanzas/caja/cierre',  loadComponent: () => import('./features/finanzas/pages/caja-cierre/caja-cierre.component').then(m => m.CajaCierreComponent) },
      { path: 'finanzas/deudas',       loadComponent: () => import('./features/finanzas/pages/deudas/deudas.component').then(m => m.DeudasComponent) },
      { path: 'finanzas/pago-resumen', loadComponent: () => import('./features/finanzas/pages/pago-resumen/pago-resumen.component').then(m => m.PagoResumenComponent) },
      { path: 'finanzas/gastos',       loadComponent: () => import('./features/finanzas/pages/gastos/gastos.component').then(m => m.GastosComponent), canActivate: [duenioGuard] },

      { path: 'usuarios',   loadComponent: () => import('./features/usuarios/usuarios.component').then(m => m.UsuariosComponent), canActivate: [adminGuard] },
      { path: 'asistencia', loadComponent: () => import('./features/asistencia/asistencia.component').then(m => m.AsistenciaComponent), canActivate: [adminGuard] },

      { path: 'tiendas',      loadComponent: () => import('./features/tienda/pages/tiendas/tiendas.component').then(m => m.TiendasComponent) },
      { path: 'tiendas/form', loadComponent: () => import('./features/tienda/pages/tienda-form/tienda-form.component').then(m => m.TiendaFormComponent) },

      { path: 'config/impresora', loadComponent: () => import('./features/impresora/impresora-config/impresora-config.component').then(m => m.ImpresoraConfigComponent) },

      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ]
  },

  { path: 'invitation/new', loadComponent: () => import('./features/invitation/pages/invitation-form/invitation-form.component').then(m => m.InvitationFormComponent), canActivate: [authGuard] },
  { path: '**', redirectTo: '/login' },
];
```

**2.2 MainShell (equivale a `MainShell` widget en `router.dart`)**

```typescript
// src/app/layout/main-shell/main-shell.component.ts
import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-main-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-shell.component.html',
})
export class MainShellComponent {
  private readonly auth    = inject(AuthService);
  readonly canViewUsuarios = this.auth.canViewUsuarios;
  readonly isDueno         = this.auth.isDueno;
  readonly userMe          = this.auth.userMe;

  logout(): void {
    this.auth.logout();
    inject(Router).navigate(['/login']);
  }
}
```

```html
<!-- main-shell.component.html -->
<div class="shell-layout">
  <nav class="sidebar">
    <div class="sidebar-brand">
      <span>Sistema de Gestión</span>
    </div>
    <ul class="nav-links">
      <li><a routerLink="/home"        routerLinkActive="active">Inicio</a></li>
      <li><a routerLink="/inventario"  routerLinkActive="active">Inventario</a></li>
      <li><a routerLink="/operaciones" routerLinkActive="active">Operaciones</a></li>
      <li><a routerLink="/finanzas"    routerLinkActive="active">Finanzas</a></li>
      @if (canViewUsuarios()) {
        <li><a routerLink="/usuarios"  routerLinkActive="active">Usuarios</a></li>
      }
    </ul>
    <button (click)="logout()">Cerrar sesión</button>
  </nav>
  <main class="main-content">
    <router-outlet />
  </main>
</div>
```

> **Nota de diseño:** El `BottomNavigationBar` del móvil se convierte en sidebar lateral en web. En pantallas < 768px colapsa a hamburger menu.

---

### Fase 3 — Inventario: Lotes, Paginación Cursor, Catálogo (Días 18-25)

**3.1 InventarioService (equivale a `lote_provider.dart`)**

El patrón de paginación cursor-based de Riverpod se replica con Signals:

```typescript
// src/app/features/inventario/inventario.service.ts
import { Injectable, signal, inject } from '@angular/core';
import { AuthService }          from '../../core/auth/auth.service';
import { InventarioRepository } from './inventario.repository';
import { LoteResponse }         from './models/lote.model';

export interface InventarioState {
  isLoading:     boolean;
  isSaving:      boolean;
  errorMessage:  string | null;
  successMessage: string | null;
  lotes:         LoteResponse[];
  nextCursor:    string | null;
  hasMore:       boolean;
  isLoadingMore: boolean;
}

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly repo = inject(InventarioRepository);
  private readonly auth = inject(AuthService);

  private readonly _state = signal<InventarioState>({
    isLoading: false, isSaving: false,
    errorMessage: null, successMessage: null,
    lotes: [], nextCursor: null, hasMore: false, isLoadingMore: false,
  });
  readonly state = this._state.asReadonly();

  async cargarLotes(): Promise<void> {
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) return;

    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null }));
    try {
      const result = await this.repo.getLotes(tiendaId);
      this._state.update(s => ({
        ...s, isLoading: false,
        lotes: result.lotes,
        nextCursor: result.nextCursor,
        hasMore: result.nextCursor !== null,
      }));
    } catch (e: any) {
      this._state.update(s => ({ ...s, isLoading: false, errorMessage: e.message }));
    }
  }

  async cargarMasLotes(): Promise<void> {
    const s = this._state();
    if (s.isLoadingMore || !s.hasMore) return;
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) return;

    this._state.update(st => ({ ...st, isLoadingMore: true }));
    try {
      const result = await this.repo.getLotes(tiendaId, s.nextCursor ?? undefined);
      this._state.update(st => ({
        ...st, isLoadingMore: false,
        lotes: [...st.lotes, ...result.lotes],
        nextCursor: result.nextCursor,
        hasMore: result.nextCursor !== null,
      }));
    } catch {
      this._state.update(st => ({ ...st, isLoadingMore: false }));
    }
  }

  clearMessages(): void {
    this._state.update(s => ({ ...s, errorMessage: null, successMessage: null }));
  }
}
```

**3.2 Infinite scroll en el componente**

```typescript
// lote-list.component.ts
import { Component, OnInit, inject, HostListener } from '@angular/core';
import { InventarioService } from '../../inventario.service';

@Component({ /* ... */ })
export class LoteListComponent implements OnInit {
  readonly svc   = inject(InventarioService);
  readonly state = this.svc.state;

  ngOnInit(): void { this.svc.cargarLotes(); }

  @HostListener('window:scroll')
  onScroll(): void {
    const nearBottom = (window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 300);
    if (nearBottom) this.svc.cargarMasLotes();
  }
}
```

---

### Fase 4 — Ventas: Flujo Multi-paso + SUNAT (Días 26-38)

Esta es la fase más crítica. El flujo `Catálogo → Carrito → Resumen → [SUNAT] → Comprobante` debe preservar estado entre navegaciones.

**4.1 CarritoService (equivale a `CarritoNotifier`)**

```typescript
// src/app/features/venta/carrito.service.ts
import { Injectable, signal, computed } from '@angular/core';

export interface CarritoItem {
  productoId?:     number;
  loteProductoId?: number;
  productoNombre:  string;
  unidadMedida:    string;
  cantidad:        number;
  precioVenta:     number;
  esAveriado:      boolean;
  productoImagen?: string;
}

@Injectable({ providedIn: 'root' })
export class CarritoService {
  private readonly _items = signal<CarritoItem[]>([]);

  readonly items = this._items.asReadonly();
  readonly total = computed(() => this._items().reduce((sum, i) => sum + i.cantidad * i.precioVenta, 0));
  readonly count = computed(() => this._items().length);

  agregarItem(item: CarritoItem): void {
    this._items.update(items => [...items, item]);
  }

  eliminarItem(index: number): void {
    this._items.update(items => items.filter((_, i) => i !== index));
  }

  actualizarCantidad(index: number, cantidad: number): void {
    if (cantidad <= 0) return;
    this._items.update(items =>
      items.map((item, i) => i === index ? { ...item, cantidad } : item)
    );
  }

  actualizarPrecio(index: number, precioVenta: number): void {
    this._items.update(items =>
      items.map((item, i) => i === index ? { ...item, precioVenta } : item)
    );
  }

  actualizarAveriado(index: number, esAveriado: boolean): void {
    this._items.update(items =>
      items.map((item, i) => i === index ? { ...item, esAveriado } : item)
    );
  }

  limpiar(): void { this._items.set([]); }
}
```

**4.2 Validadores de venta (equivale a `venta_validator.dart`)**

Cada regla de negocio del Dart se convierte en un `ValidatorFn` reutilizable:

```typescript
// src/app/features/venta/validators/venta.validators.ts
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function rucValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value?.trim() ?? '';
    if (!val) return null;
    return /^\d{11}$/.test(val) ? null : { invalidRuc: 'RUC debe tener exactamente 11 dígitos' };
  };
}

export function noRucEnBoletaValidator(tipoComprobanteControl: AbstractControl): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (tipoComprobanteControl.value !== '03') return null;
    return control.value === '6' ? { rucEnBoleta: 'Boleta no permite RUC' } : null;
  };
}

// Cross-field validator: equivale a validate() en VentaCreateModel
export function ventaFormValidator(group: AbstractControl): ValidationErrors | null {
  const tipo            = group.get('tipoVenta')?.value ?? 'NORMAL';
  const tipoComprobante = group.get('tipoComprobante')?.value;
  const clienteId       = group.get('clienteId')?.value;

  if (tipo === 'CREDITO' && !clienteId) {
    return { clienteRequerido: 'Cliente requerido para venta a crédito' };
  }
  if (tipo === 'SUNAT' && !tipoComprobante) {
    return { comprobanteRequerido: 'Tipo de comprobante requerido para SUNAT' };
  }
  if (tipo === 'SUNAT' && tipoComprobante === '01' && !clienteId) {
    return { clienteFacturaRequerido: 'Cliente con RUC requerido para factura' };
  }

  return null;
}
```

**4.3 ResumenVentaService (equivale a `ResumenVentaNotifier`)**

Persiste el estado del formulario mientras el usuario navega entre pasos:

```typescript
// src/app/features/venta/resumen-venta.service.ts
import { Injectable, signal } from '@angular/core';

export interface ResumenVentaState {
  tipoVenta:            string;
  metodoPago:           string;
  tipoComprobante:      string;
  tipoDocumento:        string;
  usarClienteExistente: boolean;
  clienteId:            number | null;
  nombre:               string;
  numeroDocumento:      string;
  telefono:             string;
  email:                string;
  direccion:            string;
}

const INITIAL_STATE: ResumenVentaState = {
  tipoVenta: 'NORMAL', metodoPago: 'EFECTIVO',
  tipoComprobante: '03', tipoDocumento: '1',
  usarClienteExistente: true, clienteId: null,
  nombre: '', numeroDocumento: '', telefono: '', email: '', direccion: '',
};

@Injectable({ providedIn: 'root' })
export class ResumenVentaService {
  private readonly _state = signal<ResumenVentaState>(INITIAL_STATE);
  readonly state = this._state.asReadonly();

  actualizar(partial: Partial<ResumenVentaState>): void {
    this._state.update(s => ({ ...s, ...partial }));
  }

  limpiar(): void { this._state.set(INITIAL_STATE); }
}
```

**4.4 VentaService (equivale a `VentaNotifier`)**

```typescript
// src/app/features/venta/venta.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthService }    from '../../core/auth/auth.service';
import { VentaRepository } from './venta.repository';
import { CarritoService } from './carrito.service';
import { VentaCreateModel, VentaReadModel, ConfirmarSunatItem } from './models/venta-create.model';

export interface VentaState {
  isLoading:      boolean;
  isSaving:       boolean;
  errorMessage:   string | null;
  successMessage: string | null;
  ventaCreada:    VentaReadModel | null;
}

@Injectable({ providedIn: 'root' })
export class VentaService {
  private readonly repo    = inject(VentaRepository);
  private readonly auth    = inject(AuthService);
  private readonly carrito = inject(CarritoService);

  private readonly _state = signal<VentaState>({
    isLoading: false, isSaving: false,
    errorMessage: null, successMessage: null, ventaCreada: null,
  });

  readonly state       = this._state.asReadonly();
  readonly ventaCreada = computed(() => this._state().ventaCreada);

  async crearVenta(data: VentaCreateModel): Promise<void> {
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      const venta = await this.repo.crearVenta(data);
      this._state.update(s => ({
        ...s, isSaving: false, ventaCreada: venta,
        successMessage: venta.propuestaSunat
          ? 'Venta creada. Confirma la propuesta SUNAT'
          : 'Venta creada exitosamente',
      }));
    } catch (e: any) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: e.message }));
    }
  }

  async confirmarSunat(numeroComprobante: string, items: ConfirmarSunatItem[]): Promise<void> {
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      const venta = await this.repo.confirmarSunat(numeroComprobante, items);
      this._state.update(s => ({ ...s, isSaving: false, ventaCreada: venta, successMessage: 'Propuesta SUNAT confirmada' }));
    } catch (e: any) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: e.message }));
    }
  }

  async emitirNotaCredito(numeroComprobante: string, opciones: any): Promise<VentaReadModel | null> {
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      const venta = await this.repo.emitirNotaCredito(numeroComprobante, opciones);
      this._state.update(s => ({ ...s, isSaving: false, successMessage: 'Nota de crédito emitida' }));
      return venta;
    } catch (e: any) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: e.message }));
      return null;
    }
  }

  clearMessages(): void {
    this._state.update(s => ({ ...s, errorMessage: null, successMessage: null }));
  }
}
```

**4.5 Formulario de resumen con Reactive Forms**

```typescript
// resumen.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ResumenVentaService } from '../../resumen-venta.service';
import { VentaService }        from '../../venta.service';
import { ventaFormValidator, rucValidator } from '../../validators/venta.validators';

@Component({ imports: [ReactiveFormsModule], /* ... */ })
export class ResumenComponent implements OnInit {
  private readonly fb  = inject(FormBuilder);
  readonly svc         = inject(ResumenVentaService);
  readonly ventaSvc    = inject(VentaService);

  form: ReturnType<typeof this.buildForm> | undefined;

  ngOnInit(): void {
    const saved = this.svc.state();
    this.form = this.buildForm(saved);

    // Persistir cambios al service mientras el usuario llena el form
    this.form.valueChanges.subscribe(val => this.svc.actualizar(val as any));

    // Control dinámico: si tipo=SUNAT y comprobante=01, numeroDocumento requiere RUC
    this.form.get('tipoComprobante')?.valueChanges.subscribe(tc => {
      const ndCtrl = this.form!.get('numeroDocumento')!;
      ndCtrl.setValidators(tc === '01' ? [Validators.required, rucValidator()] : []);
      ndCtrl.updateValueAndValidity();
    });
  }

  private buildForm(saved: any) {
    return this.fb.group({
      tipoVenta:            [saved.tipoVenta],
      metodoPago:           [saved.metodoPago, Validators.required],
      tipoComprobante:      [saved.tipoComprobante],
      usarClienteExistente: [saved.usarClienteExistente],
      clienteId:            [saved.clienteId],
      tipoDocumento:        [saved.tipoDocumento],
      nombre:               [saved.nombre],
      numeroDocumento:      [saved.numeroDocumento],
      telefono:             [saved.telefono],
      email:                [saved.email],
      direccion:            [saved.direccion],
    }, { validators: ventaFormValidator });
  }
}
```

---

### Fase 5 — Servicios (Días 39-44)

El módulo de servicios sigue el mismo patrón que ventas pero más simple (sin carrito ni catálogo).

```typescript
// src/app/features/servicio/servicio.service.ts
import { Injectable, signal, inject } from '@angular/core';
import { ServicioRepository } from './servicio.repository';

export interface ServicioState {
  isLoading:      boolean;
  isSaving:       boolean;
  errorMessage:   string | null;
  successMessage: string | null;
  servicioCreado: any | null;
}

@Injectable({ providedIn: 'root' })
export class ServicioService {
  private readonly repo   = inject(ServicioRepository);

  private readonly _state = signal<ServicioState>({
    isLoading: false, isSaving: false,
    errorMessage: null, successMessage: null, servicioCreado: null,
  });
  readonly state = this._state.asReadonly();

  async crearServicio(data: any): Promise<void> {
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      const servicio = await this.repo.crearServicio(data);
      this._state.update(s => ({ ...s, isSaving: false, servicioCreado: servicio, successMessage: 'Servicio creado exitosamente' }));
    } catch (e: any) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: e.message }));
    }
  }

  async emitirNotaCredito(numeroComprobante: string, data: any): Promise<void> {
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      await this.repo.emitirNotaCredito(numeroComprobante, data);
      this._state.update(s => ({ ...s, isSaving: false, successMessage: 'Nota de crédito emitida' }));
    } catch (e: any) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: e.message }));
    }
  }
}
```

**Modelos a migrar:**

| Dart | TypeScript |
|---|---|
| `ServicioCreateModel` | `servicio-create.model.ts` |
| `ServicioReadModel` | `servicio-read.model.ts` |
| `NotaCreditoData` | `nota-credito.model.ts` |

---

### Fase 6 — Finanzas (Días 45-55)

**6.1 FinanzasService (equivale a `finanzas_provider.dart`)**

Las búsquedas en paralelo del Dart se replican con `Promise.allSettled`:

```typescript
// src/app/features/finanzas/finanzas.service.ts
import { Injectable, signal, inject } from '@angular/core';
import { AuthService }       from '../../core/auth/auth.service';
import { FinanzasRepository } from './finanzas.repository';

@Injectable({ providedIn: 'root' })
export class FinanzasService {
  private readonly repo = inject(FinanzasRepository);
  private readonly auth = inject(AuthService);

  private readonly _state = signal<FinanzasState>({
    isLoading: false, isSaving: false,
    errorMessage: null, successMessage: null,
    cajaResumen: null, deudas: [], pagos: [],
    tiposGasto: [], gastosFijosResumen: null, gastosVariablesResumen: null,
  });
  readonly state = this._state.asReadonly();

  // Equivale a buscarDeudasPorComprobante() - búsqueda en paralelo
  async buscarDeudasPorComprobante(numeroComprobante: string): Promise<void> {
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null }));
    try {
      // Equivale al Future.wait con catchError en Dart
      const [ventaResult, servicioResult] = await Promise.allSettled([
        this.repo.buscarVentaPorComprobante(numeroComprobante),
        this.repo.buscarServicioPorComprobante(numeroComprobante),
      ]);

      const venta    = ventaResult.status    === 'fulfilled' ? ventaResult.value    : null;
      const servicio = servicioResult.status === 'fulfilled' ? servicioResult.value : null;

      if (!venta && !servicio) {
        this._state.update(s => ({ ...s, isLoading: false, deudas: [], errorMessage: 'Comprobante no encontrado' }));
        return;
      }

      const filtro = venta ? { venta: venta.id } : { servicio: servicio!.id };
      const deudas = await this.repo.getDeudas(filtro);
      this._state.update(s => ({ ...s, isLoading: false, deudas }));
    } catch (e: any) {
      this._state.update(s => ({ ...s, isLoading: false, deudas: [], errorMessage: e.message }));
    }
  }

  // PDF: el endpoint devuelve bytes → en web abrimos como blob
  async registrarPago(deudaId: number, monto: string): Promise<void> {
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      const pdfBlob = await this.repo.registrarPago(deudaId, monto);
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
      URL.revokeObjectURL(url);

      this._state.update(s => ({ ...s, isSaving: false, successMessage: 'Pago registrado correctamente' }));
      await Promise.all([this.cargarDeudas(), this.cargarPagos()]);
    } catch (e: any) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: e.message }));
    }
  }

  async cerrarMesGastos(mes: number, anio: number): Promise<void> {
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) return;

    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      await this.repo.cerrarMesGastos({ tiendaId, mes, anio });
      this._state.update(s => ({ ...s, isSaving: false, successMessage: 'Mes de gastos cerrado' }));
      await Promise.all([
        this.cargarGastosFijosResumen(mes, anio),
        this.cargarGastosVariablesResumen(mes, anio),
      ]);
    } catch (e: any) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: e.message }));
    }
  }

  async cargarDeudas(filtros?: any): Promise<void> { /* ... */ }
  async cargarPagos(filtros?: any): Promise<void> { /* ... */ }
  async cargarGastosFijosResumen(mes: number, anio: number): Promise<void> { /* ... */ }
  async cargarGastosVariablesResumen(mes: number, anio: number): Promise<void> { /* ... */ }

  clearMessages(): void {
    this._state.update(s => ({ ...s, errorMessage: null, successMessage: null }));
  }
}
```

**6.2 FinanzasRepository: manejo de respuesta PDF**

```typescript
// src/app/features/finanzas/finanzas.repository.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FinanzasRepository {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  // Equivale a ResponseType.bytes en Dio
  async registrarPago(deudaId: number, monto: string): Promise<Blob> {
    return firstValueFrom(
      this.http.post(`${this.base}finances/pagos/`,
        { deuda_id: deudaId, monto },
        { responseType: 'blob' }
      )
    );
  }

  async getDeudas(filtros: { cliente?: number; estado?: string; venta?: number; servicio?: number } = {}): Promise<any[]> {
    const params: any = {};
    if (filtros.cliente)  params['cliente']  = filtros.cliente;
    if (filtros.estado)   params['estado']   = filtros.estado;
    if (filtros.venta)    params['venta']    = filtros.venta;
    if (filtros.servicio) params['servicio'] = filtros.servicio;

    return firstValueFrom(
      this.http.get<any[]>(`${this.base}finances/deudas/`, { params })
    );
  }

  async buscarVentaPorComprobante(numero: string): Promise<any> {
    return firstValueFrom(this.http.get(`${this.base}sales/ventas/${numero}/`));
  }

  async buscarServicioPorComprobante(numero: string): Promise<any> {
    return firstValueFrom(this.http.get(`${this.base}services/servicio/${numero}/`));
  }

  async cerrarMesGastos(data: { tiendaId: number; mes: number; anio: number }): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.base}finances/gastos/cerrar-mes/`,
        { tienda_id: data.tiendaId, mes: data.mes, anio: data.anio }
      )
    );
  }
}
```

---

### Fase 7 — Impresora (Días 56-61)

En web no hay sockets TCP directos. La estrategia recomendada es un servidor local bridge.

**Opciones disponibles:**

| Opción | Descripción | Complejidad |
|---|---|---|
| **Servidor local bridge (recomendado)** | Pequeño servidor Node.js/Python en la máquina del negocio que expone `/print` | Media |
| **QZ Tray** | App de escritorio bridge entre browser e impresora | Media-Baja |
| **WebUSB API** | Imprimir directamente a USB desde Chrome | Alta (solo Chrome, requiere HTTPS) |
| **CUPS vía backend** | El backend Django manda a la impresora por CUPS | Baja |

**7.1 ImpresoraService (equivale a `impresora_provider.dart`)**

```typescript
// src/app/features/impresora/impresora.service.ts
import { Injectable, signal } from '@angular/core';

export type TipoConexionImpresora = 'wifi' | 'usb_cups';

export interface ImpresoraConfig {
  ip:           string;
  puerto:       number;
  tipoConexion: TipoConexionImpresora;
}

@Injectable({ providedIn: 'root' })
export class ImpresoraService {
  private readonly IP_KEY    = 'impresora_ip';
  private readonly PORT_KEY  = 'impresora_puerto';
  private readonly TIPO_KEY  = 'impresora_tipo_conexion';
  private readonly BRIDGE_URL = 'http://localhost:3000';

  private readonly _config = signal<ImpresoraConfig>(this.cargarConfig());
  readonly config           = this._config.asReadonly();
  readonly estaConfigurada  = () => {
    const c = this._config();
    return c.tipoConexion === 'usb_cups' || c.ip !== '';
  };

  private cargarConfig(): ImpresoraConfig {
    return {
      ip:           localStorage.getItem(this.IP_KEY) ?? '',
      puerto:       parseInt(localStorage.getItem(this.PORT_KEY) ?? '9100', 10),
      tipoConexion: (localStorage.getItem(this.TIPO_KEY) ?? 'wifi') as TipoConexionImpresora,
    };
  }

  guardarConfiguracion(ip: string, puerto: number, tipo: TipoConexionImpresora): void {
    localStorage.setItem(this.IP_KEY, ip);
    localStorage.setItem(this.PORT_KEY, String(puerto));
    localStorage.setItem(this.TIPO_KEY, tipo);
    this._config.set({ ip, puerto, tipoConexion: tipo });
  }

  async probarConexion(): Promise<boolean> {
    const cfg = this._config();
    try {
      const resp = await fetch(`${this.BRIDGE_URL}/test-printer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: cfg.ip, puerto: cfg.puerto }),
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  async imprimirTicket(contenidoEscPos: string): Promise<void> {
    const cfg = this._config();
    await fetch(`${this.BRIDGE_URL}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: cfg.ip, puerto: cfg.puerto, contenido: contenidoEscPos }),
    });
  }

  limpiar(): void {
    [this.IP_KEY, this.PORT_KEY, this.TIPO_KEY].forEach(k => localStorage.removeItem(k));
    this._config.set({ ip: '', puerto: 9100, tipoConexion: 'wifi' });
  }
}
```

**7.2 TicketConverter (equivale a `ticket_converter.dart`)**

La conversión ESC/POS es lógica pura sin dependencias de Flutter, se porta directamente:

```typescript
// src/app/features/impresora/ticket.converter.ts
export interface TicketData {
  nombreTienda: string;
  ruc:          string;
  items:        TicketItem[];
  total:        number;
  metodoPago:   string;
  fecha:        string;
}

export interface TicketItem {
  nombre:   string;
  cantidad: number;
  precio:   number;
}

export class TicketConverter {
  private readonly ESC = '\x1B';
  private readonly GS  = '\x1D';

  toEscPos(ticket: TicketData): string {
    let out = '';
    out += `${this.ESC}@`;          // Init impresora
    out += `${this.ESC}a\x01`;      // Centrar
    out += `${ticket.nombreTienda}\n`;
    out += `RUC: ${ticket.ruc}\n`;
    out += `${ticket.fecha}\n\n`;
    out += `${this.ESC}a\x00`;      // Izquierda
    out += '-'.repeat(32) + '\n';
    for (const item of ticket.items) {
      out += `${item.nombre}\n`;
      out += `  ${item.cantidad} x S/${item.precio.toFixed(2)}\n`;
    }
    out += '-'.repeat(32) + '\n';
    out += `TOTAL: S/${ticket.total.toFixed(2)}\n`;
    out += `Pago: ${ticket.metodoPago}\n\n`;
    out += `${this.GS}V\x41\x03`;   // Cortar papel
    return out;
  }
}
```

---

### Fase 8 — Invitation + Onboarding (Días 62-67)

**8.1 Invitation Accept (deep link → query param en URL web)**

En Flutter la invitación llega por deep link `myapp://invite?token=xxx`. En web es una URL normal: `https://tu-dominio.com/invite?token=abc123`

```typescript
// invitation-accept.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { InvitationService } from '../../invitation.service';

@Component({ /* ... */ })
export class InvitationAcceptComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc   = inject(InvitationService);

  // Equivale a: final token = state.uri.queryParameters['token']
  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) this.svc.aceptarInvitacion(token);
  }
}
```

**8.2 OnboardingService**

```typescript
// src/app/features/onboarding/onboarding.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient }   from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment }  from '../../../environments/environment';
import { AuthService }  from '../../core/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = environment.apiBaseUrl;

  async completarPerfil(firstName: string, lastName: string): Promise<void> {
    const data = await firstValueFrom(
      this.http.patch<any>(`${this.base}auth/profile/`, { first_name: firstName, last_name: lastName })
    );
    this.auth.updateUserMe(data);
  }

  async crearEmpresa(nombre: string, ruc: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.base}store/empresa/`, { nombre, ruc })
    );
    const me = await firstValueFrom(this.http.get<any>(`${this.base}auth/me/`));
    this.auth.updateUserMe(me);
  }
}
```

---

### Fase 9 — UI Global: Componentes Compartidos (Días 68-73)

**9.1 Componentes equivalentes a `core/widgets/`**

```typescript
// src/app/core/components/empty-state/empty-state.component.ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="empty-state">
      <span class="material-icons">{{ icon() }}</span>
      <h3>{{ title() }}</h3>
      <p>{{ message() }}</p>
    </div>
  `,
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  readonly icon    = input<string>('inbox');
  readonly title   = input.required<string>();
  readonly message = input<string>('');
}
```

```typescript
// src/app/core/components/status-badge/status-badge.component.ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="badge" [class]="'badge--' + type()">{{ label() }}</span>`,
  styleUrl: './status-badge.component.scss',
})
export class StatusBadgeComponent {
  readonly label = input.required<string>();
  readonly type  = input<'success' | 'error' | 'warning' | 'info'>('info');
}
```

```typescript
// src/app/core/components/error-state/error-state.component.ts
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-state',
  standalone: true,
  template: `
    <div class="error-state">
      <span class="material-icons">error_outline</span>
      <p>{{ message() }}</p>
      @if (showRetry()) {
        <button (click)="retry.emit()">Reintentar</button>
      }
    </div>
  `,
})
export class ErrorStateComponent {
  readonly message   = input.required<string>();
  readonly showRetry = input<boolean>(true);
  readonly retry     = output<void>();
}
```

**9.2 Pipes de formato (equivale a `format_utils.dart`)**

```typescript
// src/app/core/pipes/currency-pe.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'currencyPe', standalone: true })
export class CurrencyPePipe implements PipeTransform {
  transform(value: number): string {
    return `S/ ${value.toFixed(2)}`;
  }
}

// Uso en template: {{ item.precio | currencyPe }}
```

---

### Fase 10 — Testing (Días 74-80)

Tests críticos que deben escribirse antes de considerar el módulo completo:

**Auth:**
```typescript
describe('AuthService', () => {
  it('debe marcar isAuthenticated = true después del login', async () => {
    // setup mocks
    await service.login('usuario', 'clave');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('debe limpiar estado en logout', () => {
    service.logout();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.userMe()).toBeNull();
  });
});
```

**Validadores SUNAT:**
```typescript
describe('rucValidator', () => {
  it('debe rechazar RUC con menos de 11 dígitos', () => {
    const ctrl = new FormControl('12345', [rucValidator()]);
    expect(ctrl.errors?.['invalidRuc']).toBeDefined();
  });

  it('debe aceptar RUC válido de 11 dígitos', () => {
    const ctrl = new FormControl('20123456789', [rucValidator()]);
    expect(ctrl.errors).toBeNull();
  });

  it('debe rechazar RUC con letras', () => {
    const ctrl = new FormControl('2012345678A', [rucValidator()]);
    expect(ctrl.errors?.['invalidRuc']).toBeDefined();
  });
});
```

**CarritoService:**
```typescript
describe('CarritoService', () => {
  it('debe calcular total correctamente', () => {
    const svc = new CarritoService();
    svc.agregarItem({ productoNombre: 'A', cantidad: 2, precioVenta: 10.5, unidadMedida: 'UND', esAveriado: false });
    expect(svc.total()).toBe(21);
  });

  it('debe eliminar item por índice', () => {
    const svc = new CarritoService();
    svc.agregarItem({ productoNombre: 'A', cantidad: 1, precioVenta: 5, unidadMedida: 'UND', esAveriado: false });
    svc.agregarItem({ productoNombre: 'B', cantidad: 1, precioVenta: 8, unidadMedida: 'UND', esAveriado: false });
    svc.eliminarItem(0);
    expect(svc.items().length).toBe(1);
    expect(svc.items()[0].productoNombre).toBe('B');
  });
});
```

**Guards:**
```typescript
describe('authGuard', () => {
  it('debe redirigir a login cuando no está autenticado', () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);
    const result = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute, { url: '/home' } as any)
    );
    expect(result).toEqual(router.createUrlTree(['/login']));
  });

  it('debe redirigir a profile/complete si el perfil está incompleto', () => {
    mockAuthService.isAuthenticated.mockReturnValue(true);
    mockAuthService.userMe.mockReturnValue({ firstName: '', lastName: '', tiendas: [] });
    const result = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute, { url: '/home' } as any)
    );
    expect(result).toEqual(router.createUrlTree(['/profile/complete']));
  });
});
```

---

## 5. API Endpoints de Referencia

Mapeados del código real de los repositories Flutter:

| Módulo | Método | Endpoint | Equivale en Dart |
|---|---|---|---|
| Auth | POST | `auth/login/` | `auth_repository.dart` |
| Auth | GET | `auth/me/` | `auth_repository.dart` |
| Auth | POST | `auth/refresh/` | `auth_interceptor.dart` |
| Auth | PATCH | `auth/profile/` | `profile_repository.dart` |
| Lotes | GET | `inventory/lotes/?tienda_id=&cursor=` | `lote_repository.dart` |
| Productos catálogo | GET | `inventory/catalogo/?tienda_id=&search=&cursor=` | `lote_repository.dart` |
| Productos | GET | `inventory/productos/` | `lote_repository.dart` |
| Stock | GET | `inventory/stock/?tienda_id=` | `lote_repository.dart` |
| Ventas | POST | `sales/ventas/` | `venta_repository.dart` |
| Ventas | GET | `sales/ventas/{numero}/` | `finanzas_repository.dart` |
| Ventas confirmar SUNAT | POST | `sales/ventas/{numero}/confirmar-sunat/` | `venta_repository.dart` |
| Ventas nota crédito | POST | `sales/ventas/{numero}/nota-credito/` | `venta_repository.dart` |
| Ventas cancelar | POST | `sales/ventas/{numero}/cancelar/` | `venta_repository.dart` |
| Clientes | GET | `sales/clientes/?tienda_id=&search=` | `venta_repository.dart` |
| Servicios | POST | `services/servicio/` | `servicio_repository.dart` |
| Servicios | GET | `services/servicio/{numero}/` | `finanzas_repository.dart` |
| Caja resumen | GET | `finances/caja/resumen/?tienda_id=` | `finanzas_repository.dart` |
| Caja cerrar | POST | `finances/caja/cerrar/` | `finanzas_repository.dart` |
| Deudas | GET | `finances/deudas/?cliente=&estado=&venta=&servicio=` | `finanzas_repository.dart` |
| Pagos | GET | `finances/pagos/?deuda__cliente=&deuda__estado=` | `finanzas_repository.dart` |
| Registrar pago (PDF) | POST | `finances/pagos/` → devuelve PDF bytes | `finanzas_repository.dart` |
| Gastos fijos resumen | GET | `finances/gastos/resumen/?tienda_id=&mes=&anio=&tipo=fijo` | `finanzas_repository.dart` |
| Gastos tipos | GET | `finances/gastos/tipos/` | `finanzas_repository.dart` |
| Crear gasto fijo | POST | `finances/gastos/manual/` | `finanzas_repository.dart` |
| Gastos variables resumen | GET | `finances/gastos-variable/resumen/?tienda_id=&mes=&anio=` | `finanzas_repository.dart` |
| Crear gasto variable | POST | `finances/gastos-variable/crear/` | `finanzas_repository.dart` |
| Cerrar mes gastos | POST | `finances/gastos/cerrar-mes/` | `finanzas_repository.dart` |
| Tiendas | GET | `store/` | `tienda_repository.dart` |
| Empresa crear | POST | `store/empresa/` | `setup_repository.dart` |
| Usuarios | GET | `users/` | `usuarios_repository.dart` |
| Asistencia | GET | `attendance/` | `asistencia_repository.dart` |
| Invitación crear | POST | `invitation/` | `invitation_repository.dart` |
| Invitación aceptar | POST | `invitation/accept/` | `invitation_accept_repository.dart` |
| Roles | GET | `users/roles/` | `invitation_repository.dart` |

---

## 6. Decisiones de Diseño

### Layout web vs móvil

| Elemento Flutter | Equivalente web |
|---|---|
| `BottomNavigationBar` | Sidebar lateral (desktop) + hamburger menu (móvil < 768px) |
| `Scaffold` | CSS Grid con sidebar fijo + contenido |
| `BottomSheet` | `MatDialog` o panel lateral deslizable (`MatDrawer`) |
| `showDialog` | `MatDialog.open()` |
| `SnackBar` | `MatSnackBar` |
| `Navigator.pop()` | `location.back()` o `router.navigate()` |
| `InkWell` / `GestureDetector` | `button` o `div` con `cursor: pointer` |
| `ListTile` | Fila de tabla `<tr>` o card component |
| `DataTable` | `MatTable` con `MatSort` y `MatPaginator` |
| `TextField` | `MatFormField` + `matInput` |
| `DropdownButton` | `MatSelect` |
| Infinite scroll con `ListView` | `IntersectionObserver` API |
| `Image.network` | `<img>` con lazy loading |
| `CircularProgressIndicator` | `MatProgressSpinner` |
| `LinearProgressIndicator` | `MatProgressBar` |

### Manejo de PDF en web

```typescript
// Ver PDF en nueva pestaña (equivale a printing.layoutPdf)
async verPdf(blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// Descargar PDF
async descargarPdf(blob: Blob, nombre: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download = `${nombre}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Criterio de "módulo completado"

Un módulo se considera migrado cuando cumple todos estos puntos:

1. Todos los endpoints del repository están implementados y probados con datos reales de la API
2. El service (Signal-based) replica toda la lógica de negocio del Notifier Flutter
3. Los formularios tienen los mismos validadores que el código Dart original
4. El guard de rol aplica correctamente (si el módulo tiene restricción de rol)
5. Tiene al menos un test unitario por método del service

### Orden de implementación por prioridad de negocio

```
Semana 1-2:   Fase 0 (setup) + Fase 1 (auth/interceptor/guards)  ← BLOQUEANTE
Semana 3:     Fase 2 (home, tienda, usuarios, asistencia)
Semana 4-5:   Fase 3 (inventario + paginación cursor)
Semana 6-8:   Fase 4 (ventas + SUNAT)                            ← más complejo
Semana 9:     Fase 5 (servicios)
Semana 10-11: Fase 6 (finanzas)
Semana 12:    Fase 7 (impresora) + Fase 8 (invitation/onboarding)
Semana 13:    Fase 9 (UI global + pulido visual)
Semana 14:    Fase 10 (testing + QA)
```

### Reglas de convención del proyecto

| Aspecto | Convención |
|---|---|
| Archivos | `kebab-case.component.ts` |
| Clases | `PascalCase` |
| Signals | prefijo `_` para privados (`_state`), sin prefijo para públicos (`state`) |
| Interfaces de estado | sufijo `State` (`AuthState`, `VentaState`) |
| Repositories | sufijo `Repository` |
| Services de negocio | sufijo `Service` |
| Guards | sufijo `Guard` o función `xGuard` |
| Modelos de API | sufijo `Model` |
| Constantes | `UPPER_SNAKE_CASE` para valores, `PascalCase` para objetos const |
