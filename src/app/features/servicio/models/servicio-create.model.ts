export interface ClienteNuevoServicio {
  nombre: string;
  tipoDocumento: string;
  numeroDocumento: string;
  telefono: string;
  email: string;
  direccion: string;
}

export interface ServicioCreateModel {
  tiendaId: number;
  descripcion?: string;
  fechaInicio: string;
  fechaFin: string;
  total: string;
  tipo: string;
  metodoPago?: string;
  tipoComprobante?: string;
  clienteId?: number;
  clienteNuevo?: ClienteNuevoServicio;
  camposFaltantesClienteExistente?: Record<string, string>;
}

export function servicioCreateModelToJson(model: ServicioCreateModel): Record<string, unknown> {
  const json: Record<string, unknown> = {
    tienda_id: model.tiendaId,
    fecha_inicio: model.fechaInicio,
    fecha_fin: model.fechaFin,
    total: model.total,
    tipo: model.tipo,
  };

  if (model.tipo.toUpperCase() !== 'CREDITO' && model.metodoPago) {
    json['metodo_pago'] = model.metodoPago;
  }

  if (model.descripcion && model.descripcion.trim()) {
    json['descripcion'] = model.descripcion.trim();
  }

  if (model.tipo.toUpperCase() === 'SUNAT' && model.tipoComprobante) {
    json['tipo_comprobante'] = model.tipoComprobante;
  }

  if (model.clienteId && model.clienteId > 0) {
    json['cliente_id'] = model.clienteId;
    if (model.camposFaltantesClienteExistente && Object.keys(model.camposFaltantesClienteExistente).length > 0) {
      json['cliente_campos_adicionales'] = model.camposFaltantesClienteExistente;
    }
  } else if (model.clienteNuevo) {
    const cn: Record<string, unknown> = { nombre: model.clienteNuevo.nombre };
    if (model.clienteNuevo.tipoDocumento) cn['tipo_documento'] = model.clienteNuevo.tipoDocumento;
    if (model.clienteNuevo.numeroDocumento) cn['numero_documento'] = model.clienteNuevo.numeroDocumento;
    if (model.clienteNuevo.telefono) cn['telefono'] = model.clienteNuevo.telefono;
    if (model.clienteNuevo.email) cn['email'] = model.clienteNuevo.email;
    if (model.clienteNuevo.direccion) cn['direccion'] = model.clienteNuevo.direccion;
    json['cliente'] = cn;
  }

  return json;
}
