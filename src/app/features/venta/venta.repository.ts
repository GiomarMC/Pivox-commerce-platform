import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { extractApiError } from '../../core/http/api-error.handler';
import { VentaCreateModel, ClienteNuevoInput, ventaCreateModelToJson } from './models/venta-create.model';
import { VentaReadModel, ventaReadModelFromJson } from './models/venta-read.model';
import { ClienteModel, clienteFromJson } from './models/cliente.model';

export interface VentasPageResult {
  items: VentaReadModel[];
  nextCursor: string | null;
}

@Injectable({ providedIn: 'root' })
export class VentaRepository {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  async crearVenta(payload: VentaCreateModel): Promise<VentaReadModel> {
    try {
      const data = await firstValueFrom(
        this.http.post<Record<string, unknown>>(`${this.base}sales/ventas/`, ventaCreateModelToJson(payload)),
      );
      return ventaReadModelFromJson(data);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async confirmarSunat(
    id: number,
    lineas: { loteProductoId: number; cantidadConfirmada: string; precioConfirmado: string; esRelleno?: boolean; loteProductoOriginalId?: number | null }[],
  ): Promise<VentaReadModel> {
    try {
      const body = {
        propuesta: lineas.map(l => ({
          lote_producto_id: l.loteProductoId,
          cantidad: l.cantidadConfirmada,
          precio: l.precioConfirmado,
          es_relleno: l.esRelleno ?? false,
          lote_producto_original_id: l.loteProductoOriginalId ?? null,
        })),
      };
      const data = await firstValueFrom(
        this.http.post<Record<string, unknown>>(`${this.base}sales/ventas/${id}/confirmar-sunat/`, body),
      );
      return ventaReadModelFromJson(data);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async consultarEstadoSunat(numeroComprobante: string): Promise<VentaReadModel> {
    try {
      const data = await firstValueFrom(
        this.http.post<Record<string, unknown>>(`${this.base}sales/ventas/${numeroComprobante}/consultar-estado/`, null),
      );
      return ventaReadModelFromJson(data);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async notaCredito(
    numero: string,
    motivo: string,
    options?: {
      codigoTipo?: string;
      items?: { loteProductoId: number; cantidad: string; precioNuevo?: string }[];
    },
  ): Promise<VentaReadModel> {
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
      return ventaReadModelFromJson(data);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async cancelarVenta(numero: string): Promise<void> {
    try {
      await firstValueFrom(this.http.delete(`${this.base}sales/ventas/${numero}/`));
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async anularVenta(numero: string, motivo: string): Promise<VentaReadModel> {
    try {
      const data = await firstValueFrom(
        this.http.post<Record<string, unknown>>(`${this.base}sales/ventas/${numero}/anular/`, { motivo }),
      );
      return ventaReadModelFromJson(data);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async getVenta(numero: string): Promise<VentaReadModel> {
    try {
      const data = await firstValueFrom(
        this.http.get<Record<string, unknown>>(`${this.base}sales/ventas/${numero}/`),
      );
      return ventaReadModelFromJson(data);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async getClientes(tiendaId: number, search?: string): Promise<ClienteModel[]> {
    try {
      const params: Record<string, string> = { tienda: String(tiendaId) };
      if (search) params['search'] = search;
      const data = await firstValueFrom(
        this.http.get<unknown>(`${this.base}sales/clientes/`, { params }),
      );
      const list = this.extractList(data);
      return list.map(clienteFromJson);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async actualizarCliente(id: number, payload: Partial<ClienteNuevoInput>): Promise<ClienteModel> {
    try {
      const body: Record<string, unknown> = {};
      if (payload.nombre != null) body['nombre'] = payload.nombre;
      if (payload.tipoDocumento != null) body['tipo_documento'] = payload.tipoDocumento;
      if (payload.numeroDocumento != null) body['numero_documento'] = payload.numeroDocumento;
      if (payload.email != null) body['email'] = payload.email;
      if (payload.telefono != null) body['telefono'] = payload.telefono;
      if (payload.direccion != null) body['direccion'] = payload.direccion;
      const data = await firstValueFrom(
        this.http.patch<Record<string, unknown>>(`${this.base}sales/clientes/${id}/`, body),
      );
      return clienteFromJson(data);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async getVentas(tiendaId: number, filters?: {
    cursor?: string;
    tipo?: string;
    estadoSunat?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    search?: string;
  }): Promise<VentasPageResult> {
    try {
      const params: Record<string, string> = { tienda: String(tiendaId) };
      if (filters?.cursor)      params['cursor']       = filters.cursor;
      if (filters?.tipo)        params['tipo']         = filters.tipo;
      if (filters?.estadoSunat) params['estado_sunat'] = filters.estadoSunat;
      if (filters?.fechaDesde)  params['fecha_desde']  = filters.fechaDesde;
      if (filters?.fechaHasta)  params['fecha_hasta']  = filters.fechaHasta;
      if (filters?.search)      params['search']       = filters.search;
      const data = await firstValueFrom(
        this.http.get<unknown>(`${this.base}sales/ventas/`, { params }),
      );
      const list = this.extractList(data);
      const nextCursor = this.extractCursor(
        (data as Record<string, unknown>)?.['next'] as string | null,
      );
      return { items: list.map(ventaReadModelFromJson), nextCursor };
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async descargarTicketPdf(numeroComprobante: string): Promise<Blob> {
    try {
      return await firstValueFrom(
        this.http.get(
          `${this.base}sales/ventas/${numeroComprobante}/ticket/`,
          { responseType: 'blob' },
        ),
      );
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  private extractList(data: unknown): Record<string, unknown>[] {
    if (data && typeof data === 'object' && 'results' in data) {
      return (data as { results: Record<string, unknown>[] }).results;
    }
    if (Array.isArray(data)) return data as Record<string, unknown>[];
    return [];
  }

  private extractCursor(nextUrl: string | null | undefined): string | null {
    if (!nextUrl) return null;
    return new URL(nextUrl).searchParams.get('cursor');
  }
}
