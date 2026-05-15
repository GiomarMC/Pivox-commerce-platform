import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { extractApiError } from '../../core/http/api-error.handler';
import { OperacionModel } from './models/operacion.model';
import { ventaReadModelFromJson } from '../venta/models/venta-read.model';
import { servicioReadModelFromJson } from '../servicio/models/servicio-read.model';

export interface OperacionesPageResult {
  items: OperacionModel[];
  nextCursorVentas: string | null;
  nextCursorServicios: string | null;
}

export interface HistorialFilters {
  cursor?: string;
  search?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  fecha?: string;
}

@Injectable({ providedIn: 'root' })
export class OperacionesRepository {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  async getVentas(tiendaId: number, filters?: HistorialFilters): Promise<{ items: OperacionModel[]; nextCursor: string | null }> {
    try {
      const params: Record<string, string> = { tienda: String(tiendaId) };
      if (filters?.cursor)     params['cursor']      = filters.cursor;
      if (filters?.search)     params['search']      = filters.search;
      if (filters?.fechaDesde) params['fecha_desde'] = filters.fechaDesde;
      if (filters?.fechaHasta) params['fecha_hasta'] = filters.fechaHasta;
      if (filters?.fecha)      params['fecha']       = filters.fecha;
      const data = await firstValueFrom(
        this.http.get<Record<string, unknown>>(`${this.base}sales/ventas/`, { params }),
      );
      const list = this.extractList(data);
      const nextCursor = this.extractCursor((data['next'] as string | null));
      const items = list.map(ventaReadModelFromJson).map(v => ({
        id: v.numero,
        numeroComprobante: v.numero,
        tipo: 'VENTA' as const,
        tipoVenta: v.tipoVenta,
        tipoDisplay: v.tipoVenta,
        fecha: v.fechaCreacion,
        clienteNombre: v.clienteNombre,
        total: parseFloat(v.total),
        estadoSunat: v.estadoSunat,
        metodoPago: v.metodoPago,
        tipoComprobante: v.tipoComprobante,
        isActive: !v.isCancelada,
        isCancelada: v.isCancelada,
        motivoRechazo: v.motivoRechazo,
        descripcion: null,
        fechaInicio: null,
        fechaFin: null,
        deuda: 0,
        igvTotal: v.igvTotal,
        subtotal: v.subtotal,
        detalles: v.detalles,
        notaCredito: v.notaCredito,
        notaCreditoServicio: null,
        urlPdfTicket: v.urlPdfTicket,
      }));
      return { items, nextCursor };
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async getServicios(tiendaId: number, filters?: HistorialFilters): Promise<{ items: OperacionModel[]; nextCursor: string | null }> {
    try {
      const params: Record<string, string> = { tienda: String(tiendaId) };
      if (filters?.cursor)     params['cursor'] = filters.cursor;
      if (filters?.search)     params['search'] = filters.search;
      if (filters?.fecha)      params['fecha']  = filters.fecha;
      if (filters?.fechaDesde) params['fecha_desde'] = filters.fechaDesde;
      if (filters?.fechaHasta) params['fecha_hasta'] = filters.fechaHasta;
      const data = await firstValueFrom(
        this.http.get<Record<string, unknown>>(`${this.base}services/servicio/`, { params }),
      );
      const list = this.extractList(data);
      const nextCursor = this.extractCursor((data['next'] as string | null));
      const items = list.map(servicioReadModelFromJson).map(s => ({
        id: s.numeroComprobante,
        numeroComprobante: s.numeroComprobante,
        tipo: 'SERVICIO' as const,
        tipoVenta: s.tipo,
        tipoDisplay: s.tipoDisplay || s.tipo,
        fecha: s.fecha,
        clienteNombre: s.cliente?.nombre ?? null,
        total: s.total,
        estadoSunat: s.estadoSunat !== 'NO_APLICA' ? s.estadoSunat : null,
        metodoPago: s.metodoPago,
        tipoComprobante: s.tipoComprobante || null,
        isActive: s.isActive,
        isCancelada: !s.isActive,
        motivoRechazo: s.motivoRechazo || null,
        descripcion: s.descripcion || null,
        fechaInicio: s.fechaInicio || null,
        fechaFin: s.fechaFin || null,
        deuda: s.deuda,
        igvTotal: null,
        subtotal: null,
        detalles: [],
        notaCredito: null,
        notaCreditoServicio: null,
        urlPdfTicket: s.urlPdfTicket,
      }));
      return { items, nextCursor };
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  private extractList(data: Record<string, unknown>): Record<string, unknown>[] {
    if (Array.isArray(data['results'])) return data['results'] as Record<string, unknown>[];
    if (Array.isArray(data)) return data as Record<string, unknown>[];
    return [];
  }

  private extractCursor(nextUrl: string | null): string | null {
    if (!nextUrl) return null;
    try {
      return new URL(nextUrl).searchParams.get('cursor');
    } catch {
      return null;
    }
  }
}
