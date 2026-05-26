# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ Pre-deploy checklist

Antes del primer build/deploy a producción, verifica:

1. **`src/environments/environment.prod.ts`** — reemplazar `tu-dominio.com` por el dominio real:
   - `apiBaseUrl` debe apuntar al backend real con HTTPS
   - `inviteBaseUrl` debe ser la URL pública del frontend
2. **`src/server.ts`** — en el CSP de `helmet`, actualizar `connectSrc` con el host real del backend.
3. **`angular.json`** — añadir el dominio real a `architect.build.options.security.allowedHosts` (anti-SSRF en SSR).
4. **Variables de entorno del servidor SSR** — si `PORT` distinto a 4000, configurarlo en el host.
5. **Backend complementario** — confirmar que:
   - Mensajes de error del login son genéricos (sin user enumeration)
   - JWT con expiración corta y refresh rotation
   - Rate limiting en `/auth/login/` y `/auth/refresh/`
   - CORS restringido al dominio del frontend
6. **`pnpm audit`** — sin CVEs críticos en dependencias antes del build.

## Commands

```bash
# Development
pnpm start          # ng serve → http://localhost:4200
pnpm run watch      # Build in watch mode (development config)

# Build & SSR
pnpm run build                                      # Production SSR build → dist/
pnpm run serve:ssr:management_system               # Run SSR server (port 4000)

# Testing
pnpm test           # ng test (Vitest)
# Run a single test file:
pnpm ng test --include="src/app/path/to/file.spec.ts"
```

## Architecture

**Angular 21 — standalone components, no NgModules.** Everything is imported directly into components or registered in `app.config.ts`.

**SSR enabled.** `src/server.ts` is an Express 5 server that serves the Angular app server-side. The build outputs two bundles: `dist/management_system/browser/` and `dist/management_system/server/`.

**State management via Angular Signals.** No NgRx. Use `signal()`, `computed()`, and `effect()` for reactive state within and across services.

**Styling: Tailwind CSS v4** via PostCSS (`@tailwindcss/postcss`). Global import in `src/styles.css`.

**Testing: Vitest** (not Karma/Jasmine). Test files use `vitest/globals` types. Use `@testing-library/angular` for component testing.

**TypeScript: strict mode** — all strict flags enabled plus `noImplicitOverride`, `noImplicitReturns`, `noPropertyAccessFromIndexSignature`, strict Angular template/injection checks.

## Project Context

This is a Flutter → Angular migration of a POS/management system (ferretería). The original Flutter app is at `~/Universidad/MANAGEMENT-SYSTEM-UI`. The detailed migration plan is in `Migracion.md`.

Feature domains: auth & RBAC, inventario (lotes/productos), ventas (multi-step + SUNAT), servicios, finanzas (caja/deudas/gastos), impresora ESC/POS, tiendas, usuarios/asistencia, invitaciones.

**Migration status:**
- ✅ Fase 0: Setup (environments, CSS tokens, HttpClient)
- ✅ Fase 1: Core (StorageService, AuthService, authInterceptor, authGuard/duenioGuard/adminGuard, extractApiError)
- ✅ Fase 2: Routing + MainShell + Login + Tienda (CRUD) + Usuarios (editar/toggle/reenviar) + Asistencia (hoy+resumen) + Operaciones hub
- ✅ Fase 3: Inventario (lotes, paginación cursor)
- ✅ Fase 4: Ventas + SUNAT (CarritoService, ResumenVentaService, VentaService, VentaRepository, validators, FlowHeader, ClienteSearch, 5 pages)
- ⏳ Fase 5–10: Ver Migracion.md

**Key design decisions vs Flutter:**
- Roles devueltos por la API son en mayúsculas: `DUENO`, `ADMINISTRADOR`, `TRABAJADOR` (definidos en `auth.models.ts`)
- `BottomNavigationBar` → sidebar lateral (desktop) + hamburger futuro (< 768px)
- TCP socket impresora → bridge HTTP local en `localhost:3000`
- All SSR routes use `RenderMode.Client` (auth-protected app, no prerender)

## Conventions to Follow

- Use **standalone components** exclusively — no `NgModule` declarations.
- Lazy-load feature routes from `app.routes.ts`. All routes already declared.
- `core/` for infrastructure (auth, http, guards, storage); `features/` for business modules; `layout/` for shell.
- Each feature follows: `pages/`, `components/`, `models/`, `{feature}.service.ts`, `{feature}.repository.ts`.
- Services use `signal<State>()` with `_state` private and `state = _state.asReadonly()` public.
- Use `inject()` function instead of constructor injection.
- Repositories use `firstValueFrom()` to convert Observables to Promises.
- API base URL from `environment.apiBaseUrl` — never hardcode URLs.
