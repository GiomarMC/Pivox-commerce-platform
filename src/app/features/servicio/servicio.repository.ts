import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { extractApiError } from '../../core/http/api-error.handler';
import { ServicioCreateModel, servicioCreateModelToJson } from './models/servicio-create.model';
import { ServicioReadModel, servicioReadModelFromJson } from './models/servicio-read.model';
import { NotaCreditoData, notaCreditoDataFromJson } from './models/nota-credito.model';

export interface ServiciosPageResult {
  items: ServicioReadModel[];
  nextCursor: string | null;
}

export interface EmitirNotaCreditoResult {
  servicio: ServicioReadModel;
  notaCredito: NotaCreditoData | null;
}

@Injectable({ providedIn: 'root' })
export class ServicioRepository {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  async crearServicio(payload: ServicioCreateModel): Promise<ServicioReadModel> {
    try {
      const data = await firstValueFrom(
        this.http.post<Record<string, unknown>>(`${this.base}services/servicio/`, servicioCreateModelToJson(payload)),
      );
      return servicioReadModelFromJson(data);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async getServicio(numeroComprobante: string): Promise<ServicioReadModel> {
    try {
      const data = await firstValueFrom(
        this.http.get<Record<string, unknown>>(`${this.base}services/servicio/${numeroComprobante}/`),
      );
      return servicioReadModelFromJson(data);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async getServicios(tiendaId: number, cursor?: string, filters?: {
    tipo?: string;
    search?: string;
    estadoSunat?: string;
    fecha?: string;
  }): Promise<ServiciosPageResult> {
    try {
      const params: Record<string, string> = { tienda: String(tiendaId) };
      if (cursor) params['cursor'] = cursor;
      if (filters?.tipo) params['tipo'] = filters.tipo;
      if (filters?.search) params['search'] = filters.search;
      if (filters?.estadoSunat) params['estado_sunat'] = filters.estadoSunat;
      if (filters?.fecha) params['fecha'] = filters.fecha;

      const data = await firstValueFrom(
        this.http.get<unknown>(`${this.base}services/servicio/`, { params }),
      );

      const list = this.extractList(data);
      const nextCursor = this.extractCursor(
        (data as Record<string, unknown>)?.['next'] as string | null,
      );
      return { items: list.map(servicioReadModelFromJson), nextCursor };
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async eliminarServicio(numeroComprobante: string): Promise<void> {
    try {
      await firstValueFrom(this.http.delete(`${this.base}services/servicio/${numeroComprobante}/`));
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async anularServicio(numeroComprobante: string, motivo: string): Promise<ServicioReadModel> {
    try {
      const data = await firstValueFrom(
        this.http.post<Record<string, unknown>>(
          `${this.base}services/servicio/${numeroComprobante}/anular/`,
          { motivo },
        ),
      );
      return servicioReadModelFromJson(data);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async emitirNotaCredito(
    numeroComprobante: string,
    options: { codigoTipo?: string; motivo: string; precioNuevo?: string },
  ): Promise<EmitirNotaCreditoResult> {
    try {
      const body: Record<string, unknown> = {
        codigo_tipo: options.codigoTipo ?? '01',
        motivo: options.motivo,
      };
      if (options.precioNuevo) body['precio_nuevo'] = options.precioNuevo;

      const data = await firstValueFrom(
        this.http.post<Record<string, unknown>>(
          `${this.base}services/servicio/${numeroComprobante}/nota-credito/`,
          body,
        ),
      );
      const servicio = servicioReadModelFromJson(data);
      const ncMap = data['nota_credito'] as Record<string, unknown> | null;
      return { servicio, notaCredito: ncMap ? notaCreditoDataFromJson(ncMap) : null };
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async consultarEstadoSunat(numeroComprobante: string): Promise<ServicioReadModel> {
    try {
      const data = await firstValueFrom(
        this.http.post<Record<string, unknown>>(
          `${this.base}services/servicio/${numeroComprobante}/consultar-estado/`, null,
        ),
      );
      return servicioReadModelFromJson(data);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async descargarTicketPdf(numeroComprobante: string): Promise<Blob> {
    try {
      return await firstValueFrom(
        this.http.get(`${this.base}services/servicio/${numeroComprobante}/ticket/`, { responseType: 'blob' }),
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
