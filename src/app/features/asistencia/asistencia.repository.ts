import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AsistenciaModel,
  AsistenciaResumenModel,
  asistenciaFromJson,
  asistenciaResumenFromJson,
} from './models/asistencia.model';
import { extractApiError } from '../../core/http/api-error.handler';

@Injectable({ providedIn: 'root' })
export class AsistenciaRepository {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  async getAsistencias(params: { usuarioTienda?: number; fecha?: string } = {}): Promise<AsistenciaModel[]> {
    const qp: Record<string, unknown> = {};
    if (params.usuarioTienda != null) qp['usuario_tienda'] = params.usuarioTienda;
    if (params.fecha != null) qp['fecha'] = params.fecha;

    try {
      const data = await firstValueFrom(
        this.http.get<Record<string, unknown>[]>(`${this.base}auth/asistencia/`, {
          params: qp as Record<string, string>,
        }),
      );
      return data.map(asistenciaFromJson);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async getResumen(params: { mes: number; anio: number; usuarioTienda?: number }): Promise<AsistenciaResumenModel[]> {
    const qp: Record<string, unknown> = { mes: params.mes, anio: params.anio };
    if (params.usuarioTienda != null) qp['usuario_tienda'] = params.usuarioTienda;

    try {
      const data = await firstValueFrom(
        this.http.get<Record<string, unknown>[]>(`${this.base}auth/asistencia/resumen/`, {
          params: qp as Record<string, string>,
        }),
      );
      return data.map(asistenciaResumenFromJson);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async marcarEntrada(usuarioTiendaId: number): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.base}auth/asistencia/entrada/`, { usuario_tienda: usuarioTiendaId }),
      );
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async marcarSalida(usuarioTiendaId: number, almuerzo: boolean): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.base}auth/asistencia/salida/`, {
          usuario_tienda: usuarioTiendaId,
          almuerzo,
        }),
      );
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }
}
