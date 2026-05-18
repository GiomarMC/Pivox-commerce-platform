# Feature: Servicio

Documentación detallada del módulo `features/servicio/`. Modela el registro de **servicios prestados** (mano de obra, mantenimientos, asistencia técnica, etc.) como una operación monetaria que puede emitirse en modo normal, a crédito o con comprobante electrónico SUNAT (boleta/factura). Es el módulo gemelo de `venta`, pero sin carrito de productos: el "ítem" es un único bloque descripción + período + monto total.

Para el contexto general (auth, http, guards, storage, convenciones), ver [`ARQUITECTURA.md`](./ARQUITECTURA.md).

---

## 1. Resumen

### 1.1 Estructura de archivos

```
features/servicio/
  components/
    servicio-flow-header/
      servicio-flow-header.component.ts         (stepper visual)
  models/
    nota-credito.model.ts                       (NotaCreditoData)
    servicio-create.model.ts                    (ServicioCreateModel + DTO mapping)
    servicio-read.model.ts                      (ServicioReadModel + DTO mapping)
  pages/
    comprobante/comprobante.component.ts        (step 3 — post-creación)
    formulario/formulario.component.ts          (step 1 standalone — variante)
    historial/historial.component.ts            (lista filtrable)
    resumen/resumen.component.ts                (step 2 standalone — variante)
    servicio/servicio.component.ts              (wrapper que fusiona formulario + resumen)
  validators/
    servicio.validators.ts                      (fechaFin, totalPositivo, clienteRequerido)
  resumen-servicio.service.ts                   (estado del bloque pago/cliente)
  servicio-form.service.ts                      (estado del bloque descripción/fechas/total)
  servicio.repository.ts                        (HTTP a services/servicio/*)
  servicio.service.ts                           (orquestador y singleton de estado)
```

### 1.2 Servicios singletons (`providedIn: 'root'`)

| Servicio | Rol | Persistencia entre rutas |
|---|---|---|
| `ServicioService` | Orquesta creación, NC, anulación, eliminación, historial, descarga de PDF, consulta SUNAT. Es la fuente del último servicio creado. | Sí (singleton) |
| `ServicioFormService` | Solo guarda los 4 campos del bloque "detalle" (descripción, fechaInicio, fechaFin, total) | Sí |
| `ResumenServicioService` | Guarda configuración de pago/cliente (tipoVenta, metodoPago, tipoComprobante, cliente) | Sí |
| `ServicioRepository` | Capa HTTP (POST/GET/DELETE + mapping snake_case → camelCase) | Sí |

### 1.3 Reutilización con `venta`

El feature **reutiliza intencionalmente** módulos de `venta` (no se duplican). Ver §10 para detalle:

- `features/venta/models/cliente.model.ts` → `ClienteModel`, `clienteFromJson`.
- `features/venta/components/cliente-search/cliente-search.component.ts` → buscador de clientes.
- `features/venta/constants/{tipo-venta,metodo-pago,tipo-comprobante,estado-sunat}.ts` → enums + labels.
- `features/venta/validators/venta.validators.ts` → `rucValidator`, `noRucEnBoletaValidator`.
- `features/impresora/print-preview/print-preview.component.ts` y `features/impresora/ticket.converter.ts` → impresión ESC/POS.

---

## 2. Flujo multi-step

### 2.1 Rutas (de `app.routes.ts` líneas 118-140)

| Path | Componente | Notas |
|---|---|---|
| `/servicios` | `ServicioComponent` (wrapper) | Step 1+2 fusionados en una pantalla con panel lateral |
| `/servicios/resumen` | redirect → `/servicios` (pathMatch full) | Restos del flujo "separado" |
| `/servicios/comprobante` | `ComprobanteServicioComponent` | Step 3 |
| `/servicios/historial` | `ServicioHistorialComponent` | Pantalla independiente, no es step |

### 2.2 Cómo funciona en la práctica

Existen **dos implementaciones del flujo** que conviven en el repo:

1. **Activa (production)** — `ServicioComponent` (`pages/servicio/servicio.component.ts`) condensa step 1 (detalle del servicio) y step 2 (tipo / pago / cliente / SUNAT) en una sola pantalla con grid `1fr 360px` en desktop y bottom-sheet en mobile. El header del flow muestra **2 burbujas**: `Servicio` (1) y `Comprobante` (2).
2. **Legacy (no enrutada directamente)** — `FormularioComponent` + `ResumenServicioComponent` siguen el patrón clásico de dos rutas separadas. `formulario` navega a `/servicios/resumen`, pero esa ruta hoy redirige a `/servicios`. Estos componentes existen como **variante alternativa** y mantienen state sincronizado con los mismos servicios singletons, así que cambiar a un flujo por rutas reales es trivial (solo registrar las rutas en `app.routes.ts`).

> Nota para rediseño: ambos componentes leen/escriben en `ServicioFormService` y `ResumenServicioService`, así que la "fuente de verdad" del state es el service, no el componente. Esto facilita rotar UI sin perder datos al cambiar de paso.

### 2.3 Diagrama de navegación

```
                ┌──────────────┐
                │ /servicios   │  (ServicioComponent, step 1+2)
                │  formDetalle │
                │  formConfig  │
                └──────┬───────┘
                       │ registrar()
                       │ servicioSvc.crearServicio()
                       ▼
                ┌──────────────────────┐
                │ /servicios/          │ (ComprobanteServicioComponent, step 3)
                │   comprobante        │
                │ acciones:            │
                │  - descargar PDF     │
                │  - imprimir          │
                │  - emitir NC         │
                │  - anular            │
                │  - cancelar/eliminar │
                │  - nuevo servicio    │
                │  - ver operaciones   │
                └──────────────────────┘

(/servicios/historial vive aparte, accesible desde el menú)
```

### 2.4 Step indicator

`ServicioFlowHeaderComponent` declara dos pasos `Servicio` (1) y `Comprobante` (2). Sin embargo el comprobante invoca `<app-servicio-flow-header [currentStep]="3" />`, lo que produce que ambas burbujas queden en estado **done** (check verde). Es intencional para indicar finalización (ver `comprobante.component.ts:38`).

---

## 3. Modelos / DTOs

### 3.1 `ServicioCreateModel` (`models/servicio-create.model.ts`)

Payload de entrada para crear un servicio.

```ts
interface ClienteNuevoServicio {
  nombre: string;
  tipoDocumento: string;        // '1' DNI | '6' RUC | '7' Pasaporte
  numeroDocumento: string;
  telefono: string;
  email: string;
  direccion: string;
}

interface ServicioCreateModel {
  tiendaId: number;
  descripcion?: string;
  fechaInicio: string;          // 'YYYY-MM-DD'
  fechaFin: string;             // 'YYYY-MM-DD'
  total: string;                // decimal serializado: '120.00'
  tipo: string;                 // 'NORMAL' | 'CREDITO' | 'SUNAT'
  metodoPago?: string;          // 'EFECTIVO' | 'TARJETA' | 'YAPE' | ... (omitido si CREDITO)
  tipoComprobante?: string;     // '01' Factura | '03' Boleta (sólo si SUNAT)
  clienteId?: number;
  clienteNuevo?: ClienteNuevoServicio;
  camposFaltantesClienteExistente?: Record<string, string>;
}
```

#### Mapping a JSON (`servicioCreateModelToJson`, líneas 24-61)

Reglas aplicadas al serializar:

- Siempre: `tienda_id`, `fecha_inicio`, `fecha_fin`, `total`, `tipo`.
- `metodo_pago` se omite **si `tipo === 'CREDITO'`** (servicios a crédito no tienen pago inmediato).
- `descripcion` solo se envía si tiene contenido tras `trim()`.
- `tipo_comprobante` solo si `tipo === 'SUNAT'`.
- Si `clienteId > 0`: se envía `cliente_id` (+ `cliente_campos_adicionales` cuando hay campos faltantes del cliente existente).
- Si no hay `clienteId` y sí `clienteNuevo`: se envía el objeto `cliente` con los campos no vacíos (`tipo_documento`, `numero_documento`, `telefono`, `email`, `direccion`); `nombre` siempre se incluye.

### 3.2 `ServicioReadModel` (`models/servicio-read.model.ts`)

Respuesta del backend.

```ts
interface ServicioReadModel {
  id: number;
  numeroComprobante: string;        // Se usa como identificador en URLs (es la primary key de operaciones)
  cliente: ClienteModel | null;     // Reutiliza modelo de venta (cliente.model.ts)
  tiendaId: number;
  tiendaNombre: string;
  tipo: string;                     // 'NORMAL' | 'CREDITO' | 'SUNAT'
  tipoDisplay: string;              // texto legible enviado por backend
  metodoPago: string | null;
  metodoPagoDisplay: string | null;
  estadoSunat: string;              // 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | 'NO_APLICA' (default)
  estadoSunatDisplay: string;
  tipoComprobante: string;          // '01' | '03' | '' para no-SUNAT
  tipoComprobanteDisplay: string;
  hashCpe: string;                  // Hash del comprobante electrónico
  urlXml: string | null;            // URLs públicas a archivos generados por SUNAT
  urlPdfA4: string | null;
  urlPdfTicket: string | null;
  urlCdr: string | null;
  motivoRechazo: string;            // Texto si SUNAT rechazó
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  total: number;                    // parseado a number en mapping
  isActive: boolean;                // false → servicio anulado/eliminado lógicamente
  fecha: string;                    // fecha/hora de emisión
  deuda: number;                    // monto pendiente (solo CREDITO)
}
```

#### Notas de mapping (`servicioReadModelFromJson`, líneas 32-62)

- `tienda` puede venir como objeto `{ id, nombre }` o como número (id pelado) — se acepta ambos.
- `total` y `deuda` se hacen `parseFloat(String(...))` para tolerar string o number.
- `cliente` puede ser `null`; si viene se delega a `clienteFromJson` de `venta/models/cliente.model.ts`.
- `estadoSunat` por defecto es `'NO_APLICA'` cuando el backend no lo manda.

### 3.3 `NotaCreditoData` (`models/nota-credito.model.ts`)

Subdocumento devuelto en la respuesta de `emitir nota-crédito`.

```ts
interface NotaCreditoData {
  numero: string;        // N° del comprobante de NC
  estado: string;        // 'ACEPTADO' | 'RECHAZADO' | 'PENDIENTE'
  hash: string;          // hash del CPE de la NC
  xml: string | null;    // URL al XML firmado
  cdr: string | null;    // URL al CDR de SUNAT
  pdfTicket: string | null;
  pdfA4: string | null;
}
```

---

## 4. Endpoints API

Base: `${environment.apiBaseUrl}services/servicio/` (= `http://127.0.0.1:8000/api/services/servicio/` en dev).

| Método | Endpoint | Repo method | Body | Respuesta |
|---|---|---|---|---|
| POST | `services/servicio/` | `crearServicio` | `ServicioCreateModel` serializado (ver §3.1 mapping) | `ServicioReadModel` |
| GET | `services/servicio/{numero}/` | `getServicio` | — | `ServicioReadModel` |
| GET | `services/servicio/?tienda={id}&cursor=...&tipo=...&search=...&estado_sunat=...&fecha=...` | `getServicios` | — | `{ results: ServicioReadModel[], next: string \| null }` o array directo |
| DELETE | `services/servicio/{numero}/` | `eliminarServicio` | — | 204 |
| POST | `services/servicio/{numero}/anular/` | `anularServicio` | `{ motivo: string }` | `ServicioReadModel` |
| POST | `services/servicio/{numero}/nota-credito/` | `emitirNotaCredito` | `{ codigo_tipo: '01'\|'09', motivo: string, precio_nuevo?: string }` | `ServicioReadModel & { nota_credito: NotaCreditoData \| null }` |
| POST | `services/servicio/{numero}/consultar-estado/` | `consultarEstadoSunat` | `null` | `ServicioReadModel` |
| GET | `services/servicio/{numero}/ticket/` | `descargarTicketPdf` | — (responseType `blob`) | `Blob` (PDF) |

### 4.1 Body shape: POST `services/servicio/`

```jsonc
{
  "tienda_id": 1,
  "fecha_inicio": "2026-05-01",
  "fecha_fin": "2026-05-10",
  "total": "320.00",
  "tipo": "SUNAT",
  "metodo_pago": "EFECTIVO",      // omitido si tipo === 'CREDITO'
  "descripcion": "Mantenimiento de impresora",   // opcional, solo si no-vacío
  "tipo_comprobante": "01",       // solo si tipo === 'SUNAT'
  // Opción A — cliente existente:
  "cliente_id": 42,
  "cliente_campos_adicionales": {  // opcional, solo si hay
    "email": "x@y.com"
  },
  // Opción B — cliente nuevo (si no hay cliente_id):
  "cliente": {
    "nombre": "ACME S.A.C.",
    "tipo_documento": "6",
    "numero_documento": "20123456789",
    "telefono": "999111222",       // omitidos si vacíos
    "email": "contacto@acme.pe",
    "direccion": "Av. ..."
  }
}
```

### 4.2 Body shape: POST `.../anular/`

```json
{ "motivo": "Cliente solicitó anulación" }
```

### 4.3 Body shape: POST `.../nota-credito/`

```jsonc
{
  "codigo_tipo": "01",        // '01' = anulación total | '09' = disminución en valor
  "motivo": "...",
  "precio_nuevo": "150.00"    // solo si codigo_tipo === '09'
}
```

### 4.4 Body shape: POST `.../consultar-estado/`

Sin body (envía `null`).

### 4.5 Paginación

`getServicios` usa **DRF cursor pagination**. El campo `next` es una URL completa; el repo extrae el query param `cursor` con `extractCursor` (líneas 153-156). El service guarda ese cursor en `historial.nextCursor` y lo reusa en `cargarMasServicios`.

---

## 5. Repository (`servicio.repository.ts`)

`@Injectable({ providedIn: 'root' })`. Dependencia: `HttpClient` vía `inject()`. Base URL: `environment.apiBaseUrl`.

### 5.1 `crearServicio(payload: ServicioCreateModel): Promise<ServicioReadModel>`

POST a `services/servicio/`. Aplica `servicioCreateModelToJson` antes del envío y `servicioReadModelFromJson` a la respuesta. En error envuelve con `extractApiError`. (`repository.ts:25-34`)

### 5.2 `getServicio(numeroComprobante: string): Promise<ServicioReadModel>`

GET por número. (`repository.ts:36-45`)

### 5.3 `getServicios(tiendaId, cursor?, filters?): Promise<ServiciosPageResult>`

GET listado paginado. Acepta filtros opcionales:
- `tipo: string` → `?tipo=`
- `search: string` → `?search=`
- `estadoSunat: string` → `?estado_sunat=`
- `fecha: string` → `?fecha=`

> Nota: el service público (§6) expone también `fechaDesde` y `fechaHasta` en `cargarServicios`, **pero el repository solo los mapea como `fecha`** — actualmente esos filtros no llegan al backend. Es un bug latente / falta de cableado (`servicio.service.ts:158-174` vs `servicio.repository.ts:47-73`).

Tolera respuesta como `{ results: [...] }` o array plano. Devuelve `{ items, nextCursor }`. (`repository.ts:47-73`)

### 5.4 `eliminarServicio(numeroComprobante): Promise<void>`

DELETE. (`repository.ts:75-81`)

### 5.5 `anularServicio(numeroComprobante, motivo): Promise<ServicioReadModel>`

POST a `.../anular/` con `{ motivo }`. (`repository.ts:83-95`)

### 5.6 `emitirNotaCredito(numeroComprobante, options): Promise<EmitirNotaCreditoResult>`

POST a `.../nota-credito/`. `options` = `{ codigoTipo?: '01' (default), motivo: string, precioNuevo?: string }`. Devuelve `{ servicio, notaCredito }` donde `notaCredito` se extrae de `data['nota_credito']` (puede ser `null` si SUNAT rechazó la NC). (`repository.ts:97-120`)

### 5.7 `consultarEstadoSunat(numeroComprobante): Promise<ServicioReadModel>`

POST a `.../consultar-estado/` con body `null`. Útil para refrescar el estado SUNAT (cuando estaba `PENDIENTE`). (`repository.ts:122-133`)

### 5.8 `descargarTicketPdf(numeroComprobante): Promise<Blob>`

GET binario con `responseType: 'blob'`. (`repository.ts:135-143`)

### 5.9 Helpers privados

- `extractList(data)`: extrae `data.results` o devuelve `data` si es array. (líneas 145-151)
- `extractCursor(nextUrl)`: parsea el query param `cursor` de una URL completa con `new URL(...).searchParams.get('cursor')`. (líneas 153-156)

---

## 6. Services

### 6.1 `ServicioService` (`servicio.service.ts`)

Orquestador principal. Inyecta `ServicioRepository`, `AuthService`, `ServicioFormService`, `ResumenServicioService`.

#### Estados (signals)

```ts
// Estado del flujo actual (creación + servicio creado)
interface ServicioServiceState {
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  servicioCreado: ServicioReadModel | null;
}

// Estado del historial (lista paginada)
interface ServicioHistorialState {
  servicios: ServicioReadModel[];
  nextCursor: string | null;
  isLoading: boolean;
}
```

Expone `state` (readonly) y `historial` (readonly).

#### Métodos

| Método | Descripción | Comportamiento |
|---|---|---|
| `crearServicio()` | Construye el payload combinando `ServicioFormService` + `ResumenServicioService` + tienda activa; llama `repo.crearServicio`; guarda el resultado en `servicioCreado` y setea `successMessage = 'Servicio registrado exitosamente.'`. | Si falta tienda → error `'No hay tienda seleccionada'`. Si falta `fechaInicio`/`fechaFin`/`total` → error `'Completa los datos del servicio primero'`. (líneas 48-101) |
| `emitirNotaCredito(motivo, codigoTipo='01', precioNuevo?)` | Llama `repo.emitirNotaCredito` sobre `servicioCreado.numeroComprobante`. Reemplaza `servicioCreado` con la respuesta y devuelve `NotaCreditoData \| null`. | Si no hay `servicioCreado` devuelve `null` sin llamar API. (líneas 103-121) |
| `anularServicio(motivo)` | POST `.../anular/`. Reemplaza `servicioCreado`. Devuelve `boolean`. (líneas 123-141) |
| `eliminarServicio()` | DELETE. Devuelve `boolean`. **No** vacía `servicioCreado`. (líneas 143-156) |
| `cargarServicios(filtros?)` | Resetea `historial.servicios` con primera página. `filtros` admite `tipo`, `estadoSunat`, `fechaDesde`, `fechaHasta`, `search`. (líneas 158-174) |
| `cargarMasServicios()` | Append con `nextCursor`. Si no hay cursor no hace nada. (líneas 176-192) |
| `descargarTicketPdf(numero)` | Llama repo, crea `URL.createObjectURL(blob)`, abre en pestaña nueva, revoca la URL a los 15s. Errores se silencian. (líneas 194-201) |
| `consultarEstadoSunat(numero)` | POST consulta estado, actualiza `servicioCreado` (líneas 209-219) |
| `limpiarFlujo()` | `formSvc.limpiar()` + `resumenSvc.limpiar()` + reset `_state`. Llamado tras "nuevo servicio". (líneas 203-207) |
| `clearMessages()` | Limpia error/success messages. (líneas 221-223) |

#### Reglas de payload en `crearServicio`

- Tienda viene de `auth.selectedTiendaId()`.
- `descripcion`: enviado solo si `form.descripcion` truthy.
- `metodoPago`: enviado siempre (el filtro por crédito ocurre en `servicioCreateModelToJson`).
- `tipoComprobante`: enviado **solo si** `resumen.tipoVenta === 'SUNAT' && resumen.tipoComprobante` (líneas 71-73).
- Cliente: si `resumen.clienteId` → `clienteId`. Sino, si `resumen.usarClienteNuevo && resumen.clienteNuevo.nombre` → `clienteNuevo`. Si no se cumple ninguna → ambos `undefined`.

### 6.2 `ServicioFormService` (`servicio-form.service.ts`)

State mínimo para el bloque "detalle del servicio":

```ts
interface ServicioFormState {
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  total: string;       // serializado como string (input number → toString)
}
```

API:
- `actualizar(partial: Partial<ServicioFormState>)` — merge no destructivo.
- `limpiar()` — vuelve a `INITIAL` (todos vacíos).
- `state` — signal readonly.

### 6.3 `ResumenServicioService` (`resumen-servicio.service.ts`)

State del bloque "tipo / pago / cliente":

```ts
interface ResumenServicioState {
  tipoVenta: string;            // 'NORMAL' default
  metodoPago: string;           // 'EFECTIVO' default
  tipoComprobante: string | null;
  clienteId: number | null;
  clienteNombre: string | null;
  usarClienteNuevo: boolean;
  clienteNuevo: {
    tipoDocumento: string;      // '1' DNI default
    numeroDocumento: string;
    nombre: string;
    telefono: string;
    email: string;
    direccion: string;
  };
}
```

API:
- `actualizar(partial)` — merge.
- `seleccionarCliente(cliente: ClienteModel)` — atajo: setea `clienteId`, `clienteNombre`, `usarClienteNuevo = false`.
- `limpiar()` — reset.
- `state` — readonly.

---

## 7. Validators (`validators/servicio.validators.ts`)

Tres validadores reutilizables (todos `ValidatorFn` salvo el primero, que es de grupo):

| Validator | Tipo | Regla | Error |
|---|---|---|---|
| `servicioFormGroupValidator(group)` | `(AbstractControl) => ValidationErrors\|null` (group) | Si `tipoServicio` (en el grupo) es `'CREDITO'` o `'SUNAT'` y `clienteId` es `null` → error. | `{ clienteRequerido: '...' }` |
| `fechaFinValidator(fechaInicioControl)` | Factory de `ValidatorFn` | `new Date(fechaFin) >= new Date(fechaInicio)`. Si falla → error. | `{ fechaFinAnterior: '...' }` |
| `totalPositivoValidator()` | Factory de `ValidatorFn` | `parseFloat(value) > 0`. | `{ totalInvalido: 'El total debe ser mayor a 0' }` |

> **Nota**: los componentes hoy NO usan estos exports tal cual; cada uno re-declara una variante inline (`fechaFinValidator` en `formulario.component.ts:144-151`, `resumen.component.ts` y `servicio.component.ts:647-665`). Hay duplicación que se podría consolidar en el rediseño. Los validadores cross-cliente (`clienteRequerido`, `clienteFacturaRequerido`) viven inline en los componentes — la versión genérica del archivo `validators/` solo cubre `clienteRequerido` para CREDITO/SUNAT genérico.

Adicionalmente, los componentes importan de `venta/validators/venta.validators`:
- `rucValidator()` — RUC = 11 dígitos exactos.
- `noRucEnBoletaValidator(tipoComprobanteCtrl)` — bloquea RUC si el comprobante es boleta (`'03'`).

---

## 8. Componentes

### 8.1 `ServicioFlowHeaderComponent` (`components/servicio-flow-header/`)

Stepper visual horizontal.

- **Selector**: `app-servicio-flow-header`
- **Standalone**, sin dependencias externas.
- **Input**: `currentStep: number` (default `1`).
- **Steps fijos** (constante `STEPS`, líneas 8-11):
  ```ts
  [
    { label: 'Servicio',    step: 1 },
    { label: 'Comprobante', step: 2 },
  ]
  ```
- **Estados visuales por burbuja**:
  - `currentStep === step` → clase `sf-current` (fondo navy `#1F2A7C`).
  - `currentStep > step` → clase `sf-done` (fondo `#DCFCE7`, ícono check verde).
  - resto → gris (`#E2E6F0` / `#9CA3AF`).
- **Estilos inline** en el componente (líneas 16-35). Responsive: padding y tamaños se incrementan en `min-width: 768px`.
- **Truco**: `comprobante.component.ts` pasa `currentStep="3"` (un valor mayor que los pasos existentes) para mostrar ambas burbujas como completadas.

---

## 9. Páginas

### 9.1 `ServicioComponent` (`pages/servicio/servicio.component.ts`)

**Wrapper multi-step principal** (la única ruta usada en producción para el flujo).

- **Ruta**: `/servicios`
- **Selector**: `app-servicio`
- **Step**: 1 (la barra siempre muestra `currentStep=1` aquí — pero el componente fusiona los dos pasos en una sola pantalla).
- **Imports**: `ReactiveFormsModule`, `NgTemplateOutlet`, `ServicioFlowHeaderComponent`, `ClienteSearchComponent` (de venta).
- **Inyecciones**: `ServicioService`, `ResumenServicioService`, `ServicioFormService`, `FormBuilder`, `Router`.

#### Layout

- **Desktop (`min-width: 1024px`)**: grid `1fr 360px`. Izquierda = formulario de detalles (descripción / fechas / total). Derecha = panel sticky con tipo de servicio / pago / cliente.
- **Mobile**: detalles en flujo vertical + una barra flotante `sv-float-bar` que abre un bottom-sheet (`sheet-panel`, 85dvh) con el panel de configuración.
- `@HostListener('document:keydown', ['$event'])`: `Escape` cierra el sheet (líneas 515-518).

#### FormGroups

```ts
formDetalle = fb.group(
  {
    descripcion: [''],
    fechaInicio: ['', Validators.required],
    fechaFin:    ['', Validators.required],
    total: [null as number|null, [Validators.required, Validators.min(0.01)]],
  },
  { validators: this.fechaFinValidator }  // inline, lines 647-652
);

formConfig = fb.group(
  {
    tipoVenta:        ['NORMAL', Validators.required],
    metodoPago:       ['EFECTIVO', Validators.required],
    tipoComprobante:  [''],
    clienteId:        [null as number|null],
    usarClienteNuevo: [false],
    clienteNuevo: fb.group({
      tipoDocumento:   ['1'],
      numeroDocumento: [''],
      nombre:          [''],
      telefono:        [''],
      email:           [''],
      direccion:       [''],
    }),
  },
  { validators: this.servicioFormValidator }  // inline, lines 654-665
);
```

#### Signals locales

- `_tipoVenta`, `_metodoPago`, `_tipoComprobante` (mirror de los controles para `computed`s).
- `isSunat`, `isCredito` (`computed`s).
- `clienteObligatorio` = `isCredito() || (isSunat() && tipoComprobante === '01')` (línea 478-480).
- `mostrarSheet` (controla bottom-sheet móvil).

#### Hidratación inicial (`ngOnInit`, líneas 520-618)

1. Lee `formSvc.state()` y `resumenSvc.state()` para pre-cargar ambos formGroups (permite navegar atrás desde el comprobante y reanudar).
2. Suscripciones para mantener bidireccional `formGroups ↔ services`:
   - `formDetalle.valueChanges` → `formSvc.actualizar(...)`.
   - `formConfig.valueChanges` → `resumenSvc.actualizar(...)` (mapea `clienteNuevo` nested).
   - Cambios en `tipoDocumento` → enchufa/saca `rucValidator()` en `numeroDocumento`.
   - Cambios en `tipoVenta` → si pasa a `'SUNAT'` agrega `Validators.required` a `tipoComprobante`; si sale, limpia validador y vacía el control.
   - Cambios en `tipoComprobante` → recalcula `noRucEnBoletaValidator(tipoCompCtrl)` sobre `tipoDocumento`.

#### Acciones

- `seleccionarTipoVenta(v)` → `formConfig.patchValue({ tipoVenta: v, tipoComprobante: '' })`.
- `setUsarClienteNuevo(bool)` → toggle + limpia `clienteId` si vuelve a `false`.
- `onClienteSeleccionado(cliente)` → `resumenSvc.seleccionarCliente()` + `formConfig.patchValue({ clienteId: cliente.id, usarClienteNuevo: false })`.
- `onLimpiarCliente()` → limpia ambos.
- `registrar()` (líneas 667-678):
  1. `formDetalle.markAllAsTouched()`; si inválido → return.
  2. `formConfig.markAllAsTouched()`; si inválido → return.
  3. `servicioSvc.clearMessages()`.
  4. `await servicioSvc.crearServicio()`. Si éxito → cierra sheet + `router.navigate(['/servicios/comprobante'])`.

#### Validaciones inline en grupo

- `fechaFinValidator(group)` (líneas 647-652) → `{ fechaFinAnterior: true }` si `fin < inicio`.
- `servicioFormValidator(group)` (líneas 654-665):
  - `tipo === 'CREDITO'` sin cliente (ni id ni nuevo con nombre) → `{ clienteRequerido: true }`.
  - `tipo === 'SUNAT' && tipoComprobante === '01'` sin cliente → `{ clienteFacturaRequerido: true }`.

#### Edge cases

- Si no hay tienda activa → `crearServicio` devuelve `null` y muestra `'No hay tienda seleccionada'` en `state.errorMessage` (que se renderiza al final del panel, línea 420-427).
- Mensaje de error de SUNAT del backend se propaga via `servicioSvc.state().errorMessage`.
- Si el usuario llega a `/servicios` por segunda vez (post `nuevoServicio`), `limpiarFlujo()` ya reseteó ambos services.

---

### 9.2 `FormularioComponent` (`pages/formulario/formulario.component.ts`)

**Step 1 standalone** (variante alternativa, **no enrutada** actualmente).

- **Selector**: `app-servicio-formulario`
- **Step**: 1
- **Imports**: `ReactiveFormsModule`, `ServicioFlowHeaderComponent`.
- **Inyecciones**: `FormBuilder`, `Router`, `ServicioFormService`.

#### Layout

- Mobile: form vertical + footer fijo con botón "Continuar al resumen".
- `min-width: 768px`: `max-width: 640px`, footer fijo oculto, botón inline (`sf-desktop-btn`).

#### FormGroup

Idéntico al `formDetalle` del wrapper: `descripcion`, `fechaInicio` (required), `fechaFin` (required), `total` (required, min 0.01). Validador de grupo `fechaFinValidator` inline (líneas 144-151).

#### `ngOnInit`

- Hidrata desde `formSvc.state()`.
- `valueChanges` → `formSvc.actualizar(...)` (mantiene state aún si el usuario abandona).

#### `siguiente()`

1. `markAllAsTouched()`.
2. Si válido → `router.navigate(['/servicios/resumen'])`.

> En el routing actual `/servicios/resumen` redirige a `/servicios`, así que este componente quedaría inutilizable hasta que se re-enrute. Útil si se decide volver al flujo por rutas separadas.

---

### 9.3 `ResumenServicioComponent` (`pages/resumen/resumen.component.ts`)

**Step 2 standalone** (variante alternativa, **no enrutada** directamente).

- **Selector**: `app-resumen-servicio`
- **Step**: 2
- **Imports**: `ReactiveFormsModule`, `RouterLink`, `ServicioFlowHeaderComponent`, `ClienteSearchComponent`.

#### Layout

- **Mobile**: lista vertical (resumen del servicio + form de pago) + footer fijo "Registrar servicio".
- **Desktop (`min-width: 1024px`)**: grid `360px 1fr` — izquierda sticky con resumen del servicio (período + total + descripción), derecha con form de pago.

#### FormGroup

Idéntico al `formConfig` del wrapper. Mismos validadores de grupo (líneas 382-397):
- `clienteRequerido` (CREDITO sin cliente).
- `clienteFacturaRequerido` (factura SUNAT sin cliente).

#### `ngOnInit`

- Hidrata desde `resumenSvc.state()`.
- Mismas 6 suscripciones que el wrapper (`tipoVenta`, `metodoPago`, `tipoComprobante`, `tipoDocumento`, comportamientos cross-control).

#### Acciones

- `seleccionarTipoVenta(v)`, `setUsarClienteNuevo`, `onClienteSeleccionado`, `onLimpiarCliente` — espejo del wrapper.
- `submit()`:
  1. `markAllAsTouched`. Si inválido → return.
  2. `servicioSvc.crearServicio()` → si OK → navigate `'/servicios/comprobante'`.

#### Botón "Volver"

`<a routerLink="/servicios" class="btn-back">Datos del servicio</a>` (línea 46-51). Esto permite regresar al step 1.

---

### 9.4 `ComprobanteServicioComponent` (`pages/comprobante/comprobante.component.ts`)

**Step 3** — pantalla post-creación.

- **Ruta**: `/servicios/comprobante`
- **Selector**: `app-comprobante-servicio`
- **Step indicator**: `currentStep="3"` (ambas burbujas en done — línea 38).
- **Imports**: `ServicioFlowHeaderComponent`, `FormsModule` (para `ngModel` en NC), `PrintPreviewComponent` (de impresora).

#### Signals consumidos

- `servicio` = `computed(() => servicioSvc.state().servicioCreado)` — fuente única (línea 268).
- `isSunat = computed(() => servicio()?.tipo === 'SUNAT')`.
- Locales:
  - `mostrarFormNotaCredito: signal<boolean>` (toggle del form de NC).
  - `mostrarPreview: signal<boolean>`, `previewPdfUrl`, `previewPdfBlob`, `previewTicketData` — controlan `<app-print-preview>`.
  - `notaCreditoEmitida: signal<NotaCreditoData|null>` — guarda NC ya emitida para mostrar acciones de descarga/impresión.
  - `motivoNotaCredito: string`, `tipoNotaCredito: '01'|'09'`, `precioNuevo: string` — bindings del form NC.

#### `ngOnInit` (líneas 287-291)

Si `!servicio()` → `router.navigate(['/servicios'])`. Protege contra entrar directo a la URL.

#### Layout

- **Mobile**: card de éxito + card de info + acciones + footer fijo con "Volver a operaciones" / "+ Nuevo servicio".
- **Desktop (`min-width: 768px`)**: grid `1fr 280px`. Derecha = panel sticky con botones de acción + botones de footer movidos inline.

#### Reglas de visibilidad de acciones

| Botón | Condición |
|---|---|
| `puedeNotaCredito()` | `tipo === 'SUNAT' && estadoSunat === 'ACEPTADO' && isActive && !notaCreditoEmitida` (línea 309-312) |
| `puedeAnular()` | `tipo === 'SUNAT' && estadoSunat === 'ACEPTADO' && isActive` (línea 314-317) |
| `puedeCancelar()` | `tipo !== 'SUNAT' && isActive` (líneas 319-322) |

#### Acciones

| Acción | Implementación |
|---|---|
| `descargarPdf()` | Si `s.urlPdfTicket` → `window.open` (URL pública SUNAT). Sino → `servicioSvc.descargarTicketPdf(numero)` (endpoint autenticado). |
| `descargarPdfNc(url)` | `window.open(url, '_blank')`. |
| `imprimirNc(pdfUrl)` | Pasa URL a `print-preview`. |
| `volverAOperaciones()` | `router.navigate(['/operaciones'])`. |
| `cancelar()` | `confirm('¿Cancelar este servicio?')` → `servicioSvc.eliminarServicio()` → navigate `/servicios`. |
| `imprimirTicket()` | Logic compleja (líneas 355-390): si SUNAT con URL pública → usa `previewPdfUrl`. Sino bajamos blob del repo. Si falla incluso eso → genera `TicketData` HTML con datos de tienda activa (de `TiendaService`). |
| `anular()` | `window.prompt('Ingresa el motivo de anulación:')` → `servicioSvc.anularServicio(motivo)`. |
| `emitirNotaCredito()` | Llama `servicioSvc.emitirNotaCredito(motivo, tipoNotaCredito, precioNuevo if '09')`; on success setea `notaCreditoEmitida`, cierra form, limpia inputs. |
| `nuevoServicio()` | `servicioSvc.limpiarFlujo()` + navigate `/servicios`. |

#### Vista de Nota de Crédito

- **Antes** de emitir NC: botón "Emitir nota de crédito" si `puedeNotaCredito()`.
- Al click → muestra mini-form (líneas 156-184):
  - Select `tipoNotaCredito`: `01` (anulación total) / `09` (disminución).
  - Si `09` → input `precioNuevo` (decimal).
  - Textarea `motivoNotaCredito`.
  - Botones Cancelar / Emitir.
- **Después** de emitir NC: banner info con `nc.numero` + botones "PDF A4" y "Imprimir NC" (líneas 129-148).

#### Badge SUNAT

`sunatBadgeClass(estado)` (líneas 297-307) mapea el color devuelto por `getEstadoSunatColor` a clases globales `badge badge-success|error|info|warning|zinc`.

#### Edge cases

- **Estado RECHAZADO + motivoRechazo**: muestra `error-banner` con el motivo (líneas 74-81).
- **Deuda > 0**: muestra fila adicional "Deuda pendiente" en naranja (líneas 120-125). Solo aplica a CREDITO.
- **`esExitoCreacion()`**: filtra el `successMessage` para no mostrarlo como banner si es el mensaje inicial de creación (ya se muestra el banner verde de éxito).

---

### 9.5 `ServicioHistorialComponent` (`pages/historial/historial.component.ts`)

**Listado independiente** — no es step del flujo.

- **Ruta**: `/servicios/historial`
- **Selector**: `app-servicio-historial`
- **Imports**: `FormsModule` (filtros con `ngModel`).
- **Inyecciones**: `ServicioService`, `ServicioRepository`.

#### State (signals locales)

- `busqueda: string`, `filtroTipo`, `filtroEstadoSunat`, `fechaDesde`, `fechaHasta` — bindings de filtros.
- `accionando: signal<string|null>` — número del servicio sobre el que hay una acción en vuelo (deshabilita botones).
- `errorPorNumero: signal<string|null>`, `errorMsg: signal<string|null>` — error por fila.

#### Signals consumidos

- `svc.historial()` (de `ServicioService`) → `{ servicios, nextCursor, isLoading }`.

#### Lifecycle

- `ngOnInit` → `svc.cargarServicios()` (primera página, sin filtros).
- `@HostListener('window:scroll')`: infinite scroll. Si `window.innerHeight + window.scrollY >= document.body.offsetHeight - 300` y no está cargando → `svc.cargarMasServicios()` (líneas 161-167).

#### Filtros

- Search box por N° comprobante.
- Selects de tipo y estado SUNAT con valores fijos (`NORMAL`, `CREDITO`, `SUNAT` para tipo; `PENDIENTE`, `ACEPTADO`, `RECHAZADO`, `NO_APLICA` para estado).
- Dos inputs date `fechaDesde` / `fechaHasta`.
- `buscar()` (líneas 169-177) llama `cargarServicios({ search, tipo, estadoSunat, fechaDesde, fechaHasta })`.

> Bug latente: `fechaDesde`/`fechaHasta` se pasan al service pero el repo solo serializa `fecha` único. Estos filtros no afectan el resultado del backend.

#### Render por servicio

- Card con N° comprobante (monospace), tipo, descripción truncada, badge SUNAT, cliente, período, fecha, total.
- Acciones por fila:
  - **PDF** → `descargarPdf(s)` → `svc.descargarTicketPdf(s.numeroComprobante)`.
  - **Anular** (si `puedeAnular`) → `puedeAnular = tipo === 'SUNAT' && estadoSunat === 'ACEPTADO' && isActive`. Llama directamente `repo.anularServicio` (no via service) y refresca lista.
  - **Eliminar** (si `puedeEliminar`) → `puedeEliminar = tipo !== 'SUNAT' && isActive`. Llama directamente `repo.eliminarServicio` y refresca.
- Error por fila se muestra como banner debajo de la card cuando `errorPorNumero === s.numeroComprobante`.

#### Estados vacíos

- `isLoading && servicios.length === 0` → spinner "Cargando servicios...".
- `servicios.length === 0` (no loading) → empty state con ícono de documento.

#### Edge cases

- **No re-usa el wrapper de errores del service**: tiene su propio `errorMsg` por fila para no contaminar `state.errorMessage` global (que sigue siendo del flujo de creación).
- **Anular sin motivo**: el `prompt` cancelado o vacío aborta la operación.

---

## 10. Notas para el rediseño

### 10.1 Notas de Crédito (NC)

**Cuándo se emiten** — Solo cuando se cumplen TODAS:
- `tipo === 'SUNAT'` (la NC es un documento SUNAT, no aplica a normal/crédito).
- `estadoSunat === 'ACEPTADO'`.
- `isActive === true` (servicio vigente).
- No se ha emitido NC antes en esta sesión (`!notaCreditoEmitida()`).

**Tipos de NC**:
- `'01'` → Anulación total (la NC elimina el comprobante original).
- `'09'` → Disminución en valor (requiere `precioNuevo`).

**Endpoint**: POST `services/servicio/{numero}/nota-credito/` con `{ codigo_tipo, motivo, precio_nuevo? }`. Devuelve el servicio actualizado (con el nuevo estado SUNAT) + un subdocumento `nota_credito` con URLs a PDF/XML/CDR de la NC.

**Diferencia con anular/eliminar**:
- `anular` (POST `.../anular/`) → solo SUNAT aceptados. SUNAT mismo da de baja el comprobante. **Diferente** de NC: anular no genera un nuevo documento de NC.
- `eliminar` (DELETE) → solo no-SUNAT. Borrado lógico (presumiblemente `is_active = false`).

### 10.2 Dependencias con SUNAT

- **Bloqueo cuando `tipo === 'SUNAT'`**:
  - `tipoComprobante` es requerido (validator dinámico, líneas 580-589 del wrapper).
  - Si `tipoComprobante === '01'` (Factura) → cliente con RUC obligatorio (validator de grupo `clienteFacturaRequerido`).
  - Si `tipoComprobante === '03'` (Boleta) → cliente con RUC **prohibido** (`noRucEnBoletaValidator` del módulo venta).
- **Refresh de estado SUNAT**: `consultarEstadoSunat(numero)` permite refrescar el estado de un servicio `PENDIENTE`. No hay polling automático actual — habría que invocarlo manualmente desde el comprobante si se quiere actualizar en vivo.
- **Estado por defecto** del modelo lee como `'NO_APLICA'`, lo cual es la convención para no-SUNAT.
- **URLs SUNAT**: `urlPdfA4`, `urlPdfTicket`, `urlXml`, `urlCdr` solo llegan si el backend ya procesó el envío.

### 10.3 Reúso con `venta`

El feature **depende** de los siguientes archivos de venta — no se deben mover sin actualizar imports:

| Lugar reutilizado | Path | Uso en servicio |
|---|---|---|
| `ClienteModel` + `clienteFromJson` | `venta/models/cliente.model.ts` | Tipo del campo `cliente` en `ServicioReadModel`, parámetro de `seleccionarCliente` |
| `ClienteSearchComponent` | `venta/components/cliente-search/cliente-search.component.ts` | Buscador de cliente en wrapper y resumen |
| `TIPO_VENTA_VALUES`, `getTipoVentaLabel` | `venta/constants/tipo-venta.ts` | Chips de tipo + display en comprobante/historial |
| `METODO_PAGO_VALUES`, `getMetodoPagoLabel` | `venta/constants/metodo-pago.ts` | Chips de pago + display |
| `TIPO_COMPROBANTE_VALUES`, `getTipoComprobanteLabel` | `venta/constants/tipo-comprobante.ts` | Chips de factura/boleta + display |
| `getEstadoSunatLabel`, `getEstadoSunatColor` | `venta/constants/estado-sunat.ts` | Badge SUNAT en comprobante e historial |
| `rucValidator`, `noRucEnBoletaValidator` | `venta/validators/venta.validators.ts` | Validación de documento del cliente nuevo |
| `PrintPreviewComponent`, `TicketData` | `features/impresora/...` | Vista previa de impresión |

**No se reutilizan**:
- El `CarritoService` de venta (servicios no tienen carrito de productos).
- `ResumenVentaService` / `VentaService` (separados por dominio).
- Sus modelos de venta/comprobante.

**Si se mueven** estos archivos a `shared/`, hay que ajustar todos los imports listados arriba. Hacerlo solo si se va a unificar el flujo o se requiere para varios features (3+).

### 10.4 Convenciones específicas que se deben preservar

- **Singleton state**: `ServicioService`, `ServicioFormService`, `ResumenServicioService` son singletons (`providedIn: 'root'`). Navegar entre `/servicios` ↔ `/servicios/comprobante` no resetea el state — eso lo hace explícitamente `limpiarFlujo()`.
- **Repository pattern**: nunca llamar `HttpClient` directo desde componentes. `historial.component.ts` rompe la convención en `anular`/`eliminar` (usa `repo` directo en vez de `servicioSvc`); en un rediseño se debería rutear via service para consistencia.
- **No prefetch en `ngOnInit` del comprobante**: el servicio creado ya vive en `servicioSvc.state().servicioCreado`. No hay nuevo fetch.
- **Mapping snake_case → camelCase**: todos los modelos lo hacen en `*.model.ts` con funciones `xxxFromJson`. Si la API agrega campos, el mapping debe actualizarse.
- **Mensajes de error**: provenir de `extractApiError` para mensajes legibles (no mostrar `HttpErrorResponse` raw).

### 10.5 Deuda técnica detectada (oportunidad de rediseño)

- **Duplicación de FormGroups y validators** entre `ServicioComponent` y `ResumenServicioComponent` (~100 líneas repetidas).
- **Duplicación de validators inline** vs los exports de `validators/servicio.validators.ts` (el archivo está infrautilizado).
- **Filtros de fecha** (`fechaDesde`/`fechaHasta`) no se cablean al backend en `getServicios`.
- **`historial.component`** llama al repo directamente (rompe convención de "componentes solo hablan con services").
- **Step indicator** con `currentStep=3` es un hack visual; conceptualmente sólo hay 2 pasos.
- **Routing**: `/servicios/resumen` existe sólo como redirect; el flujo legacy (`formulario` + `resumen`) está orphan. Decidir: o se enrutan ambos, o se eliminan los archivos.

### 10.6 Resumen de inputs/outputs por componente (contratos)

| Componente | Inputs | Outputs |
|---|---|---|
| `ServicioFlowHeaderComponent` | `currentStep: number` | — |
| `ServicioComponent` (página) | — | — |
| `FormularioComponent` (página) | — | — |
| `ResumenServicioComponent` (página) | — | — |
| `ComprobanteServicioComponent` (página) | — | — |
| `ServicioHistorialComponent` (página) | — | — |

Los componentes son páginas autosuficientes y leen state directamente de los signals de los services. Cambiar el look interno está OK; **no** romper esa lectura.
