import { Injectable, signal } from '@angular/core';
import { ClienteModel } from '../venta/models/cliente.model';

export interface ResumenServicioState {
  tipoVenta: string;
  metodoPago: string;
  tipoComprobante: string | null;
  clienteId: number | null;
  clienteNombre: string | null;
  usarClienteNuevo: boolean;
  clienteNuevo: {
    tipoDocumento: string;
    numeroDocumento: string;
    nombre: string;
    telefono: string;
    email: string;
    direccion: string;
  };
}

const INITIAL: ResumenServicioState = {
  tipoVenta: 'NORMAL',
  metodoPago: 'EFECTIVO',
  tipoComprobante: null,
  clienteId: null,
  clienteNombre: null,
  usarClienteNuevo: false,
  clienteNuevo: {
    tipoDocumento: '1',
    numeroDocumento: '',
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
  },
};

@Injectable({ providedIn: 'root' })
export class ResumenServicioService {
  private readonly _state = signal<ResumenServicioState>(INITIAL);
  readonly state = this._state.asReadonly();

  actualizar(partial: Partial<ResumenServicioState>): void {
    this._state.update(s => ({ ...s, ...partial }));
  }

  seleccionarCliente(cliente: ClienteModel): void {
    this._state.update(s => ({
      ...s,
      clienteId: cliente.id,
      clienteNombre: cliente.nombre,
      usarClienteNuevo: false,
    }));
  }

  limpiar(): void {
    this._state.set(INITIAL);
  }
}
