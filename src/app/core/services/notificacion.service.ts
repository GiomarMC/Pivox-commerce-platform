import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

export interface NotifItem {
  tipo: 'sin-stock' | 'stock-bajo' | 'deuda' | 'cierre-mes';
  titulo: string;
  detalle: string;
  ruta: string;
}

interface NotifState {
  items: NotifItem[];
  isLoading: boolean;
  error: string | null;
  cargado: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly api = environment.apiBaseUrl;

  private readonly _state = signal<NotifState>({
    items: [], isLoading: false, error: null, cargado: false,
  });
  readonly state = this._state.asReadonly();
  readonly count = computed(() => this._state().items.length);

  async cargar(tiendaId?: number): Promise<void> {
    if (this._state().isLoading) return;
    this._state.update(s => ({ ...s, isLoading: true, error: null }));

    const hoy = new Date();
    const diasEnMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    // TEST: forzar ultimaSemana = true para probar la notificación de cierre de mes
    const ultimaSemana = (diasEnMes - hoy.getDate()) <= 7;

    const items: NotifItem[] = [];
    let hayError = false;
    const canViewDeudas = this.auth.canViewUsuarios();
    const esDueno = this.auth.isDueno();

    // — Stock y lotes: solo si hay tienda seleccionada —
    if (tiendaId != null) {
      const [stockResult, lotesResult] = await Promise.allSettled([
        firstValueFrom(this.http.get<unknown>(`${this.api}inventory/stock/?tienda=${tiendaId}`)),
        firstValueFrom(this.http.get<unknown>(`${this.api}inventory/lotes/?tienda=${tiendaId}&page_size=500`)),
      ]);

      // Construir mapa productoId → cantidadInicialTotal desde lotes activos
      const inicialMap = new Map<number, number>();
      if (lotesResult.status === 'fulfilled' && lotesResult.value != null) {
        for (const lote of this.toArray(lotesResult.value)) {
          if (!(lote['is_active'] as boolean)) continue;
          const productos = (lote['productos'] as Record<string, unknown>[] | undefined) ?? [];
          for (const p of productos) {
            const pid = p['producto'] as number;
            const ini = parseFloat(String(p['cantidad_inicial'] ?? '0'));
            if (!isNaN(ini)) inicialMap.set(pid, (inicialMap.get(pid) ?? 0) + ini);
          }
        }
      }

      if (stockResult.status === 'fulfilled') {
        for (const p of this.toArray(stockResult.value)) {
          const pid = p['producto_id'] as number;
          const cant = parseFloat(String(p['cantidad_disponible'] ?? '0'));
          const nombre = String(p['producto_nombre'] ?? p['nombre'] ?? 'Producto');
          const total = inicialMap.get(pid) ?? 0;
          const pct = total > 0 ? cant / total : null;

          if (cant <= 0) {
            items.push({ tipo: 'sin-stock', titulo: 'Sin stock', detalle: nombre, ruta: '/inventario' });
          } else if (pct !== null ? pct <= 0.10 : cant <= 20) {
            const label = pct !== null
              ? `${nombre} — ${Math.round(pct * 100)}% restante`
              : `${nombre} — ${cant} u.`;
            items.push({ tipo: 'stock-bajo', titulo: 'Stock bajo', detalle: label, ruta: '/inventario' });
          }
        }
      } else {
        console.warn('[Notificaciones] Stock falló:', (stockResult as PromiseRejectedResult).reason);
        hayError = true;
      }
    }

    // — Deudas (ADMINISTRADOR+) y cierre de mes (DUENO) —
    const [deudasResult, gastosResult] = await Promise.allSettled([
      canViewDeudas
        ? firstValueFrom(this.http.get<unknown>(`${this.api}finances/deudas/?estado=ACTIVA&page_size=1`))
        : Promise.resolve(null),
      ultimaSemana && tiendaId != null && esDueno
        ? firstValueFrom(this.http.get<unknown>(
            `${this.api}finances/gastos/resumen/?tienda_id=${tiendaId}&mes=${hoy.getMonth() + 1}&anio=${hoy.getFullYear()}`,
          ))
        : Promise.resolve(null),
    ]);

    if (canViewDeudas) {
      if (deudasResult.status === 'fulfilled' && deudasResult.value != null) {
        const count = this.toCount(deudasResult.value);
        if (count > 0)
          items.push({ tipo: 'deuda', titulo: 'Créditos pendientes', detalle: `${count} deuda(s) activa(s)`, ruta: '/finanzas/creditos' });
      } else if (deudasResult.status === 'rejected') {
        console.warn('[Notificaciones] Deudas falló:', (deudasResult as PromiseRejectedResult).reason);
        hayError = true;
      }
    }

    // — Cierre de mes (solo DUENO, últimos 7 días) —
    if (esDueno && ultimaSemana && gastosResult.status === 'fulfilled' && gastosResult.value != null) {
      const raw = gastosResult.value as Record<string, unknown>;
      if (!(raw['mes_cerrado'] as boolean)) {
        const totalStr = String(raw['total_general'] ?? '0');
        const hayGastos = parseFloat(totalStr) > 0;
        items.push({
          tipo: 'cierre-mes',
          titulo: 'Cierre de mes pendiente',
          detalle: hayGastos ? `S/ ${totalStr} en gastos registrados` : 'Sin gastos fijos registrados aún',
          ruta: '/finanzas/gastos',
        });
      }
    }

    this._state.set({ items, isLoading: false, error: hayError ? 'Algunas alertas no se pudieron cargar' : null, cargado: true });
  }

  dismiss(index: number): void {
    this._state.update(s => ({
      ...s,
      items: s.items.filter((_, i) => i !== index),
    }));
  }

  private toArray(res: unknown): Record<string, unknown>[] {
    if (Array.isArray(res)) return res as Record<string, unknown>[];
    if (res && typeof res === 'object' && 'results' in res)
      return (res as { results: Record<string, unknown>[] }).results;
    return [];
  }

  private toCount(res: unknown): number {
    if (res && typeof res === 'object' && 'count' in res) return (res as { count: number }).count;
    if (Array.isArray(res)) return res.length;
    return 0;
  }

  limpiar(): void {
    this._state.set({ items: [], isLoading: false, error: null, cargado: false });
  }
}
