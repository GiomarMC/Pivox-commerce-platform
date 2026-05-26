import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService } from '../storage/storage.service';
import {
  AuthResponseModel,
  UserMeModel,
  UserTiendaModel,
  Roles,
  isProfileIncomplete as checkIncomplete,
  isDueno as checkDueno,
} from './auth.models';

export interface AuthState {
  isLoading: boolean;
  errorMessage: string | null;
  authData: AuthResponseModel | null;
  userMe: UserMeModel | null;
  selectedTiendaId: number | null;
}

const INITIAL_STATE: AuthState = {
  isLoading: false,
  errorMessage: null,
  authData: null,
  userMe: null,
  selectedTiendaId: null,
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly base = environment.apiBaseUrl;

  private readonly _state = signal<AuthState>(INITIAL_STATE);

  readonly state = this._state.asReadonly();
  readonly isAuthenticated = computed(() => this._state().authData !== null);
  readonly userMe = computed(() => this._state().userMe);
  readonly selectedTiendaId = computed(() => this._state().selectedTiendaId);
  readonly isDueno = computed(() => this._state().userMe?.rol === Roles.dueno);
  readonly isAdmin = computed(() => this._state().userMe?.rol === Roles.administrador);
  readonly canViewUsuarios = computed(() => this.isDueno() || this.isAdmin());

  async login(username: string, password: string): Promise<void> {
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null }));
    try {
      const authData = await firstValueFrom(
        this.http.post<AuthResponseModel>(`${this.base}auth/login/`, { username, password }),
      );
      this.storage.saveToken(authData.access);
      this.storage.saveRefreshToken(authData.refresh);

      const raw = await firstValueFrom(this.http.get<Record<string, unknown>>(`${this.base}auth/me/`));
      const userMe = this.mapUserMe(raw);

      let selectedTiendaId: number | null = null;
      if (userMe.tiendas.length > 0) {
        const lastId = this.storage.getLastTiendaId();
        const existe = userMe.tiendas.some(t => t.tiendaId === lastId);
        selectedTiendaId = existe ? lastId : userMe.tiendas[0].tiendaId;
      }

      this._state.set({ isLoading: false, errorMessage: null, authData, userMe, selectedTiendaId });
    } catch (err: unknown) {
      const error = err as { error?: { detail?: string; non_field_errors?: string[] } };
      const msg =
        error?.error?.detail ??
        error?.error?.non_field_errors?.[0] ??
        'Error al iniciar sesión';
      this._state.update(s => ({ ...s, isLoading: false, errorMessage: msg }));
    }
  }

  logout(): void {
    this.storage.clearAuthTokens();
    this._state.set(INITIAL_STATE);
  }

  /**
   * Restaura la sesión al cargar la app si hay tokens válidos en storage.
   * Se invoca desde APP_INITIALIZER. En SSR `storage.getToken()` devuelve null
   * (StorageService es SSR-safe), por lo que es un no-op en servidor.
   */
  async restoreSession(): Promise<void> {
    const token = this.storage.getToken();
    if (!token) return;

    try {
      const refresh = this.storage.getRefreshToken() ?? '';
      const raw = await firstValueFrom(
        this.http.get<Record<string, unknown>>(`${this.base}auth/me/`),
      );
      const userMe = this.mapUserMe(raw);

      let selectedTiendaId: number | null = null;
      if (userMe.tiendas.length > 0) {
        const lastId = this.storage.getLastTiendaId();
        const existe = userMe.tiendas.some(t => t.tiendaId === lastId);
        selectedTiendaId = existe ? lastId : userMe.tiendas[0].tiendaId;
      }

      this._state.set({
        isLoading: false,
        errorMessage: null,
        authData: { access: token, refresh },
        userMe,
        selectedTiendaId,
      });
    } catch {
      this.storage.clearAuthTokens();
    }
  }

  selectTienda(tiendaId: number): void {
    this.storage.setLastTiendaId(tiendaId);
    this._state.update(s => ({ ...s, selectedTiendaId: tiendaId }));
  }

  clearTiendaSelection(): void {
    this._state.update(s => ({ ...s, selectedTiendaId: null }));
  }

  updateUserMe(userMe: UserMeModel): void {
    this._state.update(s => ({ ...s, userMe }));
  }

  private mapUserMe(json: Record<string, unknown>): UserMeModel {
    return {
      id: json['id'] as number,
      username: json['username'] as string,
      email: json['email'] as string,
      firstName: (json['first_name'] as string) ?? '',
      lastName: (json['last_name'] as string) ?? '',
      rol: (json['rol'] as string) ?? null,
      tiendas: ((json['tiendas'] as Record<string, unknown>[]) ?? []).map(
        (t): UserTiendaModel => ({
          tiendaId: t['tienda_id'] as number,
          tiendaNombre: t['tienda_nombre'] as string,
        }),
      ),
    };
  }
}
