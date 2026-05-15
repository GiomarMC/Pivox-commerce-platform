import { Injectable, signal } from '@angular/core';

export interface ServicioFormState {
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  total: string;
}

const INITIAL: ServicioFormState = {
  descripcion: '',
  fechaInicio: '',
  fechaFin: '',
  total: '',
};

@Injectable({ providedIn: 'root' })
export class ServicioFormService {
  private readonly _state = signal<ServicioFormState>(INITIAL);
  readonly state = this._state.asReadonly();

  actualizar(partial: Partial<ServicioFormState>): void {
    this._state.update(s => ({ ...s, ...partial }));
  }

  limpiar(): void {
    this._state.set(INITIAL);
  }
}
