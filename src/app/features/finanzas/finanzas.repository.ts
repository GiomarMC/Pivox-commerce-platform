import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { extractApiError } from '../../core/http/api-error.handler';
import { CajaResumenModel, cajaResumenFromJson } from './models/caja-resumen.model';
import { CajaCierreModel, cajaCierreFromJson } from './models/caja-cierre.model';
import { DeudaModel, deudaFromJson } from './models/deuda.model';
import { PagoModel, pagoFromJson } from './models/pago.model';
import { GastoTipoModel, gastoTipoFromJson } from './models/gasto-tipo.model';
import { GastoFijoResumenModel, gastoFijoResumenFromJson } from './models/gasto-fijo-resumen.model';
import { GastoVariableResumenModel, gastoVariableResumenFromJson } from './models/gasto-variable-resumen.model';

export interface GastoFijoCreatePayload {
  tiendaId: number;
  tipoGasto: string;
  mes: number;
  anio: number;
  monto: string;
}

export interface GastoVariableCreatePayload {
  descripcion: string;
  monto: string;
  fecha: string;
  tiendaId?: number;
}

@Injectable({ providedIn: 'root' })
export class FinanzasRepository {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  async getCajaResumen(tiendaId: number): Promise<CajaResumenModel> {
    try {
      const data = await firstValueFrom(
        this.http.get<Record<string, unknown>>(`${this.base}finances/caja/resumen/`, {
          params: { tienda_id: String(tiendaId) },
        }),
      );
      return cajaResumenFromJson(data);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async cerrarCaja(tiendaId: number, montoReal: string, observaciones: string): Promise<CajaCierreModel> {
    try {
      const data = await firstValueFrom(
        this.http.post<Record<string, unknown>>(`${this.base}finances/caja/cerrar/`, {
          tienda_id: tiendaId,
          monto_real: montoReal,
          observaciones,
        }),
      );
      return cajaCierreFromJson(data);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async getDeudas(filters: {
    cliente?: number;
    estado?: string;
    ordering?: string;
    servicio?: number;
    venta?: number;
  } = {}): Promise<DeudaModel[]> {
    try {
      const params: Record<string, string> = {};
      if (filters.cliente != null) params['cliente'] = String(filters.cliente);
      if (filters.estado) params['estado'] = filters.estado;
      if (filters.ordering) params['ordering'] = filters.ordering;
      if (filters.servicio != null) params['servicio'] = String(filters.servicio);
      if (filters.venta != null) params['venta'] = String(filters.venta);

      const data = await firstValueFrom(
        this.http.get<unknown>(`${this.base}finances/deudas/`, { params }),
      );
      return this.extractList(data).map(deudaFromJson);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async getPagos(filters: {
    deudaCliente?: number;
    deudaEstado?: string;
    deudaServicio?: number;
    deudaVenta?: number;
    ordering?: string;
  } = {}): Promise<PagoModel[]> {
    try {
      const params: Record<string, string> = {};
      if (filters.deudaCliente != null) params['deuda__cliente'] = String(filters.deudaCliente);
      if (filters.deudaEstado) params['deuda__estado'] = filters.deudaEstado;
      if (filters.deudaServicio != null) params['deuda__servicio'] = String(filters.deudaServicio);
      if (filters.deudaVenta != null) params['deuda__venta'] = String(filters.deudaVenta);
      if (filters.ordering) params['ordering'] = filters.ordering;

      const data = await firstValueFrom(
        this.http.get<unknown>(`${this.base}finances/pagos/`, { params }),
      );
      return this.extractList(data).map(pagoFromJson);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async registrarPago(deudaId: number, monto: string): Promise<Blob> {
    try {
      return await firstValueFrom(
        this.http.post(`${this.base}finances/pagos/`, { deuda_id: deudaId, monto }, { responseType: 'blob' }),
      );
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async getTiposGasto(): Promise<GastoTipoModel[]> {
    try {
      const data = await firstValueFrom(
        this.http.get<unknown>(`${this.base}finances/gastos/tipos/`),
      );
      return this.extractList(data).map(gastoTipoFromJson);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async getGastosFijosResumen(tiendaId: number, mes: number, anio: number): Promise<GastoFijoResumenModel> {
    try {
      const data = await firstValueFrom(
        this.http.get<Record<string, unknown>>(`${this.base}finances/gastos/resumen/`, {
          params: { tienda_id: String(tiendaId), mes: String(mes), anio: String(anio), tipo: 'fijo' },
        }),
      );
      return gastoFijoResumenFromJson(data);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async crearGastoFijo(payload: GastoFijoCreatePayload): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.base}finances/gastos/manual/`, {
          tienda_id: payload.tiendaId,
          tipo_gasto: payload.tipoGasto,
          mes: payload.mes,
          anio: payload.anio,
          monto: payload.monto,
        }),
      );
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async getGastosVariablesResumen(tiendaId: number, mes: number, anio: number): Promise<GastoVariableResumenModel> {
    try {
      const data = await firstValueFrom(
        this.http.get<Record<string, unknown>>(`${this.base}finances/gastos-variable/resumen/`, {
          params: { tienda_id: String(tiendaId), mes: String(mes), anio: String(anio) },
        }),
      );
      return gastoVariableResumenFromJson(data);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async crearGastoVariable(payload: GastoVariableCreatePayload): Promise<void> {
    try {
      const body: Record<string, unknown> = {
        descripcion: payload.descripcion,
        monto: payload.monto,
        fecha: payload.fecha,
      };
      if (payload.tiendaId != null) body['tienda_id'] = payload.tiendaId;
      await firstValueFrom(this.http.post(`${this.base}finances/gastos-variable/crear/`, body));
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async cerrarMesGastos(tiendaId: number, mes: number, anio: number): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.base}finances/gastos/cerrar-mes/`, { tienda_id: tiendaId, mes, anio }),
      );
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async buscarClientePorDocumento(numeroDocumento: string): Promise<{ id: number; nombre: string } | null> {
    try {
      const data = await firstValueFrom(
        this.http.get<unknown>(`${this.base}sales/clientes/`, { params: { search: numeroDocumento } }),
      );
      const list = this.extractList(data);
      if (list.length === 0) return null;
      const c = list[0] as Record<string, unknown>;
      return { id: c['id'] as number, nombre: String(c['nombre'] ?? '') };
    } catch {
      return null;
    }
  }

  async buscarVentaPorComprobante(numero: string): Promise<{ id: number } | null> {
    try {
      const data = await firstValueFrom(
        this.http.get<Record<string, unknown>>(`${this.base}sales/ventas/${numero}/`),
      );
      return { id: data['id'] as number };
    } catch {
      return null;
    }
  }

  async buscarServicioPorComprobante(numero: string): Promise<{ id: number } | null> {
    try {
      const data = await firstValueFrom(
        this.http.get<Record<string, unknown>>(`${this.base}services/servicio/${numero}/`),
      );
      return { id: data['id'] as number };
    } catch {
      return null;
    }
  }

  private extractList(data: unknown): Record<string, unknown>[] {
    if (data && typeof data === 'object' && 'results' in data) {
      return (data as { results: Record<string, unknown>[] }).results;
    }
    if (Array.isArray(data)) return data as Record<string, unknown>[];
    return [];
  }
}
