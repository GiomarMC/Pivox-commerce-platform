import { VentaLineaModel, NotaCreditoModel } from '../../venta/models/venta-read.model';
import { NotaCreditoData } from '../../servicio/models/nota-credito.model';

export interface OperacionModel {
  id: string;
  numeroComprobante: string;
  tipo: 'VENTA' | 'SERVICIO';
  tipoVenta: string;
  tipoDisplay: string;
  fecha: string;
  clienteNombre: string | null;
  total: number;
  estadoSunat: string | null;
  metodoPago: string | null;
  tipoComprobante: string | null;
  isActive: boolean;
  isCancelada: boolean;
  motivoRechazo: string | null;
  // Servicio fields
  descripcion: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  deuda: number;
  // Venta fields
  igvTotal: string | null;
  subtotal: string | null;
  detalles: VentaLineaModel[];
  notaCredito: NotaCreditoModel | null;
  notaCreditoServicio: NotaCreditoData | null;
  urlPdfTicket: string | null;
}
