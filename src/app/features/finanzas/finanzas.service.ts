import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { FinanzasRepository } from './finanzas.repository';
import { CajaResumenModel } from './models/caja-resumen.model';
import { DeudaModel } from './models/deuda.model';
import { PagoModel } from './models/pago.model';
import { GastoTipoModel } from './models/gasto-tipo.model';
import { GastoFijoResumenModel } from './models/gasto-fijo-resumen.model';
import { GastoVariableResumenModel } from './models/gasto-variable-resumen.model';

export interface FinanzasState {
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  cajaResumen: CajaResumenModel | null;
  deudas: DeudaModel[];
  pagos: PagoModel[];
  tiposGasto: GastoTipoModel[];
  gastosFijosResumen: GastoFijoResumenModel | null;
  gastosVariablesResumen: GastoVariableResumenModel | null;
  deudasDashboard: DeudaModel[];
  deudasDashboardLoading: boolean;
}

const INITIAL: FinanzasState = {
  isLoading: false,
  isSaving: false,
  errorMessage: null,
  successMessage: null,
  cajaResumen: null,
  deudas: [],
  pagos: [],
  tiposGasto: [],
  gastosFijosResumen: null,
  gastosVariablesResumen: null,
  deudasDashboard: [],
  deudasDashboardLoading: false,
};

@Injectable({ providedIn: 'root' })
export class FinanzasService {
  private readonly repo = inject(FinanzasRepository);
  private readonly auth = inject(AuthService);

  private readonly _state = signal<FinanzasState>(INITIAL);
  readonly state = this._state.asReadonly();

  async cargarCajaResumen(): Promise<void> {
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) return;
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null }));
    try {
      const cajaResumen = await this.repo.getCajaResumen(tiendaId);
      this._state.update(s => ({ ...s, isLoading: false, cajaResumen }));
    } catch (err) {
      this._state.update(s => ({ ...s, isLoading: false, errorMessage: (err as Error).message }));
    }
  }

  async cerrarCaja(montoReal: string, observaciones: string): Promise<boolean> {
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) return false;
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      await this.repo.cerrarCaja(tiendaId, montoReal, observaciones);
      this._state.update(s => ({ ...s, isSaving: false, successMessage: 'Caja cerrada correctamente' }));
      await this.cargarCajaResumen();
      return true;
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: (err as Error).message }));
      return false;
    }
  }

  async cargarDeudas(filters: {
    cliente?: number;
    estado?: string;
    servicio?: number;
    venta?: number;
  } = {}): Promise<void> {
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null }));
    try {
      const deudas = await this.repo.getDeudas(filters);
      this._state.update(s => ({ ...s, isLoading: false, deudas }));
    } catch (err) {
      this._state.update(s => ({ ...s, isLoading: false, errorMessage: (err as Error).message }));
    }
  }

  async buscarDeudasPorDocumento(numeroDocumento: string): Promise<void> {
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null, deudas: [] }));
    try {
      const cliente = await this.repo.buscarClientePorDocumento(numeroDocumento);
      if (!cliente) {
        this._state.update(s => ({ ...s, isLoading: false, errorMessage: 'Cliente no encontrado' }));
        return;
      }
      const deudas = await this.repo.getDeudas({ cliente: cliente.id });
      const msg = deudas.length === 0 ? 'No hay deudas activas para este cliente' : null;
      this._state.update(s => ({ ...s, isLoading: false, deudas, errorMessage: msg }));
    } catch (err) {
      this._state.update(s => ({ ...s, isLoading: false, errorMessage: (err as Error).message }));
    }
  }

  async buscarDeudasPorComprobante(numeroComprobante: string): Promise<void> {
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null, deudas: [] }));
    try {
      const [venta, servicio] = await Promise.all([
        this.repo.buscarVentaPorComprobante(numeroComprobante),
        this.repo.buscarServicioPorComprobante(numeroComprobante),
      ]);

      if (!venta && !servicio) {
        this._state.update(s => ({ ...s, isLoading: false, errorMessage: 'Comprobante no encontrado' }));
        return;
      }

      const filters = venta ? { venta: venta.id } : { servicio: servicio!.id };
      const deudas = await this.repo.getDeudas(filters);
      const msg = deudas.length === 0 ? 'No hay deudas para este comprobante' : null;
      this._state.update(s => ({ ...s, isLoading: false, deudas, errorMessage: msg }));
    } catch (err) {
      this._state.update(s => ({ ...s, isLoading: false, errorMessage: (err as Error).message }));
    }
  }

  async registrarPago(deudaId: number, monto: string): Promise<Blob | null> {
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      const pdfBlob = await this.repo.registrarPago(deudaId, monto);
      this._state.update(s => ({ ...s, isSaving: false, successMessage: 'Pago registrado correctamente' }));
      return pdfBlob;
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: (err as Error).message }));
      return null;
    }
  }

  async cargarPagos(filters: {
    deudaCliente?: number;
    deudaEstado?: string;
  } = {}): Promise<void> {
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null }));
    try {
      const pagos = await this.repo.getPagos(filters);
      this._state.update(s => ({ ...s, isLoading: false, pagos }));
    } catch (err) {
      this._state.update(s => ({ ...s, isLoading: false, errorMessage: (err as Error).message }));
    }
  }

  async cargarTiposGasto(): Promise<void> {
    try {
      const tiposGasto = await this.repo.getTiposGasto();
      this._state.update(s => ({ ...s, tiposGasto }));
    } catch (err) {
      this._state.update(s => ({ ...s, errorMessage: (err as Error).message }));
    }
  }

  async cargarGastosFijosResumen(mes: number, anio: number): Promise<void> {
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) return;
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null }));
    try {
      const gastosFijosResumen = await this.repo.getGastosFijosResumen(tiendaId, mes, anio);
      this._state.update(s => ({ ...s, isLoading: false, gastosFijosResumen }));
    } catch (err) {
      this._state.update(s => ({ ...s, isLoading: false, errorMessage: (err as Error).message }));
    }
  }

  async crearGastoFijo(tipoGasto: string, mes: number, anio: number, monto: string): Promise<boolean> {
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) return false;
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      await this.repo.crearGastoFijo({ tiendaId, tipoGasto, mes, anio, monto });
      this._state.update(s => ({ ...s, isSaving: false, successMessage: 'Gasto fijo registrado correctamente' }));
      await this.cargarGastosFijosResumen(mes, anio);
      return true;
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: (err as Error).message }));
      return false;
    }
  }

  async cargarGastosVariablesResumen(mes: number, anio: number): Promise<void> {
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) return;
    this._state.update(s => ({ ...s, isLoading: true, errorMessage: null }));
    try {
      const gastosVariablesResumen = await this.repo.getGastosVariablesResumen(tiendaId, mes, anio);
      this._state.update(s => ({ ...s, isLoading: false, gastosVariablesResumen }));
    } catch (err) {
      this._state.update(s => ({ ...s, isLoading: false, errorMessage: (err as Error).message }));
    }
  }

  async crearGastoVariable(descripcion: string, monto: string, fecha: string): Promise<boolean> {
    const tiendaId = this.auth.selectedTiendaId();
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      await this.repo.crearGastoVariable({ descripcion, monto, fecha, tiendaId: tiendaId ?? undefined });
      this._state.update(s => ({ ...s, isSaving: false, successMessage: 'Gasto variable registrado correctamente' }));
      const parts = fecha.split('-');
      if (parts.length === 3) {
        await this.cargarGastosVariablesResumen(parseInt(parts[1], 10), parseInt(parts[0], 10));
      }
      return true;
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: (err as Error).message }));
      return false;
    }
  }

  async cerrarMesGastos(mes: number, anio: number): Promise<boolean> {
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) return false;
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      await this.repo.cerrarMesGastos(tiendaId, mes, anio);
      this._state.update(s => ({ ...s, isSaving: false, successMessage: 'Mes de gastos cerrado correctamente' }));
      await Promise.all([
        this.cargarGastosFijosResumen(mes, anio),
        this.cargarGastosVariablesResumen(mes, anio),
      ]);
      return true;
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: (err as Error).message }));
      return false;
    }
  }

  async cargarDeudasDashboard(): Promise<void> {
    this._state.update(s => ({ ...s, deudasDashboardLoading: true }));
    try {
      const deudas = await this.repo.getDeudas({ estado: 'ACTIVA' });
      this._state.update(s => ({ ...s, deudasDashboardLoading: false, deudasDashboard: deudas }));
    } catch {
      this._state.update(s => ({ ...s, deudasDashboardLoading: false }));
    }
  }

  clearMessages(): void {
    this._state.update(s => ({ ...s, errorMessage: null, successMessage: null }));
  }
}
