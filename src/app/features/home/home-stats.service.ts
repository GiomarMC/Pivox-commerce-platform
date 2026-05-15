import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';

export interface ProductoRanking {
  nombre: string;
  cantidadVendida: number;
}

export interface TendenciaDia {
  fecha: string;
  totalVentas: number;
  totalServicios: number;
}

export interface HomeStatsModel {
  numVentas: number;
  numServicios: number;
  ticketPromedio: number;
  topProductos: ProductoRanking[];
  bottomProductos: ProductoRanking[];
  tendencia: TendenciaDia[];
}

export interface HomeStatsState {
  isLoading: boolean;
  data: HomeStatsModel | null;
  disponible: boolean;
}

// ── Interfaces crudas de la API (snake_case) ──────────────────────────────
interface ApiProductoRanking {
  nombre: string;
  cantidad_vendida: string;
}

interface ApiResumenDiario {
  num_ventas: number;
  num_servicios: number;
  ticket_promedio: string;
  top_productos: ApiProductoRanking[];
  bottom_productos: ApiProductoRanking[];
}

interface ApiTendenciaDia {
  fecha: string;
  total_ventas: string;
  total_servicios: string;
}

// ── Mappers API → modelo interno ─────────────────────────────────────────
function productoRankingFromApi(p: ApiProductoRanking): ProductoRanking {
  return { nombre: p.nombre, cantidadVendida: +p.cantidad_vendida };
}

function tendenciaDiaFromApi(t: ApiTendenciaDia): TendenciaDia {
  return {
    fecha:          t.fecha,
    totalVentas:    +t.total_ventas,
    totalServicios: +t.total_servicios,
  };
}

@Injectable({ providedIn: 'root' })
export class HomeStatsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = environment.apiBaseUrl;

  private readonly _state = signal<HomeStatsState>({
    isLoading: false,
    data: null,
    disponible: false,
  });

  readonly state = this._state.asReadonly();

  // Período activo — permite que otras partes de la app recarguen con el período actual
  readonly periodoActual = signal<'dia' | 'semana' | 'mes'>('dia');

  async cargarStats(periodo?: 'dia' | 'semana' | 'mes'): Promise<void> {
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) return;

    const p = periodo ?? this.periodoActual();
    if (periodo) this.periodoActual.set(periodo);

    this._state.update(s => ({ ...s, isLoading: true }));

    try {
      // Ambos endpoints en paralelo — una sola recarga actualiza todos los gráficos
      const [resumen, tendenciaRaw] = await Promise.all([
        firstValueFrom(
          this.http.get<ApiResumenDiario>(
            `${this.base}stats/resumen-diario/?tienda=${tiendaId}&periodo=${p}`,
          ),
        ),
        firstValueFrom(
          this.http.get<ApiTendenciaDia[]>(
            `${this.base}stats/tendencia/?tienda=${tiendaId}&dias=7`,
          ),
        ),
      ]);

      this._state.set({
        isLoading: false,
        disponible: true,
        data: {
          numVentas:      resumen.num_ventas,
          numServicios:   resumen.num_servicios,
          ticketPromedio: +resumen.ticket_promedio,
          topProductos:   resumen.top_productos.map(productoRankingFromApi),
          bottomProductos: resumen.bottom_productos.map(productoRankingFromApi),
          tendencia:      tendenciaRaw.map(tendenciaDiaFromApi),
        },
      });
    } catch {
      this._state.update(s => ({ ...s, isLoading: false }));
    }
  }
}
