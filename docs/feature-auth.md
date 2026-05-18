# Feature: Auth (Login + Store Selector)

> **Nota**: `AuthService`, `auth.models.ts`, `authInterceptor`, `authGuard` y `StorageService` están documentados en `ARQUITECTURA.md` (secciones 3, 4, 5, 6). Este archivo cubre **sólo las dos páginas** que viven en `features/auth/`.

---

## 1. Resumen

Dos páginas públicas-ish del flujo de ingreso:
- **`/login`** — autenticación por username/password.
- **`/select-store`** — selección de la tienda activa cuando el usuario tiene más de una (o no hay una pre-seleccionada).

Ambas son standalone components que **consumen `AuthService`** directamente. No tienen un servicio propio.

---

## 2. Página: `LoginComponent` (`/login`)

### Propósito
Login con username/password. Tras autenticar, navega según el estado del usuario (perfil completo, tiendas, etc.).

### Imports
- `FormsModule` (ngModel-based).
- `Router`, `AuthService`.

### State expuesto al template
- `state = auth.state` (signal readonly) — para `isLoading` y `errorMessage`.
- `username: string` (two-way binding).
- `password: string` (two-way binding).

### Acción: `onSubmit()`
1. Si `username` o `password` están vacíos (trimmed) → no hace nada.
2. `await auth.login(username.trim(), password.trim())` — esto:
   - Hace POST `auth/login/` y GET `auth/me/`.
   - Guarda tokens.
   - Pre-selecciona última tienda (de `localStorage`) o la primera disponible.
   - Actualiza `state.errorMessage` si falla.
3. Si `auth.isAuthenticated()` → `router.navigate(['/home'])`.

### Redirecciones implícitas (hechas por el `authGuard`)
Tras navegar a `/home`, el guard puede redirigir:
- Perfil incompleto → `/profile/complete`.
- Dueño sin tiendas → `/setup`.
- Tiendas pero sin selección → `/select-store`.

> Por eso `LoginComponent` solo navega a `/home` — el guard hace el ruteo final.

### Edge cases
- **Credenciales inválidas**: `auth.login` setea `state.errorMessage` con el mensaje extraído de la API (`detail`, `non_field_errors[0]`, o "Error al iniciar sesión").
- **Network error**: idem, mensaje genérico.
- **Refresh durante login**: el `isLoading` bloquea el botón.

---

## 3. Página: `StoreSelectorComponent` (`/select-store`)

### Propósito
Muestra la lista de tiendas asociadas al usuario (de `auth.userMe().tiendas`) para elegir la activa.

### Imports
- Inline component (template y styles inline en el `.ts`).
- `Router`, `AuthService`.

### Getter
- `tiendas` — `auth.userMe()?.tiendas ?? []`. Cada item es `UserTiendaModel` (`{ tiendaId, tiendaNombre }`).

### Acción: `seleccionar(tiendaId)`
1. `auth.selectTienda(tiendaId)` — esto:
   - Persiste el ID en `localStorage` (`last_tienda_id`).
   - Actualiza `state.selectedTiendaId`.
2. `router.navigate(['/home'])`.

### Edge cases
- **Si `userMe()` es null**: `tiendas` devuelve `[]` y la pantalla queda vacía. No debería ocurrir porque el `authGuard` ya valida que `userMe` exista antes de llegar acá.
- **El guard fuerza esta página** cuando `userMe.tiendas.length > 0 && selectedTiendaId === null`. Si el usuario llega vía URL directa con tienda ya seleccionada → guard redirige a `/home`.

---

## 4. Notas para el rediseño

### NO tocar
- `auth.login()`, `auth.selectTienda()`, `auth.isAuthenticated()` — son el contrato.
- El flujo: login → `/home` (el guard hace el routing final). NO duplicar la lógica del guard en `LoginComponent`.
- `auth.userMe().tiendas` es la fuente única para el selector.

### Rediseñable libremente
- **`StoreSelectorComponent`** tiene su CSS inline — al rediseñar, pásalo a un `.html` + `.css` separados como las demás páginas o mantén inline si prefieres. El contrato es: leer `tiendas`, llamar `seleccionar(id)`.
- Look del login: cambia libremente. Mantén el form binding y `onSubmit`.

### Dependencias cruzadas
- `MainShellComponent.logout()` → `auth.logout() + navigate('/login')`.
- `MainShellComponent.cambiarTienda()` → `auth.clearTiendaSelection() + navigate('/select-store')`.
- El sistema entero depende de que tras login se llegue a `/home` y el guard haga el resto.

### Comportamiento esperado
- El error de login NO se limpia automáticamente al editar el input — queda hasta el próximo submit (o reset manual).
- Si el usuario solo tiene **una tienda**, el `auth.login` la auto-selecciona y el guard salta `/select-store` directamente. La página solo aparece cuando hay opciones.
- `StoreSelectorComponent` no muestra la tienda actualmente seleccionada (no hay un highlight) — al rediseñar puedes agregar este detalle leyendo `auth.selectedTiendaId()`.
