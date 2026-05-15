import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { TiendaRepository } from './tienda.repository';
import { StoreModel } from '../../core/models/store.model';

export interface TiendaState {
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  tiendas: StoreModel[];
}

@Injectable({ providedIn: 'root' })
export class TiendaService {
  private readonly repo = inject(TiendaRepository);
  private readonly auth = inject(AuthService);

  private readonly _state = signal<TiendaState>({
    isLoading: false,
    isSaving: false,
    errorMessage: null,
    successMessage: null,
    tiendas: [],
  });

  readonly state = this._state.asReadonly();

  readonly tiendaActiva = computed((): StoreModel | null => {
    const selectedId = this.auth.selectedTiendaId();
    const tiendas = this._state().tiendas;
    if (!selectedId || tiendas.length === 0) return null;
    return tiendas.find(t => t.id === selectedId) ?? tiendas[0];
  });

  async cargarTiendas(): Promise<void> {
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null }));
    try {
      const tiendas = await this.repo.getTiendas();
      this._state.update(s => ({ ...s, isLoading: false, tiendas }));
    } catch (err: unknown) {
      this._state.update(s => ({
        ...s,
        isLoading: false,
        errorMessage: (err as Error).message,
      }));
    }
  }

  async actualizarTienda(id: number, payload: { nombreSede: string; direccion: string; ubigeo: string }): Promise<void> {
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null, successMessage: null }));
    try {
      const updated = await this.repo.actualizarTienda(id, payload);
      this._state.update(s => ({
        ...s,
        isSaving: false,
        successMessage: 'Tienda actualizada correctamente',
        tiendas: s.tiendas.map(t => (t.id === id ? updated : t)),
      }));
    } catch (err: unknown) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: (err as Error).message }));
    }
  }

  async crearTienda(payload: {
    nombreSede: string;
    direccion: string;
    ubigeo: string;
    serieFactura: string;
    serieBoleta: string;
    serieTicket: string;
    empresaId: number;
  }): Promise<void> {
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null, successMessage: null }));
    try {
      const nueva = await this.repo.crearTienda(payload);
      this._state.update(s => ({
        ...s,
        isSaving: false,
        successMessage: 'Tienda creada correctamente',
        tiendas: [...s.tiendas, nueva],
      }));
    } catch (err: unknown) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: (err as Error).message }));
    }
  }

  async desactivarTienda(id: number): Promise<void> {
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      await this.repo.desactivarTienda(id);
      const tiendas = this._state().tiendas.filter(t => t.id !== id);
      this._state.update(s => ({ ...s, isSaving: false, tiendas }));

      if (this.auth.selectedTiendaId() === id && tiendas.length > 0) {
        this.auth.selectTienda(tiendas[0].id);
      }
    } catch (err: unknown) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: (err as Error).message }));
    }
  }

  clearMessages(): void {
    this._state.update(s => ({ ...s, errorMessage: null, successMessage: null }));
  }
}
