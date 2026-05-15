import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { extractApiError } from '../../core/http/api-error.handler';
import { LoteResponse, LoteCreateModel, loteResponseFromJson, loteCreateModelToJson } from './models/lote.model';
import { ProductoModel, ProductoCatalogoModel, productoModelFromJson, productoCatalogoFromJson } from './models/producto.model';
import { StockModel, stockFromJson } from './models/stock.model';

interface PaginatedResult<T> {
  results: T[];
  nextCursor: string | null;
}

@Injectable({ providedIn: 'root' })
export class InventarioRepository {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  async getLotes(tiendaId: number, cursor?: string): Promise<PaginatedResult<LoteResponse>> {
    try {
      const params: Record<string, string> = { tienda: String(tiendaId) };
      if (cursor) params['cursor'] = cursor;
      const data = await firstValueFrom(
        this.http.get<Record<string, unknown>>(`${this.base}inventory/lotes/`, { params }),
      );
      return this.parsePaginated(data, loteResponseFromJson);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async getLoteDetalle(id: number): Promise<LoteResponse> {
    try {
      const data = await firstValueFrom(
        this.http.get<Record<string, unknown>>(`${this.base}inventory/lotes/${id}/`),
      );
      return loteResponseFromJson(data);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async crearLote(lote: LoteCreateModel): Promise<LoteResponse> {
    try {
      const data = await firstValueFrom(
        this.http.post<Record<string, unknown>>(`${this.base}inventory/lotes/`, loteCreateModelToJson(lote)),
      );
      return loteResponseFromJson(data);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async desactivarLote(id: number): Promise<void> {
    try {
      await firstValueFrom(this.http.delete(`${this.base}inventory/lotes/${id}/`));
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async getProductos(): Promise<ProductoModel[]> {
    try {
      const data = await firstValueFrom(
        this.http.get<unknown>(`${this.base}inventory/productos/`),
      );
      const list = this.extractList(data);
      return list.map(productoModelFromJson);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async getProductoDetalle(id: number): Promise<ProductoModel> {
    try {
      const data = await firstValueFrom(
        this.http.get<Record<string, unknown>>(`${this.base}inventory/productos/${id}/`),
      );
      return productoModelFromJson(data);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async actualizarProducto(id: number, payload: { tipoIgv?: string; isActive?: boolean }, imagenFile?: File): Promise<void> {
    try {
      if (imagenFile) {
        const fd = new FormData();
        if (payload.tipoIgv != null) fd.append('tipo_igv', payload.tipoIgv);
        if (payload.isActive != null) fd.append('is_active', String(payload.isActive));
        fd.append('imagen', imagenFile, imagenFile.name);
        await firstValueFrom(this.http.patch(`${this.base}inventory/productos/${id}/`, fd));
      } else {
        const body: Record<string, unknown> = {};
        if (payload.tipoIgv != null) body['tipo_igv'] = payload.tipoIgv;
        if (payload.isActive != null) body['is_active'] = payload.isActive;
        await firstValueFrom(this.http.patch(`${this.base}inventory/productos/${id}/`, body));
      }
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async getStock(tiendaId: number): Promise<StockModel[]> {
    try {
      const data = await firstValueFrom(
        this.http.get<unknown>(`${this.base}inventory/stock/`, { params: { tienda: String(tiendaId) } }),
      );
      const list = this.extractList(data);
      return list.map(stockFromJson);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async getCatalogo(tiendaId: number, opts: { cursor?: string; search?: string; pageSize?: number } = {}): Promise<PaginatedResult<ProductoCatalogoModel>> {
    try {
      const params: Record<string, string> = {
        tienda: String(tiendaId),
        page_size: String(opts.pageSize ?? 20),
      };
      if (opts.cursor) params['cursor'] = opts.cursor;
      if (opts.search) params['search'] = opts.search;
      const data = await firstValueFrom(
        this.http.get<Record<string, unknown>>(`${this.base}inventory/catalogo/`, { params }),
      );
      return this.parsePaginated(data, productoCatalogoFromJson);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  private parsePaginated<T>(data: Record<string, unknown>, fromJson: (j: Record<string, unknown>) => T): PaginatedResult<T> {
    const nextUrl = data['next'] as string | null;
    const nextCursor = nextUrl ? new URL(nextUrl).searchParams.get('cursor') : null;
    const list = this.extractList(data);
    return { results: list.map(fromJson), nextCursor };
  }

  private extractList(data: unknown): Record<string, unknown>[] {
    if (data && typeof data === 'object' && 'results' in data) {
      return (data as { results: Record<string, unknown>[] }).results;
    }
    if (Array.isArray(data)) return data as Record<string, unknown>[];
    return [];
  }
}
