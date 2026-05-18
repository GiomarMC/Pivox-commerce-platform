# Feature: Venta

Documento de referencia para el rediseño total de las páginas del módulo de **ventas**.
Convención: rutas relativas a `src/app/features/venta/`. Citas de archivos con formato `archivo:linea`.

---

## 1. Resumen

El feature `venta` orquesta el ciclo completo de una operación comercial en el POS:

- **Selección de tipo de venta** (NORMAL / CREDITO / SUNAT).
- **Selección de productos del catálogo** y armado de un carrito con lotes específicos (FIFO automático u opción manual).
- **Configuración de pago**: método de pago, tipo de comprobante (Boleta/Factura), datos del cliente (existente o nuevo).
- **Creación de la venta** contra el backend (`POST sales/ventas/`). El backend puede responder con una **propuesta SUNAT** si el stock seleccionado no tiene factura de compra y se requiere sustitución por un producto equivalente con factura.
- **Confirmación de propuesta SUNAT** (cuando aplica), permitiendo al usuario editar cantidades/precios y reemplazar productos de relleno.
- **Visualización del comprobante** con acciones: imprimir (bridge ESC/POS), descargar PDF, emitir nota de crédito, anular (SUNAT aceptada) o cancelar (no-SUNAT).

**Dependencias con otros features**:
- **Inventario** (`features/inventario/`): `CatalogoService` (productos del catálogo, paginado cursor), `InventarioService` (lotes para resolución FIFO y advertencias con/sin factura), `ProductoCatalogoModel`, `LoteProductoResponse`.
- **Finanzas**: una venta tipo `CREDITO` genera deuda en backend (sin llamada explícita desde frontend).
- **Impresora** (`features/impresora/`): `PrintPreviewComponent` y `TicketData` para imprimir vía bridge HTTP local (`localhost:3000`).
- **Tiendas** (`features/tienda/`): `TiendaService.tiendaActiva()` para fallback de ticket HTML.
- **Auth**: `auth.selectedTiendaId()` requerida en creación de venta y búsqueda de clientes.

**Variantes en paralelo (coexistentes)**:
- **Implementación moderna (en uso)**: `pages/venta/venta.component.ts` (single-page con steps internos via signal). Ruta `/ventas` renderiza catálogo + panel lateral con sub-steps (productos/pago). Modal post-pago abre `PropuestaSunatComponent` o `ComprobanteComponent` como overlay (`isModal=true`).
- **Implementación legacy (rutas redirect)**: `pages/{catalogo,pedido,carrito,resumen,tipo-venta}/` son páginas standalone. Las rutas `ventas/catalogo`, `ventas/pedido`, `ventas/carrito`, `ventas/resumen` son **redirect a `/ventas`** en `app.routes.ts` (ver `ARQUITECTURA.md`). Los componentes existen y se referencian internamente.

Las rutas `/ventas/propuesta-sunat` y `/ventas/comprobante` **sí son rutas reales**.

---

## 2. Flujo multi-step

### Vista general (componente moderno)

```
/ventas (VentaComponent)
  Panel interno:
    [Tipo de venta] (siempre visible)
    panelStep 1: Productos
      - Lista del carrito
      - Lote selector
      - Toggle averiado
    panelStep 2: Pago
      - Método de pago
      - Tipo de comprobante
      - Cliente
    pagar() -> ventaSvc.crearVenta()

Decisión post-creación:
  propuestaSunat.length > 0  -> PropuestaSunatComponent (modal o página)
  propuestaSunat.length == 0 -> ComprobanteComponent (modal o página)

PropuestaSunatComponent:
  confirmar() -> ventaSvc.confirmarSunat() -> Comprobante
  volverAlCarrito() -> cancelarVentaSinLimpiarCarrito() -> /ventas/pedido (o cierra modal)
  cancelar() -> cancelarVenta() -> /ventas (limpia carrito y resumen)

ComprobanteComponent:
  acciones: imprimir, descargar PDF, nota credito, anular, cancelar, nueva venta
```

### Flujo legacy (páginas separadas)

```
TipoVenta -> Catálogo -> Pedido (o Carrito+Resumen) -> Propuesta SUNAT -> Comprobante
```

Rutas marcadas `catalogo/pedido/carrito/resumen` redirigen a `/ventas`. Los componentes legacy se referencian por `RouterLink` interno (`catalogo.component.html:10`, `pedido.component.ts:438`, `carrito.component.ts:429`, `resumen.component.ts:478`).

### Condiciones de avance entre steps

| De -> A                          | Disparador                          | Precondiciones                                                                                                |
|----------------------------------|-------------------------------------|---------------------------------------------------------------------------------------------------------------|
| Vacío -> Productos               | `agregarItem` desde catálogo        | Stock > 0 (`venta.component.ts:292`). Si tiene averiados, modal de elección.                                  |
| Productos -> Pago                | `nextStep()`                        | `carritoSvc.count() > 0` (`venta.component.ts:336`).                                                          |
| Pago -> Crear venta              | `pagar()`                           | Form válido + carrito no vacío + sin stock insuficiente (`venta.component.ts:459-478`).                       |
| Crear venta -> Propuesta SUNAT   | `venta.propuestaSunat.length > 0`   | Backend devuelve líneas de relleno.                                                                            |
| Crear venta -> Comprobante       | `propuestaSunat.length === 0`       | Caso happy path.                                                                                               |
| Propuesta SUNAT -> Comprobante   | `confirmar()` -> `confirmarSunat()` | `rellenosSinResolver() === 0` (`propuesta-sunat.component.ts:44-46`).                                          |
| Propuesta SUNAT -> Pedido        | `volverAlCarrito()`                 | `confirm()` del navegador + `cancelarVentaSinLimpiarCarrito()` (`propuesta-sunat.component.ts:136-145`).       |
| Propuesta SUNAT -> Cancelar todo | `cancelar()`                        | `confirm()` + `cancelarVenta()` -> `limpiarFlujo()`.                                                            |
| Comprobante -> Nueva venta       | `nuevaVenta()`                      | `ventaSvc.limpiarFlujo()`.                                                                                     |
| Comprobante -> Operaciones       | `volverAOperaciones()`              | Solo no-modal. `limpiarFlujo()` + navega a `/operaciones`.                                                     |

### Reset automático

`venta.component.ts:82-84`: `effect()` resetea `panelStep` a `1` cuando `carritoSvc.count() === 0`.

---

## 3. Modelos / DTOs

### `CarritoItem` (`models/carrito.model.ts`)

| Campo                | Tipo                | Notas                                                                                  |
|----------------------|---------------------|----------------------------------------------------------------------------------------|
| `productoId`         | `number`            | ID del producto del catálogo.                                                          |
| `loteProductoId`     | `number | null`     | `null` significa resolución FIFO automática en backend.                                |
| `nombre`             | `string`            | Snapshot del producto.                                                                 |
| `codigo`             | `string`            | Snapshot del código.                                                                   |
| `imagen`             | `string | null`     | URL.                                                                                   |
| `tipoIgv`            | `string`            | `'GRAVADO'`, etc.                                                                       |
| `unidadMedida`       | `string`            | Código (`UND`, `KG`...). Label via `getUnidadMedidaLabel`.                              |
| `cantidad`           | `number`            | Editable. Puede ser decimal (step `0.001`).                                            |
| `precioUnitario`     | `number`            | Editable. Inicializado con `parseFloat(precioVentaMercado)`.                            |
| `esAveriado`         | `boolean`           | Determina contra qué stock se chequea (`cantidadAveriada` vs `cantidadDisponible`).    |
| `precioVentaMercado` | `number`            | Precio base de mercado.                                                                 |
| `precioVentaBase`    | `number | null`     | Precio de costo. Informativo.                                                          |
| `stockDisponible`    | `number`            | Snapshot del stock al agregar (no se sincroniza después).                              |

> El key único de un item en el carrito es la tupla `(productoId, esAveriado)`. Ver `carrito.service.ts:22-23` y firmas `productoId + '-' + esAveriado` en templates.

### `ClienteModel` (`models/cliente.model.ts`)

| Campo                  | Tipo            | Mapping API (snake_case)         |
|------------------------|-----------------|----------------------------------|
| `id`                   | `number`        | `id`                             |
| `tipoDocumento`        | `string`        | `tipo_documento` (`'1'` DNI, `'6'` RUC, `'7'` Pasaporte) |
| `tipoDocumentoDisplay` | `string`        | `tipo_documento_display`         |
| `numeroDocumento`      | `string`        | `numero_documento`               |
| `nombre`               | `string`        | `nombre`                         |
| `email`                | `string | null` | `email`                          |
| `telefono`             | `string | null` | `telefono`                       |
| `direccion`            | `string | null` | `direccion`                      |
| `saldoTotal`           | `string`        | `saldo_total` (default `'0.00'`) |

Constructor: `clienteFromJson(json)` (`cliente.model.ts:13-25`).

### `VentaCreateModel` (`models/venta-create.model.ts`)

Shape interno:

```ts
interface VentaCreateModel {
  tienda: number;
  tipoVenta: string;           // 'NORMAL' | 'CREDITO' | 'SUNAT'
  metodoPago?: string;         // ignorado cuando tipoVenta === 'CREDITO'
  tipoComprobante?: string;    // '01' Factura, '03' Boleta
  clienteId?: number;
  clienteNuevo?: ClienteNuevoInput;
  detalles: DetalleVentaCreate[];
  notas?: string;
}

interface DetalleVentaCreate {
  productoId: number;
  loteProductoId?: number;
  cantidad: number;
  precioUnitario: number;
  esAveriado: boolean;
}

interface ClienteNuevoInput {
  tipoDocumento: string;       // '1' | '6' | '7'
  numeroDocumento: string;
  nombre: string;
  email?: string;
  telefono?: string;
  direccion?: string;
}
```

**Body real enviado** (`ventaCreateModelToJson`, `venta-create.model.ts:29-61`):

```jsonc
{
  "tienda_id": 1,
  "tipo": "SUNAT",
  "productos": [
    {
      "cantidad": "2",
      "precio_venta": "15.50",
      "es_averiado": false,
      "lote_producto_id": 42        // si loteProductoId != null
      // o "producto_id": 7         // si loteProductoId == null (FIFO)
    }
  ],
  "metodo_pago": "EFECTIVO",        // omitido si tipo === 'CREDITO'
  "tipo_comprobante": "03",         // solo SUNAT
  "cliente_id": 12,                 // si cliente existente
  "cliente": {                      // si usarClienteNuevo + datos válidos
    "nombre": "Juan",
    "tipo_documento": "1",
    "numero_documento": "12345678",
    "email": "...", "telefono": "...", "direccion": "..."
  }
}
```

Conversiones clave:
- `cantidad` y `precio_venta` se serializan como **string** (no number) — `venta-create.model.ts:35-36`.
- Se elige `lote_producto_id` XOR `producto_id` por línea (`venta-create.model.ts:39-43`).
- `metodo_pago` se omite si `tipoVenta === 'CREDITO'` (`venta-create.model.ts:47`).

### `VentaReadModel` (`models/venta-read.model.ts`)

Modelo enriquecido con listas anidadas y propuesta SUNAT.

```ts
interface VentaReadModel {
  id: number;
  numero: string;                        // numero_comprobante o numero
  tiendaId: number;
  tiendaNombre: string;
  tipoVenta: string;                     // tipo (NORMAL/CREDITO/SUNAT)
  tipoDisplay: string;
  metodoPago: string | null;
  metodoPagoDisplay: string | null;
  tipoComprobante: string | null;
  tipoComprobanteDisplay: string;
  estadoSunat: string | null;            // PENDIENTE/ENVIADO/ACEPTADO/RECHAZADO/ANULADO
  estadoSunatDisplay: string;
  motivoRechazo: string | null;
  clienteId: number | null;
  clienteNombre: string | null;
  total: string;
  igvTotal: string | null;
  subtotal: string;
  fechaCreacion: string;
  hashCpe: string;
  urlXml: string | null;
  urlCdr: string | null;
  urlPdfTicket: string | null;           // PDF público desde SUNAT
  urlPdfA4: string | null;
  detalles: VentaLineaModel[];           // detalle (líneas internas)
  detallesSunat: VentaSunatLineaModel[]; // lineas_sunat (con IGV)
  propuestaSunat: PropuestaSunatItem[];  // propuesta_sunat
  notaCredito: NotaCreditoModel | null;
  isCancelada: boolean;                   // is_active === false
}
```

**Sub-modelos**:

- `VentaLineaModel`: `{ id, productoId, loteProductoId, productoNombre, productoCodigo, unidadMedida, cantidad, precioUnitario, subtotal, esAveriado }`.
- `VentaSunatLineaModel`: extiende `VentaLineaModel` con `{ valorUnitario, igv, valorVenta }`.
- `PropuestaSunatItem`: `{ loteProductoId, loteProductoNombre, cantidad, precio, subtotal, esRelleno, loteProductoOriginalId, motivo }`.
- `NotaCreditoModel`: `{ id, numero, tipoComprobante, tipoComprobanteDisplay, motivo, fecha, urlPdfTicket, urlPdfA4, hashCpe, urlXml, urlCdr, itemsNc }`.
- `NotaCreditoItemModel`: `{ loteProductoId, cantidad?, precioNuevo? }`.

Constructor: `ventaReadModelFromJson(json)` (`venta-read.model.ts:146-185`). Tolerante a aliases del backend (`numero_comprobante`/`numero`, `fecha`/`fecha_creacion`, `precio_unitario`/`precio`).

---

## 4. Constants

### `tipo-venta.ts`

| Code      | Label              |
|-----------|--------------------|
| `NORMAL`  | Venta Normal       |
| `CREDITO` | Venta a Crédito    |
| `SUNAT`   | Venta con SUNAT    |

API: `TIPO_VENTA_LABELS`, `TIPO_VENTA_VALUES`, `getTipoVentaLabel(code)`.

### `tipo-comprobante.ts`

| Code  | Label   |
|-------|---------|
| `01`  | Factura |
| `03`  | Boleta  |

API: `TIPO_COMPROBANTE_LABELS`, `TIPO_COMPROBANTE_VALUES`, `getTipoComprobanteLabel(code)`.

### `metodo-pago.ts`

| Code            | Label                   |
|-----------------|-------------------------|
| `EFECTIVO`      | Efectivo                |
| `TRANSFERENCIA` | Transferencia Bancaria  |
| `TARJETA`       | Tarjeta                 |
| `YAPE`          | Yape                    |
| `PLIN`          | Plin                    |
| `CHEQUE`        | Cheque                  |

API: `METODO_PAGO_LABELS`, `METODO_PAGO_VALUES`, `getMetodoPagoLabel(code|null|undefined)` retorna `'—'` si null.

### `estado-sunat.ts`

| Code        | Label                | Color (status-badge) |
|-------------|----------------------|----------------------|
| `PENDIENTE` | Pendiente de envío   | `warning`            |
| `ENVIADO`   | Enviado a SUNAT      | `info`               |
| `ACEPTADO`  | Aceptado por SUNAT   | `success`            |
| `RECHAZADO` | Rechazado por SUNAT  | `error`              |
| `ANULADO`   | Anulado              | `neutral`            |

API: `ESTADO_SUNAT_LABELS`, `ESTADO_SUNAT_VALUES`, `getEstadoSunatLabel(code)`, `getEstadoSunatColor(code)`.

---

## 5. Endpoints API

Base URL: `environment.apiBaseUrl`. Todos requieren `Authorization: Bearer <access>` agregado por `authInterceptor`.

| # | Método | Path                                            | Repo method                  | Notas                                                                                                       |
|---|--------|-------------------------------------------------|------------------------------|-------------------------------------------------------------------------------------------------------------|
| 1 | POST   | `sales/ventas/`                                 | `crearVenta(payload)`        | Crea venta. Puede devolver `propuesta_sunat`.                                                                |
| 2 | POST   | `sales/ventas/:id/confirmar-sunat/`             | `confirmarSunat(id, lineas)` | Confirma propuesta SUNAT. `:id` es ID numérico.                                                              |
| 3 | POST   | `sales/ventas/:numero/consultar-estado/`        | `consultarEstadoSunat(num)`  | Refresca estado de SUNAT.                                                                                    |
| 4 | POST   | `sales/ventas/:numero/nota-credito/`            | `notaCredito(num, motivo)`   | Solo SUNAT aceptada. Opcionalmente `codigo_tipo`, `items`.                                                   |
| 5 | DELETE | `sales/ventas/:numero/`                         | `cancelarVenta(numero)`      | No-SUNAT siempre, SUNAT solo si no aceptada.                                                                 |
| 6 | POST   | `sales/ventas/:numero/anular/`                  | `anularVenta(num, motivo)`   | Solo SUNAT aceptada.                                                                                          |
| 7 | GET    | `sales/ventas/:numero/`                         | `getVenta(numero)`           | Recupera venta.                                                                                              |
| 8 | GET    | `sales/ventas/?tienda=<id>&...`                 | `getVentas(tiendaId, filt)`  | Paginación cursor. Filtros: `tipo`, `estado_sunat`, `fecha_desde`, `fecha_hasta`, `search`, `cursor`.        |
| 9 | GET    | `sales/ventas/:numero/ticket/`                  | `descargarTicketPdf(num)`    | `responseType: 'blob'`.                                                                                       |
| 10| GET    | `sales/clientes/?tienda=<id>&search=<q>`        | `getClientes(tienda, q)`     | Acepta `{results}` o array directo.                                                                          |
| 11| PATCH  | `sales/clientes/:id/`                           | `actualizarCliente(id, p)`   | PATCH con mapping snake_case.                                                                                |

### Body detallado: crear venta

```http
POST {{base}}sales/ventas/
Authorization: Bearer ...
Content-Type: application/json
```

```jsonc
{
  "tienda_id": 1,
  "tipo": "SUNAT",                   // NORMAL | CREDITO | SUNAT
  "metodo_pago": "EFECTIVO",         // OMITIDO si tipo === "CREDITO"
  "tipo_comprobante": "01",          // OPCIONAL, solo SUNAT
  "cliente_id": 12,                  // OPCIONAL — XOR con "cliente"
  "cliente": {                       // OPCIONAL — XOR con "cliente_id"
    "nombre": "Juan Pérez",
    "tipo_documento": "1",           // 1=DNI, 6=RUC, 7=Pasaporte
    "numero_documento": "12345678",
    "email": "juan@ejemplo.com",
    "telefono": "+51999...",
    "direccion": "Av. ..."
  },
  "productos": [
    {
      "cantidad": "2",               // string
      "precio_venta": "15.50",       // string
      "es_averiado": false,
      "lote_producto_id": 42         // XOR con "producto_id"
    },
    {
      "cantidad": "1.500",
      "precio_venta": "20.00",
      "es_averiado": true,
      "producto_id": 7               // sin lote: resolución FIFO en backend
    }
  ]
}
```

**Respuesta**: `VentaReadModel`. Cuando `propuesta_sunat` no es vacío, el frontend abre la pantalla de propuesta. Códigos de error mapeados por `extractApiError` (DRF). Si el detalle es `"<n>: <mensaje>"` (con `<n>` índice de item), `VentaService.crearVenta` (`venta.service.ts:99-104`) lo reemplaza por el `nombre` del item del carrito y limpia ceros decimales trailing.

### Body: confirmar propuesta SUNAT

```http
POST {{base}}sales/ventas/:id/confirmar-sunat/
```

```jsonc
{
  "propuesta": [
    {
      "lote_producto_id": 42,
      "cantidad": "2",
      "precio": "15.50",
      "es_relleno": true,
      "lote_producto_original_id": 99
    }
  ]
}
```

Respuesta: `VentaReadModel` actualizada.

### Body: nota de crédito

```http
POST {{base}}sales/ventas/:numero/nota-credito/
```

```jsonc
{
  "motivo": "Devolución total",
  "codigo_tipo": "07",          // OPCIONAL
  "items": [                    // OPCIONAL
    { "lote_producto_id": 42, "cantidad": "1", "precio_nuevo": "10.00" }
  ]
}
```

### Body: anulación

```http
POST {{base}}sales/ventas/:numero/anular/
{ "motivo": "..." }
```

### Paginación cursor

`getVentas` (`venta.repository.ts:154-181`) extrae `nextCursor` de la URL absoluta `next` con `new URL().searchParams.get('cursor')` (`venta.repository.ts:204-207`).

---

## 6. Repository — `VentaRepository`

Inyecta `HttpClient`, usa `environment.apiBaseUrl`. Todas las llamadas envuelven con `try/catch` y rethrow con `extractApiError(err)`.

| Método | Firma | Detalle |
|--------|-------|---------|
| `crearVenta` | `(payload: VentaCreateModel) => Promise<VentaReadModel>` | Convierte payload con `ventaCreateModelToJson`. Endpoint 1. |
| `confirmarSunat` | `(id: number, lineas) => Promise<VentaReadModel>` | Mapea camelCase a snake_case manualmente para `propuesta`. Endpoint 2. |
| `consultarEstadoSunat` | `(numero: string) => Promise<VentaReadModel>` | POST sin body (`null`). Endpoint 3. |
| `notaCredito` | `(numero, motivo, options?) => Promise<VentaReadModel>` | `options` puede incluir `codigoTipo`, `items[{loteProductoId, cantidad, precioNuevo?}]`. Endpoint 4. |
| `cancelarVenta` | `(numero) => Promise<void>` | Endpoint 5 (DELETE). |
| `anularVenta` | `(numero, motivo) => Promise<VentaReadModel>` | Endpoint 6. |
| `getVenta` | `(numero) => Promise<VentaReadModel>` | Endpoint 7. |
| `getClientes` | `(tiendaId, search?) => Promise<ClienteModel[]>` | Endpoint 10. |
| `actualizarCliente` | `(id, partial) => Promise<ClienteModel>` | PATCH. Endpoint 11. |
| `getVentas` | `(tiendaId, filters?) => Promise<VentasPageResult>` | Paginación cursor: `{ items, nextCursor }`. Endpoint 8. |
| `descargarTicketPdf` | `(numero) => Promise<Blob>` | `responseType: 'blob'`. Endpoint 9. |

Helpers privados:
- `extractList(data)`: soporta `{results: [...]}` o array directo, retorna `[]` si nada.
- `extractCursor(nextUrl)`: saca `?cursor=...` de URL devuelta por DRF.

---

## 7. Services

### CarritoService (CRÍTICO)

Archivo: `carrito.service.ts`. **Singleton (`providedIn: 'root'`)**. Single source of truth del carrito. Compartido entre todas las páginas.

#### State

```ts
interface CarritoState {
  items: CarritoItem[];
}
```

Solo una propiedad. La configuración de pago/cliente vive en `ResumenVentaService`, NO aquí.

#### Signals

| Signal | Tipo | Definición |
|--------|------|------------|
| `state` | `Signal<{items: CarritoItem[]}>` | Readonly del estado completo. |
| `items` | `Signal<CarritoItem[]>` | Computed: `state().items`. |
| `count` | `Signal<number>` | Computed: **suma de cantidades** (`acc + i.cantidad`). NO es `items.length`. Si un item tiene `cantidad=3`, `count() === 3`. |
| `total` | `Signal<number>` | Computed: `sum(cantidad * precioUnitario)`. |

> No hay computed para `subtotal`/`igv`: el IGV lo calcula el backend y vuelve en `VentaReadModel.igvTotal`.

#### Métodos

| Método | Firma | Comportamiento |
|--------|-------|----------------|
| `agregarItem(producto, esAveriado)` | `(ProductoCatalogoModel, boolean) => void` | Busca item por **(productoId, esAveriado)**. Si existe: `cantidad += 1`. Si no: crea con `cantidad=1`, `precioUnitario=parseFloat(precioVentaMercado)`, `stockDisponible` según `esAveriado` (`cantidadAveriada` o `cantidadDisponible`), `loteProductoId=null` (FIFO). Ver `carrito.service.ts:20-48`. |
| `eliminarItem(productoId, esAveriado)` | `(number, boolean) => void` | Filter por tupla key. |
| `actualizarCantidad(productoId, esAveriado, cantidad)` | `(number, boolean, number) => void` | Si `cantidad <= 0` llama `eliminarItem`. |
| `actualizarPrecio(productoId, esAveriado, precio)` | `(number, boolean, number) => void` | Modifica `precioUnitario`. Permite `precio=0`. |
| `actualizarAveriado(productoId, esAveriado, nuevoAveriado)` | `(number, boolean, boolean) => void` | Cambia el flag. **Cuidado**: rompe unicidad de key, puede generar duplicados. |
| `actualizarLote(productoId, esAveriado, loteId)` | `(number, boolean, number|null) => void` | Asigna `loteProductoId` (null = FIFO). |
| `limpiar()` | `() => void` | Reset `{items: []}`. |

#### Persistencia

**NO hay persistencia en `localStorage`.** El carrito vive en memoria mientras dure la SPA. Refrescar borra todo.

#### Contrato verificado por tests

`carrito.service.spec.ts` valida:
- Carrito inicial vacío: `items().length === 0`, `total() === 0`, `count() === 0` (`spec:28-32`).
- `total()` suma `precio * cantidad` (`spec:34-39`).
- Agregar mismo producto dos veces: `items.length === 1`, `cantidad === 2` (`spec:41-48`).
- `eliminarItem` quita por `productoId` + `esAveriado`.
- `limpiar()` vacía.

> Cualquier cambio en este contrato (especialmente count/total semantics) romperá tests y posiblemente UI downstream.

### ResumenVentaService

Archivo: `resumen-venta.service.ts`. Singleton. Mantiene **la selección del usuario** del step de pago.

#### State

```ts
interface ResumenVentaState {
  tipoVenta: string;                          // default 'NORMAL'
  metodoPago: string;                         // default 'EFECTIVO'
  tipoComprobante: string | null;
  clienteId: number | null;
  clienteNombre: string | null;
  usarClienteNuevo: boolean;
  clienteNuevo: Partial<ClienteNuevoInput>;
  notas: string;
}
```

#### Signals

- `state` (readonly).

#### Métodos

| Método | Firma | Comportamiento |
|--------|-------|----------------|
| `actualizar(partial)` | `(Partial<ResumenVentaState>) => void` | Patch parcial via `_state.update`. |
| `seleccionarCliente(cliente)` | `(ClienteModel) => void` | Setea `clienteId`, `clienteNombre`, `usarClienteNuevo=false`, `clienteNuevo={}`. |
| `limpiar()` | `() => void` | Reset a INITIAL. |

> Configuración persistente entre `panelStep` 1/2 del componente moderno y entre rutas en flujo legacy.

### VentaService

Archivo: `venta.service.ts`. Singleton. Orquesta creación y manipulación de ventas, mantiene **historial** (lista) y **venta creada** (último flujo).

#### State principal

```ts
interface VentaServiceState {
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  ventaCreada: VentaReadModel | null;
}
```

#### State historial

```ts
interface VentaHistorialState {
  ventas: VentaReadModel[];
  nextCursor: string | null;
  isLoading: boolean;
}
```

#### Signals

- `state` (readonly del state principal).
- `historial` (readonly del state historial).

#### Métodos

| Método | Firma | Detalle |
|--------|-------|---------|
| `crearVenta()` | `() => Promise<VentaReadModel | null>` | Construye `VentaCreateModel` desde `carritoSvc.items()` + `resumenSvc.state()` + `auth.selectedTiendaId()`. Si carrito vacío o sin tienda: setea `errorMessage` y retorna `null` (`venta.service.ts:48-58`). Si `tipoVenta==='SUNAT'` agrega `tipoComprobante`. Distingue `clienteId` (existente) vs `clienteNuevo`. Llama `repo.crearVenta`. Tras éxito guarda `ventaCreada` + `successMessage`. En error: post-procesa el mensaje reemplazando "n: " por "nombre: " y quitando ceros trailing (`venta.service.ts:99-104`). |
| `confirmarSunat(lineas)` | `(LineaConfig[]) => Promise<VentaReadModel | null>` | Usa el `id` numérico de `ventaCreada`. Actualiza con la respuesta. |
| `emitirNotaCredito(motivo)` | `(string) => Promise<boolean>` | `repo.notaCredito(numero, motivo)`. Actualiza `ventaCreada`. |
| `cancelarVentaSinLimpiarCarrito()` | `() => Promise<boolean>` | DELETE pero **conserva el carrito** (`venta.service.ts:150-162`). |
| `cancelarVenta()` | `() => Promise<boolean>` | DELETE + `limpiarFlujo()`. |
| `anularVenta(motivo)` | `(string) => Promise<boolean>` | POST anular. Actualiza `ventaCreada`. |
| `cargarVentas(filtros?)` | `(filt?) => Promise<void>` | GET listado. Reemplaza `_historial.ventas`. |
| `cargarMasVentas()` | `() => Promise<void>` | Paginación cursor: append. |
| `descargarTicketPdf(numero)` | `(string) => Promise<void>` | Descarga blob, `URL.createObjectURL`, `window.open`, revoca a los 15s. Silencia errores. |
| `consultarEstadoSunat(numero)` | `(string) => Promise<VentaReadModel | null>` | Actualiza `ventaCreada`. |
| `limpiarFlujo()` | `() => void` | `carritoSvc.limpiar()` + `resumenSvc.limpiar()` + `_state.set(INITIAL)`. |
| `clearMessages()` | `() => void` | Limpia `errorMessage` y `successMessage`. |

> `VentaService.crearVenta` es el **único punto de entrada** para registrar una venta. No llamar al repo directamente desde componentes.

---

## 8. Validators

Archivo: `validators/venta.validators.ts`. `ValidatorFn` de Angular Reactive Forms (devuelven `ValidationErrors | null`).

### `rucValidator()`

| Aspecto | Valor |
|---------|-------|
| Input   | `AbstractControl` con `value: string`. |
| Acepta vacío | Sí (`return null`). |
| Regla   | Regex de 11 dígitos exactos. |
| Error key | `{ rucInvalido: true }` |
| Tests   | `validators/venta.validators.spec.ts:4-31`. |

### `noRucEnBoletaValidator(tipoComprobanteControl)`

| Aspecto | Valor |
|---------|-------|
| Input   | `AbstractControl` (`tipoDocumento`); recibe por parámetro el control de `tipoComprobante`. |
| Regla   | Si `tipoComprobante.value === '03'` (Boleta) Y `tipoDocumento.value === '6'` (RUC) entonces error. |
| Error key | `{ rucEnBoleta: true }` |

### `ventaFormValidator(group)` — validator de grupo

Aplicado al `FormGroup` raíz del pago. Inspecciona `tipoVenta`, `tipoComprobante`, `clienteId`, `usarClienteNuevo`, `clienteNuevo.{tipoDocumento, numeroDocumento, nombre}`.

Reglas (en orden):

| Condición | Error |
|-----------|-------|
| `tipoVenta === 'CREDITO'` Y no hay cliente (ni id ni nuevo con `nombre` + `numeroDocumento`) | `{ clienteRequeridoCredito: true }` |
| `tipoVenta === 'SUNAT'` Y `tipoComprobante === '01'` Y no hay RUC válido (`clienteId` o nuevo con `tipoDocumento==='6'` + `numeroDocumento` 11 dígitos) | `{ facturaRequiereRuc: true }` |
| `tipoVenta === 'SUNAT'` Y `tipoComprobante === '03'` Y `usarClienteNuevo` Y `tipoDocumento === '6'` | `{ boletaNoAdmiteRuc: true }` |

Tests: `venta.validators.spec.ts:33-80` cubren todos los casos + happy paths.

---

## 9. Componentes

### `FlowHeaderComponent`

Archivo: `components/flow-header/flow-header.component.ts`.

| Aspecto | Valor |
|---------|-------|
| Selector | `app-flow-header` |
| Inputs   | `currentStep: number` (default `1`), `showSunatStep: boolean` (default `false`) |
| Outputs  | ninguno |
| Propósito | Indicador visual de progreso multi-step. |

**Steps base** (`flow-header.component.ts:10-14`):
- 1: Venta -> `/ventas`
- 2: SUNAT -> `/ventas/propuesta-sunat` (solo si `showSunatStep`)
- 3: Comprobante -> `/ventas/comprobante`

Lógica clave:
- `visibleSteps` filtra step SUNAT si `showSunatStep === false`.
- `displayNum(step)` re-numera: sin SUNAT, "3 Comprobante" se renderiza como "2".
- `canGoBack(step)` permite navegar a steps anteriores **excepto** al 2 (SUNAT) desde comprobante (`flow-header.component.ts:152-157`). Una vez confirmada la propuesta, no se puede revisitar.
- `goTo(step)` ejecuta `router.navigate(step.route)` si se permite.

### `ClienteSearchComponent`

Archivo: `components/cliente-search/cliente-search.component.ts`.

| Aspecto | Valor |
|---------|-------|
| Selector | `app-cliente-search` |
| Inputs   | `tipoComprobante: string | null` (afecta hints) |
| Outputs  | `clienteSeleccionado: EventEmitter<ClienteModel>`, `limpiar: EventEmitter<void>` |
| Propósito | Búsqueda con debounce + dropdown. |

**Lógica clave**:
- Debounce **400ms** (`cliente-search.component.ts:103`).
- Mínimo **2 caracteres** para disparar búsqueda (`cliente-search.component.ts:98-102`).
- Llama `repo.getClientes(tiendaId, query)` directamente (sin service intermedio).
- Si `auth.selectedTiendaId()` es null, no busca (`cliente-search.component.ts:107-108`).
- Al seleccionar: emite `clienteSeleccionado(cliente)`. Botón "Cambiar" emite `limpiar`.
- Hints visuales por `tipoComprobante`: `'01'` muestra "Se requiere cliente con RUC (Factura)"; `'03'` muestra "DNI u otro documento (no RUC en Boleta)".
- Display del documento: `'RUC: <num>'` si `tipoDocumento==='6'`, sino `'DNI: <num>'` (`cliente-search.component.ts:123`). No maneja explícitamente `'7'` (Pasaporte), lo muestra como DNI.

---

## 10. Páginas

### Página 1 — `VentaComponent` (moderno, principal)

| Atributo | Valor |
|----------|-------|
| Ruta | `/ventas` |
| Archivo | `pages/venta/venta.component.{ts,html,css}` |
| Selector | `app-venta` |
| Step (FlowHeader) | `currentStep=1`, `showSunatStep=false` |

**Propósito**: pantalla única que combina catálogo (izquierda) + carrito + configuración de pago (derecha, con sub-steps). Post-pago: modal con propuesta SUNAT o comprobante.

**Signals consumidos**:
- `svc.state()` (CatalogoService): `productos`, `isLoading`, `isLoadingMore`, `errorMessage`.
- `carritoSvc.items()`, `count()`, `total()`.
- `inventarioSvc.state().lotes` para resolución FIFO + advertencias con/sin factura.
- `ventaSvc.state()` con `isSaving`, `errorMessage`, `successMessage`.
- Locales: `mostrarSheet` (bottom sheet mobile), `panelStep` (1=productos, 2=pago), `modalActivo` (`'propuesta' | 'comprobante' | null`), `modalProducto`, `modalLoteData`, `stockError`.

**Acciones y métodos invocados**:

| Acción UI | Método componente | Service llamado |
|-----------|-------------------|-----------------|
| Buscar producto | `onBusquedaChange()` (debounce 400ms) | `svc.cargarCatalogo(busqueda)` |
| Scroll catálogo | `onCatalogScroll(ev)` | `svc.cargarMasCatalogo()` |
| Tap producto | `onTapProducto(p)` | Si en carrito: `eliminarItem`. Si averiado disponible: abre modal. Sino: `agregarItem`. |
| Buen/averiado | `seleccionarTipoModal(esAveriado)` | `carritoSvc.agregarItem(p, esAveriado)` |
| +/- cantidad | `decrementar`/`incrementar`/`onCantidadChange` | `carritoSvc.actualizarCantidad` |
| Editar precio | `onPrecioChange` | `carritoSvc.actualizarPrecio` |
| Quitar averiado | `toggleAveriado(item, false)` | `carritoSvc.actualizarAveriado` |
| Abrir lote selector | `abrirModalLote(item, idx)` | UI |
| Seleccionar lote | `seleccionarLote(loteId)` | `carritoSvc.actualizarLote` |
| Cambiar tipo venta | `seleccionarTipoVenta(tipo)` | `resumenSvc.actualizar({tipoVenta})` + ajusta validators |
| Elegir cliente | `onClienteSeleccionado(c)` | `resumenSvc.seleccionarCliente(c)` |
| Limpiar cliente | `onLimpiarCliente()` | `resumenSvc.actualizar({clienteId:null, clienteNombre:null})` |
| Avanzar a Pago | `nextStep()` | `panelStep.set(2)` si `count() > 0` |
| Pagar | `pagar()` | Valida stock + form, llama `ventaSvc.crearVenta()`, abre modal correspondiente |

**Validaciones client-side en `pagar()`** (`venta.component.ts:459-478`):
1. `form.markAllAsTouched()`.
2. Si `form.invalid` retorna.
3. Si `carrito.count() === 0` retorna.
4. Si algún item tiene `cantidad > stockDisponible` setea `stockError`.
5. Limpia `stockError` y mensajes.
6. Llama `ventaSvc.crearVenta()`.

**Navegación** (sin URL, todo modal):
- `crearVenta()` exitoso + propuesta -> `modalActivo.set('propuesta')`.
- `crearVenta()` exitoso + sin propuesta -> `modalActivo.set('comprobante')`.
- Modal propuesta: `propuestaConfirmada` -> `modalActivo='comprobante'`; `carritoRecuperado`/`ventaCancelada` -> cierra modal.
- Modal comprobante: `nuevaVenta` -> cierra modal.

**Edge cases**:
- Carrito vacío: `effect()` mantiene `panelStep=1`; botón "Siguiente" deshabilitado.
- `auth.selectedTiendaId()` null: `crearVenta` setea `errorMessage='No hay tienda seleccionada'`.
- Producto con `cantidadDisponible === 0`: `onTapProducto` retorna.
- Stock insuficiente: banner + bloqueo de "Pagar".
- SUNAT con lote sin factura: banner informativo (no bloquea).

**Sincronización form con ResumenVentaService**:
- `ngOnInit` (líneas 199-265): inicializa form con valores de `resumenSvc.state()`.
- Suscripciones a `valueChanges` actualizan signals locales y persisten en `resumenSvc` (línea 242-259).
- Validadores dinámicos:
  - `tipoDocumento === '6'` aplica `rucValidator()` a `numeroDocumento`.
  - Siempre aplica `noRucEnBoletaValidator` a `tipoDocumento`.
  - `tipoVenta === 'SUNAT'` requiere `tipoComprobante`.

---

### Página 2 — `CatalogoComponent` (legacy)

| Atributo | Valor |
|----------|-------|
| Ruta | `/ventas/catalogo` (redirect a `/ventas`). Componente enlazado por `routerLink` interno. |
| Archivo | `pages/catalogo/catalogo.component.{ts,html,css}` |
| Selector | `app-catalogo` |
| Step | `currentStep=2` |

**Propósito**: catálogo full-page con carrito lateral.

**Signals**: `svc.state()`, `carritoSvc.items()/count()/total()`, `esSunat`.

**Acciones**: idénticas a columna izquierda de `VentaComponent`. `RouterLink` a `/ventas/pedido`.

**Edge cases**: stock 0 sin tap; carrito vacío oculta panel lateral.

---

### Página 3 — `TipoVentaComponent` (legacy)

| Atributo | Valor |
|----------|-------|
| Ruta | No registrada explícitamente. Reemplazada por chip selector en `VentaComponent`. |
| Archivo | `pages/tipo-venta/tipo-venta.component.ts` (template inline) |
| Selector | `app-tipo-venta` |

**Propósito**: elegir tipo de venta antes del catálogo.

**Signals**: `carritoSvc.count()`, `tipoActual`.

**Acciones**:
- `seleccionar(value)`: `resumenSvc.actualizar({tipoVenta})` + nav `/ventas/catalogo`.
- `continuarVenta()`: nav `/ventas/pedido`.
- `descartarVenta()`: `ventaSvc.limpiarFlujo()`.

**Edge case**: banner "Tienes una venta en curso" si hay items.

---

### Página 4 — `PedidoComponent` (legacy)

| Atributo | Valor |
|----------|-------|
| Ruta | `/ventas/pedido` (redirect a `/ventas`). |
| Archivo | `pages/pedido/pedido.component.ts` (template inline) |
| Selector | `app-pedido` |
| Step | `currentStep=3` |

**Propósito**: mezcla edición de carrito + configuración de pago + cliente (equivalente a `panelStep=2` pero como página).

**Signals**: `carritoSvc`, `inventarioSvc.state().lotes`, `resumenSvc.state()`, `ventaSvc.state()`. Computed: `isSunat`, `isCredito`, `clienteObligatorio`, `stockPorTipo`, `loteFifo`, `otrosLotes`.

**Acciones**: idénticas al moderno + `pagar()`.

**Navegación**:
- `pagar()` exitoso + propuesta -> `/ventas/propuesta-sunat`.
- `pagar()` exitoso + sin propuesta -> `/ventas/comprobante`.

**Edge cases**: carrito vacío -> empty state. Stock insuficiente -> deshabilita "Pagar".

---

### Página 5 — `CarritoComponent` (legacy alternativa)

| Atributo | Valor |
|----------|-------|
| Ruta | `/ventas/carrito` (redirect a `/ventas`). |
| Archivo | `pages/carrito/carrito.component.ts` (template inline) |
| Selector | `app-carrito` |
| Step | `currentStep=3` |

**Propósito**: solo carrito (sin configuración de pago).

**Acciones**: edición items, `limpiar()`, `irACatalogo()`, `irAResumen()` (bloqueado si stock insuficiente).

**Navegación**: anterior `/ventas/catalogo`, siguiente `/ventas/resumen`.

---

### Página 6 — `ResumenComponent` (legacy)

| Atributo | Valor |
|----------|-------|
| Ruta | `/ventas/resumen` (redirect a `/ventas`). |
| Archivo | `pages/resumen/resumen.component.ts` (template inline) |
| Selector | `app-resumen-venta` |
| Step | `currentStep=4`, `showSunatStep=isSunat()` |

**Propósito**: configuración final de pago. Resumen colapsable de items (no editable).

**Signals locales reactivos** espejan el form: `_tipoVenta`, `_metodoPago`, `_tipoComprobante` (porque `computed()` no observa ReactiveForms — ver comentario en `resumen.component.ts:304-305`).

**Acciones**: `submit()` -> `crearVenta()` -> nav a propuesta o comprobante.

**Navegación**: link "Cambiar" en sección "Tipo de venta" enlaza a `/ventas`.

---

### Página 7 — `PropuestaSunatComponent`

| Atributo | Valor |
|----------|-------|
| Ruta | `/ventas/propuesta-sunat` (**ruta real**). También modal (`isModal=true`). |
| Archivo | `pages/propuesta-sunat/propuesta-sunat.component.{ts,html,css}` |
| Selector | `app-propuesta-sunat` |
| Step | `currentStep=2`, `showSunatStep=true` (solo no-modal — `html:1-3`) |

**Propósito**: el backend devolvió `propuesta_sunat`. Cada línea es:
- No-relleno: usuario solo confirma cantidad/precio.
- Relleno: backend sugirió un sustituto **con factura**. Usuario puede aceptar o **cambiarlo** manualmente.

**Inputs**: `isModal: boolean` (default `false`).
**Outputs**: `propuestaConfirmada: void`, `carritoRecuperado: void`, `ventaCancelada: void`.

**Signals**:
- `lineas`: array editable (`LineaEditable[]`).
- `rellenosSinResolver`: count de rellenos sin `loteProductoOriginalId`.
- `selectorIndice`.

**Lógica en `ngOnInit`** (`propuesta-sunat.component.ts:53-112`):
1. Si no hay venta creada: nav `/ventas/catalogo`.
2. Construye 3 mapas de imágenes (por nombre, por productoId, por loteProductoId) del carrito.
3. Mapea cada `PropuestaSunatItem` a `LineaEditable` (imagen actual, imagen original, nombre original).
4. Pre-carga catálogo.

**Acciones**:

| Acción | Método | Service |
|--------|--------|---------|
| Editar cantidad/precio | `[(ngModel)]` directo en `LineaEditable` | — |
| Confirmar | `confirmar()` | `ventaSvc.confirmarSunat(lineas)` |
| Volver al carrito | `volverAlCarrito()` | `cancelarVentaSinLimpiarCarrito()` (confirm) |
| Cancelar | `cancelar()` | `cancelarVenta()` (confirm) |
| Abrir selector | `abrirSelector(idx)` | UI |
| Buscar en selector | `onSelectorBusqueda()` (debounce 350ms) | `catalogoSvc.cargarCatalogo` |
| Scroll selector | `onSelectorScroll(ev)` | `catalogoSvc.cargarMasCatalogo` |
| Elegir reemplazo | `seleccionarReemplazo(producto)` | Update local de `lineas[idx]` (solo nombre/imagen, no `loteProductoId`) |

**Validaciones**: `confirmar()` bloqueado si `rellenosSinResolver() > 0`.

**Navegación**:
- Modo página: `confirmar` -> `/ventas/comprobante`; `volverAlCarrito` -> `/ventas/pedido`; `cancelar` -> `/ventas`.
- Modo modal: emite eventos al padre.

**Edge cases**:
- `loteProductoOriginalId === null` en relleno: banner rojo "No se encontró sustituto automático". Confirmar deshabilitado.
- Carga directa sin venta creada: redirect.
- Confirmaciones por `confirm()` del navegador.

---

### Página 8 — `ComprobanteComponent`

| Atributo | Valor |
|----------|-------|
| Ruta | `/ventas/comprobante` (**ruta real**). También modal con `isModal=true`. |
| Archivo | `pages/comprobante/comprobante.component.ts` (template inline largo) |
| Selector | `app-comprobante-venta` |
| Step | `currentStep = isSunat() ? 3 : 2`, `showSunatStep=isSunat()` (`comprobante.component.ts:43`) |

**Propósito**: muestra resultado de la venta + acciones de gestión.

**Inputs**: `isModal: boolean` (default `false`).
**Outputs**: `nuevaVentaEvent: void`.

**Signals**:
- `venta = computed(() => ventaSvc.state().ventaCreada)`.
- `isSunat = computed(() => venta()?.tipoVenta === 'SUNAT')`.
- `mostrarFormNotaCredito`, `motivoNotaCredito`.
- `mostrarPreview`, `previewPdfUrl`, `previewPdfBlob`, `previewTicketData`.

**Acciones**:

| Acción | Método | Comportamiento |
|--------|--------|----------------|
| Descargar PDF | `descargarPdf()` | Si `urlPdfTicket` (SUNAT): `window.open`. Sino: `ventaSvc.descargarTicketPdf(numero)`. |
| Imprimir | `imprimir()` | SUNAT + `urlPdfTicket`: usa URL. Sino: baja blob; si falla, fallback a `TicketData` con `tiendaSvc.tiendaActiva()`. Abre `PrintPreviewComponent`. |
| Cancelar | `cancelar()` | `confirm()` + `ventaSvc.cancelarVenta()`. |
| Anular | `anular()` | `prompt()` motivo + `ventaSvc.anularVenta(motivo)`. |
| Emitir NC | `emitirNotaCredito()` | `ventaSvc.emitirNotaCredito(motivo)`. |
| Nueva venta | `nuevaVenta()` | `limpiarFlujo()` + nav `/ventas` o emit. |
| Ver operaciones | `volverAOperaciones()` | `limpiarFlujo()` + nav `/operaciones`. Solo no-modal. |

**Reglas de mostrado** (`comprobante.component.ts:355-368`):
- `puedeCancelar()`: `tipoVenta !== 'SUNAT'` Y `!isCancelada`.
- `puedeAnular()`: `tipoVenta === 'SUNAT'` Y `estadoSunat === 'ACEPTADO'`.
- `puedeNotaCredito()`: SUNAT aceptada Y `!notaCredito`.

**Detalle visible**:
- Banner verde "Venta registrada".
- Card principal con `tipoDisplay`, `tipoComprobanteDisplay`, badge de `estadoSunat`, mensaje de rechazo.
- Meta-rows: número, cliente, método pago, fecha (formato `es-PE`).
- Líneas: usa `detallesSunat` si SUNAT, sino `detalles`.
- Totales: subtotal + IGV + total (subtotal/IGV solo si `igvTotal` no null).
- Si existe `notaCredito`: card con motivo, botones "PDF A4" e "Imprimir NC".

**Edge cases**:
- `ngOnInit`: si no hay venta Y no es modal: redirect a `/ventas`.
- Falla descarga ticket PDF: fallback a `TicketData` con `tiendaSvc.tiendaActiva()`.
- Rechazo SUNAT: banner con `motivoRechazo`.
- Prompt anular vacío: no hace nada.

---

## 11. Notas para el rediseño

### Lo que NO se puede tocar (contratos)

- `carrito.service.ts`: semántica de `count` (suma cantidades), key tupla `(productoId, esAveriado)`, signals públicos. Tests lo verifican.
- `venta.service.ts`: API pública (`crearVenta`, `confirmarSunat`, `cancelarVenta`, `cancelarVentaSinLimpiarCarrito`, `anularVenta`, `emitirNotaCredito`, `limpiarFlujo`, etc.).
- `resumen-venta.service.ts`: estado y métodos.
- `venta.repository.ts`: endpoints y mapping.
- `models/*.ts`: DTOs y `fromJson` / `toJson`.
- `validators/venta.validators.ts`: funciones de validación (con tests).
- `constants/*.ts`: códigos (`'01'`, `'03'`, `'1'`, `'6'`, `'7'`, `'NORMAL'`, etc.) son contratos con backend.

### Lo que sí se rediseña

- Todas las plantillas `.html` y `.css` de `pages/**`.
- `components/cliente-search/cliente-search.component.ts`: visual; **mantener Inputs/Outputs**.
- `components/flow-header/flow-header.component.ts`: visual.
- Composición de pantallas.

### Riesgo: rutas redirect vs URLs reales por step

Hoy:
- `/ventas` -> `VentaComponent` (moderno, single-page).
- `/ventas/catalogo`, `/ventas/pedido`, `/ventas/carrito`, `/ventas/resumen` -> redirect a `/ventas`.
- `/ventas/propuesta-sunat`, `/ventas/comprobante` -> rutas reales.

Los componentes legacy existen pero la navegación cae en redirect.

**Si el rediseño quiere URLs reales por step**:
1. Quitar redirects en `app.routes.ts`.
2. Mover signals `panelStep`/`modalActivo` a un service global.
3. Mantener `CarritoService` y `ResumenVentaService` intactos (son singletons aptos para navegación multi-página).
4. Decidir si propuesta y comprobante siguen siendo overlay o pasan a navegación pura.

**Si se mantiene single-page**:
- Eliminar las páginas legacy del código (auditar `RouterLink` rotos).

### Dependencias con otros features

- **Inventario**: el flujo necesita `CatalogoService.cargarCatalogo`/`cargarMasCatalogo` e `InventarioService.cargarLotes`. Cambios en `ProductoCatalogoModel` rompen el carrito.
- **Finanzas**: venta `CREDITO` genera deuda en backend (no llamada explícita en frontend). Las deudas activas aparecen en `NotificacionService.cargar()`.
- **Impresora**: `ComprobanteComponent.imprimir()` usa bridge en `localhost:3000` via `PrintPreviewComponent`. Fallback HTML con `TicketData`.
- **Tiendas**: fallback de impresión usa `nombreSede`, `ruc`, `direccion`.
- **Auth**: `selectedTiendaId()` precondición de crear venta y buscar clientes.

### Edge cases conocidos

1. **Sin persistencia local**: el carrito vive en memoria. Refrescar borra todo. `AuthService.logout()` no llama `limpiarFlujo()`; estado puede sobrevivir entre sesiones del navegador si no se hace nav. Considerar suscribir `VentaService` a `auth.isAuthenticated` para limpiar.
2. **`actualizarAveriado` rompe unicidad**: puede colisionar con item existente con la combinación destino. No hay merge. Ver `carrito.service.ts:78-86`.
3. **`count()` no es `items.length`**: `count` suma cantidades. Usar `items().length` para "líneas".
4. **`cantidad` y `precioUnitario` como string en payload**: backend espera strings con punto decimal. `ventaCreateModelToJson` hace `String(...)` sin validar formato.
5. **Mensajes de error con índice**: `crearVenta` reemplaza `"<n>: <msg>"` por `"<nombre>: <msg>"` (línea 100-103). Si backend cambia los mensajes, este regex puede dejar de aplicar.
6. **`flow-header` no permite revisitar step SUNAT desde comprobante** (`flow-header.component.ts:152-157`).
7. **`PropuestaSunatComponent.ngOnInit`** redirige a `/ventas/catalogo` si no hay venta creada (equivale a `/ventas` por redirect). Ajustar si se reorganiza el routing.
8. **`isCancelada` se mapea desde `is_active === false`** (`venta-read.model.ts:183`). Ojo con `puedeCancelar()`.
9. **`PropuestaSunatComponent.seleccionarReemplazo`** solo cambia `nombre`/`imagen` localmente. El `loteProductoId` enviado al backend sigue siendo el sugerido (`propuesta-sunat.component.ts:187-195`). Para permitir cambio real del lote, extender `LineaEditable` y endpoint.
10. **`noRucEnBoletaValidator` necesita acceso al control hermano**: bind dinámico en `ngOnInit`. Preservar este patrón al rediseñar el form, o convertir a cross-field validator del grupo.

---

Fin. Citas `archivo:linea` apuntan al lugar exacto en el código.
