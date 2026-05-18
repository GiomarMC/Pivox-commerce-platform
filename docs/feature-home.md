# Feature: Home (Dashboard)

## 1. Resumen

Dashboard inicial post-login. Consume **tres services** para mostrar:
- **`FinanzasService.cajaResumen`** — KPIs del día (total, ventas, servicios, efectivo) + distribución de cobros + ventas vs servicios + contado vs crédito.
- **`CatalogoService.productos`** — alertas de stock (sin stock, críticos ≤ 5, bajo stock > 5 más bajos).
- **`HomeStatsService`** (propio del feature) — ranking de top/bottom productos + tendencia 7 días.
- **`FinanzasService.deudasDashboard`** — widget de deudas activas (count + saldo total).

Tiene acciones rápidas (links a venta, servicio, productos, lotes, caja, historial).

Ruta: `/home` (dentro del `MainShell`).

> **Nota**: la mayoría de los datos vienen de services de OTROS features. El único service propio de home es `HomeStatsService` para las estadísticas (top/bottom productos y tendencia).

---

## 2. Service: `HomeStatsService` (`home-stats.service.ts`)

### Modelos
```ts
interface ProductoRanking {
  nombre: string;
  cantidadVendida: number;
}

interface TendenciaDia {
  fecha: string;             // 'YYYY-MM-DD'
  totalVentas: number;
  totalServicios: number;
}

interface HomeStatsModel {
  numVentas: number;
  numServicios: number;
  ticketPromedio: number;
  topProductos: ProductoRanking[];
  bottomProductos: ProductoRanking[];
  tendencia: TendenciaDia[];
}
```

### State
```ts
interface HomeStatsState {
  isLoading: boolean;
  data: HomeStatsModel | null;
  disponible: boolean;     // se setea a true tras la primera carga exitosa
}
```

### Signals públicos
- `state` (readonly).
- **`periodoActual: signal<'dia' | 'semana' | 'mes'>`** (writable) — usado por el componente para cambiar período sin perder el último valor.

### Método: `cargarStats(periodo?: 'dia' | 'semana' | 'mes')`
1. Lee `auth.selectedTiendaId()`. Si null → no-op.
2. Si `periodo` no se pasa → usa `periodoActual()`.
3. Hace **dos requests en paralelo**:
   - GET `stats/resumen-diario/?tienda=<id>&periodo=<p>` → `ApiResumenDiario`.
   - GET `stats/tendencia/?tienda=<id>&dias=7` → `ApiTendenciaDia[]`.
4. Mapea snake_case → camelCase.
5. Set `state.data = {numVentas, numServicios, ticketPromedio, topProductos, bottomProductos, tendencia}`.
6. **Si falla** (cualquier endpoint) → `isLoading: false`, sin mensaje de error (silencioso).

### Mappers
- `productoRankingFromApi({nombre, cantidad_vendida})` → `{nombre, cantidadVendida: +cantidad_vendida}` (convierte a number).
- `tendenciaDiaFromApi({fecha, total_ventas, total_servicios})` → idem.

### Endpoints
| Método | Path                                                     | Response                              |
|--------|----------------------------------------------------------|---------------------------------------|
| GET    | `stats/resumen-diario/?tienda=<id>&periodo=<dia|semana|mes>` | `{num_ventas, num_servicios, ticket_promedio, top_productos: [...], bottom_productos: [...]}` |
| GET    | `stats/tendencia/?tienda=<id>&dias=7`                    | Array `[{fecha, total_ventas, total_servicios}]` |

---

## 3. Componentes de chart (`features/home/components/`)

Todos son **componentes presentacionales** que reciben data via `input()` y renderizan un gráfico con ApexCharts. NO consumen services directamente.

### `CobrosChartComponent`
- Input: `slices: { label, value, color, pct }[]`.
- Pie/donut chart de distribución por método de pago.

### `InventarioAlertasComponent`
- Inputs:
  - `sinStock: { nombre, cantidadDisponible, unidadMedida }[]` — productos con stock = 0.
  - `criticos: ...[]` — stock 1-5.
  - `bajoStock: ...[]` — top 6 productos con stock más bajo entre los que tienen > 5 unidades.
- Lista los productos con badges de severidad.

### `RankingsChartComponent`
- Input: `data: { top: ProductoRanking[], bottom: ProductoRanking[] } | null`.
- Bar chart horizontal de top 5 / bottom 5 productos vendidos.

### `VentasServiciosChartComponent`
- Inputs: `ventas: number`, `servicios: number`.
- Donut comparando ambos.

### `ContadoCreditoChartComponent`
- Inputs: `contado: number`, `credito: number`.
- Donut comparando.

### `DeudasWidgetComponent`
- Inputs: `total: number`, `count: number`, `isLoading: boolean`.
- Widget simple con cifra grande y count.

### `TendenciaChartComponent`
- Input: `tendencia: TendenciaDia[]`.
- Line chart 7 días con dos series (ventas/servicios).

---

## 4. `HomeComponent` (`/home`)

### Signals/state consumidos
- `auth.userMe` — para greeting.
- `fin = FinanzasService` — para `cajaResumen` y `deudasDashboard`.
- `cat = CatalogoService` — para `productos`.
- `stats = HomeStatsService` — para `data` (rankings y tendencia).

### State local
- `periodo: signal<'dia' | 'semana' | 'mes'>` (default `'dia'`).

### Carga inicial (`ngOnInit`)
- `fin.cargarCajaResumen()`.
- `cat.cargarCatalogo()`.
- `fin.cargarDeudasDashboard()`.
- **`stats.cargarStats` NO se llama acá** — se dispara desde un `effect` en el constructor (porque depende del `periodo` signal).

### Effect (en constructor)
```ts
effect(() => {
  const p = this.periodo();
  untracked(() => void this.stats.cargarStats(p));
});
```
Re-dispara la carga de stats cuando cambia el período.

### Computeds del componente

#### Alertas de inventario
- **`prodSinStock`**: productos activos con `cantidadDisponible === 0`.
- **`prodCriticos`**: 1 ≤ `cantidadDisponible` ≤ 5. Ordenados ascendente.
- **`prodBajoStock`**: `> 5` unidades, ordenados ascendente, **top 6**. Para que siempre haya algo que mostrar incluso sin problemas reales.

#### Cobros (paymentSlices)
- Lee `cajaResumen`. Devuelve array con los 6 métodos (efectivo, yape, tarjeta, plin, crédito, transferencia) con sus colores hex. Filtra los > 0 y calcula `pct` sobre el total.
- Colores: efectivo `#16A34A`, yape `#7C3AED`, tarjeta `#0284C7`, plin `#D97706`, crédito `#DC2626`, transferencia `#6B7280`.

#### `ventasVsServicios`
- `{ ventas, servicios }` desde `cajaResumen.resumenVentas?.totalGeneral` y `.resumenServicios`.

#### `contadoCredito`
- `{ contado: +totalContado, credito: +totalCredito }`.

#### `rankingsData`
- Si `stats.data` → `{ top: topProductos, bottom: bottomProductos }`. Sino `null`.

#### `tendenciaData`
- `stats.data?.tendencia ?? []`.

#### `totalDeudas`
- Reduce sobre `fin.deudasDashboard`: `{ total: sum(saldos), count: length }`.

### Display getters
- **`greetLabel`**: `Buenos días` (< 12h), `Buenas tardes` (< 18h), `Buenas noches`.
- **`todayLabel`**: `toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })`.

### Acciones de la UI
- **Period toggle** (`periodo.set('dia' | 'semana' | 'mes')`): dispara el effect → recarga `stats.cargarStats`.
- **Links rápidos**: `routerLink` a `/ventas`, `/servicios`, `/inventario/productos`, `/inventario/lotes`, `/finanzas/caja/resumen`, `/operaciones/historial`.

### Edge cases
- **Sin caja del día**: `cajaResumen` es null → muestra empty state ("Caja no iniciada hoy") con link a finanzas.
- **Sin stats**: `stats.data` null → empty state en rankings y tendencia.
- **Si stats falla silenciosamente**: el effect re-intenta cada vez que cambia período, pero un fallo aislado deja la UI sin datos sin mensaje de error.
- **Período se aplica solo a rankings**: `tendencia` siempre es de 7 días (parámetro `dias=7` hardcoded en el service).

---

## 5. Notas para el rediseño

### NO tocar
- `HomeStatsService` — state shape, `periodoActual` signal, los dos endpoints (`stats/resumen-diario`, `stats/tendencia`).
- Los **computed** del `HomeComponent` que derivan datos de los 4 services. Son la traducción del modelo de dominio al de presentación.
- La regla de **`prodBajoStock` top 6** (UX: siempre mostrar algo).
- Los colores de cada método de pago — son consistentes con `feature-finanzas` y otros lugares del sistema.

### Reorganizable
- Los **7 chart components** son ApexCharts wrappers. Si vas a cambiar de librería de charts, hazlo componente por componente respetando inputs/outputs.
- El `HomeComponent` es presentacional — todo el rediseño visual se hace acá.
- Los KPI cards del header podrían extraerse a un `KpiCardComponent` reutilizable.
- Las acciones rápidas pueden ser un componente con array de configuración.

### Dependencias cruzadas
- **`FinanzasService`**: cajaResumen + deudasDashboard.
- **`CatalogoService`** (feature-inventario): productos del catálogo.
- **`AuthService`**: userMe + selectedTiendaId.
- **Charts**: ApexCharts (paquete `apexcharts` en `package.json`).

### Edge cases conocidos
- **`tendencia` hardcoded a 7 días**: si rediseñas para mostrar más días, agregar parámetro al service.
- **`periodo` re-dispara stats pero NO finanzas**: el resumen de caja siempre es del día actual. Cuidado al cambiar período si esperas que afecte los KPI.
- **`untracked` en el effect**: previene que la llamada al service re-cree dependencias del effect (evita loops infinitos).
- **Carga de catálogo completa**: `cat.cargarCatalogo()` trae los primeros 20 productos. Las alertas de stock solo consideran esos 20. Si la tienda tiene muchos productos, las alertas son parciales. Considerar un endpoint dedicado de alertas en el backend.

### Comportamiento esperado
- Los 4 cargas iniciales (`cajaResumen`, `catalogo`, `deudasDashboard`, `stats`) **no esperan unos a otros** — todas las llamadas se disparan en paralelo y la UI muestra skeletons hasta que cada una termina.
- El cambio de período recarga **solo stats**. Los demás KPI siguen mostrando datos del día.
