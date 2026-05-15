import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { VentaRepository } from './venta.repository';
import { CarritoService } from './carrito.service';
import { ResumenVentaService } from './resumen-venta.service';
import { VentaReadModel } from './models/venta-read.model';
import { VentaCreateModel } from './models/venta-create.model';

interface VentaServiceState {
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  ventaCreada: VentaReadModel | null;
}

const INITIAL: VentaServiceState = {
  isLoading: false,
  isSaving: false,
  errorMessage: null,
  successMessage: null,
  ventaCreada: null,
};

interface VentaHistorialState {
  ventas: VentaReadModel[];
  nextCursor: string | null;
  isLoading: boolean;
}

const HISTORIAL_INITIAL: VentaHistorialState = {
  ventas: [], nextCursor: null, isLoading: false,
};

@Injectable({ providedIn: 'root' })
export class VentaService {
  private readonly repo = inject(VentaRepository);
  private readonly carritoSvc = inject(CarritoService);
  private readonly resumenSvc = inject(ResumenVentaService);
  private readonly auth = inject(AuthService);

  private readonly _state = signal<VentaServiceState>(INITIAL);
  readonly state = this._state.asReadonly();

  private readonly _historial = signal<VentaHistorialState>(HISTORIAL_INITIAL);
  readonly historial = this._historial.asReadonly();

  async crearVenta(): Promise<VentaReadModel | null> {
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) {
      this._state.update(s => ({ ...s, errorMessage: 'No hay tienda seleccionada' }));
      return null;
    }
    const items = this.carritoSvc.items();
    if (items.length === 0) {
      this._state.update(s => ({ ...s, errorMessage: 'El carrito está vacío' }));
      return null;
    }
    const resumen = this.resumenSvc.state();

    const payload: VentaCreateModel = {
      tienda: tiendaId,
      tipoVenta: resumen.tipoVenta,
      metodoPago: resumen.metodoPago,
      detalles: items.map(i => ({
        productoId: i.productoId,
        loteProductoId: i.loteProductoId ?? undefined,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        esAveriado: i.esAveriado,
      })),
    };
    if (resumen.tipoVenta === 'SUNAT' && resumen.tipoComprobante) {
      payload.tipoComprobante = resumen.tipoComprobante;
    }
    if (resumen.clienteId != null) {
      payload.clienteId = resumen.clienteId;
    } else if (resumen.usarClienteNuevo && resumen.clienteNuevo.nombre) {
      payload.clienteNuevo = {
        tipoDocumento: resumen.clienteNuevo.tipoDocumento ?? '1',
        numeroDocumento: resumen.clienteNuevo.numeroDocumento ?? '',
        nombre: resumen.clienteNuevo.nombre,
        email: resumen.clienteNuevo.email,
        telefono: resumen.clienteNuevo.telefono,
        direccion: resumen.clienteNuevo.direccion,
      };
    }
    if (resumen.notas) payload.notas = resumen.notas;

    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      const venta = await this.repo.crearVenta(payload);
      const msg = venta.propuestaSunat.length > 0
        ? 'Venta creada. Revisa la propuesta SUNAT.'
        : 'Venta creada exitosamente.';
      this._state.update(s => ({ ...s, isSaving: false, ventaCreada: venta, successMessage: msg }));
      return venta;
    } catch (err) {
      let msg = (err as Error).message;
      msg = msg.replace(/^(\d+): /, (_, idx: string) => {
        const item = items[parseInt(idx, 10)];
        return item ? `${item.nombre}: ` : '';
      });
      msg = msg.replace(/\b(\d+)\.0+\b/g, '$1').replace(/\b(\d+\.\d*[1-9])0+\b/g, '$1');
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: msg }));
      return null;
    }
  }

  async confirmarSunat(
    lineas: { loteProductoId: number; cantidadConfirmada: string; precioConfirmado: string; esRelleno?: boolean; loteProductoOriginalId?: number | null }[],
  ): Promise<VentaReadModel | null> {
    const id = this._state().ventaCreada?.id;
    if (!id) return null;
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      const venta = await this.repo.confirmarSunat(id, lineas);
      this._state.update(s => ({
        ...s,
        isSaving: false,
        ventaCreada: venta,
        successMessage: 'Propuesta SUNAT confirmada.',
      }));
      return venta;
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: (err as Error).message }));
      return null;
    }
  }

  async emitirNotaCredito(motivo: string): Promise<boolean> {
    const numero = this._state().ventaCreada?.numero;
    if (!numero) return false;
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      const venta = await this.repo.notaCredito(numero, motivo);
      this._state.update(s => ({
        ...s,
        isSaving: false,
        ventaCreada: venta,
        successMessage: 'Nota de crédito emitida.',
      }));
      return true;
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: (err as Error).message }));
      return false;
    }
  }

  async cancelarVentaSinLimpiarCarrito(): Promise<boolean> {
    const numero = this._state().ventaCreada?.numero;
    if (!numero) return true;
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      await this.repo.cancelarVenta(numero);
      this._state.update(s => ({ ...s, isSaving: false, ventaCreada: null, errorMessage: null, successMessage: null }));
      return true;
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: (err as Error).message }));
      return false;
    }
  }

  async cancelarVenta(): Promise<boolean> {
    const numero = this._state().ventaCreada?.numero;
    if (!numero) return false;
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      await this.repo.cancelarVenta(numero);
      this.limpiarFlujo();
      return true;
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: (err as Error).message }));
      return false;
    }
  }

  async anularVenta(motivo: string): Promise<boolean> {
    const numero = this._state().ventaCreada?.numero;
    if (!numero) return false;
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      const venta = await this.repo.anularVenta(numero, motivo);
      this._state.update(s => ({
        ...s,
        isSaving: false,
        ventaCreada: venta,
        successMessage: 'Venta anulada.',
      }));
      return true;
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: (err as Error).message }));
      return false;
    }
  }

  async cargarVentas(filtros?: {
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
      const result = await this.repo.getVentas(tiendaId, filtros);
      this._historial.set({ ventas: result.items, nextCursor: result.nextCursor, isLoading: false });
    } catch {
      this._historial.update(s => ({ ...s, isLoading: false }));
    }
  }

  async cargarMasVentas(): Promise<void> {
    const cursor = this._historial().nextCursor;
    if (!cursor) return;
    const tiendaId = this.auth.selectedTiendaId();
    if (!tiendaId) return;
    this._historial.update(s => ({ ...s, isLoading: true }));
    try {
      const result = await this.repo.getVentas(tiendaId, { cursor });
      this._historial.update(s => ({
        ventas: [...s.ventas, ...result.items],
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
    this.carritoSvc.limpiar();
    this.resumenSvc.limpiar();
    this._state.set(INITIAL);
  }

  async consultarEstadoSunat(numeroComprobante: string): Promise<VentaReadModel | null> {
    this._state.update(s => ({ ...s, isSaving: true, errorMessage: null }));
    try {
      const venta = await this.repo.consultarEstadoSunat(numeroComprobante);
      this._state.update(s => ({ ...s, isSaving: false, ventaCreada: venta }));
      return venta;
    } catch (err) {
      this._state.update(s => ({ ...s, isSaving: false, errorMessage: (err as Error).message }));
      return null;
    }
  }

  clearMessages(): void {
    this._state.update(s => ({ ...s, errorMessage: null, successMessage: null }));
  }
}
