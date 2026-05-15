import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StoreModel, storeFromJson } from '../../core/models/store.model';
import { extractApiError } from '../../core/http/api-error.handler';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class TiendaRepository {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  async getTiendas(): Promise<StoreModel[]> {
    try {
      const data = await firstValueFrom(
        this.http.get<Record<string, unknown>[]>(`${this.base}store/`),
      );
      return data.map(storeFromJson);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async actualizarTienda(id: number, payload: { nombreSede: string; direccion: string; ubigeo: string }): Promise<StoreModel> {
    try {
      const data = await firstValueFrom(
        this.http.patch<Record<string, unknown>>(`${this.base}store/${id}/`, {
          nombre_sede: payload.nombreSede,
          direccion: payload.direccion,
          ubigeo: payload.ubigeo,
        }),
      );
      return storeFromJson(data);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
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
  }): Promise<StoreModel> {
    try {
      const data = await firstValueFrom(
        this.http.post<Record<string, unknown>>(`${this.base}store/`, {
          nombre_sede: payload.nombreSede,
          direccion: payload.direccion,
          ubigeo: payload.ubigeo,
          serie_factura: payload.serieFactura,
          serie_boleta: payload.serieBoleta,
          serie_ticket: payload.serieTicket,
          empresa_id: payload.empresaId,
        }),
      );
      return storeFromJson(data);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async desactivarTienda(id: number): Promise<void> {
    try {
      await firstValueFrom(this.http.delete(`${this.base}store/${id}/`));
    } catch (err) {
      throw new Error('Error al desactivar la tienda');
    }
  }
}
