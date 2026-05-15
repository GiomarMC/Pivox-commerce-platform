import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface NotifItem {
  tipo: 'sin-stock' | 'stock-bajo' | 'deuda';
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
  private readonly api = environment.apiBaseUrl;

  private readonly _state = signal<NotifState>({
    items: [], isLoading: false, error: null, cargado: false,
  });
  readonly state = this._state.asReadonly();
  readonly count = computed(() => this._state().items.length);

  async cargar(tiendaId?: number): Promise<void> {
    if (this._state().isLoading) return;
    this._state.update(s => ({ ...s, isLoading: true, error: null }));

    const tiendaQ = tiendaId ? `?tienda_id=${tiendaId}` : '';

    const [stockResult, deudasResult] = await Promise.allSettled([
      firstValueFrom(this.http.get<unknown>(`${this.api}inventory/stock/${tiendaQ}`)),
      firstValueFrom(this.http.get<unknown>(`${this.api}finances/deudas/?estado=ACTIVA&page_size=1`)),
    ]);

    const items: NotifItem[] = [];
    let hayError = false;

    if (stockResult.status === 'fulfilled') {
      for (const p of this.toArray(stockResult.value)) {
        const cant = parseFloat(String(p['cantidadDisponible'] ?? '0'));
        const nombre = String(p['productoNombre'] ?? p['nombre'] ?? 'Producto');
        if (cant <= 0) {
          items.push({ tipo: 'sin-stock', titulo: 'Sin stock', detalle: nombre, ruta: '/inventario' });
        } else if (cant <= 5) {
          items.push({ tipo: 'stock-bajo', titulo: 'Stock bajo', detalle: `${nombre} — ${cant} u.`, ruta: '/inventario' });
        }
      }
    } else { hayError = true; }

    if (deudasResult.status === 'fulfilled') {
      const deudasCount = this.toCount(deudasResult.value);
      if (deudasCount > 0) {
        items.push({ tipo: 'deuda', titulo: 'Créditos pendientes', detalle: `${deudasCount} deuda(s) activa(s)`, ruta: '/finanzas/deudas' });
      }
    } else { hayError = true; }

    const error = hayError ? 'Algunas alertas no se pudieron cargar' : null;
    this._state.set({ items, isLoading: false, error, cargado: true });
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
