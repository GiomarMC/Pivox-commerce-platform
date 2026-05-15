import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { InventarioRepository } from './inventario.repository';
import { ProductoCatalogoModel } from './models/producto.model';

interface CatalogoState {
  isLoading: boolean;
  isLoadingMore: boolean;
  errorMessage: string | null;
  productos: ProductoCatalogoModel[];
  nextCursor: string | null;
  hasMore: boolean;
  searchQuery: string;
}

const INITIAL: CatalogoState = {
  isLoading: false,
  isLoadingMore: false,
  errorMessage: null,
  productos: [],
  nextCursor: null,
  hasMore: false,
  searchQuery: '',
};

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly repo = inject(InventarioRepository);
  private readonly auth = inject(AuthService);

  private readonly _state = signal<CatalogoState>(INITIAL);
  readonly state = this._state.asReadonly();

  async cargarCatalogo(search?: string): Promise<void> {
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) {
      this._state.update(s => ({ ...s, productos: [], errorMessage: 'No hay tienda seleccionada' }));
      return;
    }
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null, searchQuery: search ?? '' }));
    try {
      const result = await this.repo.getCatalogo(tiendaId, { search });
      this._state.update(s => ({
        ...s,
        isLoading: false,
        productos: result.results,
        nextCursor: result.nextCursor,
        hasMore: result.nextCursor != null,
      }));
    } catch (err) {
      this._state.update(s => ({ ...s, isLoading: false, errorMessage: (err as Error).message }));
    }
  }

  async cargarMasCatalogo(): Promise<void> {
    const st = this._state();
    if (st.isLoadingMore || !st.hasMore) return;
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) return;

    this._state.update(s => ({ ...s, isLoadingMore: true }));
    try {
      const result = await this.repo.getCatalogo(tiendaId, {
        cursor: st.nextCursor ?? undefined,
        search: st.searchQuery || undefined,
      });
      this._state.update(s => ({
        ...s,
        isLoadingMore: false,
        productos: [...s.productos, ...result.results],
        nextCursor: result.nextCursor,
        hasMore: result.nextCursor != null,
      }));
    } catch {
      this._state.update(s => ({ ...s, isLoadingMore: false }));
    }
  }

  clearMessages(): void {
    this._state.update(s => ({ ...s, errorMessage: null }));
  }
}
