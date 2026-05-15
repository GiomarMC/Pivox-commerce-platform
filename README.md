# Pivox

Plataforma SaaS de gestión empresarial y punto de venta (POS) con integración SUNAT, diseñada para escalar a múltiples rubros.

---

## Tecnologías principales

| Herramienta | Versión |
|---|---|
| Node.js | ≥ 20.x |
| pnpm | 11.1.2 |
| Angular | 21.2.x |
| Angular CLI | 21.2.8 |
| TypeScript | ~5.9.x |
| Tailwind CSS | 4.x |
| RxJS | ~7.8.x |
| Express (SSR) | 5.x |
| Vitest | 4.x |

---

## Requisitos previos

- **Node.js 20+** — [descargar](https://nodejs.org/)
- **pnpm 11** — gestor de paquetes requerido (npm no está soportado en este proyecto)

```bash
# Instalar pnpm globalmente via corepack (incluido con Node.js — sin npm)
corepack enable
corepack prepare pnpm@11.1.2 --activate
```

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd management_system

# 2. Instalar dependencias
pnpm install

# 3. Aprobar builds de dependencias nativas (solo la primera vez)
pnpm approve-builds --all
```

---

## Variables de entorno

El proyecto usa archivos de entorno en `src/environments/`:

| Archivo | Propósito |
|---|---|
| `environment.ts` | Desarrollo local |
| `environment.prod.ts` | Producción |

Ejemplo de `environment.ts`:

```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'http://127.0.0.1:8000/api/',
  inviteBaseUrl: 'http://localhost:4200/invite',
};
```

Ajusta `apiBaseUrl` para apuntar a tu backend Django.

---

## Ejecución

### Modo desarrollo (con hot-reload)

```bash
pnpm start
# → http://localhost:4200
```

### Modo watch (rebuild automático en desarrollo)

```bash
pnpm run watch
```

### Build de producción (SSR)

```bash
pnpm run build
# Salida: dist/management_system/browser/ + dist/management_system/server/
```

### Servidor SSR (producción)

```bash
# Primero construye el proyecto
pnpm run build

# Luego levanta el servidor Express SSR
pnpm run serve:ssr:management_system
# → http://localhost:4000
```

---

## Tests

```bash
# Ejecutar todos los tests (Vitest)
pnpm test

# Ejecutar un archivo de test específico
pnpm ng test --include="src/app/path/to/file.spec.ts"
```

---

## Estructura del proyecto

```
src/
├── app/
│   ├── core/           # Infraestructura: auth, guards, interceptors, storage
│   ├── features/       # Módulos de negocio (inventario, ventas, servicios…)
│   ├── layout/         # Shell principal (sidebar, header)
│   ├── app.config.ts   # Configuración global (providers, interceptors)
│   ├── app.routes.ts   # Rutas lazy-load
│   └── app.ts          # Componente raíz
├── environments/       # Variables de entorno por build
├── styles.css          # Importación global de Tailwind CSS v4
├── main.ts             # Punto de entrada browser
├── main.server.ts      # Punto de entrada SSR
└── server.ts           # Servidor Express 5 para SSR
printer-bridge/         # Bridge HTTP→TCP para impresora ESC/POS (localhost:3000)
```

### Convenciones de features

Cada feature sigue la estructura:

```
features/<nombre>/
├── pages/              # Componentes de página (ruteados)
├── components/         # Componentes reutilizables del feature
├── models/             # Interfaces y tipos
├── <nombre>.service.ts # Estado con Angular Signals
└── <nombre>.repository.ts  # Acceso a la API (Observables → Promises)
```

---

## Arquitectura

- **Standalone components** — sin NgModules. Todo se importa directamente en componentes o se registra en `app.config.ts`.
- **Angular Signals** para estado reactivo (`signal()`, `computed()`, `effect()`). Sin NgRx.
- **SSR con Express 5** — todas las rutas usan `RenderMode.Client` (app protegida por auth, sin prerender).
- **Tailwind CSS v4** vía PostCSS.
- **Roles de API en mayúsculas**: `DUENO`, `ADMINISTRADOR`, `TRABAJADOR`.
- **Inyección vía `inject()`** — no constructor injection.
- **Repositorios** usan `firstValueFrom()` para convertir Observables a Promises.

---

## Impresora ESC/POS

El sistema incluye un bridge en `printer-bridge/` que expone una API HTTP local en `localhost:3000` para comunicarse con la impresora térmica vía TCP socket. Requiere ejecutarse por separado:

```bash
cd printer-bridge
pnpm install
pnpm start
```

---

## Estado de migración Flutter → Angular

| Fase | Descripción | Estado |
|---|---|---|
| 0 | Setup: environments, CSS tokens, HttpClient | ✅ |
| 1 | Core: StorageService, AuthService, interceptors, guards | ✅ |
| 2 | Routing + MainShell + Login + Tienda + Usuarios + Asistencia | ✅ |
| 3 | Inventario (lotes, paginación cursor) | ✅ |
| 4 | Ventas + SUNAT (CarritoService, 5 páginas) | ✅ |
| 5–10 | Servicios, Finanzas, Caja, Deudas, Gastos, Invitaciones | ⏳ |

Ver `Migracion.md` para el plan detallado de las fases pendientes.

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `pnpm start` | Dev server en `localhost:4200` |
| `pnpm run build` | Build SSR de producción |
| `pnpm run watch` | Build en modo watch (desarrollo) |
| `pnpm run serve:ssr:management_system` | Levantar servidor SSR en `localhost:4000` |
| `pnpm test` | Ejecutar tests con Vitest |
| `pnpm ng <comando>` | CLI de Angular directamente |
