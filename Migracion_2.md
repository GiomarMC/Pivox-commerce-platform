# Migración Flutter → Angular: Pendientes Detallados

**Fecha:** 30 de Abril, 2026  
**Propósito:** Documento de seguimiento de TODO lo que falta implementar para completar la migración.  
**Cómo usar:** Cada ítem tiene ✅ cuando se implementa. Implementar en el orden marcado por prioridad.

---

## Estado Real de la Migración

| Capa | Completado | Pendiente |
|------|-----------|-----------|
| Services/Repositories (lógica) | ~80% | ~20% |
| Templates HTML | 11 / 37 (30%) | 26 plantillas |
| Listeners reactivos (effects) | 0% | 2 módulos |
| Validadores de formularios | 1 módulo (venta) | 4 módulos |
| PDF handling | Finanzas (blobs) | Abrir en pestaña |
| Sidebar/shell UI | Básico | Tienda activa, cambiar tienda |
| Impresora bridge | 0% | Completo |
| Tests | 2 archivos | Todo |

---

## Índice de Secciones

| Sección | Contenido | Estado |
|---------|-----------|--------|
| **1. MainShell / Sidebar** | tiendaActiva, botón cambiar tienda, links faltantes | ✅ Completado |
| **2. Templates HTML Faltantes** | 26 plantillas HTML pendientes | ✅ Completado |
| **3. Lógica Faltante en Services/Repositories** | Métodos que faltan en servicios existentes | ✅ Completado |
| **4. Validadores Faltantes** | Validators para tienda, servicio, finanzas | ✅ Completado |
| **5. Impresora: Bridge HTTP** | Servidor Node.js para ESC/POS | ✅ Completado |
| **6. Páginas Completamente Nuevas** | Páginas fuera del plan original | ✅ Completado |
| **7. Correcciones en lo Existente** | Bugs y correcciones menores | ✅ Completado |
| **8. Plan de Implementación** | Plan semana por semana con estimados | — Referencia |
| **Checklist Rápido** | Lista de verificación completa | — Referencia |

---

## 1. MainShell / Sidebar

**Archivo:** `src/app/layout/main-shell/main-shell.component.ts` y `.html`

### 1.1 — Tienda activa visible en el sidebar ❌

En Flutter el sidebar mostraba el nombre de la tienda en la que se operaba. En Angular no aparece nada. Falta agregar en el `.html`:

```html
<!-- Encima del nombre de usuario en sidebar-footer -->
@if (tiendaActiva()) {
  <span class="tienda-activa">{{ tiendaActiva()!.nombreSede }}</span>
}
```

Y exponer la señal en el `.ts`:
```typescript
readonly tiendaActiva = inject(TiendaService).tiendaActiva;
```

### 1.2 — Botón "Cambiar tienda" solo para dueño multitienda ❌

El dueño puede operar en varias tiendas. En Flutter había una forma de navegar a `/select-store` desde dentro de la app. En Angular no existe ese punto de entrada. Falta en el `.html`:

```html
@if (isDueno() && userMe()!.tiendas.length > 1) {
  <button class="btn-cambiar-tienda" (click)="cambiarTienda()">
    Cambiar tienda
  </button>
}
```

Y en el `.ts`:
```typescript
cambiarTienda(): void {
  this.auth.selectTienda(0 as unknown as number); // limpia selección
  this.router.navigate(['/select-store']);
}
```

### 1.3 — Links faltantes en el sidebar ❌

El sidebar actual solo tiene: Inicio, Inventario, Operaciones, Finanzas, Usuarios. En Flutter el menú tenía acceso a más secciones según el rol. Faltan:

```html
<!-- Para todos -->
<li><a routerLink="/tiendas" routerLinkActive="active">Tiendas</a></li>

<!-- Solo admin/dueño -->
@if (canViewUsuarios()) {
  <li><a routerLink="/asistencia" routerLinkActive="active">Asistencia</a></li>
}

<!-- Solo dueño -->
@if (isDueno()) {
  <li><a routerLink="/config/impresora" routerLinkActive="active">Impresora</a></li>
}
```

### 1.4 — `tiendaActiva` computed en TiendaService ❌

El Flutter tenía `tiendaActivaProvider` que calculaba la tienda activa cruzando `selectedTiendaId` con la lista de tiendas. En Angular no existe. Agregar en `tienda.service.ts`:

```typescript
// Equivale a tiendaActivaProvider en Flutter
readonly tiendaActiva = computed(() => {
  const selectedId = this.auth.selectedTiendaId();
  const tiendas = this._state().tiendas;
  if (!selectedId || tiendas.length === 0) return null;
  return tiendas.find(t => t.id === selectedId) ?? tiendas[0];
});
```

---

## 2. Templates HTML Faltantes

> El `StoreSelectorComponent` usa template inline en el `.ts` — eso es válido, no necesita archivo `.html` separado.

### 2.1 — Home ❌

**Archivo:** `src/app/features/home/home.component.html` y lógica en `.ts`

El componente `.ts` está completamente vacío. En Flutter la pantalla de inicio mostraba:

- Saludo con nombre del usuario y rol
- Card con resumen de caja del día (total ventas, total servicios, efectivo en caja)
- Card con operaciones recientes (últimas 3 ventas/servicios)
- Card con asistencia de hoy (cuántos entraron, cuántos faltaron)
- Accesos rápidos: botones grandes a Ventas, Servicios, Inventario

**Lógica requerida en `home.component.ts`:**
```typescript
// Cargar en ngOnInit en paralelo:
await Promise.all([
  finanzasService.cargarCajaResumen(),
  // traer últimas ventas (getVentas con page_size=3)
  // traer asistencias de hoy
]);
```

---

### 2.2 — Operaciones: Historial ❌

**Archivo:** `src/app/features/operaciones/operaciones-historial/operaciones-historial.component.html`

**Lógica requerida (service/repository NO existen aún):**

Crear `src/app/features/operaciones/operaciones.service.ts`:
```typescript
// Carga ventas y servicios en paralelo y los mezcla ordenados por fecha desc
async cargarHistorial(filtros?: { tipo?: 'VENTA' | 'SERVICIO'; fechaDesde?: string; fechaHasta?: string }): Promise<void>
async cargarMas(): Promise<void>  // paginación cursor
```

Crear `src/app/features/operaciones/operaciones.repository.ts`:
```typescript
// Llama a ambos endpoints y devuelve lista unificada
async getVentas(tiendaId: number, cursor?: string): Promise<{ items: VentaReadModel[], nextCursor: string | null }>
async getServicios(tiendaId: number, cursor?: string): Promise<{ items: ServicioReadModel[], nextCursor: string | null }>
```

Crear `src/app/features/operaciones/models/operacion.model.ts`:
```typescript
export interface OperacionModel {
  id: number;
  numeroComprobante: string;
  tipo: 'VENTA' | 'SERVICIO';
  fecha: string;
  clienteNombre: string | null;
  total: number;
  estado: string;
  metodoPago: string;
  estadoSunat?: string;
}
```

**Template debe mostrar:**
- Tabs o select: "Todos / Ventas / Servicios"
- Filtros: rango de fechas
- Tabla: N° comprobante, Fecha, Tipo, Cliente, Total, Estado
- Paginación infinite scroll (igual que lote-list)
- Por fila: botón "Ver detalle", botón "Descargar PDF"

---

### 2.3 — Venta: Catálogo ❌

**Archivo:** `src/app/features/venta/pages/catalogo/catalogo.component.html`

**Template debe mostrar:**
- Barra de búsqueda con debounce
- Badge del carrito (cantidad de items) en la esquina
- Grid de tarjetas de productos:
  - Imagen del producto (o ícono)
  - Nombre, precio, unidad de medida
  - Stock disponible
  - Botón "Agregar" o `+` / `-` si ya está en carrito
- Indicador de carga (infinite scroll)
- Botón flotante "Ir al carrito" cuando `carrito.count() > 0`
- FlowHeader mostrando el paso actual (Paso 1: Catálogo)

---

### 2.4 — Venta: Flow Header ❌

**Archivo:** `src/app/features/venta/components/flow-header/flow-header.component.html`

**Template:**
```html
<!-- Barra de progreso con 4 o 5 pasos -->
<div class="flow-header">
  <div class="step" [class.active]="paso >= 1" [class.done]="paso > 1">Catálogo</div>
  <div class="divider"></div>
  <div class="step" [class.active]="paso >= 2" [class.done]="paso > 2">Carrito</div>
  <div class="divider"></div>
  <div class="step" [class.active]="paso >= 3" [class.done]="paso > 3">Resumen</div>
  @if (tieneSunat()) {
    <div class="divider"></div>
    <div class="step" [class.active]="paso >= 4" [class.done]="paso > 4">SUNAT</div>
  }
  <div class="divider"></div>
  <div class="step" [class.active]="paso >= 5">Comprobante</div>
</div>
```

**Input necesario en `.ts`:**
```typescript
readonly paso = input.required<number>();       // 1..5
readonly tieneSunat = input<boolean>(false);
```

---

### 2.5 — Venta: Cliente Search ❌

**Archivo:** `src/app/features/venta/components/cliente-search/cliente-search.component.html`

Este es un autocomplete. Debe tener:
- Input de texto con debounce (300ms)
- Spinner mientras busca
- Lista desplegable de clientes coincidentes (nombre + documento)
- Opción "Crear nuevo cliente" al final de la lista
- Al seleccionar, emite el `clienteId` al componente padre

**Método que llama internamente:**
```typescript
// Ya existe en VentaRepository:
async getClientes(tiendaId: number, search?: string): Promise<ClienteModel[]>
```

**Inputs/Outputs del componente:**
```typescript
readonly tiendaId = input.required<number>();
readonly clienteSeleccionado = output<ClienteModel | null>();
```

---

### 2.6 — Venta: Carrito ❌

**Archivo:** `src/app/features/venta/pages/carrito/carrito.component.html`

**Template debe mostrar:**
- FlowHeader (paso 2)
- Mensaje "Carrito vacío" si no hay items
- Tabla / lista de items:
  - Nombre del producto
  - Input numérico para cantidad (editable)
  - Input numérico para precio (editable)
  - Subtotal calculado
  - Checkbox "¿Averiado?"
  - Botón eliminar `✕`
- Total del carrito (grande, sticky al fondo)
- Botón "Volver al catálogo" (atrás)
- Botón "Confirmar carrito" → navegar a `/ventas/resumen`

---

### 2.7 — Venta: Resumen ❌

**Archivo:** `src/app/features/venta/pages/resumen/resumen.component.html`

**Template debe mostrar:**
- FlowHeader (paso 3)
- Select "Tipo de venta": NORMAL / CRÉDITO / SUNAT
- Select "Método de pago": EFECTIVO / YAPE / PLIN / TRANSFERENCIA / TARJETA / OTRO
- **Si tipo = SUNAT:**
  - Select "Tipo comprobante": Boleta (03) / Factura (01)
  - ClienteSearch (autocomplete)
  - O formulario de datos manuales (nombre, tipo doc, N° doc, teléfono, email, dirección)
- **Si tipo = CRÉDITO:**
  - ClienteSearch (autocomplete)
- Resumen del carrito (solo lectura): items y total
- Errores de validación en rojo
- Botón "Volver" y botón "Confirmar venta"
- Loading spinner mientras se crea la venta

---

### 2.8 — Venta: Propuesta SUNAT ❌

**Archivo:** `src/app/features/venta/pages/propuesta-sunat/propuesta-sunat.component.html`

**Template debe mostrar:**
- FlowHeader (paso 4)
- Badge de estado SUNAT (colores por estado: pendiente, aceptado, rechazado)
- Datos de la propuesta: número, serie, correlativo
- Tabla de items del comprobante (con IGV desglosado)
- Mensaje/respuesta de SUNAT (CDR)
- Botón "Confirmar propuesta" → llama `VentaService.confirmarSunat()`
- Botón "Volver" (si aún no confirmó)
- Loading durante confirmación

---

### 2.9 — Venta: Comprobante ❌

**Archivo:** `src/app/features/venta/pages/comprobante/comprobante.component.html`

**Template debe mostrar:**
- FlowHeader (paso 5)
- Número de comprobante completo
- Datos del cliente (si aplica)
- Tabla de items vendidos
- Total, método de pago, fecha
- Estado SUNAT (si era SUNAT)
- Botones:
  - "Imprimir ticket" → `ImpresoraService.imprimirTicket()`
  - "Descargar PDF" → `VentaRepository.descargarTicketPdf()`
  - "Nueva venta" → limpia carrito y navega a `/ventas`
  - "Emitir nota de crédito" (si el comprobante lo permite)

**Métodos faltantes en VentaService y Repository:**
```typescript
// VentaRepository: ❌ NO EXISTE
async descargarTicketPdf(numeroComprobante: string): Promise<Blob>
  // GET /sales/ventas/{numero}/ticket/  →  responseType: 'blob'

// VentaService: ❌ NO EXISTE
async descargarTicketPdf(): Promise<void>
  // Obtiene el Blob y lo abre en nueva pestaña con URL.createObjectURL()
```

---

### 2.10 — Servicio: Servicio Flow Header ❌

**Archivo:** `src/app/features/servicio/components/servicio-flow-header/servicio-flow-header.component.html`

Igual al de venta pero con 3 pasos: Formulario → Resumen → Comprobante.

```typescript
readonly paso = input.required<1 | 2 | 3>();
```

---

### 2.11 — Servicio: Formulario ❌

**Archivo:** `src/app/features/servicio/pages/formulario/formulario.component.html`

**Necesita `servicio.validators.ts` (ver sección 4).**

**Template debe mostrar:**
- ServicioFlowHeader (paso 1)
- Input "Descripción" (textarea)
- Date picker "Fecha de inicio"
- Date picker "Fecha de fin"
- Input numérico "Total (S/.)"
- Botón "Siguiente" → navega a `/servicios/resumen`

**Los datos se guardan en `ServicioFormService` entre pasos.**

---

### 2.12 — Servicio: Resumen ❌

**Archivo:** `src/app/features/servicio/pages/resumen/resumen.component.html`

**Template debe mostrar:**
- ServicioFlowHeader (paso 2)
- Select "Tipo de servicio": NORMAL / CRÉDITO / SUNAT
- Select "Método de pago"
- **Si SUNAT:** tipo comprobante + ClienteSearch
- **Si CRÉDITO:** ClienteSearch
- Resumen del formulario (descripción, fechas, total) — solo lectura
- Botón "Volver" y botón "Confirmar"
- Loading durante el POST

**Los datos del resumen se guardan en `ResumenServicioService` entre pasos.**

---

### 2.13 — Servicio: Comprobante ❌

**Archivo:** `src/app/features/servicio/pages/comprobante/comprobante.component.html`

**Template debe mostrar:**
- ServicioFlowHeader (paso 3)
- Número de comprobante
- Descripción del servicio
- Fechas y total
- Estado SUNAT (si aplica)
- Botones: "Imprimir", "Descargar PDF", "Nuevo servicio"
- Botón "Emitir nota de crédito" con modal:
  - Tipo: Anulación total (01) o Disminución en valor (09)
  - Si tipo 09: campo "Nuevo precio"
  - Campo "Motivo"

**Métodos que deben existir y YA EXISTEN en el service:**
- `ServicioService.emitirNotaCredito()` ✅
- `ServicioService.anularServicio()` ✅

**Método faltante:**
```typescript
// ServicioRepository: ❌ verificar si existe
async descargarTicketPdf(numeroComprobante: string): Promise<Blob>
  // GET /services/servicio/{numero}/ticket/  →  responseType: 'blob'
```

---

### 2.14 — Finanzas: Hub ❌

**Archivo:** `src/app/features/finanzas/pages/finanzas-hub/finanzas-hub.component.html`

**Template debe mostrar:**
- Grid de tarjetas de acceso a cada sub-módulo:
  - Resumen de Caja → `/finanzas/caja/resumen`
  - Cerrar Caja → `/finanzas/caja/cierre`
  - Deudas → `/finanzas/deudas`
  - Gastos → `/finanzas/gastos` (solo dueño)
- Resumen numérico rápido: ventas del día, efectivo esperado

---

### 2.15 — Finanzas: Resumen de Caja ❌

**Archivo:** `src/app/features/finanzas/pages/caja-resumen/caja-resumen.component.html`

**Lógica en `.ts`:** llamar `finanzasService.cargarCajaResumen()` en `ngOnInit`.

**Template debe mostrar:**
- Total ventas del día (por tipo: normal, crédito, SUNAT)
- Desglose por método de pago (efectivo, Yape, transferencia…)
- Total servicios del día
- Efectivo esperado en caja
- Botón "Cerrar caja" → navega a `/finanzas/caja/cierre`

---

### 2.16 — Finanzas: Cierre de Caja ❌

**Archivo:** `src/app/features/finanzas/pages/caja-cierre/caja-cierre.component.html`

**Lógica en `.ts`:** llamar `finanzasService.cerrarCaja(montoReal, observaciones)`.

**Template debe mostrar:**
- Resumen de lo esperado (traído de `cargarCajaResumen`)
- Input "Monto real contado (S/.)"
- Textarea "Observaciones"
- Diferencia calculada = esperado − real (en rojo si negativa)
- Botón "Cerrar caja" con confirmación
- Loading durante el POST

---

### 2.17 — Finanzas: Deudas ❌

**Archivo:** `src/app/features/finanzas/pages/deudas/deudas.component.html`

**Lógica en `.ts`:**
- `ngOnInit`: cargar deudas pendientes
- Modo búsqueda: por número de comprobante (`buscarDeudasPorComprobante`) o por documento del cliente (`buscarDeudasPorDocumento`)

**Template debe mostrar:**
- Tabs: "Buscar por comprobante" / "Buscar por documento"
- Input de búsqueda + botón buscar
- Lista de deudas usando `<app-deuda-card>` por cada una:
  - Nombre del cliente
  - Número de comprobante
  - Monto total / monto pagado / monto pendiente
  - Estado (PENDIENTE / PARCIAL / PAGADO)
  - Botón "Registrar pago"
- Modal/panel al hacer "Registrar pago":
  - Input "Monto a pagar"
  - Botón confirmar → llama `finanzasService.registrarPago()`
  - Muestra/descarga PDF del recibo generado

---

### 2.18 — Finanzas: DeudaCard ❌

**Archivo:** `src/app/features/finanzas/components/deuda-card/deuda-card.component.html`

Componente reutilizable que muestra una deuda individual.

**Inputs:**
```typescript
readonly deuda = input.required<DeudaModel>();
readonly onPagar = output<DeudaModel>();
```

**Template:**
```html
<div class="deuda-card" [class]="'estado--' + deuda().estado">
  <p class="cliente">{{ deuda().clienteNombre }}</p>
  <p class="comprobante">{{ deuda().numeroComprobante }}</p>
  <div class="montos">
    <span>Total: {{ deuda().montoTotal | currency:'PEN':'S/ ' }}</span>
    <span>Pagado: {{ deuda().montoPagado | currency:'PEN':'S/ ' }}</span>
    <span class="pendiente">Pendiente: {{ deuda().montoPendiente | currency:'PEN':'S/ ' }}</span>
  </div>
  <span class="badge" [class]="'badge--' + deuda().estado">{{ deuda().estado }}</span>
  @if (deuda().estado !== 'PAGADO') {
    <button (click)="onPagar.emit(deuda())">Registrar pago</button>
  }
</div>
```

---

### 2.19 — Finanzas: Pago Resumen ❌

**Archivo:** `src/app/features/finanzas/pages/pago-resumen/pago-resumen.component.html`

En Flutter esta página recibía la deuda y el monto ya registrado via `state.extra`. En Angular el router no pasa datos de esa manera por defecto.

**Solución:** Usar un `PagoPdfService` (ver sección 3.3) para pasar el PDF entre páginas.

**Template debe mostrar:**
- Datos de la deuda pagada
- Monto registrado
- Botón "Ver recibo PDF" → abre el Blob guardado en PagoPdfService
- Botón "Descargar PDF"
- Botón "Volver a deudas"

---

### 2.20 — Finanzas: Gastos ❌

**Archivo:** `src/app/features/finanzas/pages/gastos/gastos.component.html`

**Lógica en `.ts`:** tabs para Gastos Fijos y Gastos Variables. Selector de mes/año.

**Template debe mostrar:**
- Selector de mes y año (dropdowns)
- Tabs: "Gastos Fijos" / "Gastos Variables"
- **Tab Gastos Fijos:**
  - Tabla con tipos de gasto y monto del mes
  - Botón "Agregar gasto fijo" → modal con select de tipo y monto
  - Total de gastos fijos
  - Botón "Cerrar mes" (si el mes no está cerrado)
- **Tab Gastos Variables:**
  - Tabla con descripción, monto, fecha
  - Botón "Agregar gasto variable" → modal con descripción, monto, fecha
  - Total de gastos variables

---

### 2.21 — Impresora: Config ❌

**Archivo:** `src/app/features/impresora/impresora-config/impresora-config.component.html`

**Template debe mostrar:**
- Radio buttons: "WiFi (TCP)" / "USB/CUPS"
- **Si WiFi:**
  - Input "Dirección IP" (ej: 192.168.1.100)
  - Input "Puerto" (default 9100)
- Estado actual de configuración guardada
- Botón "Probar conexión" → llama `probarConexion()`, muestra ✅ o ❌
- Botón "Guardar configuración"
- Botón "Limpiar configuración"

---

### 2.22 — Onboarding: Completar Perfil ❌

**Archivo:** `src/app/features/onboarding/profile-complete/profile-complete.component.html`

**Lógica en `.ts`:**
```typescript
form = new FormGroup({
  firstName: new FormControl('', [Validators.required, Validators.minLength(2)]),
  lastName:  new FormControl('', [Validators.required, Validators.minLength(2)]),
});

async submit(): Promise<void> {
  if (this.form.invalid) return;
  await this.onboardingService.completarPerfil(
    this.form.value.firstName!,
    this.form.value.lastName!,
  );
  this.router.navigate(['/home']);
}
```

**Template:** Formulario simple con dos campos y botón guardar.

---

### 2.23 — Onboarding: Setup (Crear empresa) ❌

**Archivo:** `src/app/features/onboarding/setup/setup.component.html`

**Lógica en `.ts`:** wizard de 3 pasos con `currentStep = signal(0)`.

**Template:**
- Paso 0: Bienvenida + explicación + botón "Empezar"
- Paso 1: Formulario empresa (nombre, RUC con validación de 11 dígitos)
- Paso 2: Confirmación de datos + botón "Crear empresa"
- Loading durante el POST
- Botones "Atrás" / "Siguiente" / "Crear"

---

### 2.24 — Invitation: Formulario ❌

**Archivo:** `src/app/features/invitation/pages/invitation-form/invitation-form.component.html`

**Lógica en `.ts`:**
```typescript
ngOnInit() {
  this.invitationService.cargarRolesYTiendas();
}
async enviar() {
  await this.invitationService.crearInvitacion(email, rol, tiendaId, salario);
  // Muestra el link generado con opción de copiarlo
}
```

**Template:**
- Input "Email del invitado"
- Select "Rol" (cargado desde `InvitationService.state().roles`)
- Select "Tienda" (si hay más de una)
- Input "Salario (opcional)"
- Botón "Enviar invitación"
- Si `state().invitationLink`: mostrar el link con botón "Copiar"

---

### 2.25 — Invitation: Aceptar ❌

**Archivo:** `src/app/features/invitation/pages/invitation-accept/invitation-accept.component.html`

**Lógica en `.ts`:**
```typescript
ngOnInit() {
  const token = this.route.snapshot.queryParamMap.get('token');
  if (!token) { /* mostrar error */ return; }
  // NO llamar al service todavía, esperar que el usuario llene los datos
}
async completarRegistro() {
  const ok = await this.invitationService.aceptarInvitacion(
    this.token, this.firstName, this.lastName, this.password
  );
  if (ok) this.router.navigate(['/login']);
}
```

**Template:**
- Mensaje de bienvenida: "Fuiste invitado a unirte"
- Si `token` inválido: mensaje de error
- Formulario:
  - Input "Nombre"
  - Input "Apellido"
  - Input "Contraseña"
  - Input "Confirmar contraseña"
- Botón "Crear cuenta"
- Loading durante el POST
- Éxito: "Cuenta creada. Ya puedes iniciar sesión" + link a `/login`

---

### 2.26 — Store Selector (Completar lógica) ⚠️

**Archivo:** `src/app/features/auth/store-selector/store-selector.component.ts`

El template **ya existe inline** y funciona. Sin embargo, le falta mostrar:
- El rol del usuario debajo de cada tienda (como en Flutter)
- Loading state si las tiendas todavía no cargaron

```typescript
// Agregar en el componente:
readonly userRol = computed(() => this.auth.userMe()?.rol ?? '');
```

---

## 3. Lógica Faltante en Services/Repositories

### 3.1 — VentaService y VentaRepository: Listar ventas ❌

Para la página de historial de operaciones se necesita poder listar ventas creadas.

**Agregar en `venta.repository.ts`:**
```typescript
async getVentas(tiendaId: number, filters?: {
  cursor?: string;
  tipo?: string;
  estadoSunat?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  search?: string;
}): Promise<{ items: VentaReadModel[], nextCursor: string | null }> {
  const params: Record<string, string> = { tienda: String(tiendaId) };
  // aplicar filtros...
  const data = await firstValueFrom(
    this.http.get<unknown>(`${this.base}sales/ventas/`, { params })
  );
  // manejar resultados paginados con cursor
}

async descargarTicketPdf(numeroComprobante: string): Promise<Blob> {
  return firstValueFrom(
    this.http.get(`${this.base}sales/ventas/${numeroComprobante}/ticket/`, {
      responseType: 'blob',
    })
  );
}
```

**Agregar en `venta.service.ts`:**
```typescript
async cargarVentas(filtros?: {...}): Promise<void>
async cargarMasVentas(): Promise<void>
async descargarTicketPdf(): Promise<void>  // abre el blob en nueva pestaña
```

---

### 3.2 — ServicioService: Listar servicios ❌

`ServicioRepository.getServicios()` YA EXISTE. Solo falta exponer el listado desde el service con estado signal para la página de historial.

**Agregar en `servicio.service.ts`:**
```typescript
// Estado para el historial (paginación separada del flujo de creación)
private readonly _historial = signal<{
  servicios: ServicioReadModel[];
  nextCursor: string | null;
  isLoading: boolean;
}>({ servicios: [], nextCursor: null, isLoading: false });

readonly historial = this._historial.asReadonly();

async cargarServicios(filtros?: {
  tipo?: string;
  estadoSunat?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  search?: string;
}): Promise<void>

async cargarMasServicios(): Promise<void>
```

---

### 3.3 — PagoPdfService ❌

En Flutter el PDF del pago se guardaba en un `pagoPdfProvider` para pasarlo a la pantalla de confirmación. En Angular falta este servicio puente.

**Crear `src/app/features/finanzas/pago-pdf.service.ts`:**
```typescript
@Injectable({ providedIn: 'root' })
export class PagoPdfService {
  private readonly _blob = signal<Blob | null>(null);
  readonly blob = this._blob.asReadonly();

  guardar(blob: Blob): void {
    this._blob.set(blob);
    // Abrir en nueva pestaña automáticamente
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 15_000);
  }

  limpiar(): void { this._blob.set(null); }
}
```

**Modificar `finanzas.service.ts`:** después de `registrarPago()`, llamar `pagoPdfService.guardar(blob)` y navegar a `/finanzas/pago-resumen`.

---

### 3.4 — Métodos de Impresora ❌

**Agregar en `impresora.service.ts`:**
```typescript
async probarConexion(): Promise<boolean> {
  const cfg = this.config();
  try {
    const resp = await fetch('http://localhost:3000/test-printer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: cfg.ip, puerto: cfg.puerto }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

async imprimirTicket(contenidoEscPos: string): Promise<void> {
  const cfg = this.config();
  await fetch('http://localhost:3000/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ip: cfg.ip,
      puerto: cfg.puerto,
      contenido: contenidoEscPos,
    }),
  });
}
```

---

### 3.5 — Listeners reactivos en Usuarios y Asistencia ❌

En Flutter, cuando el dueño cambia de tienda activa, los módulos de Usuarios y Asistencia recargaban automáticamente sus datos. En Angular ninguno de los dos tiene ese comportamiento.

**Agregar en `usuarios.component.ts`:**
```typescript
private readonly auth = inject(AuthService);
private readonly svc = inject(UsuariosService);

constructor() {
  // Effect que se dispara cuando cambia la tienda seleccionada
  effect(() => {
    this.auth.selectedTiendaId(); // lectura reactiva
    this.svc.cargarUsuarios();
  });
}
```

**Mismo patrón en `asistencia.component.ts`:**
```typescript
effect(() => {
  this.auth.selectedTiendaId();
  this.svc.cargarAsistenciasHoy();
});
```

---

## 4. Validadores Faltantes

### 4.1 — Tienda (`tienda.validators.ts`) ❌

**Crear `src/app/features/tienda/validators/tienda.validators.ts`:**
```typescript
export function nombreSedeValidator(): ValidatorFn {
  return ctrl => ctrl.value?.trim().length >= 3 ? null : { minLength: 'Mínimo 3 caracteres' };
}

export function ubigeoValidator(): ValidatorFn {
  return ctrl => /^\d{6}$/.test(ctrl.value ?? '') ? null
    : { formatoUbigeo: 'El ubigeo debe tener exactamente 6 dígitos numéricos (código INEI)' };
}

export function serieValidator(): ValidatorFn {
  // Formato: letra + 3 dígitos. Ej: F001, B001, T001
  return ctrl => /^[A-Z]\d{3}$/.test(ctrl.value ?? '') ? null
    : { formatoSerie: 'Formato inválido. Ejemplo: F001, B001, T001' };
}
```

---

### 4.2 — Servicio (`servicio.validators.ts`) ❌

**Crear `src/app/features/servicio/validators/servicio.validators.ts`:**
```typescript
export function servicioFormGroupValidator(group: AbstractControl): ValidationErrors | null {
  const tipo     = group.get('tipoServicio')?.value ?? 'NORMAL';
  const clienteId = group.get('clienteId')?.value;

  if ((tipo === 'CREDITO' || tipo === 'SUNAT') && !clienteId) {
    return { clienteRequerido: 'Se requiere un cliente para este tipo de servicio' };
  }
  return null;
}

export function fechaFinValidator(fechaInicioControl: AbstractControl): ValidatorFn {
  return ctrl => {
    const inicio = new Date(fechaInicioControl.value);
    const fin    = new Date(ctrl.value);
    return !ctrl.value || fin >= inicio ? null
      : { fechaFinAnterior: 'La fecha de fin no puede ser anterior a la de inicio' };
  };
}

export function totalPositivoValidator(): ValidatorFn {
  return ctrl => {
    const val = parseFloat(ctrl.value ?? '0');
    return val > 0 ? null : { totalInvalido: 'El total debe ser mayor a 0' };
  };
}
```

---

### 4.3 — Finanzas (`finanzas.validators.ts`) ❌

**Crear `src/app/features/finanzas/validators/finanzas.validators.ts`:**
```typescript
export function montoPositivoValidator(): ValidatorFn {
  return ctrl => parseFloat(ctrl.value ?? '0') > 0 ? null
    : { montoInvalido: 'El monto debe ser mayor a 0' };
}

export function montoNoNegativoValidator(): ValidatorFn {
  return ctrl => parseFloat(ctrl.value ?? '0') >= 0 ? null
    : { montoNegativo: 'El monto no puede ser negativo' };
}
```

---

## 5. Impresora: Bridge HTTP

El principal reto de la impresora en web es que no existe acceso TCP directo desde el browser. La solución es un pequeño servidor local que corra en la máquina del negocio.

### 5.1 — Servidor Bridge (Node.js) ❌

**Crear archivo en la raíz del repo (o repositorio separado):** `printer-bridge/server.js`

```javascript
const express = require('express');
const net = require('net');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// POST /test-printer
app.post('/test-printer', (req, res) => {
  const { ip, puerto } = req.body;
  const client = new net.Socket();
  client.setTimeout(3000);
  client.connect(puerto, ip, () => {
    client.destroy();
    res.json({ success: true });
  });
  client.on('error', () => res.status(500).json({ success: false }));
  client.on('timeout', () => { client.destroy(); res.status(500).json({ success: false }); });
});

// POST /print
app.post('/print', (req, res) => {
  const { ip, puerto, contenido } = req.body;
  const client = new net.Socket();
  client.connect(puerto, ip, () => {
    client.write(contenido, 'binary', () => {
      client.destroy();
      res.json({ success: true });
    });
  });
  client.on('error', err => res.status(500).json({ success: false, error: err.message }));
});

app.listen(3000, () => console.log('Printer bridge running on http://localhost:3000'));
```

**Instalar con:** `npm install express cors`  
**Ejecutar con:** `node server.js`

---

### 5.2 — Integrar impresión en venta/servicio comprobante ❌

En los componentes de comprobante (venta y servicio), el botón "Imprimir ticket" debe:

```typescript
async imprimirTicket(): Promise<void> {
  const venta = this.ventaService.state().ventaCreada!;
  const tienda = this.tiendaService.tiendaActiva()!;

  const escPos = new TicketConverter().toEscPos({
    nombreTienda: tienda.nombreSede,
    ruc: tienda.ruc,
    items: venta.items.map(i => ({
      nombre: i.productoNombre,
      cantidad: i.cantidad,
      precio: i.precioVenta,
    })),
    total: venta.total,
    metodoPago: venta.metodoPago,
    fecha: new Date().toLocaleString('es-PE'),
  });

  await this.impresoraService.imprimirTicket(escPos);
}
```

---

## 6. Páginas Completamente Nuevas (No en el plan original)

### 6.1 — Historial de Servicios ❌

**Crear `src/app/features/servicio/pages/historial/historial.component.ts`**

La ruta en `app.routes.ts` debe ser `/servicios/historial`.

**Funcionalidad:**
- Listar servicios paginados (cursor-based, igual que lotes)
- Filtros: tipo, estado SUNAT, rango de fechas, búsqueda
- Por fila: ver detalle, descargar PDF, anular/eliminar (con confirmación)

---

## 7. Correcciones en lo Existente

### 7.1 — Roles en mayúsculas ⚠️

El CLAUDE.md especifica que los roles devueltos por la API son en mayúsculas: `DUENO`, `ADMINISTRADOR`, `TRABAJADOR`. Verificar que `auth.models.ts` y todas las comparaciones usen las mayúsculas correctas:

```typescript
// auth.models.ts — verificar que sea:
export const Roles = {
  dueno:         'DUENO',          // no 'dueno'
  administrador: 'ADMINISTRADOR',
  trabajador:    'TRABAJADOR',
} as const;
```

---

### 7.2 — `inviteBaseUrl` hardcodeado en UsuariosService ⚠️

En `usuarios.service.ts` línea 86-87 el URL base para invitaciones está hardcodeado:
```typescript
// ❌ ACTUAL (hardcodeado)
const inviteBaseUrl = environment.production
  ? 'https://tu-dominio.com/invite'
  : 'http://localhost:4200/invite';
```

Mover a `environment.ts`:
```typescript
// environment.ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://127.0.0.1:8000/api/',
  inviteBaseUrl: 'http://localhost:4200/invite',
};

// environment.prod.ts
export const environment = {
  production: true,
  apiBaseUrl: 'https://tu-dominio.com/api/',
  inviteBaseUrl: 'https://tu-dominio.com/invite',
};
```

---

### 7.3 — `StoreModel` — verificar campos completos ⚠️

Revisar que `src/app/core/models/store.model.ts` mapee todos los campos que devuelve la API. En particular:
- `nombreSede`
- `ruc`
- `ubigeo`
- `serieFactura`, `serieBoleta`, `serieTicket`
- `empresaId`
- `isActive`

---

## 8. Plan de Implementación por Semanas

| Semana | Tareas | Esfuerzo estimado |
|--------|--------|-------------------|
| **1** | MainShell (tienda activa, cambiar tienda, links sidebar) + TiendaService (tiendaActiva computed) | 4h |
| **1** | Home (template + carga paralela) | 3h |
| **2** | Venta: 5 templates + flow-header + cliente-search | 8h |
| **2** | VentaRepository/Service: getVentas, descargarTicketPdf | 2h |
| **3** | Operaciones: historial template + service + repository + model | 5h |
| **3** | Servicio: 4 templates + servicio.validators.ts | 4h |
| **4** | Finanzas: 7 templates + deuda-card + PagoPdfService | 8h |
| **4** | finanzas.validators.ts + corrección effects reactivos | 2h |
| **5** | Impresora: template + probarConexion/imprimirTicket + bridge server | 5h |
| **5** | Onboarding: 2 templates + lógica wizards | 3h |
| **6** | Invitation: 2 templates + lógica completa | 3h |
| **6** | Correcciones generales (roles, inviteBaseUrl, StoreModel) + tienda.validators.ts | 2h |
| **Total** | | **~49 horas** |

---

## Checklist Rápido

### Shell y Navegación
- [x] `tiendaActiva` computed en `TiendaService`
- [x] Tienda activa visible en sidebar
- [x] Botón "Cambiar tienda" (solo dueño multitienda)
- [x] Links Tiendas, Asistencia, Impresora en sidebar
- [x] `StoreSelectorComponent`: mostrar rol del usuario

### Effects / Reactivity
- [x] `UsuariosComponent`: recargar al cambiar tienda
- [x] `AsistenciaComponent`: recargar al cambiar tienda

### Templates HTML (26 faltantes)
- [x] `home.component.html`
- [x] `operaciones-historial.component.html`
- [x] `flow-header.component.html` (venta)
- [x] `cliente-search.component.html` (venta)
- [x] `catalogo.component.html` (venta)
- [x] `carrito.component.html` (venta)
- [x] `resumen.component.html` (venta)
- [x] `propuesta-sunat.component.html` (venta)
- [x] `comprobante.component.html` (venta)
- [x] `servicio-flow-header.component.html`
- [x] `formulario.component.html` (servicio)
- [x] `resumen.component.html` (servicio)
- [x] `comprobante.component.html` (servicio)
- [x] `finanzas-hub.component.html`
- [x] `caja-resumen.component.html`
- [x] `caja-cierre.component.html`
- [x] `deudas.component.html`
- [x] `deuda-card.component.html`
- [x] `pago-resumen.component.html`
- [x] `gastos.component.html`
- [x] `impresora-config.component.html`
- [x] `profile-complete.component.html`
- [x] `setup.component.html`
- [x] `invitation-form.component.html`
- [x] `invitation-accept.component.html`

### Lógica Services/Repositories
- [x] `VentaRepository.getVentas()` con paginación cursor
- [x] `VentaRepository.descargarTicketPdf()`
- [x] `VentaService.cargarVentas()` + `cargarMasVentas()`
- [x] `VentaService.descargarTicketPdf()`
- [x] `ServicioService.cargarServicios()` + `cargarMasServicios()`
- [x] `PagoPdfService` (nuevo)
- [x] `ImpresoraService.probarConexion()`
- [x] `ImpresoraService.imprimirTicket()`
- [x] `OperacionesService` + `OperacionesRepository` (nuevos)
- [x] `OperacionModel` (nuevo)

### Validadores
- [x] `tienda.validators.ts`
- [x] `servicio.validators.ts`
- [x] `finanzas.validators.ts`

### Páginas Nuevas
- [x] `servicio/pages/historial/historial.component.ts` + `.html`

### Impresora
- [x] Bridge HTTP server (`printer-bridge/server.js`)
- [x] Integrar botón "Imprimir" en `venta/comprobante`
- [x] Integrar botón "Imprimir" en `servicio/comprobante`

### Correcciones
- [x] Roles en mayúsculas en `auth.models.ts`
- [x] `inviteBaseUrl` en `environment.ts`
- [x] Verificar campos completos de `StoreModel`
