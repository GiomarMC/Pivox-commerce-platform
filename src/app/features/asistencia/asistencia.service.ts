import { Injectable, signal, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { AsistenciaRepository } from './asistencia.repository';
import { UsuariosRepository } from '../usuarios/usuarios.repository';
import { Roles } from '../../core/auth/auth.models';
import {
  AsistenciaModel,
  AsistenciaResumenModel,
  UsuarioConAsistencia,
} from './models/asistencia.model';

export interface AsistenciaState {
  isLoading: boolean;
  isMarking: boolean;
  isLoadingResumen: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  usuariosHoy: UsuarioConAsistencia[];
  resumen: AsistenciaResumenModel[];
  mesResumen: number;
  anioResumen: number;
}

@Injectable({ providedIn: 'root' })
export class AsistenciaService {
  private readonly repo = inject(AsistenciaRepository);
  private readonly usuariosRepo = inject(UsuariosRepository);
  private readonly auth = inject(AuthService);

  private readonly now = new Date();

  private readonly _state = signal<AsistenciaState>({
    isLoading: false,
    isMarking: false,
    isLoadingResumen: false,
    errorMessage: null,
    successMessage: null,
    usuariosHoy: [],
    resumen: [],
    mesResumen: this.now.getMonth() + 1,
    anioResumen: this.now.getFullYear(),
  });

  readonly state = this._state.asReadonly();

  private fechaHoy(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  async cargarAsistenciasHoy(): Promise<void> {
    const tiendaId = this.auth.selectedTiendaId() ?? undefined;
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null }));
    try {
      const [usuarios, asistencias] = await Promise.all([
        this.usuariosRepo.getUsuarios({ tiendaId }),
        this.repo.getAsistencias({ fecha: this.fechaHoy() }),
      ]);

      const usuariosHoy: UsuarioConAsistencia[] = usuarios
        .filter(u => u.usuarioIsActive && u.rol !== Roles.dueno)
        .map(usuario => ({
          usuario,
          asistencia: asistencias.find(a => a.usuarioTienda === usuario.id) ?? null,
        }));

      this._state.update(s => ({ ...s, isLoading: false, usuariosHoy }));
    } catch (err: unknown) {
      this._state.update(s => ({ ...s, isLoading: false, errorMessage: (err as Error).message }));
    }
  }

  async cargarResumen(mes?: number, anio?: number): Promise<void> {
    const m = mes ?? this._state().mesResumen;
    const a = anio ?? this._state().anioResumen;
    this._state.update(s => ({ ...s, isLoadingResumen: true, errorMessage: null, mesResumen: m, anioResumen: a }));
    try {
      const resumen = await this.repo.getResumen({ mes: m, anio: a });
      this._state.update(s => ({ ...s, isLoadingResumen: false, resumen }));
    } catch (err: unknown) {
      this._state.update(s => ({ ...s, isLoadingResumen: false, errorMessage: (err as Error).message }));
    }
  }

  async marcarEntrada(usuarioTiendaId: number): Promise<void> {
    this._state.update(s => ({ ...s, isMarking: true, errorMessage: null }));
    try {
      await this.repo.marcarEntrada(usuarioTiendaId);
      this._state.update(s => ({ ...s, isMarking: false, successMessage: 'Entrada registrada' }));
      await this.cargarAsistenciasHoy();
    } catch (err: unknown) {
      this._state.update(s => ({ ...s, isMarking: false, errorMessage: (err as Error).message }));
    }
  }

  async marcarSalida(usuarioTiendaId: number, almuerzo: boolean): Promise<void> {
    this._state.update(s => ({ ...s, isMarking: true, errorMessage: null }));
    try {
      await this.repo.marcarSalida(usuarioTiendaId, almuerzo);
      this._state.update(s => ({ ...s, isMarking: false, successMessage: 'Salida registrada' }));
      await this.cargarAsistenciasHoy();
    } catch (err: unknown) {
      this._state.update(s => ({ ...s, isMarking: false, errorMessage: (err as Error).message }));
    }
  }

  clearMessages(): void {
    this._state.update(s => ({ ...s, errorMessage: null, successMessage: null }));
  }
}
