# Feature: Invitation

## 1. Resumen

Flujo de invitación de usuarios a una tienda. Tiene dos lados:
- **Crear invitación** (`/invitation/new`) — un usuario autenticado (dueño/admin) genera un link que envía al invitado. Requiere `authGuard`.
- **Aceptar invitación** (`/invite?token=...`) — URL pública que el invitado abre desde el link recibido; le pide nombre/apellido/password y crea su cuenta.

Ambas páginas consumen `InvitationService`, que también carga catálogos auxiliares (roles disponibles y tiendas) para el formulario de creación.

> Relacionado: `UsuariosService.refrescarInvitacion(usuarioId)` permite re-emitir el token sobre un usuario ya invitado pero no aceptado (ver `feature-usuarios.md`).

---

## 2. Service: `InvitationService`

### State
```ts
type InvitationStatus = 'idle' | 'success' | 'error';

interface InvitationState {
  isLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  status: InvitationStatus;
  invitationLink: string | null;
  roles: { valor: string; etiqueta: string }[];
  tiendas: { id: number; nombre: string }[];
}
```

Inicial: todo en `null`/`[]`, `status: 'idle'`.

### Signals públicos
- `state` (readonly).

### Métodos públicos

- **`cargarRolesYTiendas()`**: en paralelo, GET `auth/roles/` y `store/`. Los roles aceptan claves alternativas (`valor` / `value` / `rol`; `etiqueta` / `label` / `nombre`). Las tiendas idem (`nombre` / `name`). Si falla, no actualiza state (no-op silencioso).

- **`aceptarInvitacion(token, firstName, lastName, password)`**: POST `auth/register/` con `{token, first_name, last_name, password}`. Si éxito: `status = 'success'`, `successMessage = 'Cuenta creada correctamente. Ya puedes iniciar sesión.'` y devuelve `true`. Si falla: `errorMessage = extractApiError(err)` y devuelve `false`.

- **`crearInvitacion(email, rol, tiendaId?, salario?)`**: POST `auth/invite/` con `{email, rol, tienda_id?, salario?}`. Extrae el link de la respuesta probando `link` / `invitation_link` / `url`. Setea `invitationLink` en state.

- **`clearMessages()`**: limpia `errorMessage` y `successMessage`.
- **`reset()`**: vuelve a `INITIAL` (todos los campos a default).

---

## 3. Endpoints API

| Método | Path                          | Body                                                              | Response                                                |
|--------|-------------------------------|-------------------------------------------------------------------|---------------------------------------------------------|
| GET    | `auth/roles/`                 | —                                                                 | Array de `{valor, etiqueta}` (con keys alternativas)   |
| GET    | `store/`                      | —                                                                 | Array de tiendas (también usado por `TiendaRepository`)|
| POST   | `auth/register/`              | `{ token, first_name, last_name, password }`                      | (vacío / 201)                                           |
| POST   | `auth/invite/`                | `{ email, rol, tienda_id?, salario? }`                            | `{ link, ... }` (key puede variar)                      |

---

## 4. Página: `InvitationAcceptComponent` (`/invite?token=...`)

### Propósito
Permite al invitado completar sus datos y activar su cuenta.

### Pública (no requiere authGuard)
La ruta `/invite` se permite explícitamente en el `authGuard` (sección 6 de `ARQUITECTURA.md`).

### State local
- `token: signal<string | null>` — leído de `route.snapshot.queryParamMap.get('token')`.
- `form: FormGroup` (reactive):
  - `firstName: ['', Required]`
  - `lastName: ['', Required]`
  - `password: ['', [Required, passwordStrengthValidator]]`
  - `confirmPassword: ['', Required]`
  - **Group validator**: `passwordsMatchValidator` (error `passwordsMismatch`).
- `passwordReqs: computed` — array `{label, ok}` con los 5 requisitos de password en vivo:
  - Mínimo 8 caracteres
  - Una letra mayúscula
  - Una letra minúscula
  - Un número
  - Un carácter especial

### Validators locales (funciones puras)
```ts
passwordStrengthValidator(control):
  ok = length >= 8 && /[A-Z]/.test && /[a-z]/.test && /[0-9]/.test && /[^A-Za-z0-9]/.test
  return ok ? null : { passwordStrength: true }

passwordsMatchValidator(group):
  pw vs confirmPassword → { passwordsMismatch: true } si difieren
```

### Carga inicial (`ngOnInit`)
1. Lee `token` del query string.
2. `svc.reset()` para limpiar state.

### Acción: `submit()`
1. `markAllAsTouched()`.
2. Si form inválido o `!token` → no hace nada.
3. `await svc.aceptarInvitacion(token, firstName, lastName, password)`.
4. Si éxito → el state cambia a `status: 'success'` y la UI muestra la pantalla de éxito con botón "Ir al inicio de sesión".

### Acción: `irAlLogin()`
`router.navigate(['/login'])`.

### Edge cases
- **Sin token en URL**: muestra banner "Enlace de invitación inválido o expirado".
- **Token inválido en backend**: `errorMessage` con el mensaje API.
- **Token expirado**: idem; el usuario debe pedir uno nuevo (vía `UsuariosComponent.reenviarInvitacion`).
- **Password no cumple requisitos**: lista visual en vivo, submit bloqueado por validator.

---

## 5. Página: `InvitationFormComponent` (`/invitation/new`)

### Propósito
Permite a un usuario autenticado generar un nuevo link de invitación.

### Requiere `authGuard`
Ruta protegida.

### State local
- `copiado: signal<boolean>` — flag para mostrar "Copiado" 2s tras click.
- `form: FormGroup`:
  - `email: ['', [Required, Email]]`
  - `rol: ['', Required]`
  - `tiendaId: [null as number | null]` — sin validator (se valida vía `requiereTienda`)
  - `salario: [null as number | null]` — opcional
- `requiereTienda: computed` — `true` si el rol seleccionado no es vacío y no es `DUENO`. Para el dueño no se pide tienda.

### Carga inicial (`ngOnInit`)
1. `svc.clearMessages()`.
2. `svc.cargarRolesYTiendas()` (sin await — fire-and-forget).

### Acción: `submit()`
1. `markAllAsTouched()`.
2. Si inválido → no hace nada.
3. `svc.clearMessages()`.
4. `await svc.crearInvitacion(email, rol, tiendaId ?? undefined, salario ?? undefined)`.
5. Si éxito → `state.status === 'success'` y la UI muestra el link generado.

### Acción: `copiarLink()`
`navigator.clipboard.writeText(state.invitationLink)`, setea `copiado = true`, lo apaga a los 2s.

### Acción: `nuevaInvitacion()`
`svc.reset()` + `form.reset()`. Vuelve al formulario en blanco.

### Edge cases
- **Email duplicado**: error API (`extractApiError`).
- **`tiendaId` nulo cuando se requiere**: actualmente no se valida en cliente — el backend rechaza.
- **Roles vacíos del backend**: `cargarRolesYTiendas` no falla silenciosamente; el `<select>` queda vacío.
- **Clipboard no disponible**: `navigator.clipboard.writeText` throws en HTTP sin secure context.

---

## 6. Notas para el rediseño

### NO tocar
- `InvitationService` (state shape y los 4 métodos: aceptar, crear, cargarCatálogos, reset).
- Endpoints `auth/register/`, `auth/invite/`, `auth/roles/`.
- Los validators de password (los 5 requisitos son la regla de seguridad del sistema).
- La regla "dueño no requiere tienda".
- La extracción del token desde query param `?token=...` en `/invite`.

### Rediseñable libremente
- Ambas páginas tienen estilos inline (CSS-in-TS). Sepáralos a `.html` + `.css` si prefieres consistencia con el resto del proyecto.
- La UI de "requisitos en vivo" puede simplificarse a una barra de fortaleza o mantenerse como lista — el `passwordReqs` computed es reusable.
- El componente de "link generado + botón copiar" se puede extraer a un componente compartido (también lo usa `UsuariosComponent.copiarLink`).

### Dependencias cruzadas
- **`UsuariosComponent`** usa `UsuariosService.refrescarInvitacion` (no este service). Es complementario: crear inicial vs refrescar.
- **`/login`**: tras aceptar invitación, la UI sugiere ir al login.
- **`authGuard`** permite explícitamente `/invite*` sin sesión.

### Comportamiento esperado
- El `cargarRolesYTiendas` falla silenciosamente — UX degradada pero no rota.
- El link tiene tres posibles keys en el response (`link` / `invitation_link` / `url`) — defensivo contra cambios menores del backend.
- `copiado` se resetea a 2s con `setTimeout` — si el componente se destruye antes, el timeout queda colgando (memory leak menor, ignorable).
