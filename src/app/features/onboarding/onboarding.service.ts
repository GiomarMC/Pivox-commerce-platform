import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { extractApiError } from '../../core/http/api-error.handler';
import { UserMeModel } from '../../core/auth/auth.models';

export type SetupStep = 'empresa' | 'tienda' | 'equipo';

export interface OnboardingState {
  isLoading: boolean;
  errorMessage: string | null;
  setupStep: SetupStep;
  tiendaIdRecienCreada: number | null;
}

const INITIAL: OnboardingState = {
  isLoading: false,
  errorMessage: null,
  setupStep: 'empresa',
  tiendaIdRecienCreada: null,
};

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = environment.apiBaseUrl;

  private readonly _state = signal<OnboardingState>(INITIAL);
  readonly state = this._state.asReadonly();

  async completarPerfil(firstName: string, lastName: string): Promise<boolean> {
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null }));
    try {
      await firstValueFrom(
        this.http.patch(`${this.base}auth/profile/complete/`, {
          first_name: firstName,
          last_name: lastName,
        }),
      );
      const me = await firstValueFrom(
        this.http.get<Record<string, unknown>>(`${this.base}auth/me/`),
      );
      this.auth.updateUserMe(this.mapUserMe(me));
      this._state.update(s => ({ ...s, isLoading: false }));
      return true;
    } catch (err: unknown) {
      this._state.update(s => ({
        ...s,
        isLoading: false,
        errorMessage: extractApiError(err as HttpErrorResponse),
      }));
      return false;
    }
  }

  async crearEmpresa(nombre: string, ruc: string): Promise<boolean> {
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null }));
    try {
      await firstValueFrom(
        this.http.post(`${this.base}store/empresa/`, { nombre, ruc }),
      );
      const me = await firstValueFrom(
        this.http.get<Record<string, unknown>>(`${this.base}auth/me/`),
      );
      this.auth.updateUserMe(this.mapUserMe(me));
      this._state.update(s => ({ ...s, isLoading: false, setupStep: 'tienda' }));
      return true;
    } catch (err: unknown) {
      this._state.update(s => ({
        ...s,
        isLoading: false,
        errorMessage: extractApiError(err as HttpErrorResponse),
      }));
      return false;
    }
  }

  async crearTienda(
    nombre: string,
    direccion: string,
    ubigeo: string,
    serieFactura: string,
    serieBoleta: string,
    serieTicket: string,
  ): Promise<boolean> {
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null }));
    try {
      const created = await firstValueFrom(
        this.http.post<Record<string, unknown>>(`${this.base}store/`, {
          nombre,
          direccion,
          ubigeo,
          serie_factura: serieFactura,
          serie_boleta: serieBoleta,
          serie_ticket: serieTicket,
        }),
      );
      const me = await firstValueFrom(
        this.http.get<Record<string, unknown>>(`${this.base}auth/me/`),
      );
      const userMe = this.mapUserMe(me);
      this.auth.updateUserMe(userMe);

      const idFromResponse = created['id'];
      const tiendaIdRecienCreada =
        typeof idFromResponse === 'number'
          ? idFromResponse
          : userMe.tiendas.at(-1)?.tiendaId ?? null;

      if (tiendaIdRecienCreada != null) {
        this.auth.selectTienda(tiendaIdRecienCreada);
      }

      this._state.update(s => ({
        ...s,
        isLoading: false,
        setupStep: 'equipo',
        tiendaIdRecienCreada,
      }));
      return true;
    } catch (err: unknown) {
      this._state.update(s => ({
        ...s,
        isLoading: false,
        errorMessage: extractApiError(err as HttpErrorResponse),
      }));
      return false;
    }
  }

  clearMessages(): void {
    this._state.update(s => ({ ...s, errorMessage: null }));
  }

  private mapUserMe(json: Record<string, unknown>): UserMeModel {
    return {
      id: json['id'] as number,
      username: json['username'] as string,
      email: json['email'] as string,
      firstName: (json['first_name'] as string) ?? '',
      lastName: (json['last_name'] as string) ?? '',
      rol: (json['rol'] as string) ?? null,
      tiendas: ((json['tiendas'] as Record<string, unknown>[]) ?? []).map(t => ({
        tiendaId: t['tienda_id'] as number,
        tiendaNombre: t['tienda_nombre'] as string,
      })),
    };
  }
}
