import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { extractApiError } from '../../core/http/api-error.handler';

export type InvitationStatus = 'idle' | 'success' | 'error';
export type TokenStatus = 'idle' | 'validating' | 'valid' | 'invalid';

export interface InvitationState {
  isLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  status: InvitationStatus;
  tokenStatus: TokenStatus;
  usuarioNombre: string | null;
  invitationLink: string | null;
  roles: { valor: string; etiqueta: string }[];
  tiendas: { id: number; nombre: string }[];
}

const INITIAL: InvitationState = {
  isLoading: false,
  errorMessage: null,
  successMessage: null,
  status: 'idle',
  tokenStatus: 'idle',
  usuarioNombre: null,
  invitationLink: null,
  roles: [],
  tiendas: [],
};

@Injectable({ providedIn: 'root' })
export class InvitationService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  private readonly _state = signal<InvitationState>(INITIAL);
  readonly state = this._state.asReadonly();

  async cargarRolesYTiendas(): Promise<void> {
    try {
      const [rolesRaw, tiendasRaw] = await Promise.all([
        firstValueFrom(this.http.get<Record<string, unknown>[]>(`${this.base}auth/roles/`)),
        firstValueFrom(this.http.get<Record<string, unknown>[]>(`${this.base}store/`)),
      ]);
      const roles = rolesRaw.map(r => ({
        valor: String(r['valor'] ?? r['value'] ?? r['rol'] ?? ''),
        etiqueta: String(r['etiqueta'] ?? r['label'] ?? r['nombre'] ?? ''),
      }));
      const tiendas = tiendasRaw.map(t => ({
        id: Number(t['id']),
        nombre: String(t['nombre'] ?? t['name'] ?? ''),
      }));
      this._state.update(s => ({ ...s, roles, tiendas }));
    } catch {
      // non-critical; roles/tiendas may load partially
    }
  }

  async validarToken(token: string): Promise<void> {
    this._state.update(s => ({ ...s, tokenStatus: 'validating', errorMessage: null }));
    try {
      const res = await firstValueFrom(
        this.http.post<{ mensaje: string; usuario: string }>(
          `${this.base}auth/invitacion/validar/`, { token },
        ),
      );
      this._state.update(s => ({
        ...s,
        tokenStatus: 'valid',
        usuarioNombre: res.usuario ?? null,
      }));
    } catch (err: unknown) {
      this._state.update(s => ({
        ...s,
        tokenStatus: 'invalid',
        errorMessage: extractApiError(err as HttpErrorResponse),
      }));
    }
  }

  async completarInvitacion(token: string, password: string, confirmarPassword: string): Promise<boolean> {
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null }));
    try {
      await firstValueFrom(
        this.http.post(`${this.base}auth/invitacion/completar/`, {
          token,
          password,
          confirmar_password: confirmarPassword,
        }),
      );
      this._state.update(s => ({
        ...s,
        isLoading: false,
        status: 'success',
        successMessage: 'Contraseña establecida exitosamente. Ya puedes iniciar sesión.',
      }));
      return true;
    } catch (err: unknown) {
      this._state.update(s => ({
        ...s,
        isLoading: false,
        status: 'error',
        errorMessage: extractApiError(err as HttpErrorResponse),
      }));
      return false;
    }
  }

  async crearInvitacion(
    email: string,
    rol: string,
    tiendaId?: number,
    salario?: number,
  ): Promise<boolean> {
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null, invitationLink: null }));
    try {
      const body: Record<string, unknown> = { email, rol };
      if (tiendaId != null) body['tienda_id'] = tiendaId;
      if (salario != null) body['salario'] = salario;

      const resp = await firstValueFrom(
        this.http.post<Record<string, unknown>>(`${this.base}auth/invite/`, body),
      );
      const link = String(resp['link'] ?? resp['invitation_link'] ?? resp['url'] ?? '');
      this._state.update(s => ({
        ...s,
        isLoading: false,
        status: 'success',
        invitationLink: link,
        successMessage: 'Invitación creada correctamente.',
      }));
      return true;
    } catch (err: unknown) {
      this._state.update(s => ({
        ...s,
        isLoading: false,
        status: 'error',
        errorMessage: extractApiError(err as HttpErrorResponse),
      }));
      return false;
    }
  }

  clearMessages(): void {
    this._state.update(s => ({ ...s, errorMessage: null, successMessage: null }));
  }

  reset(): void {
    this._state.set(INITIAL);
  }
}
