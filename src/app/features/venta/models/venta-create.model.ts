export interface DetalleVentaCreate {
  productoId: number;
  loteProductoId?: number;
  cantidad: number;
  precioUnitario: number;
  esAveriado: boolean;
}

export interface ClienteNuevoInput {
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  email?: string;
  telefono?: string;
  direccion?: string;
}

export interface VentaCreateModel {
  tienda: number;
  tipoVenta: string;
  metodoPago?: string;
  tipoComprobante?: string;
  clienteId?: number;
  clienteNuevo?: ClienteNuevoInput;
  detalles: DetalleVentaCreate[];
  notas?: string;
}

export function ventaCreateModelToJson(m: VentaCreateModel): Record<string, unknown> {
  const body: Record<string, unknown> = {
    tienda_id: m.tienda,
    tipo: m.tipoVenta,
    productos: m.detalles.map(d => {
      const det: Record<string, unknown> = {
        cantidad: String(d.cantidad),
        precio_venta: String(d.precioUnitario),
        es_averiado: d.esAveriado,
      };
      if (d.loteProductoId != null) {
        det['lote_producto_id'] = d.loteProductoId;
      } else {
        det['producto_id'] = d.productoId;
      }
      return det;
    }),
  };
  if (m.tipoVenta !== 'CREDITO' && m.metodoPago) body['metodo_pago'] = m.metodoPago;
  if (m.tipoComprobante != null) body['tipo_comprobante'] = m.tipoComprobante;
  if (m.clienteId != null) body['cliente_id'] = m.clienteId;
  if (m.clienteNuevo != null) {
    const c = m.clienteNuevo;
    const cn: Record<string, unknown> = { nombre: c.nombre };
    if (c.tipoDocumento) cn['tipo_documento'] = c.tipoDocumento;
    if (c.numeroDocumento) cn['numero_documento'] = c.numeroDocumento;
    if (c.email) cn['email'] = c.email;
    if (c.telefono) cn['telefono'] = c.telefono;
    if (c.direccion) cn['direccion'] = c.direccion;
    body['cliente'] = cn;
  }
  return body;
}
