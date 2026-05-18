# Feature: Operaciones

## 1. Resumen

Historial **unificado** de ventas y servicios. Hace dos requests en paralelo (`sales/ventas/` + `services/servicio/`) y mergea los resultados en una sola lista ordenada por fecha descendente. Soporta filtros (tipo, fecha range, búsqueda) y acciones sobre operaciones individuales:

- Imprimir / descargar PDF del ticket.
- Anular venta (envía nota a SUNAT).
- Cancelar venta (sólo no-SUNAT).
- Emitir nota de crédito (venta o servicio) — con sub-flujos según código tipo (01, 06, 07, 09).
- Anular servicio (envía a SUNAT).
- Eliminar servicio (sólo si no fue enviado a SUNAT).

Hay un `OperacionesHubComponent` que **no está registrado en `app.routes.ts`** — código huérfano. La ruta real es `/operaciones/historial` → `OperacionesHistorialComponent`.

Rutas:
- `/operaciones` → redirect a `/operaciones/historial`
- `/operaciones/historial` → `OperacionesHistorialComponent`

---

## 2. Modelos (`models/operacion.model.ts`)

### `OperacionModel`

Modelo unificado venta/servicio para el historial. **Combina campos de ambos** dominios:

```ts
interface OperacionModel {
  id: string;                                  // = numeroComprobante
  numeroComprobante: string;
  tipo: 'VENTA' | 'SERVICIO';
  tipoVenta: string;
  tipoDisplay: string;
  fecha: string;                               // ISO
  clienteNombre: string | null;
  total: number;                               // ya parseado a number
  estadoSunat: string | null;                  // null si NO_APLICA (servicio sin SUNAT)
  metodoPago: string | null;
  tipoComprobante: string | null;              // '01' factura, '03' boleta, '07' ticket interno
  isActive: boolean;
  isCancelada: boolean;
  motivoRechazo: string | null;

  // Servicio
  descripcion: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  deuda: number;                               // monto pendiente si fue a crédito

  // Venta
  igvTotal: string | null;
  subtotal: string | null;
  detalles: VentaLineaModel[];                  // viene de feature-venta
  notaCredito: NotaCreditoModel | null;         // venta — NC persistida
  notaCreditoServicio: NotaCreditoData | null;  // servicio — NC efímera (no se persiste en BD)
  urlPdfTicket: string | null;
}
```

**Decisiones de diseño**:
- `id` es el `numeroComprobante` (string) — no un ID numérico. Sirve para `track by` y para las llamadas API que usan el número como path param.
- `tipoOrigen` en deudas/pagos es lowercase; aquí es `tipo` UPPERCASE. **NO confundir con `feature-finanzas`**.
- `estadoSunat` se normaliza: si el servicio tiene `'NO_APLICA'`, aquí lo guardamos como `null` para simplificar el render condicional.
- Los **detalles** (líneas de venta) sólo se llenan para tipo `'VENTA'`; para servicios queda `[]`.

---

## 3. Endpoints API

| Método | Path                                                   | Body                                                                                            | Response                            |
|--------|--------------------------------------------------------|-------------------------------------------------------------------------------------------------|-------------------------------------|
| GET    | `sales/ventas/?tienda=<id>&cursor=&search=&fecha_desde=&fecha_hasta=&fecha=` | —                                                                          | `{count, next, results}`            |
| GET    | `services/servicio/?tienda=<id>&cursor=&search=&fecha_desde=&fecha_hasta=&fecha=` | —                                                                       | `{count, next, results}`            |
| POST   | `sales/ventas/{numero}/anular/`                        | `{ motivo }`                                                                                    | Venta actualizada                   |
| DELETE | `sales/ventas/{numero}/`                               | —                                                                                                | (vacío)                             |
| POST   | `sales/ventas/{numero}/nota-credito/`                  | `{ motivo, codigo_tipo?, items?: [{lote_producto_id, cantidad, precio_nuevo?}] }`               | Venta actualizada con `notaCredito` |
| POST   | `services/servicio/{numero}/anular/`                   | `{ motivo }`                                                                                    | Servicio actualizado                |
| DELETE | `services/servicio/{numero}/`                          | —                                                                                                | (vacío)                             |
| POST   | `services/servicio/{numero}/nota-credito/`             | `{ motivo, codigo_tipo, precio_nuevo? }`                                                        | `{nota_credito, ...servicio}`       |

Paginación: cursor extraído del query param `cursor` de la URL `next` (DRF cursor pagination).

---

## 4. Repository (`operaciones.repository.ts`)

### `getVentas(tiendaId, filters?)`
- GET `sales/ventas/`.
- Mapea via `ventaReadModelFromJson` (de `feature-venta/models/venta-read.model.ts`) y luego transforma a `OperacionModel`.
- Devuelve `{ items, nextCursor }`.

### `getServicios(tiendaId, filters?)`
- GET `services/servicio/`.
- Mapea via `servicioReadModelFromJson` (de `feature-servicio`) y luego transforma a `OperacionModel`.
- Tratamiento de `estadoSunat`: si es `'NO_APLICA'` → `null`.

### Helpers privados
- `extractList(data)`: tolera `{results}` o array directo.
- `extractCursor(nextUrl)`: parsea `URL` y extrae query param `cursor`.

### `HistorialFilters`
```ts
interface HistorialFilters {
  cursor?: string;
  search?: string;
  fechaDesde?: string;   // 'YYYY-MM-DD'
  fechaHasta?: string;
  fecha?: string;         // fecha exacta (mutuamente exclusivo con range)
}
```

---

## 5. Service: `OperacionesService`

### State
```ts
interface OperacionesState {
  isLoading: boolean;
  isLoadingMore: boolean;
  isSaving: boolean;             // acciones de anular/cancelar/NC
  errorMessage: string | null;
  successMessage: string | null;
  operaciones: OperacionModel[];  // lista mergeada y ordenada por fecha desc
  hasMore: boolean;               // true si CUALQUIERA de los dos endpoints tiene next
}
```

### Cursors privados
- `nextCursorVentas: string | null`
- `nextCursorServicios: string | null`
- `lastParams: HistorialParams` — guarda los filtros activos para `cargarMas()`.

### Signals públicos
- `state` (readonly).

### Métodos públicos

#### Carga
- **`cargarHistorial(params)`**:
  - Reset de cursors y `operaciones: []`.
  - Si `tipo === 'TODOS'` → carga ambos en paralelo. Si `tipo === 'VENTA'` → solo ventas (servicios → resolved con `[]`). Si `tipo === 'SERVICIO'` → solo servicios.
  - Mergea con `merge()` (sort por `fecha` desc).
  - `hasMore` = `nextCursorVentas !== null || nextCursorServicios !== null`.

- **`cargarMas()`**:
  - Carga la siguiente página de **cada** endpoint que aún tenga cursor (respetando `tipo`).
  - Concatena al `operaciones` existente.

#### Anular/Cancelar Venta
- **`anularVenta(numero, motivo)`**: POST `sales/ventas/{numero}/anular/`. Devuelve `boolean`. Actualiza el item local con `isActive`, `estadoSunat`.
- **`cancelarVenta(numero)`**: DELETE `sales/ventas/{numero}/`. Marca `isActive: false`, `isCancelada: true`.

#### NC Venta
- **`emitirNotaCreditoVenta(numero, motivo, options?)`**:
  - `options.codigoTipo`: `'01' | '06' | '07' | '09'`.
  - `options.items`: array `{ loteProductoId, cantidad, precioNuevo? }` para tipos 07 (devolución por ítem) y 09 (ajuste de precio).
  - POST `sales/ventas/{numero}/nota-credito/` con body `{ motivo, codigo_tipo?, items? }`.
  - Devuelve `NotaCreditoModel | null`.
  - Actualiza el item local con `estadoSunat`, `isActive`, `isCancelada`, `notaCredito`.

#### Anular/Eliminar Servicio
- **`anularServicio(numero, motivo)`**: POST `services/servicio/{numero}/anular/`. Actualiza state.
- **`eliminarServicio(numero)`**: DELETE `services/servicio/{numero}/`. **Filtra el item del array** (eliminación física).

#### NC Servicio
- **`emitirNotaCreditoServicio(numero, motivo, codigoTipo, precioNuevo?)`**:
  - POST `services/servicio/{numero}/nota-credito/`.
  - Tipos: `'01'` (anulación total) o `'09'` (disminución en valor — requiere `precioNuevo`).
  - Devuelve `NotaCreditoData | null` (de `feature-servicio/models/nota-credito.model.ts`).
  - **Lógica especial**: tras éxito, la NC de servicio **no se persiste en BD del servicio** — sólo tienes oportunidad de imprimirla ahora.

#### Util
- `limpiarMensajes()`: limpia `errorMessage` y `successMessage`.

### Merge interno
```ts
merge(ventas, servicios): OperacionModel[] {
  return [...ventas, ...servicios].sort((a, b) => b.fecha.localeCompare(a.fecha));
}
```
Sort lexicográfico funciona porque las fechas vienen en ISO 8601.

---

## 6. Página: `OperacionesHistorialComponent` (`/operaciones/historial`)

### Propósito
Lista filtrable con scroll infinito, detalle en modal sheet, y modales para anular/cancelar/emitir NC.

### Signals/state consumidos
- `svc.state` (operaciones, loading, errors, success).
- `tiendaSvc.tiendaActiva()` — para fallback de impresión local (cuando no hay `urlPdfTicket`).

### State local (filtros)
- `searchText: string`, `fechaDesde`, `fechaHasta`.
- `tipoFiltro: signal<'TODOS' | 'VENTA' | 'SERVICIO'>` (default `'TODOS'`).
- `activeDateChip: signal<'HOY' | 'AYER' | 'SEMANA' | 'MES' | 'PERSONALIZADO' | null>`.
- `searchTimer: setTimeout | null` — debounce 300ms.

### State local (detail modal)
- `detalleAbierto: signal<OperacionModel | null>` — sheet abierto con la operación.

### State local (confirm modal)
- `confirmModal: signal<{ titulo, descripcion, boton, destructivo, conMotivo, motivoPlaceholder?, accion: ()=>Promise<void> } | null>`.
- `motivoInput: string` — usado tanto para confirm motivos como para NC motivos.

### State local (NC Venta modal)
- `notaCreditoVentaOp: signal<OperacionModel | null>`.
- `ncVentaTipo: string` (default `'01'`).
- `ncVentaItems: signal<NCItemState[]>` — items con cantidad/precioNuevo editables.
- `ncVentaError: string`.
- `NC_VENTA_TIPOS` (constante): array `[{codigo, label, desc}]` con los 4 tipos: 01, 06, 07, 09.

### State local (NC Servicio modal)
- `notaCreditoServicioOp: signal<OperacionModel | null>`.
- `ncServicioTipo: string` (default `'01'`).
- `ncServicioPrecioNuevo: string`.

### State local (preview)
- `mostrarPreview: signal<boolean>`.
- `previewPdfUrl: signal<string | null>`.
- `previewPdfBlob: signal<Blob | null>`.
- `previewTicketData: signal<TicketData | null>` — para fallback local.

### Carga inicial
`ngOnInit`: `svc.cargarHistorial({})`.

### Cleanup
`ngOnDestroy`: `clearTimeout(searchTimer)`.

### Scroll infinito
`@HostListener('window:scroll')` → `cargarMas()` si nearBottom (200px) + `hasMore` + !`isLoadingMore`.

### Filtros — date chips
- `selectDateChip(chip)`:
  - Toggle off si mismo chip → reset fechas y aplica.
  - Sino → setea fechas según `calcDateRange(chip)`:
    - `'HOY'`: `{desde: today, hasta: today}`.
    - `'AYER'`: ayer/ayer.
    - `'SEMANA'`: desde domingo de esta semana (`now.getDay()` offset) hasta hoy.
    - `'MES'`: desde día 1 hasta hoy.
    - `'PERSONALIZADO'`: muestra inputs date — no aplica hasta que cambien.

### Acciones de filtro
- `selectTipo(tipo)`: aplica.
- `aplicarFiltros()`: dispara `cargarHistorial({tipo, search, fechaDesde, fechaHasta})`.
- `onSearchChange()`: debounce 300ms → `aplicarFiltros`.

### Helpers de display
- `getTipoLabel(op)`: venta → `getTipoVentaLabel`; servicio → `tipoDisplay || tipoVenta`.
- `formatFecha(fecha)`: `toLocaleString('es-PE')` con try/catch.
- `sunatBadgeClass(estado)`: mapea `getEstadoSunatColor` → clases CSS badge.
- `sunatTextClass(estado)`: idem para texto.

### Reglas de negocio (puedeXxx())

#### `puedeAnularVenta(op)`
- Tipo VENTA + activa + `estadoSunat === 'ACEPTADO'`.
- Si `tipoComprobante === '01'` (factura): plazo de 7 días desde la fecha.
- Si `tipoComprobante === '03'` (boleta): sólo el **mismo día**.
- Otros (`'07'` ticket interno, etc.): permitido siempre.

#### `puedeCancelarVenta(op)`
- VENTA + activa + `tipoVenta !== 'SUNAT'` (no enviada a SUNAT).

#### `puedeNotaCreditoVenta(op)`
- VENTA + activa + `estadoSunat === 'ACEPTADO'` + **sin NC existente**.

#### `puedeAnularServicio(op)`
- SERVICIO + activa + `estadoSunat === 'ACEPTADO'`.

#### `puedeEliminarServicio(op)`
- SERVICIO + activa + `estadoSunat !== 'ACEPTADO' && estadoSunat !== 'ANULADO'`.
- (No se puede eliminar lo que ya fue a SUNAT — sólo anular.)

#### `puedeNotaCreditoServicio(op)`
- SERVICIO + activa + `estadoSunat === 'ACEPTADO'`.

### Detail modal (`abrirDetalle`)
- Setea `detalleAbierto` + limpia mensajes.
- Cierre: `cerrarDetalle()` → null + limpia mensajes.

### Confirm modal (factory pattern)
Para anular/cancelar/eliminar, crea un objeto `{titulo, descripcion, boton, destructivo, conMotivo, accion}` y lo guarda en `confirmModal`. `ejecutarConfirm()` lo dispara.

Acciones típicas tras éxito:
- Actualiza `detalleAbierto` localmente con `signal.update()` para reflejar nuevo estado.
- Cierra `confirmModal`.

### NC Venta modal — flujo
1. `abrirNotaCreditoVenta(op)`:
   - Reset `motivoInput`, `ncVentaTipo = '01'`, `ncVentaError`.
   - Construye `ncVentaItems` a partir de `op.detalles` (sólo los que tienen `loteProductoId`).
2. UI muestra selector de tipo (01, 06, 07, 09):
   - Si tipo `'07'` o `'09'` → `ncVentaRequiereItems` = true → muestra lista de items con checkboxes.
   - Para `'07'` (devolución por ítem): editar `cantidad` (max = cantidad original).
   - Para `'09'` (ajuste): editar `precioNuevo` (max = precio original, debe ser menor estricto).
3. `validarNcVenta()`:
   - Motivo requerido.
   - Si requiere items: al menos uno seleccionado.
   - Para `'07'`: cantidad > 0 y ≤ original.
   - Para `'09'`: precioNuevo > 0 y < original (estricto).
4. `confirmarNotaCreditoVenta()`:
   - Construye `items` array (sólo si requiereItems).
   - Llama `svc.emitirNotaCreditoVenta`.
   - Tras éxito: sincroniza `detalleAbierto` con el state actualizado del service, abre preview con `nc.urlPdfTicket ?? nc.urlPdfA4`.

### NC Servicio modal — flujo
- Form simple: tipo (`'01'` anulación total, `'09'` disminución valor), `precioNuevo` si `'09'`, motivo.
- `confirmarNotaCreditoServicio()`:
  - Si éxito → sincroniza detalle, **abre preview obligatoriamente** (la NC de servicio **no se persiste en BD** — única oportunidad de imprimirla).

### Impresión

#### `imprimirDesdeDetalle(op)` (botón "Imprimir ticket")
- Si `op.urlPdfTicket` → usa esa URL (imprime PDF remoto).
- Sino → construye `TicketData` local desde tienda activa + items de la operación. Para servicio: un único item (descripción, cantidad 1, precio total).
- Abre `PrintPreviewComponent`.

#### `descargarPdf(op)` (botón "Descargar PDF")
- `window.open(op.urlPdfTicket, '_blank')`.

#### `descargarNcPdf(url)` / `imprimirNcExistente(url)`
- Para NCs ya emitidas: abrir PDF en nueva pestaña o abrir preview.

### Print preview (modal)
- Renderizado con `<app-print-preview>` (ver `feature-impresora.md`).
- Inputs: `pdfUrl`, `pdfBlob`, `ticketData` (uno de los tres).

### Edge cases
- **Cursors independientes por endpoint**: si servicios cargan más rápido que ventas, el merge mantiene orden correcto pero la "siguiente página" puede ser desigual.
- **`hasMore` agregado**: con `tipo === 'TODOS'`, sigue habiendo más mientras CUALQUIERA tenga próxima página.
- **NC items**: `loteProductoId` puede ser `null` si la venta no usó lotes (datos legacy o servicios). Se filtran.
- **Sincronización detalle ↔ service**: tras NC o anular, se re-busca el `op` actualizado en `svc.state().operaciones` y se setea en `detalleAbierto`. Si no se encuentra (caso edge), el sheet queda con datos viejos.

---

## 7. Notas para el rediseño

### NO tocar
- `OperacionesRepository` y los endpoints. La transformación `venta → operación` y `servicio → operación` es contrato.
- `OperacionesService` — state shape, lógica de merge y cursors, todos los métodos de acción.
- Las reglas `puedeXxx()` — implementan reglas SUNAT (7 días factura, mismo día boleta, etc.). Antes de modificar, validar con compliance.
- `OperacionModel` — modelo unificado consumido por el componente. Los tipos `notaCredito` vs `notaCreditoServicio` son distintos (venta persiste NC, servicio no).

### Reorganizable
- `OperacionesHubComponent` está huérfano — eliminar o conectar.
- `OperacionesHistorialComponent` es **enorme** (~1200 líneas en TS solo). Considera dividir:
  - `HistorialFiltrosComponent` (search + chips + date range).
  - `HistorialDetalleSheetComponent`.
  - `NcVentaModalComponent`, `NcServicioModalComponent`.
  - `ConfirmAccionModalComponent` (reusable).
- El `confirmModal` con factory pattern (objeto con `accion: () => Promise<void>`) es OK pero podría tipificarse mejor.
- Date range calculation (`calcDateRange`) → extraer a util compartido.

### Dependencias cruzadas
- **`feature-venta`**: `ventaReadModelFromJson`, `VentaLineaModel`, `NotaCreditoModel`, `getTipoVentaLabel`, `getMetodoPagoLabel`, `getEstadoSunatLabel`, `getEstadoSunatColor`.
- **`feature-servicio`**: `servicioReadModelFromJson`, `NotaCreditoData`, `notaCreditoDataFromJson`.
- **`feature-inventario`**: `getUnidadMedidaLabel`.
- **`feature-tienda`**: `TiendaService.tiendaActiva` para fallback de impresión.
- **`feature-impresora`**: `PrintPreviewComponent`, `TicketData`.

### Edge cases conocidos
- **Hardcoded codes**: `'01'`, `'03'`, `'07'`, `'09'` aparecen como strings literales para tipos de comprobante y NC. Considerar extraer a constants compartidas con `feature-venta`.
- **Diferencia `urlPdfA4` vs `urlPdfTicket`**: el modelo `NotaCreditoModel` (venta) tiene ambos; al imprimir prioriza `urlPdfTicket`. Las NC de servicio usan `pdfA4` y `pdfTicket` (sin "url" prefix). NO confundir.
- **Búsqueda fecha vs range**: si pasas `fecha` Y `fechaDesde/fechaHasta`, el backend probablemente prioriza uno. El front actualmente nunca los manda juntos.
- **`tipoVenta === 'SUNAT'`**: este string aparece como discriminador para si la venta fue enviada a SUNAT — viene del backend, no es un enum del frontend.
