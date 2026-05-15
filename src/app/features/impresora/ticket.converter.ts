export interface TicketItem {
  nombre: string;
  cantidad: number;
  precio: number;
}

export interface TicketData {
  nombreTienda: string;
  ruc: string;
  direccion?: string;
  items: TicketItem[];
  subtotal?: number;
  igv?: number;
  total: number;
  metodoPago: string | null;
  tipoComprobante?: string;
  numeroComprobante?: string;
  clienteNombre?: string;
  fecha: string;
}

export class TicketConverter {
  private readonly ESC = '\x1B';
  private readonly GS = '\x1D';
  private readonly ANCHO = 32;

  toEscPos(ticket: TicketData): string {
    let out = '';

    out += `${this.ESC}@`;        // Init impresora
    out += `${this.ESC}a\x01`;    // Centrar

    out += `${this.ESC}!\x10`;    // Doble alto
    out += `${ticket.nombreTienda}\n`;
    out += `${this.ESC}!\x00`;    // Normal

    if (ticket.ruc) out += `RUC: ${ticket.ruc}\n`;
    if (ticket.direccion) out += `${ticket.direccion}\n`;
    out += `${ticket.fecha}\n`;

    if (ticket.tipoComprobante && ticket.numeroComprobante) {
      out += `${this.ESC}a\x01`;
      out += `${ticket.tipoComprobante === '01' ? 'FACTURA' : ticket.tipoComprobante === '03' ? 'BOLETA' : 'COMPROBANTE'}\n`;
      out += `N° ${ticket.numeroComprobante}\n`;
    }

    out += `${this.ESC}a\x00`;    // Izquierda
    out += `${'-'.repeat(this.ANCHO)}\n`;

    if (ticket.clienteNombre) {
      out += `Cliente: ${ticket.clienteNombre}\n`;
    }

    for (const item of ticket.items) {
      const subtotalItem = (item.cantidad * item.precio).toFixed(2);
      const linea = `${item.nombre}`;
      const detalle = `  ${item.cantidad} x S/${item.precio.toFixed(2)}`;
      const padding = this.ANCHO - detalle.length - subtotalItem.length;
      out += `${linea}\n`;
      out += `${detalle}${' '.repeat(Math.max(0, padding))}${subtotalItem}\n`;
    }

    out += `${'-'.repeat(this.ANCHO)}\n`;

    if (ticket.subtotal != null && ticket.igv != null) {
      out += this.fila('Subtotal', `S/${ticket.subtotal.toFixed(2)}`);
      out += this.fila('IGV (18%)', `S/${ticket.igv.toFixed(2)}`);
      out += `${'-'.repeat(this.ANCHO)}\n`;
    }

    out += `${this.ESC}!\x10`;    // Doble alto
    out += this.fila('TOTAL', `S/${ticket.total.toFixed(2)}`);
    out += `${this.ESC}!\x00`;    // Normal

    if (ticket.metodoPago) out += `Pago: ${ticket.metodoPago}\n\n`;

    out += `${this.ESC}a\x01`;    // Centrar
    out += `Gracias por su preferencia\n\n`;

    out += `${this.GS}V\x41\x03`; // Cortar papel
    return out;
  }

  private fila(label: string, valor: string): string {
    const espacio = this.ANCHO - label.length - valor.length;
    return `${label}${' '.repeat(Math.max(1, espacio))}${valor}\n`;
  }
}
