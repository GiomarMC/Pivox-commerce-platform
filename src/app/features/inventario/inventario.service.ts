import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { InventarioRepository } from './inventario.repository';
import { LoteResponse, LoteCreateModel } from './models/lote.model';
import { ProductoModel, ProductoCatalogoModel } from './models/producto.model';
import { StockModel } from './models/stock.model';

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
  nextCursor: string | null;
  hasMore: boolean;
  catalogo: ProductoCatalogoModel[];
}

const INITIAL: InventarioState = {
  isLoading: false,
  isSaving: false,
  isLoadingMore: false,
  errorMessage: null,
  successMessage: null,
  lotes: [],
  stock: [],
  productos: [],
  loteDetalle: null,
  nextCursor: null,
  hasMore: false,
  catalogo: [],
};

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly repo = inject(InventarioRepository);
  private readonly auth = inject(AuthService);

  private readonly _state = signal<InventarioState>(INITIAL);
  readonly state = this._state.asReadonly();

  async cargarLotes(): Promise<void> {
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) {
      this._state.update(s => ({ ...s, lotes: [], errorMessage: 'No hay tienda seleccionada', nextCursor: null, hasMore: false }));
      return;
    }
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null }));
    try {
      const result = await this.repo.getLotes(tiendaId);
      this._state.update(s => ({
        ...s,
        isLoading: false,
        lotes: result.results,
        nextCursor: result.nextCursor,
        hasMore: result.nextCursor != null,
      }));
    } catch (err) {
      this._state.update(s => ({ ...s, isLoading: false, errorMessage: (err as Error).message }));
    }
  }

  async cargarMasLotes(): Promise<void> {
    const st = this._state();
    if (st.isLoadingMore || !st.hasMore) return;
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) return;

    this._state.update(s => ({ ...s, isLoadingMore: true }));
    try {
      const result = await this.repo.getLotes(tiendaId, st.nextCursor ?? undefined);
      this._state.update(s => ({
        ...s,
        isLoadingMore: false,
        lotes: [...s.lotes, ...result.results],
        nextCursor: result.nextCursor,
        hasMore: result.nextCursor != null,
      }));
    } catch {
      this._state.update(s => ({ ...s, isLoadingMore: false }));
    }
  }

  async cargarLoteDetalle(id: number): Promise<void> {
    this._state.update(s => ({ ...s, isLoading: true, loteDetalle: null, errorMessage: null }));
    try {
      const lote = await this.repo.getLoteDetalle(id);
      this._state.update(s => ({ ...s, isLoading: false, loteDetalle: lote }));
    } catch (err) {
      this._state.update(s => ({ ...s, isLoading: false, errorMessage: (err as Error).message }));
    }
  }

  async crearLote(lote: LoteCreateModel): Promise<boolean> {
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      await this.repo.crearLote(lote);
      this._state.update(s => ({ ...s, isSaving: false, successMessage: 'Lote creado correctamente' }));
      await this.cargarLotes();
      return true;
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: (err as Error).message }));
      return false;
    }
  }

  async desactivarLote(id: number): Promise<void> {
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null }));
    try {
      await this.repo.desactivarLote(id);
      this._state.update(s => ({
        ...s,
        isLoading: false,
        lotes: s.lotes.filter(l => l.id !== id),
        successMessage: 'Lote desactivado correctamente',
      }));
    } catch (err) {
      this._state.update(s => ({ ...s, isLoading: false, errorMessage: (err as Error).message }));
    }
  }

  async cargarStock(): Promise<void> {
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) return;
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null }));
    try {
      const stock = await this.repo.getStock(tiendaId);
      this._state.update(s => ({ ...s, isLoading: false, stock }));
    } catch (err) {
      this._state.update(s => ({ ...s, isLoading: false, errorMessage: (err as Error).message }));
    }
  }

  async cargarCatalogo(): Promise<void> {
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) return;
    try {
      const result = await this.repo.getCatalogo(tiendaId, { pageSize: 200 });
      this._state.update(s => ({ ...s, catalogo: result.results }));
    } catch {
      // silencioso — el selector sigue funcionando sin datos de stock
    }
  }

  async cargarProductos(): Promise<void> {
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null }));
    try {
      const productos = await this.repo.getProductos();
      this._state.update(s => ({ ...s, isLoading: false, productos }));
    } catch (err) {
      this._state.update(s => ({ ...s, isLoading: false, errorMessage: (err as Error).message }));
    }
  }

  async actualizarProducto(id: number, payload: { tipoIgv?: string; isActive?: boolean }, imagenFile?: File): Promise<void> {
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      await this.repo.actualizarProducto(id, payload, imagenFile);
      await this.cargarProductos();
      this._state.update(s => ({ ...s, isSaving: false, successMessage: 'Producto actualizado correctamente' }));
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: (err as Error).message }));
    }
  }

  clearMessages(): void {
    this._state.update(s => ({ ...s, errorMessage: null, successMessage: null }));
  }
}
