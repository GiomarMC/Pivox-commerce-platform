# Feature: Finanzas

## 1. Resumen

Módulo financiero con cuatro sub-dominios:

- **Caja**: resumen del día (totales por método de pago, contado/crédito, ventas vs servicios) y **cierre de caja** (registrar monto real vs esperado).
- **Deudas**: créditos pendientes de ventas y servicios. Búsqueda por documento de cliente o número de comprobante. Pagos parciales o totales — el backend devuelve un PDF de comprobante de pago.
- **Pagos**: historial unificado de pagos registrados (filtrable por estado de la deuda).
- **Gastos**: fijos (mensuales: alquiler, sueldos, etc.) y variables (puntuales). Sólo accesible para dueño (`duenioGuard`).

Hay UN servicio (`FinanzasService`) con state amplio que cubre los cuatro dominios, más un servicio auxiliar `PagoPdfService` para abrir el PDF del comprobante de pago en una nueva pestaña.

Rutas:
- `/finanzas` → `FinanzasHubComponent` (dashboard)
- `/finanzas/caja/resumen` → `CajaResumenComponent`
- `/finanzas/caja/cierre` → `CajaCierreComponent`
- `/finanzas/deudas` → `DeudasComponent`
- `/finanzas/pago-resumen` → `PagoResumenComponent`
- `/finanzas/gastos` → `GastosComponent` (`duenioGuard`)

---

## 2. Modelos / DTOs

### `CajaResumenModel` (`models/caja-resumen.model.ts`)
```ts
interface ResumenOperaciones {
  totalGeneral: string;
  totalContado: string;
  totalCredito: string;
  totalEfectivo: string;
  totalYape: string;
  totalPlin: string;
  totalTransferencia: string;
  totalTarjeta: string;
}

interface CajaResumenModel {
  fecha: string;                                 // 'YYYY-MM-DD'
  tiendaId: number;
  resumenVentas: ResumenOperaciones | null;
  resumenServicios: ResumenOperaciones | null;
  totalEfectivo, totalYape, totalPlin, totalTransferencia, totalTarjeta: string;
  totalContado, totalCredito, totalGeneral: string;
}
```
Todos los totales son **strings** (para preservar decimales). Defaults `'0'` si la API no los manda.

### `CajaCierreModel`
```ts
interface CajaCierreModel {
  id: number;
  tienda: number;
  usuarioTienda: number;
  fechaHora: string;
  montoEsperado: string;
  montoReal: string;
  diferencia: string;
  estado: string;
  observaciones: string;
}
```

### `DeudaModel` (`models/deuda.model.ts`)
```ts
interface DeudaModel {
  id: number;
  origenId: number;
  tipoOrigen: string;                  // 'venta' | 'servicio'
  numeroComprobante: string | null;
  montoTotal: string;
  saldo: string;                        // lo que falta pagar
  estado: string;                       // 'ACTIVA' | 'PAGADA'
  pagos: PagoInfo[];                    // historial de pagos sobre esta deuda
}

interface PagoInfo {
  fecha: string;
  monto: string;
}
```

### `PagoModel` (`models/pago.model.ts`)
```ts
interface PagoModel {
  id: number;
  clienteId: number;
  origenId: number;
  tipoOrigen: string;                   // 'VENTA' | 'SERVICIO' (mayúsculas — distinto de DeudaModel)
  numeroComprobante: string | null;
  fecha: string;
  monto: string;
}
```

### `GastoTipoModel`
```ts
interface GastoTipoModel { valor: string; etiqueta: string; }
```

### `GastoFijoResumenModel`
```ts
interface TiendaGastoFijoDetalle {
  tienda: string;                       // nombre
  detalle: Record<string, string>;      // ej. { 'Alquiler': '500.00', 'Sueldos': '3000.00' }
  totalGeneral: string;
  mesCerrado: boolean;
}

interface GastoFijoResumenModel {
  tiendas: TiendaGastoFijoDetalle[];
  totalGlobal: string;
}
```
El `*FromJson` acepta **dos formatos**: con `tiendas: []` (multi-tienda) o sin (single tienda → wrappea en array).

### `GastoVariableResumenModel`
```ts
interface GastoVariableResumenModel {
  tienda: string;
  totalMes: string;
  mesCerrado: boolean;
}
```

### Mapping notes
- Casi todos los `*FromJson` usan `String(json[key] ?? '0')` y similares para defaults defensivos.
- Cuidado con la inconsistencia: `DeudaModel.tipoOrigen` es lowercase (`'venta'`/`'servicio'`), `PagoModel.tipoOrigen` es UPPERCASE (`'VENTA'`/`'SERVICIO'`).

---

## 3. Constants (`constants/estados-deuda.ts`)

```ts
ESTADOS_DEUDA = { activa: 'ACTIVA', pagada: 'PAGADA' }
ESTADOS_DEUDA_LABELS = { ACTIVA: 'Activa', PAGADA: 'Pagada' }
ESTADOS_DEUDA_VALUES = ['ACTIVA', 'PAGADA']
getEstadoDeudaLabel(estado): string
```

---

## 4. Validators (`validators/finanzas.validators.ts`)

```ts
montoPositivoValidator()  →  { montoInvalido: 'El monto debe ser mayor a 0' } si <= 0
montoNoNegativoValidator() →  { montoNegativo: 'El monto no puede ser negativo' } si < 0
```

> **Nota**: actualmente las páginas usan `Validators.min(0.01)` y `Validators.min(0)` en lugar de estos custom. Quedan disponibles para reuso.

---

## 5. Endpoints API

### Caja
| Método | Path                            | Body / Query                                                     | Response                       |
|--------|---------------------------------|-------------------------------------------------------------------|--------------------------------|
| GET    | `finances/caja/resumen/`        | `?tienda_id=<id>`                                                 | `CajaResumenModel`             |
| POST   | `finances/caja/cerrar/`         | `{ tienda_id, monto_real, observaciones }`                        | `CajaCierreModel`              |

### Deudas
| Método | Path                            | Body / Query                                                     | Response                       |
|--------|---------------------------------|-------------------------------------------------------------------|--------------------------------|
| GET    | `finances/deudas/`              | `?cliente=<id>&estado=<x>&ordering=<y>&servicio=<id>&venta=<id>`  | Array de `DeudaModel`          |
| GET    | `sales/clientes/`               | `?search=<documento>`                                              | Array de clientes              |
| GET    | `sales/ventas/{numero}/`        | —                                                                  | Venta (sólo se usa `.id`)      |
| GET    | `services/servicio/{numero}/`   | —                                                                  | Servicio (sólo se usa `.id`)   |

### Pagos
| Método | Path                            | Body / Query                                                     | Response                       |
|--------|---------------------------------|-------------------------------------------------------------------|--------------------------------|
| GET    | `finances/pagos/`               | `?deuda__cliente=<id>&deuda__estado=<x>&deuda__servicio=<id>&deuda__venta=<id>&ordering=<y>` | Array de `PagoModel` |
| POST   | `finances/pagos/`               | `{ deuda_id, monto }` — `responseType: 'blob'`                    | **Blob** (PDF de comprobante)  |

### Gastos
| Método | Path                                       | Body / Query                                              | Response                          |
|--------|--------------------------------------------|-----------------------------------------------------------|-----------------------------------|
| GET    | `finances/gastos/tipos/`                   | —                                                          | Array de `GastoTipoModel`         |
| GET    | `finances/gastos/resumen/`                 | `?tienda_id=<id>&mes=<m>&anio=<a>&tipo=fijo`               | `GastoFijoResumenModel`           |
| POST   | `finances/gastos/manual/`                  | `{ tienda_id, tipo_gasto, mes, anio, monto }`              | (vacío)                           |
| GET    | `finances/gastos-variable/resumen/`        | `?tienda_id=<id>&mes=<m>&anio=<a>`                         | `GastoVariableResumenModel`       |
| POST   | `finances/gastos-variable/crear/`          | `{ descripcion, monto, fecha, tienda_id? }`                | (vacío)                           |
| POST   | `finances/gastos/cerrar-mes/`              | `{ tienda_id, mes, anio }`                                 | (vacío)                           |

---

## 6. Repository (`finanzas.repository.ts`)

Métodos públicos (todos envuelven errores con `extractApiError`, las búsquedas auxiliares de cliente/comprobante devuelven `null` en lugar de lanzar):

| Método                                                          | Endpoint                                  | Detalle                                              |
|-----------------------------------------------------------------|-------------------------------------------|------------------------------------------------------|
| `getCajaResumen(tiendaId)`                                      | GET caja resumen                          | Param `tienda_id`                                    |
| `cerrarCaja(tiendaId, montoReal, observaciones)`                | POST caja cerrar                          | Body completo                                        |
| `getDeudas({ cliente?, estado?, ordering?, servicio?, venta? })`| GET deudas                                | Filtros múltiples, tolera `{results}` o array        |
| `getPagos({ deudaCliente?, deudaEstado?, deudaServicio?, deudaVenta?, ordering? })` | GET pagos    | Mapea camelCase → `deuda__<field>` (DRF nested filter) |
| `registrarPago(deudaId, monto)`                                 | POST pagos                                | **Retorna `Blob` (PDF)** — `responseType: 'blob'`   |
| `getTiposGasto()`                                               | GET gastos/tipos                          | Lista de catálogos                                   |
| `getGastosFijosResumen(tiendaId, mes, anio)`                    | GET gastos/resumen                        | Query `tipo: 'fijo'` hardcoded                       |
| `crearGastoFijo({ tiendaId, tipoGasto, mes, anio, monto })`     | POST gastos/manual                        | —                                                    |
| `getGastosVariablesResumen(tiendaId, mes, anio)`                | GET gastos-variable/resumen               | —                                                    |
| `crearGastoVariable({ descripcion, monto, fecha, tiendaId? })`  | POST gastos-variable/crear                | `tienda_id` opcional                                 |
| `cerrarMesGastos(tiendaId, mes, anio)`                          | POST gastos/cerrar-mes                    | Acción irreversible                                  |
| `buscarClientePorDocumento(doc)`                                | GET sales/clientes                        | Devuelve `{id, nombre}` o `null` (silencioso ante 404)|
| `buscarVentaPorComprobante(numero)`                             | GET sales/ventas/{numero}                 | Devuelve `{id}` o `null`                             |
| `buscarServicioPorComprobante(numero)`                          | GET services/servicio/{numero}            | Devuelve `{id}` o `null`                             |

Helper privado:
- `extractList(data)`: tolera `{results: []}` o `[]` directo.

---

## 7. Service: `FinanzasService`

### State
```ts
interface FinanzasState {
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  cajaResumen: CajaResumenModel | null;
  deudas: DeudaModel[];
  pagos: PagoModel[];
  tiposGasto: GastoTipoModel[];
  gastosFijosResumen: GastoFijoResumenModel | null;
  gastosVariablesResumen: GastoVariableResumenModel | null;
  deudasDashboard: DeudaModel[];          // separado del array principal — para el hub
  deudasDashboardLoading: boolean;
}
```

### Signals públicos
- `state` (readonly).

### Métodos públicos

#### Caja
- `cargarCajaResumen()`: GET resumen para `tiendaId` activa.
- `cerrarCaja(montoReal, observaciones)`: POST + recarga resumen. Devuelve `boolean`.

#### Deudas
- `cargarDeudas(filters)`: GET con filtros.
- `buscarDeudasPorDocumento(numeroDocumento)`:
  1. Busca cliente por documento.
  2. Si no encuentra → `errorMessage: 'Cliente no encontrado'`.
  3. Si encuentra → `getDeudas({ cliente: cliente.id })`.
  4. Si la lista vuelve vacía → `errorMessage: 'No hay deudas activas para este cliente'`.
- `buscarDeudasPorComprobante(numero)`:
  1. En paralelo busca venta + servicio por comprobante.
  2. Si ninguno → `errorMessage: 'Comprobante no encontrado'`.
  3. Si encuentra venta → `getDeudas({ venta: venta.id })`. Si servicio → `getDeudas({ servicio: servicio.id })`.
  4. Si la lista vuelve vacía → `errorMessage: 'No hay deudas para este comprobante'`.
- `registrarPago(deudaId, monto)`: POST pago. **Devuelve `Blob | null`** — el PDF de comprobante de pago. El componente lo pasa a `PrintPreviewComponent` o `PagoPdfService`.

#### Pagos
- `cargarPagos(filters)`: GET historial.

#### Gastos
- `cargarTiposGasto()`: catálogo. Silencioso ante error (sólo setea `errorMessage`).
- `cargarGastosFijosResumen(mes, anio)`: GET con tienda activa.
- `crearGastoFijo(tipoGasto, mes, anio, monto)`: POST + recarga resumen del mismo mes/año.
- `cargarGastosVariablesResumen(mes, anio)`: idem.
- `crearGastoVariable(descripcion, monto, fecha)`: POST + parsea `fecha` (`YYYY-MM-DD`) para sacar mes/año y recargar resumen.
- `cerrarMesGastos(mes, anio)`: POST + recarga **ambos** resúmenes (fijos y variables) del mes.

#### Dashboard
- `cargarDeudasDashboard()`: GET deudas con `estado: 'ACTIVA'`. Guarda en `deudasDashboard` (separado del array principal). Silencioso ante error.

#### Util
- `clearMessages()`: limpia `errorMessage` y `successMessage`.

---

## 8. Service: `PagoPdfService` (`pago-pdf.service.ts`)

Mini-service utilitario para manejar el blob del comprobante de pago.

### State
- `blob: signal<Blob | null>` (readonly).

### Métodos
- `guardar(blob)`:
  1. Setea el signal.
  2. `URL.createObjectURL(blob)`.
  3. `window.open(url, '_blank')` — abre el PDF en nueva pestaña.
  4. `setTimeout(URL.revokeObjectURL, 15000)` — limpia URL después de 15s.
- `limpiar()`: setea blob a null.

> **No es el único consumidor del blob**: `DeudasComponent` pasa el blob a `PrintPreviewComponent` (de `feature-impresora`) en lugar de usar `PagoPdfService`. Las dos paths coexisten — el service quedó disponible para usos alternativos.

---

## 9. Componente: `DeudaCardComponent` (`components/deuda-card/`)

### Inputs/Outputs
- `deuda: input.required<DeudaModel>()`.
- `pagar: output<DeudaModel>()` — se emite al click del botón "Registrar pago".

### Computeds
- `montoPagado`: `(montoTotal - saldo).toFixed(2)`.
- `porcentajePagado`: porcentaje (0-100, clamped). Para la barra de progreso.

### Comportamiento
- Color de fondo del ícono varía por `tipoOrigen` (azul para venta, verde para servicio).
- Badge de estado (`badge-warning` para activa, `badge-success` para pagada).
- Lista los `pagos` anteriores si los hay.
- Botón "Registrar pago" sólo si `estado === 'ACTIVA'`.

---

## 10. Páginas

### 10.1. `FinanzasHubComponent` (`/finanzas`)

#### Propósito
Dashboard con resumen del día (caja, métodos de pago, ventas vs servicios %), deudas activas, y acceso a las sub-secciones.

#### Signals/state consumidos
- `svc.state` (`cajaResumen`, `deudasDashboard`).
- `auth.isDueno`.

#### Getters
- `caja` → `cajaResumen`.
- `deudasActivas` → filtra `deudasDashboard` por `estado === 'ACTIVA'`.
- `saldoDeudas` → suma `parseFloat(saldo)` y formatea a 2 decimales.
- `metodosPago` → array con los 5 métodos, filtrado para mostrar solo los > 0.
- `ventasPorc` / `serviciosPorc` → distribución %.
- `fechaHoy` → fecha en español (`'lunes, 5 de mayo'`).

#### `HUB_ITEMS` (constante local)
Array de 5 items navegables: Resumen, Cierre, Deudas, Historial Pagos, Gastos (este último `duenioOnly: true`).

#### Acción
- `visibleItems()` → filtra `HUB_ITEMS` por `duenioOnly` vs `isDueno()`.

#### Carga inicial
`ngOnInit`: `cargarCajaResumen()` + `cargarDeudasDashboard()`.

---

### 10.2. `CajaResumenComponent` (`/finanzas/caja/resumen`)

#### Propósito
Muestra detalle de la caja del día (hero con total, distribución por método de pago, breakdown ventas/servicios).

#### Acciones
- `cargar()`: `svc.cargarCajaResumen()`.
- Botón "Actualizar" en el header.
- Botón "Cerrar caja" → `routerLink="/finanzas/caja/cierre"`.

#### Helper
- `metodosItems(r)`: filtra los 5 métodos a los > 0.

#### Edge cases
- Si no hay `cajaResumen` y no carga → empty state ("Sin datos de caja").
- En error → muestra el banner con botón "Reintentar".

---

### 10.3. `CajaCierreComponent` (`/finanzas/caja/cierre`)

#### Propósito
Cerrar la caja del día: comparar monto esperado del sistema vs monto real contado físicamente.

#### State local
- `form: FormGroup`:
  - `montoReal: [null, [Required, Min(0)]]`
  - `observaciones: ['']`
- `exitoso: boolean` — flag de éxito post-submit.

#### Carga inicial
- Si `state.cajaResumen` no está cargado → `svc.cargarCajaResumen()`.

#### Acción: `cerrar()`
1. `markAllAsTouched()`. Si inválido → return.
2. `svc.clearMessages()`.
3. `svc.cerrarCaja(montoReal: String, observaciones)`.
4. Si OK → `exitoso = true`, `setTimeout(navigate '/finanzas/caja/resumen', 2000)`.

#### Edge cases
- **Cierre irreversible**: una vez cerrada la caja del día, no se puede deshacer. El backend probablemente rechaza segundo cierre del mismo día.
- El monto real puede ser **mayor o menor** que el esperado → el backend calcula `diferencia`.

---

### 10.4. `DeudasComponent` (`/finanzas/deudas`)

#### Propósito
Lista de deudas con búsqueda dual (documento de cliente / comprobante) + filtros por estado + modal de registro de pago + preview del PDF.

#### State local
- `tipoBusqueda: 'documento' | 'comprobante'` (default `'documento'`).
- `queryBusqueda: string`.
- `estadoFiltro: signal<string>` (default `'ACTIVA'`).
- `_hasBuscado: boolean` (interno).
- `deudaSeleccionada: signal<DeudaModel | null>` — modal activo.
- `montoPago: number | null`.
- `mostrarPreview: signal<boolean>` — muestra `PrintPreviewComponent` con el PDF tras pago.
- `previewPdfBlob: signal<Blob | null>`.
- `estadoChips`: array `[{label: 'Activa', value: 'ACTIVA'}, ...]`.

#### Carga inicial
`ngOnInit`: `cargarDeudas({ estado: 'ACTIVA' })`, marca `_hasBuscado = true`.

#### Acciones
- `setEstadoFiltro(estado)`: actualiza filtro; si hay query activo → re-busca; sino → `cargarDeudas`.
- `buscar()`: si `tipoBusqueda === 'documento'` → `buscarDeudasPorDocumento`; sino → `buscarDeudasPorComprobante`.
- `abrirPago(deuda)`: setea `deudaSeleccionada`, pre-rellena `montoPago = parseFloat(saldo)` (pago total por default).
- `cerrarPago()`: limpia modal state.
- `confirmarPago()`:
  1. Valida que haya deuda y monto.
  2. `svc.registrarPago(deuda.id, String(montoPago))` → recibe `Blob | null`.
  3. Si OK → cierra modal, setea `previewPdfBlob` y `mostrarPreview = true`, recarga lista respetando filtro activo.

#### Edge cases
- **Modal sheet bottom**: `.deu-modal-backdrop` cubre toda la pantalla; click fuera cierra.
- **Pago en exceso**: el input tiene `[max]="saldo"` — limita en cliente. El backend probablemente también.
- **Preview del PDF**: usa `PrintPreviewComponent` del feature impresora (no `PagoPdfService`).

---

### 10.5. `PagoResumenComponent` (`/finanzas/pago-resumen`)

#### Propósito
Historial de pagos (no de deudas) filtrable por estado de la deuda.

#### State local
- `estadoFiltro: string` (default `''` = "Todos").
- `estadosDeuda = ESTADOS_DEUDA_VALUES`.

#### Acciones
- `cargar()`: `svc.cargarPagos({ deudaEstado })` si hay filtro, sino `{}`.
- `setEstadoFiltro(estado)`: setea y recarga.

#### Helper
- `formatFecha(fecha)`: `Date.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })` con try/catch.

#### Carga inicial
`ngOnInit`: `cargar()`.

---

### 10.6. `GastosComponent` (`/finanzas/gastos` — `duenioGuard`)

#### Propósito
Gestión de gastos fijos y variables con selector de mes/año, formularios inline y cierre de mes.

#### State local
- `pestana: 'fijos' | 'variables'` (default `'fijos'`).
- `mes` (default mes actual), `anio` (default año actual).
- `mostrarFormFijo: signal<boolean>`, `mostrarFormVariable: signal<boolean>`.
- `meses`: array `[{valor, label}]` con los 12 meses en español.

#### Forms (reactive)

**`formFijo`**:
- `tipoGasto: ['', Required]`
- `monto: [null, [Required, Min(0.01)]]`

**`formVariable`**:
- `descripcion: ['', Required]`
- `monto: [null, [Required, Min(0.01)]]`
- `fecha: [today, Required]` — pre-rellena con hoy

#### Carga inicial
`ngOnInit`: `recargar()` (ambos resúmenes) + `cargarTiposGasto()`.

#### Acciones
- `recargar()`: ambos resúmenes para mes/año actuales, `clearMessages`.
- `detalleEntries(detalle)`: `Object.entries` → `[{key, value}]`.
- `guardarFijo()`: `crearGastoFijo(tipoGasto, mes, anio, monto)`. Si OK → cierra form, reset.
- `guardarVariable()`: `crearGastoVariable(descripcion, monto, fecha)`. Si OK → cierra form, reset (manteniendo fecha hoy).
- `cerrarMes()`: confirm + `cerrarMesGastos(mes, anio)`.

#### Edge cases
- **Cierre de mes irreversible**: confirm dialog lo advierte. Tras cierre, `mesCerrado: true` en el resumen → la UI deshabilita acciones.
- El gasto variable se crea sin `tienda_id` explícito desde el componente — el service lo agrega.
- `mes` se valida como número (mes en JS = `getMonth() + 1` para 1-12).

---

## 11. Notas para el rediseño

### NO tocar
- `FinanzasRepository` — todos los métodos son contrato API (≥ 13 endpoints).
- `FinanzasService` — state shape, especialmente:
  - `deudasDashboard` separado de `deudas` (uno es para el hub, otro para la página detalle).
  - El patrón de `buscarDeudasPorDocumento` / `buscarDeudasPorComprobante` (dos GETs encadenados + manejo de "no encontrado").
  - El return de `registrarPago` como `Blob | null` — el comprobante de pago se descarga del backend.
- `PagoPdfService` (mini-helper para abrir PDFs).
- `DeudaCardComponent` (inputs/outputs).
- Modelos y `*FromJson`. Atención a la inconsistencia `tipoOrigen` (lowercase en deuda, UPPERCASE en pago).
- Constants y validators.
- `duenioGuard` aplicado a `/finanzas/gastos`.

### Reorganizable
- El `FinanzasService` es **gigante** (state cubre 4 sub-dominios). Considera dividirlo en `CajaService`, `DeudaService`, `PagoService`, `GastoService` con shared interface. Reduce la superficie de cada uno.
- `DeudasComponent` es complejo (búsqueda + filtros + modal + preview). Sub-componentes: `DeudaSearch`, `DeudaModalPago`.
- `GastosComponent` mezcla gastos fijos y variables; podrían ser dos páginas separadas o componentes inline.
- Los estilos inline en componentes (`CajaResumenComponent`, `CajaCierreComponent`, `DeudasComponent`, `PagoResumenComponent`, `GastosComponent`) deberían moverse a `.css` files.

### Edge cases conocidos
- **Inconsistencia `tipoOrigen`**: `DeudaModel` usa lowercase, `PagoModel` usa UPPERCASE. Los componentes hacen distintos checks (`=== 'venta'` vs `=== 'VENTA'`). Cuidado al refactorizar.
- **Búsqueda por comprobante**: hace 2 requests en paralelo (`ventas/{numero}/` y `services/servicio/{numero}/`). Si el backend cambia el endpoint que falla con 404, el flujo silencioso podría romperse.
- **Cierres irreversibles**: caja del día y mes de gastos. Confirm dialogs son la única protección. No hay undo.
- **`empresaId: 1` hardcoded** en `TiendaFormComponent.crearTienda` (no en finanzas, pero relacionado): el sistema asume una sola empresa.
- **Currency**: todos los montos se manejan como **strings con decimales**. Operaciones aritméticas requieren `parseFloat` y back to `.toFixed(2)`. Considera librería decimal si va a haber más operaciones.

### Dependencias cruzadas
- **`feature-impresora`**: `DeudasComponent` usa `PrintPreviewComponent`. Si se redibuja `print-preview`, cuidado con el contrato `[pdfBlob]` + `(cerrar)`.
- **`feature-venta`** y **`feature-servicio`**: las deudas vienen de ventas/servicios a crédito. La búsqueda por comprobante toca `sales/ventas/{n}/` y `services/servicio/{n}/`.
- **`NotificacionService`** (core) lee `finances/deudas/?estado=ACTIVA&page_size=1` para el badge de alertas.
- **`feature-home`** muestra widgets de deudas — comparte data con `deudasDashboard` o hace su propia carga.
- **`auth.selectedTiendaId`**: requerido para `cajaResumen`, `gastos*`. NO requerido para `deudas` / `pagos` (esos son por cliente o por comprobante).

### Comportamiento esperado
- Tras cualquier operación de creación/cierre, el service **recarga el resumen relevante**. No hay actualización optimista.
- Los mensajes de éxito (`successMessage`) NO se limpian automáticamente — el componente o navegación los limpia con `clearMessages()`.
- Los métodos de pago (efectivo, yape, plin, transferencia, tarjeta) son **fijos** — coinciden con `feature-venta/constants/metodo-pago.ts`.
