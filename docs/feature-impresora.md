# Feature: Impresora

## 1. Resumen

Bridge entre la app web y una impresora térmica ESC/POS. Soporta dos modos de conexión:

- **WiFi (TCP directo)**: la impresora tiene IP fija en la LAN; el bridge local (`localhost:3000`) le envía los bytes ESC/POS por TCP (puerto 9100 default).
- **USB / CUPS**: el bridge usa el sistema CUPS local (Linux/macOS o configurado en Windows). El frontend manda los datos al bridge y este los entrega al sistema.

El bridge corre en `printer-bridge/server.js` (proyecto separado, Express). Endpoints:
- `POST /test-printer` — test de conexión TCP.
- `POST /print` — imprime contenido ESC/POS raw.
- `POST /print-pdf` — recibe URL pública del PDF, lo descarga, lo renderiza con `pdfjs-dist` + `canvas`, y envía a la impresora.
- `POST /print-pdf-raw` — recibe el PDF en base64 (cuando no hay URL pública, ej. el blob del comprobante de pago).
- `GET /render-pdf?url=<u>` — preview PNG (debug).

Tres piezas en Angular:
- **`ImpresoraService`**: config (IP/puerto/tipo), persiste en `localStorage`, llamadas al bridge.
- **`TicketConverter`**: clase utility para armar el string ESC/POS desde un `TicketData` (cuando no hay URL de PDF).
- **`PrintPreviewComponent`**: modal universal de preview/impresión usado por `feature-venta`, `feature-servicio`, `feature-finanzas` y `feature-operaciones`.

Ruta:
- `/config/impresora` → `ImpresoraConfigComponent`

---

## 2. `ImpresoraService` (`impresora.service.ts`)

### Estado (config)
```ts
type TipoConexionImpresora = 'wifi' | 'usb_cups';

interface ImpresoraConfig {
  ip: string;
  puerto: number;
  tipoConexion: TipoConexionImpresora;
}
```

### Persistencia
LocalStorage keys:
- `impresora_ip` (string)
- `impresora_puerto` (number serialized)
- `impresora_tipo_conexion` (`'wifi'` | `'usb_cups'`)

Defaults: `ip: ''`, `puerto: 9100`, `tipoConexion: 'wifi'`.

### Constante interna
```ts
const BRIDGE_URL = 'http://localhost:3000';   // hardcoded
```

> **Nota**: NO viene de environment. Si quieres cambiarlo en producción, debes editar el código.

### Signals públicos
- `config: Signal<ImpresoraConfig>` (readonly).

### Métodos públicos

- **`estaConfigurada(): boolean`** — `true` si `tipoConexion === 'usb_cups'` o `ip.trim() !== ''`.

- **`guardarConfiguracion(ip, puerto, tipoConexion)`** — persiste en localStorage y actualiza signal.

- **`probarConexion(): Promise<boolean>`**:
  - POST `${BRIDGE_URL}/test-printer` con `{ip, puerto}`.
  - Devuelve `true` si `resp.ok`, `false` en cualquier error (catch all).

- **`imprimirTicket(contenidoEscPos: string)`**:
  - POST `${BRIDGE_URL}/print` con `{ip, puerto, contenido: <string ESC/POS>}`.
  - Throws si `!resp.ok`.

- **`imprimirPdfUrl(pdfUrl: string)`**:
  - POST `${BRIDGE_URL}/print-pdf` con `{url, ip, puerto}`.
  - El bridge descarga el PDF y lo procesa server-side.
  - Throws con `body.error` si falla.

- **`imprimirPdfBlob(blob: Blob)`**:
  - Convierte blob a base64 (helper `blobToBase64`).
  - POST `${BRIDGE_URL}/print-pdf-raw` con `{data: base64, ip, puerto}`.
  - Usado cuando el PDF viene del backend como `responseType: 'blob'` (ej. comprobante de pago).

- **`limpiar()`** — borra las 3 keys de localStorage y resetea config a defaults.

### Helper privado
- `blobToBase64(blob)`: `FileReader.readAsDataURL` → split por `','` para quitar el prefix `data:...;base64,`.

---

## 3. `TicketConverter` (`ticket.converter.ts`)

Clase utilitaria (no es service) que arma el string ESC/POS desde un `TicketData`.

### `TicketData`
```ts
interface TicketItem {
  nombre: string;
  cantidad: number;
  precio: number;
}

interface TicketData {
  nombreTienda: string;
  ruc: string;
  direccion?: string;
  items: TicketItem[];
  subtotal?: number;
  igv?: number;
  total: number;
  metodoPago: string | null;
  tipoComprobante?: string;     // '01' factura, '03' boleta, otros
  numeroComprobante?: string;
  clienteNombre?: string;
  fecha: string;
}
```

### Constantes
```ts
ESC = '\x1B'    // 27
GS  = '\x1D'    // 29
ANCHO = 32      // caracteres por línea (típico para impresora térmica 58mm)
```

### Método: `toEscPos(ticket: TicketData): string`

Comandos ESC/POS emitidos (en orden):

| Bytes                    | Significado                                       |
|--------------------------|---------------------------------------------------|
| `ESC @` (`\x1B@`)        | Init impresora                                    |
| `ESC a 1` (`\x1Ba\x01`)  | Alineación centrada                              |
| `ESC ! 0x10`             | Modo doble alto (para el nombre de la tienda)    |
| ... texto ...            |                                                   |
| `ESC ! 0x00`             | Vuelve a tamaño normal                            |
| `ESC a 0`                | Alineación izquierda                              |
| `-` × 32                 | Línea separadora                                  |
| ... items ...            | Cada item: nombre en una línea + `  N x S/P.PP` con padding y subtotal alineado a la derecha |
| `ESC ! 0x10` + total     | TOTAL en doble alto                               |
| `GS V A 3` (`\x1DV\x41\x03`) | Cortar papel (Partial cut con feed)          |

### Lógica de filas
```ts
fila(label, valor) {
  const espacio = ANCHO - label.length - valor.length;
  return label + ' '.repeat(Math.max(1, espacio)) + valor + '\n';
}
```

Para items la lógica es similar pero con `padding = ANCHO - detalle.length - subtotalItem.length`.

### Tipo de comprobante (display)
- `'01'` → `'FACTURA'`
- `'03'` → `'BOLETA'`
- Otros → `'COMPROBANTE'`

---

## 4. `PrintPreviewComponent` (`print-preview/print-preview.component.ts`)

Modal universal de preview + envío a impresora. Renderiza UNO de tres fuentes (en orden de precedencia):

1. **`pdfUrl: string | null`** — iframe con `bypassSecurityTrustResourceUrl`.
2. **`pdfBlob: Blob | null`** — convierte a object URL e iframe.
3. **`ticketData: TicketData | null`** — renderiza HTML preview con `buildTicketHtml()` (formato monospace 32 chars).

### Inputs
- `pdfUrl: input<string | null>(null)`
- `pdfBlob: input<Blob | null>(null)`
- `ticketData: input<TicketData | null>(null)`

### Output
- `cerrar: output<void>()`.

### Signals locales
- `enviando: signal<boolean>` — flag de envío en curso.
- `error: signal<string | null>` — mensaje si falla.
- `exito: signal<boolean>` — true tras envío exitoso (cierra a los 1.5s).
- `safePdfUrl: computed<SafeResourceUrl | null>` — pdfUrl o blob convertido a SafeResourceUrl.
- `ticketHtml: computed<string>` — HTML del preview si es ticketData.

### Acción: `enviarAImpresora()`
1. Limpia error, setea enviando.
2. Despacha según fuente:
   - `pdfUrl` → `impresoraSvc.imprimirPdfUrl(url)`.
   - `pdfBlob` → `impresoraSvc.imprimirPdfBlob(blob)`.
   - `ticketData` → `new TicketConverter().toEscPos(data)` → `impresoraSvc.imprimirTicket(escPos)`.
3. Si éxito → `exito = true`, `setTimeout(cerrar.emit(), 1500)`.
4. Si error → muestra `e.message` o fallback `'No se pudo conectar al bridge en localhost:3000'`.

### Acciones UI
- `onOverlayClick(event)`: click en el backdrop (no en el modal) → `cerrar.emit()`.

### `buildTicketHtml(data)` (función puera, local al archivo)
- Reusa la misma estructura que `TicketConverter.toEscPos` pero genera HTML para preview en pantalla:
  - 32 chars por línea (constante `W`).
  - `<strong>` para nombre tienda y línea TOTAL.
  - `esc()` helper para escapar `& < >`.

> **Duplicación intencional**: `TicketConverter` produce ESC/POS bytes, `buildTicketHtml` produce HTML para preview. Si ajustas el layout en uno, ajusta el otro para mantener WYSIWYG.

---

## 5. Página: `ImpresoraConfigComponent` (`/config/impresora`)

### Propósito
Permite configurar el modo de impresión (WiFi vs USB/CUPS) y probar la conexión.

### Forms
```ts
formWifi = fb.group({
  ip:     ['', Required],
  puerto: [9100, [Required, Min(1), Max(65535)]],
});
```

### Signals locales
- `tipoSeleccionado: signal<TipoConexionImpresora>` (default `'wifi'`).
- `probando: signal<boolean>`.
- `mensaje: signal<string | null>`.
- `esError: signal<boolean>`.

### Carga inicial (`ngOnInit`)
- Lee `svc.config()`.
- Setea `tipoSeleccionado` y `formWifi` con valores actuales.

### Acciones
- **`setTipo(tipo)`**: cambia modo + limpia mensaje.
- **`probarYGuardar()`** (modo WiFi):
  1. Valida form.
  2. `svc.guardarConfiguracion(ip, puerto, 'wifi')` — **persiste ANTES de probar** (intencional: si la prueba falla pero el usuario quiere guardar, ya está).
  3. `svc.probarConexion()`. Muestra mensaje según éxito/fallo.
- **`guardarUsbCups()`**: `svc.guardarConfiguracion('', 0, 'usb_cups')` — IP vacía y puerto 0 son señales de modo CUPS.
- **`limpiar()`**: confirm + `svc.limpiar()` + reset form.

### Helper privado
- `mostrar(msg, error)`: actualiza signals `mensaje` y `esError`.

### Edge cases
- **Bridge no corriendo**: `probarConexion()` devuelve `false` silenciosamente (catch). El mensaje dice "No se pudo conectar" pero **guarda la config** igual.
- **Puerto 0 con modo wifi**: validador rechaza (`Min(1)`).

---

## 6. Endpoints (del bridge local, NO del backend)

| Método | Path                                         | Body                                              | Response                          |
|--------|----------------------------------------------|---------------------------------------------------|-----------------------------------|
| POST   | `http://localhost:3000/test-printer`         | `{ip, puerto}`                                    | 200 OK o 5xx                      |
| POST   | `http://localhost:3000/print`                | `{ip, puerto, contenido: <string ESC/POS>}`      | 200 OK o 5xx                      |
| POST   | `http://localhost:3000/print-pdf`            | `{url, ip, puerto}`                               | 200 o `{error: '...'}`           |
| POST   | `http://localhost:3000/print-pdf-raw`        | `{data: <base64>, ip, puerto}`                    | 200 o `{error: '...'}`           |
| GET    | `http://localhost:3000/render-pdf?url=<u>`   | —                                                  | PNG stream (debug)               |

---

## 7. Notas para el rediseño

### NO tocar
- `ImpresoraService` — los 5 métodos públicos (más el `estaConfigurada`) son contrato.
- `TicketConverter.toEscPos` — los bytes ESC/POS son contrato con la impresora. Si cambias el ANCHO o quitas comandos, las impresiones se romperán físicamente.
- `PrintPreviewComponent` inputs/outputs — múltiples features lo consumen.
- LocalStorage keys (`impresora_ip`, etc.).
- BRIDGE_URL hardcoded a `localhost:3000` — los usuarios corren el bridge localmente; cambiarlo rompería las instalaciones existentes.

### Rediseñable
- UI de `ImpresoraConfigComponent` y `PrintPreviewComponent`: estilos inline pueden moverse a `.css` files.
- El preview HTML (`buildTicketHtml`) y el ESC/POS (`TicketConverter.toEscPos`) están duplicados — considera unificar con un layout descriptivo + renderers separados.
- `BRIDGE_URL` podría leerse de environment para soportar IP custom en LAN.

### Edge cases conocidos
- **Bridge ausente**: todos los `fetch` van a fallar con network error. `PrintPreviewComponent` lo muestra como error genérico con hint "Verifica que el bridge esté corriendo".
- **CORS**: el bridge tiene `cors()` enabled. Si cambias el origen del frontend (ej. SSL en producción) y el bridge sigue en HTTP local, los navegadores modernos bloquean mixed content. Considerar HTTPS local (mkcert).
- **PDF rendering**: el bridge usa `pdfjs-dist@3.x` + `canvas`. Hay polyfills custom en `server.js` para `DOMMatrix` y `Path2D` (canvas@3.x no exporta Path2D). PDFs con paths complejos pueden no renderizar correctamente.
- **Ticket interno (07)**: no es comprobante SUNAT, sólo print local. Útil para pre-tickets de cocina/cobranza.

### Dependencias cruzadas
- **Consumidores de `PrintPreviewComponent`**: `feature-finanzas` (tras pago de deuda), `feature-venta`/`feature-servicio` (tras emitir comprobante), `feature-operaciones` (impresión desde historial + NC).
- **Consumidores de `ImpresoraService`**: principalmente `PrintPreviewComponent`. Las páginas no lo consumen directamente.
- **Bridge HTTP**: `printer-bridge/server.js` debe estar corriendo (`pnpm start` desde `printer-bridge/`). El usuario lo arranca manualmente.

### Comportamiento esperado
- **El blob del comprobante de pago de finanzas** se envía a `imprimirPdfBlob` → base64 → `/print-pdf-raw`. Esto evita necesitar URL pública del PDF.
- **Las URLs `urlPdfTicket`** del backend son URLs públicas (probablemente S3 o similar). El bridge las descarga server-side.
- **El TicketConverter** se usa como **fallback local** cuando no hay PDF (operaciones legacy o cuando el backend no devolvió URL). Reconstruye el ticket desde los datos crudos.
