# Feature: Usuarios

## 1. Resumen

Administración de usuarios de una tienda (asociación `UsuarioTienda`): listar, filtrar por rol, buscar por nombre/email, editar (rol + salario), activar/desactivar y reenviar invitación. Sólo accesible para dueños y administradores (`adminGuard`).

El dueño **no puede ser editado** (rol bloqueado a vacío en la edición; el rol DUEÑO se preserva).

Ruta: `/usuarios` (guard: `adminGuard`).

---

## 2. Modelos (`models/usuario-tienda.model.ts`)

### `UsuarioTiendaModel`
```ts
interface UsuarioTiendaModel {
  id: number;              // ID de la asociación UsuarioTienda
  usuarioId: number;       // ID del usuario subyacente
  usuarioNombre: string;
  usuarioIsActive: boolean;
  tiendaId: number;
  tiendaNombre: string;
  usuarioEmail: string;
  rol: string;             // 'DUENO' | 'ADMINISTRADOR' | 'TRABAJADOR'
  rolDisplay: string;      // versión legible del rol (viene del backend)
  salario: string;         // string para preservar decimales (puede venir como "1500.00")
}
```

### `RefrescarInvitacionResponse`
```ts
interface RefrescarInvitacionResponse {
  token: string;
  usuario: string;       // email o identificador
  expiracion: string;    // ISO date
}
```

### Mapping (`usuarioTiendaFromJson`)
- `usuario_id → usuarioId`
- `usuario_nombre → usuarioNombre`
- `usuario_is_active → usuarioIsActive`
- `tienda_id → tiendaId`
- `tienda_nombre → tiendaNombre`
- `usuario_email → usuarioEmail`
- `rol_display → rolDisplay`
- Resto sin cambio. Strings con `?? ''`, booleans sin default.

---

## 3. Endpoints API

| Método | Path                                          | Body                                               | Query             | Response                              |
|--------|-----------------------------------------------|----------------------------------------------------|-------------------|---------------------------------------|
| GET    | `auth/usuario-tienda/`                        | —                                                  | `tienda?`, `rol?` | Array de `UsuarioTiendaModel`         |
| GET    | `auth/usuario-tienda/{id}/`                   | —                                                  | —                 | `UsuarioTiendaModel`                  |
| PATCH  | `auth/usuario-tienda/{id}/`                   | `{ tienda?, rol?, salario? }`                      | —                 | Sin uso (se hace GET después)         |
| PATCH  | `auth/usuario-tienda/{id}/estado/`            | `null`                                             | —                 | Sin uso (se hace GET después)         |
| POST   | `auth/invitacion/{usuarioId}/refrescar/`      | `null`                                             | —                 | `{ token, usuario, expiracion }`      |

**Nota importante**: `editarUsuario` y `toggleEstado` hacen **PATCH + GET inmediato** del recurso para obtener el modelo completo actualizado (el backend del PATCH no devuelve el modelo derivado con `tienda_nombre` y `rol_display`).

---

## 4. Repository (`usuarios.repository.ts`)

| Método                                                                 | Endpoint(s)                                                          | Notas                                              |
|------------------------------------------------------------------------|----------------------------------------------------------------------|----------------------------------------------------|
| `getUsuarios({ tiendaId?, rol? })`                                     | GET `auth/usuario-tienda/?tienda=<id>&rol=<rol>`                    | Filtros opcionales como query                       |
| `editarUsuario({ id, tiendaId?, rol?, salario? })`                     | PATCH `auth/usuario-tienda/{id}/` + GET `auth/usuario-tienda/{id}/` | El body manda `tienda`, `rol`, `salario` (snake)   |
| `toggleEstado(id)`                                                     | PATCH `auth/usuario-tienda/{id}/estado/` (body `null`) + GET        | Backend toggles activo/inactivo internamente       |
| `refrescarInvitacion(usuarioId)`                                       | POST `auth/invitacion/{usuarioId}/refrescar/`                       | Genera un nuevo token (el anterior queda inválido) |

Todos los métodos envuelven errores con `extractApiError`.

---

## 5. Service: `UsuariosService`

### State
```ts
interface UsuariosState {
  isLoading: boolean;
  isEditing: boolean;             // edit, toggle estado, etc.
  isRefreshing: boolean;          // refrescando invitación
  errorMessage: string | null;
  usuarios: UsuarioTiendaModel[];
  rolSeleccionado: string | null; // filtro activo
  invitationLink: string | null;  // link completo (con base + token) tras refrescar
}
```

### Signals públicos
- `state` (readonly).

### Métodos públicos

- **`cargarUsuarios(rol?)`**:
  - Toma `auth.selectedTiendaId()` y el rol pasado (o `state.rolSeleccionado`).
  - Llama `getUsuarios({ tiendaId, rol })` y actualiza `state.usuarios`.

- **`seleccionarRol(rol)`**:
  - Actualiza `state.rolSeleccionado` y dispara `cargarUsuarios(rol)`.

- **`editarUsuario({ id, tiendaId?, rol?, salario? })`**:
  - PATCH al backend, reemplaza el usuario en `state.usuarios` con el actualizado (matched por `id`).

- **`toggleEstado(id)`**:
  - Similar — PATCH a `/estado/` + GET. Reemplaza en la lista.

- **`refrescarInvitacion(usuarioId)`**:
  - POST refrescar → recibe `{token}` → construye `link = ${environment.inviteBaseUrl}?token=${token}` y lo guarda en `state.invitationLink`.

- **`clearInvitationLink()`**: limpia `invitationLink`.
- **`clearMessages()`**: limpia `errorMessage`.

---

## 6. Página: `UsuariosComponent` (`/usuarios`)

### Propósito
Lista de usuarios de la tienda activa con filtros (rol + búsqueda), edición inline en diálogo, toggle activo/inactivo, reenvío de invitación.

### Signals/state consumidos
- `svc.state` — lista y flags.
- `tiendaSvc` (`TiendaService`) — para el dueño, carga lista de tiendas (para el select de "mover usuario a otra tienda" si está disponible).
- `auth.isDueno` (signal).
- `auth.userMe` (signal, para identificar "mi cuenta").
- `auth.selectedTiendaId` (en `effect`).

### State local
- `busqueda: string` — filtro por nombre/email.
- `editando: UsuarioTiendaModel | null` — usuario abierto en diálogo de edición.
- `editRol`, `editSalario`: bindings del form de edición.
- `roles`: array constante con `[null, 'DUENO', 'ADMINISTRADOR', 'TRABAJADOR']` + labels.
- `Roles`: referencia a `Roles` (de `auth.models`) para usar en template.

### Carga inicial
- `effect()`: depende de `auth.selectedTiendaId()` → llama a `svc.cargarUsuarios()` con `untracked()` para evitar re-trigger.
- `ngOnInit`: si es dueño → `tiendaSvc.cargarTiendas()` (para poder mover usuarios entre tiendas).

### Computed/getter
- `usuariosFiltrados`: filtra `state.usuarios` por `busqueda` (lowercase, match en `usuarioNombre` o `usuarioEmail`).

### Helpers de display
- `esPendiente(u)`: `!u.usuarioIsActive && !u.usuarioNombre.trim()` — usuario invitado pero aún no aceptó.
- `esInactivo(u)`: `!u.usuarioIsActive && !!u.usuarioNombre.trim()` — desactivado manualmente.
- `esMiCuenta(u)`: `u.usuarioId === auth.userMe()?.id` — para deshabilitar acciones sobre sí mismo.

### Acciones de usuario
- `seleccionarRol(rol)` / `onRolChange(event)`: filtra por rol.
- `abrirEdicion(u)`: setea `editando`, copia rol (vacío si es dueño — no editable) y salario.
- `guardarEdicion()`: `svc.editarUsuario(...)` y cierra. Si rol es DUEÑO, no manda rol en el payload.
- `toggleEstado(u)`: confirm dialog → `svc.toggleEstado(u.id)`. Mensaje: "¿Desactivar a X?" / "¿Activar a X?".
- `reenviarInvitacion(u)`: confirm dialog → `svc.refrescarInvitacion(u.usuarioId)`. Mensaje: "La anterior quedará inválida".
- `copiarLink()`: `navigator.clipboard.writeText(state.invitationLink)` + `clearInvitationLink()`.

### Edge cases
- **Editar dueño**: el formulario fuerza rol vacío y `guardarEdicion` envía `rol: undefined` para no cambiarlo.
- **Mi propia cuenta**: la UI debe deshabilitar el botón "Desactivar" para `esMiCuenta()` (no se hace en el service, depende del template).
- **Link de invitación**: se construye en cliente concatenando `inviteBaseUrl`. Si el backend cambia el path, hay que actualizar `environment.inviteBaseUrl`.

---

## 7. Notas para el rediseño

### NO tocar
- `UsuariosRepository` (5 endpoints — son contrato).
- `UsuariosService` (state shape, métodos).
- `UsuarioTiendaModel` y `usuarioTiendaFromJson`.
- Reglas: dueño no editable, copia de link de invitación.

### Reorganizable
- El diálogo de edición puede ser un modal/drawer o ruta hija — el flujo `editando`/`guardarEdicion` se preserva.
- El filtro de búsqueda puede integrarse con un debounce (`computed` + `signal`) si la lista crece.
- El array `roles` puede sacarse a `core/constants/`.

### Dependencias cruzadas
- **`TiendaService`**: solo el dueño lo usa para "mover usuario a otra tienda" — opcional según diseño.
- **`AuthService`**: `selectedTiendaId`, `isDueno`, `userMe`.
- **`AsistenciaService` lo consume**: usa `UsuariosRepository.getUsuarios` para obtener la lista filtrada. NO romper esa firma.

### Comportamiento esperado
- Tras editar o toggle, el repository hace **PATCH + GET** secuencial para devolver el modelo completo. Si el backend evoluciona para devolver el modelo en el PATCH, se puede simplificar.
- El refresco de invitación **invalida la anterior** — el confirm dialog lo advierte explícitamente.
- El link de invitación se copia al portapapeles vía `navigator.clipboard` (requiere HTTPS o localhost).
