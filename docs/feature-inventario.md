# Feature: Inventario

## 1. Resumen

Manejo de inventario en dos sub-dominios:

- **Lotes** — registros de ingreso de mercadería. Un lote agrupa varios `LoteProducto` (mismo producto puede aparecer en múltiples lotes, cada uno con su precio de compra/venta, fecha y costo de operación/transporte). Soporta crear productos nuevos o asociar a productos existentes del catálogo. Paginación cursor.
- **Productos / Catálogo** — vista unificada del catálogo con stock agregado. Permite editar tipo de IGV, activar/desactivar y subir imagen.

Hay **dos services**: `InventarioService` (lotes + productos + stock; estado más amplio) y `CatalogoService` (catálogo paginado con search + scroll infinito). Ambos usan el mismo `InventarioRepository`.

Dependencias clave:
- `feature-venta`: consume `getCatalogo()` para el catálogo de venta.
- `feature-home / NotificacionService`: consume `getStock()` para alertas de stock bajo.

Rutas:
- `/inventario` → redirect a `/inventario/productos`
- `/inventario/lotes` → `LoteListComponent`
- `/inventario/lotes/nuevo` → `LoteFormComponent`
- `/inventario/lotes/:id` → `LoteDetailComponent`
- `/inventario/productos` → `ProductosComponent`

> **Nota**: existe `InventarioHubComponent` en `pages/inventario-hub/` pero **no está registrado en `app.routes.ts`** — código huérfano. Verificar si se debería eliminar o conectar.

---

## 2. Modelos / DTOs

### `LoteResponse` (`models/lote.model.ts`)
```ts
interface LoteResponse {
  id: number;
  tienda: TiendaLoteInfo;     // { id, nombreSede }
  fechaLlegada: string;        // 'YYYY-MM-DD'
  costoOperacion: string;
  costoTransporte: string;
  isActive: boolean;
  productos: LoteProductoResponse[];
}
```

### `LoteProductoResponse` (item dentro de un lote)
```ts
interface LoteProductoResponse {
  id: number;
  producto: number;              // FK al producto
  productoNombre: string;
  productoCodigo: string;
  unidadMedida: string;          // ej. 'NIU', 'KGM'
  unidadMedidaDisplay: string;
  conFactura: boolean;           // si se compró con factura
  cantidadInicial: string;
  cantidadActual: string;        // descontada por ventas
  cantidadAveriada: string;
  cantidadDisponible: number;    // suele venir como number (NO string)
  costoTotal: string;
  precioCompra: string;
  precioVentaBase: string | null;
  precioVentaMercado: string;
  isActive: boolean;
}
```

### `LoteCreateModel` (payload de creación)
```ts
interface LoteCreateModel {
  tienda: number;
  fechaLlegada: string;
  costoOperacion: string;
  costoTransporte: string;
  productos: LoteProductoInput[];
}

interface LoteProductoInput {
  productoId?: number;       // si se usa producto existente
  nombre?: string;           // si se crea nuevo producto
  unidadMedida: string;
  conFactura: boolean;
  cantidad: string;
  cantidadAveriada: string;
  costoTotal: string;
  precioVentaBase?: string;
  precioVentaMercado: string;
}
```
**Regla**: o `productoId` (existente) o `nombre` (crear nuevo) — exclusivo.

### `ProductoModel`
```ts
interface ProductoModel {
  id: number;
  nombre: string;
  codigo: string;
  tipoIgv: string;          // '10' | '20' | '30'
  tipoIgvDisplay: string;
  imagen: string | null;    // URL o null
  isActive: boolean;
}
```

### `ProductoCatalogoModel` (con stock agregado)
```ts
interface ProductoCatalogoModel {
  productoId: number;
  nombre: string;
  codigo: string;
  imagen: string | null;
  tipoIgv: string;
  isActive: boolean;
  unidadMedida: string;
  cantidadDisponible: string;
  cantidadAveriada: string;
  tieneConFactura: boolean;     // hay al menos un lote conFactura
  tieneSinFactura: boolean;     // hay al menos un lote sinFactura
  precioVentaMercado: string;
  precioVentaBase: number | null;
}
```

### `StockModel` (stock por producto)
```ts
interface StockModel {
  productoId: number;
  productoNombre: string;
  unidadMedida: string;
  cantidadDisponible: string;
  cantidadAveriada: string;
  precioVentaMercado: string;
}
```

### Mappings
Todos los `*FromJson` convierten snake_case → camelCase. Patrones notables:
- Cantidades numéricas (`cantidad_inicial`, `costo_total`, etc.) se preservan como **strings** para evitar pérdida de decimales (excepto `cantidad_disponible` en `LoteProductoResponse` que viene como number).
- `loteCreateModelToJson` (encoder): hace el mapeo inverso camel→snake y omite campos opcionales no provistos.

---

## 3. Constants

### `tipo-igv.ts`
```ts
TIPO_IGV_LABELS = {
  '10': 'Gravado (IGV 18%)',
  '20': 'Exonerado',
  '30': 'Inafecto',
}
TIPO_IGV_VALUES = ['10', '20', '30']
getTipoIgvLabel(code): string
```

### `unidad-medida.ts`
26 unidades SUNAT-compatibles:
```
NIU=Unidad, KGM=Kilogramo, MTR=Metro, LTR=Litro, BG=Bolsa, BX=Caja,
MTK=Metro cuadrado, MTQ=Metro cúbico, KT=Kit, SET=Juego, PK=Paquete,
TU=Tubo, PR=Par, CA=Lata, BJ=Balde, CY=Cilindro, CMT=Centímetro lineal,
MMT=Milímetro, GLL=Galón, DZN=Docena, C62=Pieza, GRM=Gramo, MLT=Mililitro,
FOT=Pie, ZZ=Servicio
```
Helpers: `UNIDAD_MEDIDA_VALUES` (keys), `getUnidadMedidaLabel(code)` (con fallback al code mismo si no existe).

---

## 4. Endpoints API

| Método | Path                                  | Body / Query                                              | Response                          |
|--------|---------------------------------------|-----------------------------------------------------------|-----------------------------------|
| GET    | `inventory/lotes/?tienda=<id>&cursor=<c>` | —                                                     | `{ results, next, ... }`         |
| GET    | `inventory/lotes/{id}/`               | —                                                         | `LoteResponse`                    |
| POST   | `inventory/lotes/`                    | `loteCreateModelToJson(...)` (ver §2)                     | `LoteResponse`                    |
| DELETE | `inventory/lotes/{id}/`               | —                                                         | (vacío)                           |
| GET    | `inventory/productos/`                | —                                                         | Array o `{results}` de `ProductoModel` |
| GET    | `inventory/productos/{id}/`           | —                                                         | `ProductoModel`                   |
| PATCH  | `inventory/productos/{id}/`           | JSON `{tipo_igv?, is_active?}` o **FormData** con `imagen`| (no usado)                        |
| GET    | `inventory/stock/?tienda=<id>`        | —                                                         | Array o `{results}` de `StockModel` |
| GET    | `inventory/catalogo/?tienda=<id>&page_size=<n>&cursor=<c>&search=<s>` | —                          | `{ results, next, ... }` de `ProductoCatalogoModel` |

### Paginación cursor (DRF)
`getLotes` y `getCatalogo` parsean la URL completa de `next` extrayendo el query param `cursor` (`new URL(nextUrl).searchParams.get('cursor')`). El service mantiene `nextCursor` en state y lo pasa en la siguiente request. Si `next === null` → no hay más páginas (`hasMore: false`).

### Update producto con imagen
Si se pasa `imagenFile` → se construye `FormData` (multipart). Sin imagen → JSON normal. **Misma URL**, distinto Content-Type. El interceptor del HttpClient maneja el switching automáticamente.

---

## 5. Repository (`inventario.repository.ts`)

| Método                                                              | Endpoint                              | Notas                                                       |
|---------------------------------------------------------------------|---------------------------------------|-------------------------------------------------------------|
| `getLotes(tiendaId, cursor?)`                                       | GET `inventory/lotes/`                | Devuelve `PaginatedResult<LoteResponse>` con `nextCursor`   |
| `getLoteDetalle(id)`                                                | GET `inventory/lotes/{id}/`           | Single                                                       |
| `crearLote(lote: LoteCreateModel)`                                  | POST `inventory/lotes/`               | Encode con `loteCreateModelToJson`                          |
| `desactivarLote(id)`                                                | DELETE `inventory/lotes/{id}/`        | Soft delete (backend marca `is_active=false`)               |
| `getProductos()`                                                    | GET `inventory/productos/`            | Acepta array o `{results}`                                  |
| `getProductoDetalle(id)`                                            | GET `inventory/productos/{id}/`       | Single                                                       |
| `actualizarProducto(id, {tipoIgv?, isActive?}, imagenFile?)`        | PATCH `inventory/productos/{id}/`     | JSON o FormData según haya `imagenFile`                     |
| `getStock(tiendaId)`                                                | GET `inventory/stock/?tienda=<id>`    | Acepta array o `{results}`                                  |
| `getCatalogo(tiendaId, {cursor?, search?, pageSize?})`              | GET `inventory/catalogo/`             | `pageSize` default `20`; paginated                          |

Helpers privados:
- `parsePaginated(data, fromJson)`: extrae `next`, parsea `cursor`, mapea items.
- `extractList(data)`: tolera `{results: []}` o `[]` directo.

---

## 6. Service: `InventarioService`

### State
```ts
interface InventarioState {
  isLoading: boolean;
  isSaving: boolean;
  isLoadingMore: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  lotes: LoteResponse[];
  stock: StockModel[];
  productos: ProductoModel[];
  loteDetalle: LoteResponse | null;
  nextCursor: string | null;     // cursor de lotes
  hasMore: boolean;
  catalogo: ProductoCatalogoModel[];  // catálogo pre-cargado (lote-form)
}
```

### Signals públicos
- `state` (readonly).

### Métodos públicos

- **`cargarLotes()`**: lee `auth.selectedTiendaId()`. Si null → setea `errorMessage: 'No hay tienda seleccionada'`. Sino → GET inicial, actualiza `lotes`, `nextCursor`, `hasMore`.

- **`cargarMasLotes()`**: paginación; si ya está cargando o `!hasMore` → no-op. Concatena al final.

- **`cargarLoteDetalle(id)`**: GET detalle, setea `loteDetalle`.

- **`crearLote(lote)`**: POST → si éxito, recarga la lista entera con `cargarLotes()` + setea `successMessage`. Devuelve `boolean`.

- **`desactivarLote(id)`**: DELETE → filtra el lote del array. Setea `successMessage`.

- **`cargarStock()`**: GET stock para la tienda activa.

- **`cargarCatalogo()`**: GET catálogo con `pageSize: 200` (one shot). **Silencioso ante error** — útil para enriquecer el selector de productos en `LoteFormComponent`.

- **`cargarProductos()`**: GET productos (sin paginación, lista completa).

- **`actualizarProducto(id, {tipoIgv?, isActive?}, imagenFile?)`**: PATCH → recarga productos. Setea `successMessage`.

- **`clearMessages()`**: limpia ambos mensajes.

### Reglas de carga
- Casi todos los métodos requieren `auth.selectedTiendaId()`. Si null, los que filtran por tienda devuelven temprano (con o sin error).
- Los errores se convierten a string via `(err as Error).message` (los repos ya hicieron `extractApiError`).

---

## 7. Service: `CatalogoService`

### State
```ts
interface CatalogoState {
  isLoading: boolean;
  isLoadingMore: boolean;
  errorMessage: string | null;
  productos: ProductoCatalogoModel[];
  nextCursor: string | null;
  hasMore: boolean;
  searchQuery: string;           // mantiene el query activo para "load more"
}
```

### Signals públicos
- `state` (readonly).

### Métodos públicos

- **`cargarCatalogo(search?)`**: GET inicial con `pageSize: 20` (default). Guarda `searchQuery` en state para que `cargarMasCatalogo` lo respete.

- **`cargarMasCatalogo()`**: paginación; respeta `searchQuery` del state. Si `!hasMore` → no-op.

- **`clearMessages()`**: limpia error.

### Por qué dos services
- `InventarioService` mantiene `catalogo` como **pre-fetched para el form de lote** (200 items, una sola carga, sin búsqueda).
- `CatalogoService` es **para la página `ProductosComponent`**: scroll infinito + search con debounce.

No comparten state — pueden tener datos desincronizados temporalmente. Si actualizas un producto vía `InventarioService.actualizarProducto`, el `CatalogoService.productos` no se entera automáticamente; `ProductosComponent.guardarProducto` por eso re-llama explícitamente a `cargarCatalogo` tras editar.

---

## 8. Páginas

### 8.1. `InventarioHubComponent` (NO registrado)
- **Estado**: huérfano. No está en `app.routes.ts`.
- Solo expone `isDueno` (`auth.isDueno`).
- Si quieres usarlo, registra la ruta `/inventario` → `InventarioHubComponent` y quita el redirect a `/inventario/productos`.

### 8.2. `LoteListComponent` (`/inventario/lotes`)

#### Propósito
Lista de lotes con scroll infinito; botón abrir formulario en modal o navegar a `/inventario/lotes/nuevo`; desactivar lote desde la tarjeta.

#### Signals/state consumidos
- `svc.state` (lotes, hasMore, isLoading, isLoadingMore).
- `isDueno` (de auth).

#### State local
- `modalAbierto: signal<boolean>` — si se abre el form como modal.

#### Carga inicial
`ngOnInit`: `svc.cargarLotes()`.

#### Acciones
- Scroll infinito: `@HostListener('window:scroll')` → si `scrollY + innerHeight >= offsetHeight - 300` → `svc.cargarMasLotes()`.
- `desactivar(id, event)`: `event.preventDefault()` + `stopPropagation()` (porque la card es `routerLink`) + confirm + `svc.desactivarLote(id)`.
- `onModalCerrar('guardado' | 'cancelado')`: cierra el modal. Si fue 'guardado', el `crearLote` ya recargó la lista.

#### Navegación
- Card → `/inventario/lotes/:id` (detail).
- Botón nuevo → modal o `/inventario/lotes/nuevo`.

---

### 8.3. `LoteFormComponent` (`/inventario/lotes/nuevo` o modal embebido)

#### Propósito
Formulario complejo para crear un lote con N productos. Acepta dos modos: "usar producto existente" (selector de catálogo) o "crear nuevo producto" (nombre libre).

#### Inputs/Outputs
- `@Input() modal = false` — si está embebido como modal.
- `@Output() cerrar = EventEmitter<'guardado' | 'cancelado'>` — para que el modal sepa si refrescar.

#### Estado local (form fields)
Lote base: `fechaLlegada`, `costoOperacion` (default `'0.00'`), `costoTransporte` (default `'0.00'`).

Item input (formulario para AGREGAR un item al lote):
- `usarProductoExistente: boolean` (default `true`).
- `productoSeleccionadoId: number | null` (cuando es existente).
- `nuevoNombre: string` (cuando es nuevo).
- `unidadMedida: string` (default `'NIU'`).
- `conFactura: boolean` (default `true`).
- `cantidad`, `cantidadAveriada`, `costoTotal`, `precioVentaBase`, `precioVentaMercado` (strings).
- `busquedaProducto: string` — filtro local del selector.

Estado de lista:
- `productosAgregados: LoteProductoInput[]` — items agregados al lote (acumulador).

Errores:
- `formError`, `itemError` (strings).

UI helpers:
- `showSelector: signal<boolean>` — si el dropdown del selector está abierto.
- `hoveredProductId: signal<number | null>` — para tooltip con stock previo (usa `svc.state().catalogo`).
- `hoveredCatalogo` getter — busca el `ProductoCatalogoModel` matching.

#### Carga inicial
`ngOnInit`: `svc.cargarProductos()` + `svc.cargarCatalogo()`.

#### Computeds (getters)
- `maxFecha`: `today` en formato ISO (`fechaLlegada` no puede ser futura).
- `productosFiltrados`: filtra `state.productos` por `busquedaProducto` (lowercase, nombre o código).
- `productoSeleccionadoNombre`: lookup del nombre por ID.

#### Validaciones de item (en `agregarProducto()`)
1. `cantidad` > 0 numérico.
2. `costoTotal` > 0 numérico.
3. `precioVentaMercado` > 0 numérico.
4. `cantidadAveriada <= cantidad`.
5. `precioVentaBase <= precioVentaMercado` (si se ingresó).
6. Modo existente: `productoSeleccionadoId` requerido + no duplicado en `productosAgregados`.
7. Modo nuevo: `nuevoNombre` requerido (trimmed).

Tras agregar, **resetea TODOS los campos del item** (queda listo para el siguiente).

#### Validaciones de lote (en `guardarLote()`)
1. `fechaLlegada` requerida.
2. `productosAgregados.length > 0`.
3. `auth.selectedTiendaId()` no null.
4. Confirmación con `confirm()`.

#### Submit
- Llama `svc.crearLote({...})`.
- Si éxito y `modal` → `cerrar.emit('guardado')`. Sino → `router.navigate(['/inventario/lotes'])`.

#### Cancelar
- Si `modal` → `cerrar.emit('cancelado')`. Sino → navega a `/inventario/lotes`.

#### Defaults
- `cantidadAveriada` vacía → `'0.000'` (3 decimales).
- `costoOperacion` / `costoTransporte` vacíos → `'0.00'`.
- `precioVentaBase` vacío → `undefined` (no enviado).

---

### 8.4. `LoteDetailComponent` (`/inventario/lotes/:id`)

#### Propósito
Muestra detalle de un lote y sus productos. Permite desactivar.

#### Carga inicial
- Lee `id` de `route.snapshot.paramMap`.
- `svc.cargarLoteDetalle(id)`.

#### Acción
- `desactivar()`: confirm + `svc.desactivarLote(lote.id)`.

#### Edge cases
- Si el lote no existe → `loteDetalle` queda null y `errorMessage` se setea.
- Tras desactivar exitoso, el componente NO navega automáticamente — el state queda con `loteDetalle` referenciando un lote desactivado. Considerar `router.navigate(['/inventario/lotes'])` post-éxito.

---

### 8.5. `ProductosComponent` (`/inventario/productos`)

#### Propósito
Lista del catálogo con scroll infinito + búsqueda con debounce + panel lateral de edición.

#### Signals/state consumidos
- `catalogoSvc.state` — `productos`, `isLoading`, `hasMore`.
- `inventarioSvc.state` — `isSaving`, `errorMessage` (tras editar producto).
- `isDueno`.

#### State local
- `productoSeleccionado: signal<ProductoCatalogoModel | null>` — panel abierto.
- `busqueda: string`.
- `editTipoIgv`, `editIsActive`, `editImagenFile` — campos del panel de edición.
- `searchTimeout: ReturnType<setTimeout> | null` — para debounce.
- `tiposIgv`: array `[{value, label}]` derivado de `TIPO_IGV_VALUES`.

#### Carga inicial
`ngOnInit`: `catalogoSvc.cargarCatalogo()`.

#### Cleanup
`ngOnDestroy`: `clearTimeout(searchTimeout)` para evitar leak.

#### Acciones
- Scroll: `@HostListener('window:scroll')` → `catalogoSvc.cargarMasCatalogo()` (mismo umbral que en lote-list).
- `onBusquedaChange()`: debounce de **400ms** → `catalogoSvc.cargarCatalogo(busqueda || undefined)`.
- `seleccionar(p)`: abre panel y pre-rellena `editTipoIgv`, `editIsActive`. Resetea `editImagenFile`.
- `cerrarPanel()`: `productoSeleccionado.set(null)`.
- `onImagenChange(event)`: setea `editImagenFile`.
- `guardarProducto()`: `inventarioSvc.actualizarProducto(p.productoId, {tipoIgv, isActive}, imagenFile)`. Si no hay error → `cerrarPanel()` + recarga catálogo con el mismo `busqueda` activo.

#### Edge cases
- `editImagenFile`: input type=file. Si el usuario no selecciona nada, queda null y el PATCH va sin FormData.
- El panel y la lista NO comparten estado entre services — si editas un producto, hay que re-llamar `cargarCatalogo` para que se vea (ya se hace).

---

## 9. Notas para el rediseño

### NO tocar
- `InventarioRepository` y sus 9 métodos — son contrato API.
- `InventarioService` y `CatalogoService` — state shape, patrón de paginación cursor, lógica de error tolerance (`cargarCatalogo` silencioso).
- Todos los modelos y sus `*FromJson` / `*ToJson` (especialmente `loteCreateModelToJson` que es el contrato del payload de creación).
- Constants `TIPO_IGV_*` y `UNIDAD_MEDIDA_*` — son listas SUNAT.
- Validaciones del `LoteFormComponent` — son reglas de negocio (averiada ≤ total, base ≤ mercado, no duplicar producto).
- El switching JSON ↔ FormData en `actualizarProducto`.

### Reorganizable
- `InventarioHubComponent` está huérfano: o se elimina o se conecta.
- Las dos services (`InventarioService` + `CatalogoService`) podrían unificarse si se acepta tener un sólo state grande, pero el split actual es razonable (lifecycle distinto).
- El `LoteFormComponent` es **complejo** (modal + página) — al rediseñar considera dividirlo en sub-componentes: header de lote, agregador de items, lista de items agregados.
- El debounce de búsqueda (400ms) en `ProductosComponent` se puede extraer a un util o reemplazar con `toSignal(fromEvent(...))`.

### Edge cases conocidos
- **Paginación cursor**: si el backend cambia el formato de `next` (no usa query param `cursor`), `parsePaginated` rompe. Tolerante a `null`.
- **Stock vs Catálogo**: `getStock` y `getCatalogo` son endpoints distintos. `NotificacionService` usa `/stock/`; las páginas usan `/catalogo/` (con datos enriquecidos). No confundir.
- **`cantidadDisponible`** llega como **number** en `LoteProductoResponse` pero como **string** en `StockModel` y `ProductoCatalogoModel`. Cuidado al consumir.
- **Desactivar lote vs producto**: distintas operaciones. Desactivar lote no toca el producto. Desactivar producto via `actualizarProducto({isActive: false})`.

### Dependencias cruzadas
- **`feature-venta`**: `CatalogoService` o `InventarioRepository.getCatalogo()` se usa en el catálogo de venta. Verificar si el rediseño quiere reusar el mismo service.
- **`NotificacionService`** (core): hace `GET inventory/stock/` directo (no via repository) — si cambia el endpoint, hay dos lugares a actualizar.
- **`auth.selectedTiendaId`**: requerido por casi todos los métodos. Si no hay tienda → operaciones devuelven temprano.

### Comportamiento esperado
- Tras `crearLote` exitoso, `cargarLotes` se llama otra vez → recarga la lista entera (desperdicia datos paginados ya cargados). Aceptable para volumen pequeño; al crecer, considerar agregar el nuevo lote al principio del array.
- `cargarCatalogo` (en `InventarioService`) carga **200 items en una sola request** — está pensado para un selector dentro del lote-form. Si tu nueva UI necesita más, considera paginar también ahí.
