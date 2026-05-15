import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  UsuarioTiendaModel,
  RefrescarInvitacionResponse,
  usuarioTiendaFromJson,
} from './models/usuario-tienda.model';
import { extractApiError } from '../../core/http/api-error.handler';

@Injectable({ providedIn: 'root' })
export class UsuariosRepository {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  async getUsuarios(params: { tiendaId?: number; rol?: string } = {}): Promise<UsuarioTiendaModel[]> {
    const qp: Record<string, unknown> = {};
    if (params.tiendaId != null) qp['tienda'] = params.tiendaId;
    if (params.rol != null) qp['rol'] = params.rol;

    try {
      const data = await firstValueFrom(
        this.http.get<Record<string, unknown>[]>(`${this.base}auth/usuario-tienda/`, { params: qp as Record<string, string> }),
      );
      return data.map(usuarioTiendaFromJson);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async editarUsuario(payload: {
    id: number;
    tiendaId?: number;
    rol?: string;
    salario?: string;
  }): Promise<UsuarioTiendaModel> {
    try {
      await firstValueFrom(
        this.http.patch(`${this.base}auth/usuario-tienda/${payload.id}/`, {
          tienda: payload.tiendaId,
          rol: payload.rol,
          salario: payload.salario,
        }),
      );
      const data = await firstValueFrom(
        this.http.get<Record<string, unknown>>(`${this.base}auth/usuario-tienda/${payload.id}/`),
      );
      return usuarioTiendaFromJson(data);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async toggleEstado(id: number): Promise<UsuarioTiendaModel> {
    try {
      await firstValueFrom(this.http.patch(`${this.base}auth/usuario-tienda/${id}/estado/`, null));
      const data = await firstValueFrom(
        this.http.get<Record<string, unknown>>(`${this.base}auth/usuario-tienda/${id}/`),
      );
      return usuarioTiendaFromJson(data);
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }

  async refrescarInvitacion(usuarioId: number): Promise<RefrescarInvitacionResponse> {
    try {
      const data = await firstValueFrom(
        this.http.post<Record<string, unknown>>(`${this.base}auth/invitacion/${usuarioId}/refrescar/`, null),
      );
      return {
        token: data['token'] as string,
        usuario: data['usuario'] as string,
        expiracion: data['expiracion'] as string,
      };
    } catch (err) {
      throw new Error(extractApiError(err as HttpErrorResponse));
    }
  }
}
