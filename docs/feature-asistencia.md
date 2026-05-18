# Feature: Asistencia

## 1. Resumen

Módulo de marcación de asistencia (entrada/salida) de los trabajadores y administradores de una tienda, más un resumen mensual de días/horas trabajadas. Sólo es accesible para dueños y administradores (`adminGuard`).

El módulo combina datos de dos repositorios: `UsuariosRepository` (lista de usuario-tienda) y `AsistenciaRepository` (registros de asistencia). En la pestaña "hoy" filtra a los usuarios activos no-dueño y los empareja con su registro de asistencia del día (o `null` si no han marcado).

Ruta: `/asistencia` (guard: `adminGuard`).

---

## 2. Modelos (`models/asistencia.model.ts`)

### `AsistenciaModel`
```ts
interface AsistenciaModel {
  id: number;
  usuarioTienda: number;       // FK al UsuarioTiendaModel.id
  usuarioNombre: string;
  fecha: string;               // 'YYYY-MM-DD'
  horaEntrada: string | null;  // 'HH:MM:SS' o null
  horaSalida: string | null;
  almuerzo: boolean;           // si se descontó hora de almuerzo
  horasTrabajadas: number | null;
}
```

### `AsistenciaResumenModel`
```ts
interface AsistenciaResumenModel {
  usuarioTiendaId: number;
  usuarioNombre: string;
  mes: number;          // 1-12
  anio: number;
  diasTrabajados: number;
  horasTotales: number;
}
```

### `UsuarioConAsistencia` (helper local)
```ts
interface UsuarioConAsistencia {
  usuario: UsuarioTiendaModel;        // viene de features/usuarios
  asistencia: AsistenciaModel | null;
}
```

### Mapping snake_case → camelCase
- `asistenciaFromJson`: `usuario_tienda → usuarioTienda`, `usuario_nombre`, `hora_entrada`, `hora_salida`, `horas_trabajadas` (convertido a `Number` si no es null).
- `asistenciaResumenFromJson`: `usuario_tienda_id → usuarioTiendaId`, `dias_trabajados → diasTrabajados`, `horas_totales → horasTotales` (forzado a `Number`).

---

## 3. Endpoints API

| Método | Path                                    | Body                                       | Query                                  | Response                              |
|--------|-----------------------------------------|--------------------------------------------|----------------------------------------|---------------------------------------|
| GET    | `auth/asistencia/`                      | —                                          | `usuario_tienda?`, `fecha?` (YYYY-MM-DD)| Array de `AsistenciaModel`           |
| GET    | `auth/asistencia/resumen/`              | —                                          | `mes`, `anio`, `usuario_tienda?`        | Array de `AsistenciaResumenModel`     |
| POST   | `auth/asistencia/entrada/`              | `{ usuario_tienda: number }`               | —                                      | (vacío / 201)                         |
| POST   | `auth/asistencia/salida/`               | `{ usuario_tienda: number, almuerzo: boolean }` | —                                  | (vacío / 200)                         |

Adicionalmente consume `auth/usuario-tienda/?tienda=<id>` para listar los trabajadores activos (ver `feature-usuarios.md`).

---

## 4. Repository (`asistencia.repository.ts`)

| Método                                                             | Endpoint                                | Transformación                                          |
|--------------------------------------------------------------------|-----------------------------------------|---------------------------------------------------------|
| `getAsistencias({ usuarioTienda?, fecha? })`                       | GET `auth/asistencia/`                  | snake → camel, devuelve `AsistenciaModel[]`             |
| `getResumen({ mes, anio, usuarioTienda? })`                        | GET `auth/asistencia/resumen/`          | snake → camel, devuelve `AsistenciaResumenModel[]`      |
| `marcarEntrada(usuarioTiendaId)`                                   | POST `auth/asistencia/entrada/`         | —                                                       |
| `marcarSalida(usuarioTiendaId, almuerzo)`                          | POST `auth/asistencia/salida/`          | —                                                       |

Todos envuelven errores con `extractApiError`.

---

## 5. Service: `AsistenciaService`

### State
```ts
interface AsistenciaState {
  isLoading: boolean;          // carga de "hoy"
  isMarking: boolean;          // marcando entrada/salida
  isLoadingResumen: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  usuariosHoy: UsuarioConAsistencia[];
  resumen: AsistenciaResumenModel[];
  mesResumen: number;          // default: mes actual
  anioResumen: number;         // default: año actual
}
```
Inicialización: `mesResumen` y `anioResumen` se setean al mes/año actual del cliente.

### Signals públicos
- `state` (readonly).

### Métodos públicos

- **`cargarAsistenciasHoy()`**:
  - Lee `auth.selectedTiendaId()` y la fecha de hoy (`YYYY-MM-DD` local).
  - Ejecuta `Promise.all` con `getUsuarios({ tiendaId })` y `getAsistencias({ fecha: hoy })`.
  - **Filtra usuarios**: solo activos (`usuarioIsActive`) y rol ≠ `DUENO`.
  - Empareja cada usuario con su `AsistenciaModel` donde `asistencia.usuarioTienda === usuario.id`. Si no existe → `null`.
  - Actualiza `state.usuariosHoy`.

- **`cargarResumen(mes?, anio?)`**:
  - Si no se pasan, usa los valores actuales del state.
  - Actualiza `mesResumen` y `anioResumen` en state y carga `getResumen({ mes, anio })`.

- **`marcarEntrada(usuarioTiendaId)`**:
  - POST entrada → recarga `cargarAsistenciasHoy()` automáticamente.
  - Setea `successMessage: 'Entrada registrada'`.

- **`marcarSalida(usuarioTiendaId, almuerzo)`**:
  - POST salida → recarga `cargarAsistenciasHoy()`.
  - Setea `successMessage: 'Salida registrada'`.

- **`clearMessages()`**: limpia `errorMessage` y `successMessage`.

### Helper interno
- `fechaHoy()`: formatea la fecha actual del cliente como `YYYY-MM-DD` con `padStart(2, '0')`.

---

## 6. Página: `AsistenciaComponent` (`/asistencia`)

### Propósito
Pantalla con dos tabs: **"hoy"** (marcar entrada/salida por usuario) y **"resumen"** (estadísticas mensuales).

### Signals/state consumidos
- `svc.state` (`AsistenciaState`).
- `auth.selectedTiendaId()` (en `effect` para recargar al cambiar tienda).

### State local
- `tab: signal<'hoy' | 'resumen'>` — pestaña activa, default `'hoy'`.
- `dialogSalida: UsuarioConAsistencia | null` — usuario seleccionado para diálogo de salida.
- `almuerzo: boolean` — checkbox del diálogo.
- `mesOpciones`: array de `{ value, label }` con los 12 meses en `es-PE` (`new Date().toLocaleString('es-PE', { month: 'long' })`).
- `anioOpciones`: año actual y año anterior.

### Carga inicial
En el constructor hay un `effect()` que **se re-ejecuta cada vez que cambia `auth.selectedTiendaId()`** → llama a `svc.cargarAsistenciasHoy()`. Esto cubre el initial load y cambios de tienda.

### Acciones de usuario
- `cambiarTab(t)`: setea tab; si entra a `'resumen'` y `resumen` está vacío → `svc.cargarResumen()`.
- `marcarEntrada(u)`: `svc.marcarEntrada(u.usuario.id)`.
- `abrirSalida(u)`: setea `dialogSalida = u` y resetea `almuerzo = false`.
- `confirmarSalida()`: `svc.marcarSalida(dialogSalida.usuario.id, almuerzo)` y cierra dialog.
- `cambiarMes(mes)` / `cambiarAnio(anio)`: `svc.cargarResumen(mes, ...)` o `(..., anio)`.
- `onMesChange(event)` / `onAnioChange(event)`: handlers de `<select>` que parsean el value.

### Edge cases
- **Cambio de tienda**: el `effect` recarga. Si `selectedTiendaId` es `null` (no debería pasar gracias al `authGuard`), `cargarAsistenciasHoy` lo pasa como `undefined` al repo → devuelve usuarios de todas las tiendas (depende del backend).
- **No hay usuarios**: `usuariosHoy` queda vacío; la UI debe mostrar empty state.
- **Recarga tras marcar**: `marcarEntrada/Salida` siempre recargan; no hay actualización optimista. Bloquea con `isMarking` durante la operación.

### Reglas de negocio (en el componente)
- **Excluye al dueño** de la lista de marcación (se filtra en `cargarAsistenciasHoy`).
- Solo muestra usuarios `usuarioIsActive`.

---

## 7. Notas para el rediseño

### NO tocar
- `AsistenciaRepository` y sus 4 endpoints — son contrato API.
- `AsistenciaService` (state shape, métodos, lógica de filtrado y emparejamiento).
- Modelos y `*FromJson`.
- El `effect()` que reacciona a `selectedTiendaId` (puede moverse, pero la dependencia debe respetarse).

### Reorganizable
- El diálogo de "salida" (con checkbox de almuerzo) puede ser un componente separado o un modal global; mientras `dialogSalida`/`almuerzo`/`confirmarSalida` mantengan el mismo flujo, está OK.
- Los tabs ('hoy', 'resumen') pueden convertirse en rutas hijas (`/asistencia/hoy`, `/asistencia/resumen`) o quedarse como signal local.
- El cómputo de `mesOpciones`/`anioOpciones` puede moverse a una constante o helper compartido.

### Dependencias cruzadas
- **`UsuariosRepository`**: se llama directamente desde `AsistenciaService.cargarAsistenciasHoy` (no via service). Si rediseñas, mantén esta dependencia.
- **`AuthService.selectedTiendaId`**: clave para filtrar usuarios por tienda activa.
- **`Roles.dueno`**: usado para filtrar al dueño de la lista.

### Comportamiento esperado
- Las acciones de marcado **bloquean toda la UI relevante** (`isMarking`) y muestran mensaje de éxito tras recarga. El mensaje no se limpia automáticamente — `clearMessages()` se debe llamar manualmente.
- La fecha se construye **en cliente** (zona horaria local del navegador) — si el backend espera UTC, podría haber edge case en horas cercanas a medianoche.
