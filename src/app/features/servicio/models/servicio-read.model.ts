import { ClienteModel, clienteFromJson } from '../../venta/models/cliente.model';

export interface ServicioReadModel {
  id: number;
  numeroComprobante: string;
  cliente: ClienteModel | null;
  tiendaId: number;
  tiendaNombre: string;
  tipo: string;
  tipoDisplay: string;
  metodoPago: string | null;
  metodoPagoDisplay: string | null;
  estadoSunat: string;
  estadoSunatDisplay: string;
  tipoComprobante: string;
  tipoComprobanteDisplay: string;
  hashCpe: string;
  urlXml: string | null;
  urlPdfA4: string | null;
  urlPdfTicket: string | null;
  urlCdr: string | null;
  motivoRechazo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  total: number;
  isActive: boolean;
  fecha: string;
  deuda: number;
}

export function servicioReadModelFromJson(json: Record<string, unknown>): ServicioReadModel {
  const tienda = (json['tienda'] as Record<string, unknown>) ?? {};
  return {
    id: json['id'] as number,
    numeroComprobante: String(json['numero_comprobante'] ?? ''),
    cliente: json['cliente'] ? clienteFromJson(json['cliente'] as Record<string, unknown>) : null,
    tiendaId: (tienda['id'] as number) ?? (json['tienda'] as number) ?? 0,
    tiendaNombre: String((tienda['nombre'] as string) ?? ''),
    tipo: String(json['tipo'] ?? ''),
    tipoDisplay: String(json['tipo_display'] ?? ''),
    metodoPago: (json['metodo_pago'] as string | null) ?? null,
    metodoPagoDisplay: (json['metodo_pago_display'] as string | null) ?? null,
    estadoSunat: String(json['estado_sunat'] ?? 'NO_APLICA'),
    estadoSunatDisplay: String(json['estado_sunat_display'] ?? ''),
    tipoComprobante: String(json['tipo_comprobante'] ?? ''),
    tipoComprobanteDisplay: String(json['tipo_comprobante_display'] ?? ''),
    hashCpe: String(json['hash_cpe'] ?? ''),
    urlXml: (json['url_xml'] as string | null) ?? null,
    urlPdfA4: (json['url_pdf_a4'] as string | null) ?? null,
    urlPdfTicket: (json['url_pdf_ticket'] as string | null) ?? null,
    urlCdr: (json['url_cdr'] as string | null) ?? null,
    motivoRechazo: String(json['motivo_rechazo'] ?? ''),
    descripcion: String(json['descripcion'] ?? ''),
    fechaInicio: String(json['fecha_inicio'] ?? ''),
    fechaFin: String(json['fecha_fin'] ?? ''),
    total: parseFloat(String(json['total'] ?? '0')),
    isActive: (json['is_active'] as boolean) ?? true,
    fecha: String(json['fecha'] ?? ''),
    deuda: parseFloat(String(json['deuda'] ?? '0')),
  };
}
