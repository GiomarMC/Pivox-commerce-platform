# Feature: Tienda

## 1. Resumen

Administración de las tiendas (sedes) de la empresa. Cada tienda tiene RUC heredado de la empresa, ubigeo (código INEI), dirección y series de comprobante (factura, boleta, ticket).

Operaciones:
- Listar tiendas, seleccionar la activa (interacción con `AuthService`).
- Crear nueva tienda (con sugerencia automática de siguiente serie).
- Editar tienda existente (sólo `nombreSede`, `direccion`, `ubigeo` — las series no se editan post-creación).
- Desactivar (delete en backend — la tienda desaparece de la lista).

Rutas:
- `/tiendas` — lista (sin guard adicional)
- `/tiendas/form` — formulario crear/editar (sin guard adicional; recibe la tienda via `router.getCurrentNavigation().extras.state.tienda`)

**El `TiendaService` también expone `tiendaActiva` (computed) que el `MainShellComponent` consume** para mostrar el nombre de la sede actual.

---

## 2. Modelo (`core/models/store.model.ts`)

> Este modelo vive en `core/`, no en `features/tienda/`, porque varios features lo consumen.

```ts
interface StoreModel {
  id: number;
  nombreSede: string;
  direccion: string;
  ubigeo: string;          // 6 dígitos código INEI
  ruc: string;
  serieFactura: string;    // ej. 'F001'
  serieBoleta: string;     // ej. 'B001'
  serieTicket: string;     // ej. 'T001'
  empresaId: number | null;
  isActive: boolean;
  createdAt?: string;
}
```

### Mapping (`storeFromJson`)
- `nombre_sede → nombreSede`
- `serie_factura → serieFactura`
- `serie_boleta → serieBoleta`
- `serie_ticket → serieTicket`
- `empresa_id → empresaId` (puede ser null)
- `is_active → isActive` (default `true`)
- `created_at → createdAt` (opcional)
- Strings con `?? ''` cuando faltan.

---

## 3. Validators (`validators/tienda.validators.ts`)

Tres `ValidatorFn` para reactive forms:

- **`nombreSedeValidator()`**: trim, mínimo 3 caracteres. Error: `{ minLength: 'Mínimo 3 caracteres' }`.
- **`ubigeoValidator()`**: regex `^\d{6}$`. Error: `{ formatoUbigeo: 'El ubigeo debe tener exactamente 6 dígitos numéricos (código INEI)' }`.
- **`serieValidator()`**: regex `^[A-Z]\d{3}$`. Error: `{ formatoSerie: 'Formato inválido. Ejemplo: F001, B001, T001' }`.

> **Nota**: actualmente el `TiendaFormComponent` usa `Validators.required` directo en lugar de estos custom validators. Quedan disponibles para reuso.

---

## 4. Endpoints API

| Método | Path                  | Body                                                                                              | Response                          |
|--------|-----------------------|---------------------------------------------------------------------------------------------------|-----------------------------------|
| GET    | `store/`              | —                                                                                                 | Array de `StoreModel`             |
| POST   | `store/`              | `{ nombre_sede, direccion, ubigeo, serie_factura, serie_boleta, serie_ticket, empresa_id }`       | `StoreModel`                      |
| PATCH  | `store/{id}/`         | `{ nombre_sede, direccion, ubigeo }` (sólo estos tres editables)                                  | `StoreModel`                      |
| DELETE | `store/{id}/`         | —                                                                                                 | (vacío)                           |

---

## 5. Repository (`tienda.repository.ts`)

| Método                                  | Endpoint                          | Notas                                                  |
|-----------------------------------------|-----------------------------------|--------------------------------------------------------|
| `getTiendas()`                          | GET `store/`                      | Devuelve `StoreModel[]`                                |
| `actualizarTienda(id, payload)`         | PATCH `store/{id}/`               | Sólo `nombreSede`, `direccion`, `ubigeo`               |
| `crearTienda(payload)`                  | POST `store/`                     | Incluye series y `empresaId`                           |
| `desactivarTienda(id)`                  | DELETE `store/{id}/`              | Mensaje genérico de error: `'Error al desactivar la tienda'` (no usa `extractApiError`) |

---

## 6. Service: `TiendaService`

### State
```ts
interface TiendaState {
  isLoading: boolean;
  isSaving: boolean;          // crear/editar/desactivar
  errorMessage: string | null;
  successMessage: string | null;
  tiendas: StoreModel[];
}
```

### Signals públicos
- `state` (readonly).
- **`tiendaActiva: Signal<StoreModel | null>`** (computed):
  - Si `auth.selectedTiendaId()` es null o `tiendas` vacío → `null`.
  - Sino → busca por id; si no encuentra, fallback al primero de la lista.
  - **Usado por `MainShellComponent`** para mostrar el nombre de la tienda actual en el header.

### Métodos públicos

- **`cargarTiendas()`**: GET y actualiza `state.tiendas`.

- **`actualizarTienda(id, { nombreSede, direccion, ubigeo })`**:
  - PATCH → reemplaza la tienda en `state.tiendas` con la actualizada.
  - Setea `successMessage: 'Tienda actualizada correctamente'`.

- **`crearTienda({ nombreSede, direccion, ubigeo, serieFactura, serieBoleta, serieTicket, empresaId })`**:
  - POST → agrega al final de `state.tiendas`.
  - Setea `successMessage: 'Tienda creada correctamente'`.

- **`desactivarTienda(id)`**:
  - DELETE → filtra fuera de `state.tiendas`.
  - **Side effect importante**: si la tienda desactivada era la `selectedTiendaId` y queda al menos una tienda → `auth.selectTienda(tiendas[0].id)` (re-selecciona la primera).

- **`clearMessages()`**: limpia ambos mensajes.

---

## 7. Páginas

### 7.1. `TiendasComponent` (`/tiendas`)

#### Propósito
Lista todas las tiendas; permite seleccionar la activa y desactivar.

#### Signals/state consumidos
- `svc.state` — lista y flags.
- `auth.isDueno` — para mostrar botón de crear.
- `auth.selectedTiendaId` — para marcar la activa.

#### Carga inicial
`ngOnInit`: `svc.cargarTiendas()`.

#### Acciones de usuario
- `seleccionarTienda(id)`: `auth.selectTienda(id)`. **Esto persiste en `localStorage` (`last_tienda_id`).**
- `desactivar(tienda)`: `confirm("¿Desactivar la tienda 'X'?")` → `svc.desactivarTienda(tienda.id)`.

#### Navegación
- Hacia `/tiendas/form` (nueva) o `/tiendas/form` con `[state]="{ tienda }"` (editar). Lo dispara desde el template con `[routerLink]`.

#### Edge cases
- No hay paginación — asume pocas tiendas por empresa.
- Desactivar la tienda activa fuerza re-selección a la primera disponible.

---

### 7.2. `TiendaFormComponent` (`/tiendas/form`)

#### Propósito
Formulario crear/editar tienda con `ReactiveFormsModule`.

#### Modo edición vs creación
- Detecta modo edición leyendo `router.getCurrentNavigation()?.extras?.state?.tienda` en `ngOnInit`.
- Si hay `tienda` → modo edición; pre-rellena `nombreSede`, `direccion`, `ubigeo`. Las series NO se editan post-creación.
- Si NO hay → modo creación; **sugiere la siguiente serie** vía helper `siguienteSerie(series, prefijo)` que extrae el número más alto existente y le suma 1 (ej. `[F001, F002]` → `F003`).

#### Form (reactive)
```ts
form = fb.group({
  nombreSede:   ['', Validators.required],
  direccion:    ['', Validators.required],
  ubigeo:       [''],
  serieFactura: [''],
  serieBoleta:  [''],
  serieTicket:  [''],
});
```

> **Nota**: actualmente no usa los custom validators (`ubigeoValidator`, `serieValidator`). Si quieres validación estricta, hay que aplicarlos aquí.

#### Acciones
- `onSubmit()`:
  - Si edición → `svc.actualizarTienda(id, { nombreSede, direccion, ubigeo })`.
  - Si creación → `svc.crearTienda({ ..., empresaId: 1 })` (¡`empresaId` está hardcoded a `1`!).
  - Si no hay `errorMessage` tras la operación → navega a `/tiendas`.
- `volver()`: navega a `/tiendas` sin guardar.

#### Edge cases
- **`empresaId: 1` hardcoded** — funciona porque el sistema asume una sola empresa por instalación. Si esto cambia, hay que tomar `empresaId` del usuario o de un service.
- Si `getCurrentNavigation` es null (refresh directo en `/tiendas/form`) y no hay state → entra en modo creación. No hay validación que evite refresh.
- Series default `'F001'`, `'B001'`, `'T001'` si quedan vacías.

---

## 8. Notas para el rediseño

### NO tocar
- `StoreModel` y `storeFromJson` (modelo es contrato — varios features lo usan).
- `TiendaRepository` (4 endpoints).
- `TiendaService` — especialmente `tiendaActiva` (lo consume `MainShellComponent`) y el side effect de desactivar.
- Helper `siguienteSerie` (lógica de negocio — sugerencia de serie).
- Validators custom (aunque no se usen aún, son contrato de formato).

### Reorganizable
- El formulario puede ser un modal sobre la lista o una página independiente. Pasar `tienda` por navigation state es frágil — considera ruta `/tiendas/:id/editar` y leer por `ActivatedRoute`.
- `empresaId` hardcoded a `1`: extraer a un service o environment si se va a soportar multi-empresa.
- Los flags `successMessage`/`errorMessage` pueden moverse a un sistema de notificaciones global (toast) en vez de mostrarse inline.

### Dependencias cruzadas
- **`MainShellComponent`**: consume `tiendaSvc.tiendaActiva`.
- **`AuthService.selectedTiendaId`**: el switching de tienda activa pasa por `auth.selectTienda(id)`.
- **`UsuariosComponent`** (cuando es dueño): carga tiendas para selector de "mover usuario".
- **Casi todos los features**: filtran sus listas por `auth.selectedTiendaId()`.

### Comportamiento esperado
- DELETE es soft delete en el backend (el modelo tiene `is_active`). El frontend lo trata como hard delete (saca de la lista).
- La auto-selección de la primera tienda tras desactivar la activa es **importante**: sin esto, el guard fuerza a `/select-store`.
- Las series son inmutables post-creación — restricción de negocio (SUNAT no permite cambiarlas).
