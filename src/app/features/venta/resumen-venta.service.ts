import { Injectable, signal } from '@angular/core';
import { ClienteModel } from './models/cliente.model';
import { ClienteNuevoInput } from './models/venta-create.model';

export interface ResumenVentaState {
  tipoVenta: string;
  metodoPago: string;
  tipoComprobante: string | null;
  clienteId: number | null;
  clienteNombre: string | null;
  usarClienteNuevo: boolean;
  clienteNuevo: Partial<ClienteNuevoInput>;
  notas: string;
}

const INITIAL: ResumenVentaState = {
  tipoVenta: 'NORMAL',
  metodoPago: 'EFECTIVO',
  tipoComprobante: null,
  clienteId: null,
  clienteNombre: null,
  usarClienteNuevo: false,
  clienteNuevo: {},
  notas: '',
};

@Injectable({ providedIn: 'root' })
export class ResumenVentaService {
  private readonly _state = signal<ResumenVentaState>(INITIAL);
  readonly state = this._state.asReadonly();

  actualizar(partial: Partial<ResumenVentaState>): void {
    this._state.update(s => ({ ...s, ...partial }));
  }

  seleccionarCliente(cliente: ClienteModel): void {
    this._state.update(s => ({
      ...s,
      clienteId: cliente.id,
      clienteNombre: cliente.nombre,
      usarClienteNuevo: false,
      clienteNuevo: {},
    }));
  }

  limpiar(): void {
    this._state.set(INITIAL);
  }
}
