import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { OperacionesRepository, HistorialFilters } from './operaciones.repository';
import { OperacionModel } from './models/operacion.model';
import { environment } from '../../../environments/environment';
import { extractApiError } from '../../core/http/api-error.handler';
import { ventaReadModelFromJson, NotaCreditoModel } from '../venta/models/venta-read.model';
import { servicioReadModelFromJson } from '../servicio/models/servicio-read.model';
import { notaCreditoDataFromJson } from '../servicio/models/nota-credito.model';

export interface OperacionesState {
  isLoading: boolean;
  isLoadingMore: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  operaciones: OperacionModel[];
  hasMore: boolean;
}

const INITIAL: OperacionesState = {
  isLoading: false,
  isLoadingMore: false,
  isSaving: false,
  errorMessage: null,
  successMessage: null,
  operaciones: [],
  hasMore: false,
};

export interface HistorialParams {
  tipo?: 'TODOS' | 'VENTA' | 'SERVICIO';
  search?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  fecha?: string;
}

@Injectable({ providedIn: 'root' })
export class OperacionesService {
  private readonly repo = inject(OperacionesRepository);
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  private readonly _state = signal<OperacionesState>(INITIAL);
  readonly state = this._state.asReadonly();

  private nextCursorVentas: string | null = null;
  private nextCursorServicios: string | null = null;
  private lastParams: HistorialParams = {};

  async cargarHistorial(params: HistorialParams = {}): Promise<void> {
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) return;
    this.lastParams = params;
    this.nextCursorVentas = null;
    this.nextCursorServicios = null;
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null, operaciones: [] }));
    const tipo = params.tipo ?? 'TODOS';
    const filters: HistorialFilters = {
      search: params.search,
      fechaDesde: params.fechaDesde,
      fechaHasta: params.fechaHasta,
      fecha: params.fecha,
    };
    try {
      const [ventas, servicios] = await Promise.all([
        tipo !== 'SERVICIO' ? this.repo.getVentas(tiendaId, filters) : Promise.resolve({ items: [], nextCursor: null }),
        tipo !== 'VENTA' ? this.repo.getServicios(tiendaId, filters) : Promise.resolve({ items: [], nextCursor: null }),
      ]);
      this.nextCursorVentas = ventas.nextCursor;
      this.nextCursorServicios = servicios.nextCursor;
      const merged = this.merge(ventas.items, servicios.items);
      const hasMore = ventas.nextCursor !== null || servicios.nextCursor !== null;
      this._state.update(s => ({ ...s, isLoading: false, operaciones: merged, hasMore }));
    } catch (err) {
      this._state.update(s => ({ ...s, isLoading: false, errorMessage: (err as Error).message }));
    }
  }

  async cargarMas(): Promise<void> {
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId || !this._state().hasMore) return;
    this._state.update(s => ({ ...s, isLoadingMore: true }));
    const tipo = this.lastParams.tipo ?? 'TODOS';
    const baseFilters: HistorialFilters = {
      search: this.lastParams.search,
      fechaDesde: this.lastParams.fechaDesde,
      fechaHasta: this.lastParams.fechaHasta,
      fecha: this.lastParams.fecha,
    };
    try {
      const [ventas, servicios] = await Promise.all([
        this.nextCursorVentas && tipo !== 'SERVICIO'
          ? this.repo.getVentas(tiendaId, { ...baseFilters, cursor: this.nextCursorVentas })
          : Promise.resolve({ items: [], nextCursor: null }),
        this.nextCursorServicios && tipo !== 'VENTA'
          ? this.repo.getServicios(tiendaId, { ...baseFilters, cursor: this.nextCursorServicios })
          : Promise.resolve({ items: [], nextCursor: null }),
      ]);
      this.nextCursorVentas = ventas.nextCursor;
      this.nextCursorServicios = servicios.nextCursor;
      const nuevas = this.merge(ventas.items, servicios.items);
      const hasMore = ventas.nextCursor !== null || servicios.nextCursor !== null;
      this._state.update(s => ({
        ...s,
        isLoadingMore: false,
        operaciones: [...s.operaciones, ...nuevas],
        hasMore,
      }));
    } catch (err) {
      this._state.update(s => ({ ...s, isLoadingMore: false, errorMessage: (err as Error).message }));
    }
  }

  async anularVenta(numero: string, motivo: string): Promise<boolean> {
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      const data = await firstValueFrom(
        this.http.post<Record<string, unknown>>(`${this.base}sales/ventas/${numero}/anular/`, { motivo }),
      );
      const updated = ventaReadModelFromJson(data);
      this._state.update(s => ({
        ...s,
        isSaving: false,
        successMessage: 'Venta anulada',
        operaciones: s.operaciones.map(op =>
          op.id === numero ? { ...op, isActive: !updated.isCancelada, estadoSunat: updated.estadoSunat } : op,
        ),
      }));
      return true;
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: extractApiError(err as HttpErrorResponse) }));
      return false;
    }
  }

  async cancelarVenta(numero: string): Promise<boolean> {
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      await firstValueFrom(this.http.delete(`${this.base}sales/ventas/${numero}/`));
      this._state.update(s => ({
        ...s,
        isSaving: false,
        successMessage: 'Venta cancelada',
        operaciones: s.operaciones.map(op =>
          op.id === numero ? { ...op, isActive: false, isCancelada: true } : op,
        ),
      }));
      return true;
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: extractApiError(err as HttpErrorResponse) }));
      return false;
    }
  }

  async emitirNotaCreditoVenta(
    numero: string,
    motivo: string,
    options?: {
      codigoTipo?: string;
      items?: { loteProductoId: number; cantidad: string; precioNuevo?: string }[];
    },
  ): Promise<NotaCreditoModel | null> {
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      const body: Record<string, unknown> = { motivo };
      if (options?.codigoTipo) body['codigo_tipo'] = options.codigoTipo;
      if (options?.items?.length) {
        body['items'] = options.items.map(i => ({
          lote_producto_id: i.loteProductoId,
          cantidad: i.cantidad,
          ...(i.precioNuevo ? { precio_nuevo: i.precioNuevo } : {}),
        }));
      }
      const data = await firstValueFrom(
        this.http.post<Record<string, unknown>>(`${this.base}sales/ventas/${numero}/nota-credito/`, body),
      );
      const updated = ventaReadModelFromJson(data);
      this._state.update(s => ({
        ...s,
        isSaving: false,
        successMessage: 'Nota de crédito emitida',
        operaciones: s.operaciones.map(op =>
          op.id === numero
            ? {
                ...op,
                estadoSunat: updated.estadoSunat,
                isActive: !updated.isCancelada,
                isCancelada: updated.isCancelada,
                notaCredito: updated.notaCredito,
              }
            : op,
        ),
      }));
      return updated.notaCredito;
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: extractApiError(err as HttpErrorResponse) }));
      return null;
    }
  }

  async anularServicio(numero: string, motivo: string): Promise<boolean> {
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      const data = await firstValueFrom(
        this.http.post<Record<string, unknown>>(
          `${this.base}services/servicio/${numero}/anular/`, { motivo },
        ),
      );
      const updated = servicioReadModelFromJson(data);
      this._state.update(s => ({
        ...s,
        isSaving: false,
        successMessage: 'Servicio anulado',
        operaciones: s.operaciones.map(op =>
          op.id === numero ? { ...op, isActive: updated.isActive, estadoSunat: updated.estadoSunat !== 'NO_APLICA' ? updated.estadoSunat : null } : op,
        ),
      }));
      return true;
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: extractApiError(err as HttpErrorResponse) }));
      return false;
    }
  }

  async eliminarServicio(numero: string): Promise<boolean> {
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      await firstValueFrom(this.http.delete(`${this.base}services/servicio/${numero}/`));
      this._state.update(s => ({
        ...s,
        isSaving: false,
        successMessage: 'Servicio eliminado',
        operaciones: s.operaciones.filter(op => op.id !== numero),
      }));
      return true;
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: extractApiError(err as HttpErrorResponse) }));
      return false;
    }
  }

  async emitirNotaCreditoServicio(
    numero: string,
    motivo: string,
    codigoTipo: string,
    precioNuevo?: string,
  ): Promise<import('../servicio/models/nota-credito.model').NotaCreditoData | null> {
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      const body: Record<string, unknown> = { motivo, codigo_tipo: codigoTipo };
      if (precioNuevo) body['precio_nuevo'] = precioNuevo;
      const result = await firstValueFrom(
        this.http.post<Record<string, unknown>>(
          `${this.base}services/servicio/${numero}/nota-credito/`, body,
        ),
      );
      const ncRaw = result['nota_credito'] as Record<string, unknown> | null;
      const nc = ncRaw ? notaCreditoDataFromJson(ncRaw) : notaCreditoDataFromJson(result);
      const servicioActualizado = servicioReadModelFromJson(result);
      this._state.update(s => ({
        ...s,
        isSaving: false,
        successMessage: `Nota de crédito emitida: ${nc.numero}`,
        operaciones: s.operaciones.map(op =>
          op.id === numero
            ? {
                ...op,
                estadoSunat: servicioActualizado.estadoSunat !== 'NO_APLICA'
                  ? servicioActualizado.estadoSunat
                  : null,
                isActive: servicioActualizado.isActive,
                isCancelada: !servicioActualizado.isActive,
                notaCreditoServicio: nc,
              }
            : op,
        ),
      }));
      return nc;
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: extractApiError(err as HttpErrorResponse) }));
      return null;
    }
  }

  limpiarMensajes(): void {
    this._state.update(s => ({ ...s, errorMessage: null, successMessage: null }));
  }

  private merge(ventas: OperacionModel[], servicios: OperacionModel[]): OperacionModel[] {
    return [...ventas, ...servicios].sort((a, b) => b.fecha.localeCompare(a.fecha));
  }
}
