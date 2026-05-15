import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { ServicioRepository } from './servicio.repository';
import { ServicioFormService } from './servicio-form.service';
import { ResumenServicioService } from './resumen-servicio.service';
import { ServicioReadModel } from './models/servicio-read.model';
import { NotaCreditoData } from './models/nota-credito.model';

export interface ServicioServiceState {
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  servicioCreado: ServicioReadModel | null;
}

const INITIAL: ServicioServiceState = {
  isLoading: false,
  isSaving: false,
  errorMessage: null,
  successMessage: null,
  servicioCreado: null,
};

interface ServicioHistorialState {
  servicios: ServicioReadModel[];
  nextCursor: string | null;
  isLoading: boolean;
}

const HISTORIAL_INITIAL: ServicioHistorialState = {
  servicios: [], nextCursor: null, isLoading: false,
};

@Injectable({ providedIn: 'root' })
export class ServicioService {
  private readonly repo = inject(ServicioRepository);
  private readonly auth = inject(AuthService);
  private readonly formSvc = inject(ServicioFormService);
  private readonly resumenSvc = inject(ResumenServicioService);

  private readonly _state = signal<ServicioServiceState>(INITIAL);
  readonly state = this._state.asReadonly();

  private readonly _historial = signal<ServicioHistorialState>(HISTORIAL_INITIAL);
  readonly historial = this._historial.asReadonly();

  async crearServicio(): Promise<ServicioReadModel | null> {
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) {
      this._state.update(s => ({ ...s, errorMessage: 'No hay tienda seleccionada' }));
      return null;
    }

    const form = this.formSvc.state();
    const resumen = this.resumenSvc.state();

    if (!form.fechaInicio || !form.fechaFin || !form.total) {
      this._state.update(s => ({ ...s, errorMessage: 'Completa los datos del servicio primero' }));
      return null;
    }

    const payload = {
      tiendaId,
      descripcion: form.descripcion || undefined,
      fechaInicio: form.fechaInicio,
      fechaFin: form.fechaFin,
      total: form.total,
      tipo: resumen.tipoVenta,
      metodoPago: resumen.metodoPago,
      tipoComprobante: resumen.tipoVenta === 'SUNAT' && resumen.tipoComprobante
        ? resumen.tipoComprobante
        : undefined,
      clienteId: resumen.clienteId ?? undefined,
      clienteNuevo: (!resumen.clienteId && resumen.usarClienteNuevo && resumen.clienteNuevo.nombre)
        ? {
            tipoDocumento: resumen.clienteNuevo.tipoDocumento,
            numeroDocumento: resumen.clienteNuevo.numeroDocumento,
            nombre: resumen.clienteNuevo.nombre,
            telefono: resumen.clienteNuevo.telefono,
            email: resumen.clienteNuevo.email,
            direccion: resumen.clienteNuevo.direccion,
          }
        : undefined,
    };

    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      const servicio = await this.repo.crearServicio(payload);
      this._state.update(s => ({
        ...s,
        isSaving: false,
        servicioCreado: servicio,
        successMessage: 'Servicio registrado exitosamente.',
      }));
      return servicio;
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: (err as Error).message }));
      return null;
    }
  }

  async emitirNotaCredito(motivo: string, codigoTipo = '01', precioNuevo?: string): Promise<NotaCreditoData | null> {
    const numero = this._state().servicioCreado?.numeroComprobante;
    if (!numero) return null;

    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      const result = await this.repo.emitirNotaCredito(numero, { motivo, codigoTipo, precioNuevo });
      this._state.update(s => ({
        ...s,
        isSaving: false,
        servicioCreado: result.servicio,
        successMessage: 'Nota de crédito emitida exitosamente.',
      }));
      return result.notaCredito;
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: (err as Error).message }));
      return null;
    }
  }

  async anularServicio(motivo: string): Promise<boolean> {
    const numero = this._state().servicioCreado?.numeroComprobante;
    if (!numero) return false;

    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      const servicio = await this.repo.anularServicio(numero, motivo);
      this._state.update(s => ({
        ...s,
        isSaving: false,
        servicioCreado: servicio,
        successMessage: 'Servicio anulado.',
      }));
      return true;
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: (err as Error).message }));
      return false;
    }
  }

  async eliminarServicio(): Promise<boolean> {
    const numero = this._state().servicioCreado?.numeroComprobante;
    if (!numero) return false;

    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      await this.repo.eliminarServicio(numero);
      this._state.update(s => ({ ...s, isSaving: false, successMessage: 'Servicio eliminado.' }));
      return true;
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: (err as Error).message }));
      return false;
    }
  }

  async cargarServicios(filtros?: {
    tipo?: string;
    estadoSunat?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    search?: string;
  }): Promise<void> {
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) return;
    this._historial.update(s => ({ ...s, isLoading: true }));
    try {
      const result = await this.repo.getServicios(tiendaId, undefined, filtros);
      this._historial.set({ servicios: result.items, nextCursor: result.nextCursor, isLoading: false });
    } catch {
      this._historial.update(s => ({ ...s, isLoading: false }));
    }
  }

  async cargarMasServicios(): Promise<void> {
    const cursor = this._historial().nextCursor;
    if (!cursor) return;
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) return;
    this._historial.update(s => ({ ...s, isLoading: true }));
    try {
      const result = await this.repo.getServicios(tiendaId, cursor);
      this._historial.update(s => ({
        servicios: [...s.servicios, ...result.items],
        nextCursor: result.nextCursor,
        isLoading: false,
      }));
    } catch {
      this._historial.update(s => ({ ...s, isLoading: false }));
    }
  }

  async descargarTicketPdf(numeroComprobante: string): Promise<void> {
    try {
      const blob = await this.repo.descargarTicketPdf(numeroComprobante);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 15_000);
    } catch { /* silently fail */ }
  }

  limpiarFlujo(): void {
    this.formSvc.limpiar();
    this.resumenSvc.limpiar();
    this._state.set(INITIAL);
  }

  async consultarEstadoSunat(numeroComprobante: string): Promise<ServicioReadModel | null> {
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      const servicio = await this.repo.consultarEstadoSunat(numeroComprobante);
      this._state.update(s => ({ ...s, isSaving: false, servicioCreado: servicio }));
      return servicio;
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: (err as Error).message }));
      return null;
    }
  }

  clearMessages(): void {
    this._state.update(s => ({ ...s, errorMessage: null, successMessage: null }));
  }
}
