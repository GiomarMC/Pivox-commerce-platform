import { Injectable, signal, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { UsuariosRepository } from './usuarios.repository';
import { UsuarioTiendaModel } from './models/usuario-tienda.model';
import { environment } from '../../../environments/environment';

export interface UsuariosState {
  isLoading: boolean;
  isEditing: boolean;
  isRefreshing: boolean;
  errorMessage: string | null;
  usuarios: UsuarioTiendaModel[];
  rolSeleccionado: string | null;
  invitationLink: string | null;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly repo = inject(UsuariosRepository);
  private readonly auth = inject(AuthService);

  private readonly _state = signal<UsuariosState>({
    isLoading: false,
    isEditing: false,
    isRefreshing: false,
    errorMessage: null,
    usuarios: [],
    rolSeleccionado: null,
    invitationLink: null,
  });

  readonly state = this._state.asReadonly();

  async cargarUsuarios(rol?: string): Promise<void> {
    const tiendaId = this.auth.selectedTiendaId() ?? undefined;
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null }));
    try {
      const usuarios = await this.repo.getUsuarios({
        tiendaId,
        rol: rol ?? this._state().rolSeleccionado ?? undefined,
      });
      this._state.update(s => ({ ...s, isLoading: false, usuarios }));
    } catch (err: unknown) {
      this._state.update(s => ({ ...s, isLoading: false, errorMessage: (err as Error).message }));
    }
  }

  seleccionarRol(rol: string | null): void {
    this._state.update(s => ({ ...s, rolSeleccionado: rol }));
    this.cargarUsuarios(rol ?? undefined);
  }

  async editarUsuario(payload: { id: number; tiendaId?: number; rol?: string; salario?: string }): Promise<void> {
    this._state.update(s => ({ ...s, isEditing: true, errorMessage: null }));
    try {
      const actualizado = await this.repo.editarUsuario(payload);
      this._state.update(s => ({
        ...s,
        isEditing: false,
        usuarios: s.usuarios.map(u => (u.id === payload.id ? actualizado : u)),
      }));
    } catch (err: unknown) {
      this._state.update(s => ({ ...s, isEditing: false, errorMessage: (err as Error).message }));
    }
  }

  async toggleEstado(id: number): Promise<void> {
    this._state.update(s => ({ ...s, isEditing: true, errorMessage: null }));
    try {
      const actualizado = await this.repo.toggleEstado(id);
      this._state.update(s => ({
        ...s,
        isEditing: false,
        usuarios: s.usuarios.map(u => (u.id === id ? actualizado : u)),
      }));
    } catch (err: unknown) {
      this._state.update(s => ({ ...s, isEditing: false, errorMessage: (err as Error).message }));
    }
  }

  async refrescarInvitacion(usuarioId: number): Promise<void> {
    this._state.update(s => ({ ...s, isRefreshing: true, errorMessage: null, invitationLink: null }));
    try {
      const resp = await this.repo.refrescarInvitacion(usuarioId);
      const link = `${environment.inviteBaseUrl}?token=${resp.token}`;
      this._state.update(s => ({ ...s, isRefreshing: false, invitationLink: link }));
    } catch (err: unknown) {
      this._state.update(s => ({ ...s, isRefreshing: false, errorMessage: (err as Error).message }));
    }
  }

  clearInvitationLink(): void {
    this._state.update(s => ({ ...s, invitationLink: null }));
  }

  clearMessages(): void {
    this._state.update(s => ({ ...s, errorMessage: null }));
  }
}
