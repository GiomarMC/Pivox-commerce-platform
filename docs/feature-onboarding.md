# Feature: Onboarding

## 1. Resumen

Dos páginas para completar la configuración inicial del usuario:
- **`/profile/complete`** — completa nombre y apellido (si falta uno).
- **`/setup`** — crea empresa + sede inicial (sólo para dueños sin tiendas).

Ambas son **forzadas por el `authGuard`**: aparecen automáticamente cuando el usuario está logueado pero tiene state incompleto. No se accede manualmente. Ver sección 6 de `ARQUITECTURA.md`.

Ambas usan `OnboardingService`, que tras cualquier operación re-fetcha `auth/me/` y llama a `auth.updateUserMe(...)` para que el guard reevalúe el estado y avance al siguiente paso.

---

## 2. Service: `OnboardingService`

### State
```ts
type SetupStep = 'empresa' | 'tienda';

interface OnboardingState {
  isLoading: boolean;
  errorMessage: string | null;
  setupStep: SetupStep;   // step interno del SetupComponent
}
```

### Signals públicos
- `state` (readonly).

### Métodos públicos

- **`completarPerfil(firstName, lastName)`**:
  - PATCH `auth/profile/` con `{ first_name, last_name }`.
  - Mappea response a `UserMeModel` y llama `auth.updateUserMe(...)`.
  - Devuelve `boolean` (éxito).

- **`crearEmpresa(nombre, ruc)`**:
  - POST `store/empresa/` con `{ nombre, ruc }`.
  - Tras éxito: GET `auth/me/` → `auth.updateUserMe(...)`.
  - Avanza `setupStep` a `'tienda'`.
  - Devuelve `boolean`.

- **`crearTienda(nombre, direccion, ubigeo, serieFactura, serieBoleta, serieTicket)`**:
  - POST `store/` con `{ nombre, direccion, ubigeo, serie_factura, serie_boleta, serie_ticket }`.
  - Tras éxito: GET `auth/me/` → `auth.updateUserMe(...)`.
  - Devuelve `boolean`.

- **`clearMessages()`**: limpia `errorMessage`.

### Mapping interno
- `mapUserMe(json)`: duplica el mapping de `AuthService.mapUserMe` (`first_name`, `last_name`, `tienda_id`, `tienda_nombre`). Mantener consistente con ese.

---

## 3. Endpoints API

| Método | Path                  | Body                                                                                                  | Response                  |
|--------|-----------------------|-------------------------------------------------------------------------------------------------------|---------------------------|
| PATCH  | `auth/profile/`       | `{ first_name, last_name }`                                                                            | UserMe (raw)              |
| POST   | `store/empresa/`      | `{ nombre, ruc }`                                                                                      | (no usado en el front)    |
| POST   | `store/`              | `{ nombre, direccion, ubigeo, serie_factura, serie_boleta, serie_ticket }`                             | (no usado en el front)    |
| GET    | `auth/me/`            | —                                                                                                      | UserMe (raw)              |

> **Nota**: `store/` también lo usa `TiendaRepository.crearTienda` con un body más completo (incluyendo `nombre_sede` y `empresa_id`). Aquí en onboarding la primera tienda parece usar un payload reducido — verificar consistencia con el backend si hay cambios.

---

## 4. Página: `ProfileCompleteComponent` (`/profile/complete`)

### Propósito
Pedir nombre y apellido cuando `isProfileIncomplete(user) === true` (algún campo vacío).

### Forzada por
`authGuard` (sección 6 de `ARQUITECTURA.md`): si `firstName` o `lastName` están vacíos, redirige aquí desde cualquier ruta.

### State local
- `form: FormGroup`:
  - `firstName: ['', Required]`
  - `lastName: ['', Required]`

### Carga inicial (`ngOnInit`)
1. Si `auth.userMe()` existe, pre-rellena con `firstName` / `lastName` actuales (por si tiene uno pero no el otro).
2. `svc.clearMessages()`.

### Acción: `submit()`
1. `markAllAsTouched()`. Si inválido → return.
2. `const ok = await svc.completarPerfil(firstName, lastName)`.
3. Si éxito:
   - Si `auth.isDueno()` → `router.navigate(['/setup'])`.
   - Sino → `router.navigate(['/tienda'])` (⚠️ ruta `/tienda` no existe — debería ser `/tiendas` o `/home`. Ver edge cases).

### Edge cases
- **`/tienda` no existe**: tras completar perfil siendo trabajador/admin, navega a `/tienda` (singular) que no está en `app.routes.ts`. El catch-all redirige a `/login`. **Bug latente — al rediseñar, considera cambiar a `/home`** (el guard reevaluará y mandará a `/select-store` si es necesario).
- **`auth.updateUserMe`**: vital — sin esto, el guard sigue viendo perfil incompleto y volverías a esta página en loop.

---

## 5. Página: `SetupComponent` (`/setup`)

### Propósito
Wizard de 2 pasos para dueños sin tiendas: crear empresa → crear sede inicial.

### Forzada por
`authGuard`: si `isDueno && tiendas.length === 0`, redirige aquí.

### State (consume `svc.state.setupStep`)
- Paso 1: `'empresa'` (default).
- Paso 2: `'tienda'` (tras éxito de `crearEmpresa`).

### Forms locales

**`formEmpresa`**:
- `nombre: ['', Required]` — razón social
- `ruc: ['', [Required, Pattern(/^\d{11}$/)]]` — exactamente 11 dígitos numéricos

**`formTienda`**:
- `nombre: ['', Required]`
- `direccion: ['', Required]`
- `ubigeo: ['', [Required, Pattern(/^\d{6}$/)]]` — 6 dígitos (código INEI)
- `serieFactura: ['F001', Required]`
- `serieBoleta: ['B001', Required]`
- `serieTicket: ['T001', Required]`

### Carga inicial
`svc.clearMessages()`.

### Acciones

- **`submitEmpresa()`**: `markAllAsTouched()`; si válido → `clearMessages()` + `svc.crearEmpresa(nombre, ruc)`. Tras éxito, el service avanza `setupStep` a `'tienda'` automáticamente.
- **`submitTienda()`**: idem. Si éxito → `router.navigate(['/tienda'])` (⚠️ misma ruta inexistente — ver edge cases).

### Edge cases
- **`/tienda` no existe**: tras completar el setup, navega a una ruta inválida. Mismo bug que en `ProfileCompleteComponent`. Al rediseñar, usar `/home`.
- **Si el dueño cierra el wizard a la mitad** (refresh, navega manualmente): `setupStep` está en memoria del service singleton — sobrevive a navigation pero NO a refresh. Tras refresh, vuelve a `setupStep: 'empresa'`. Si la empresa ya está creada en backend, el POST repetido falla y el dueño queda atascado. Considerar: tras refresh, verificar si la empresa ya existe leyendo `userMe()`.
- **RUC inválido**: validación cliente sólo verifica formato (11 dígitos). Validación de checksum es del backend.

---

## 6. Notas para el rediseño

### NO tocar
- `OnboardingService` (state shape, los 3 métodos, el patrón "PATCH + refetch /me + updateUserMe").
- `auth.updateUserMe` es **esencial** tras cada operación — sin esto el guard no avanza.
- Reglas: dueño hace setup, no-dueño solo profile-complete.
- Patrones de validación: RUC `/^\d{11}$/`, Ubigeo `/^\d{6}$/`.

### Bugs conocidos / Cosas a arreglar en el rediseño
- **Navegación post-éxito**: ambas páginas navegan a `/tienda` (inexistente). Cambiar a `/home`.
- **Setup tras refresh**: el `setupStep` no se persiste; un refresh entre paso 1 y 2 puede dejar al dueño atascado. Considerar leer `userMe()` al `ngOnInit` y avanzar `setupStep` si ya hay empresa pero no tienda.

### Rediseñable libremente
- Estilos inline (CSS-in-TS) — sepáralos.
- El stepper visual del setup puede ser un componente compartido si se reutiliza en otros wizards (venta, servicio).
- El form de tienda en setup repite el de `TiendaFormComponent` (parcialmente). Considera unificar o extraer el sub-form.

### Dependencias cruzadas
- **`AuthService`**: `userMe`, `updateUserMe`, `isDueno`.
- **`authGuard`**: depende de `isProfileIncomplete` y de `tiendas.length === 0`. Si cambias el contrato del onboarding, ajusta el guard.

### Comportamiento esperado
- Tras éxito, el guard reevaluará en la próxima navegación. La navegación manual del componente es **solo un hint** — el guard es la fuente de verdad del flujo.
- Los GET `auth/me/` después de POST son necesarios porque los endpoints de creación no devuelven el modelo completo del usuario.
