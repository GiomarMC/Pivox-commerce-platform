export interface VentaLineaModel {
  id: number;
  productoId: number;
  loteProductoId: number | null;
  productoNombre: string;
  productoCodigo: string;
  unidadMedida: string;
  cantidad: string;
  precioUnitario: string;
  subtotal: string;
  esAveriado: boolean;
}

export interface VentaSunatLineaModel extends VentaLineaModel {
  valorUnitario: string;
  igv: string;
  valorVenta: string;
}

export interface PropuestaSunatItem {
  loteProductoId: number;
  loteProductoNombre: string;
  cantidad: string;
  precio: string;
  subtotal: string;
  esRelleno: boolean;
  loteProductoOriginalId: number | null;
  motivo: string;
}

export interface NotaCreditoItemModel {
  loteProductoId: number;
  cantidad?: string;
  precioNuevo?: string;
}

export interface NotaCreditoModel {
  id: number;
  numero: string;
  tipoComprobante: string;
  tipoComprobanteDisplay: string;
  motivo: string;
  fecha: string;
  urlPdfTicket: string | null;
  urlPdfA4: string | null;
  hashCpe: string;
  urlXml: string | null;
  urlCdr: string | null;
  itemsNc: NotaCreditoItemModel[];
}

export interface VentaReadModel {
  id: number;
  numero: string;
  tiendaId: number;
  tiendaNombre: string;
  tipoVenta: string;
  tipoDisplay: string;
  metodoPago: string | null;
  metodoPagoDisplay: string | null;
  tipoComprobante: string | null;
  tipoComprobanteDisplay: string;
  estadoSunat: string | null;
  estadoSunatDisplay: string;
  motivoRechazo: string | null;
  clienteId: number | null;
  clienteNombre: string | null;
  total: string;
  igvTotal: string | null;
  subtotal: string;
  fechaCreacion: string;
  hashCpe: string;
  urlXml: string | null;
  urlCdr: string | null;
  urlPdfTicket: string | null;
  urlPdfA4: string | null;
  detalles: VentaLineaModel[];
  detallesSunat: VentaSunatLineaModel[];
  propuestaSunat: PropuestaSunatItem[];
  notaCredito: NotaCreditoModel | null;
  isCancelada: boolean;
}

function ventaLineaFromJson(json: Record<string, unknown>): VentaLineaModel {
  return {
    id: json['id'] as number,
    productoId: (json['producto_id'] ?? json['producto']) as number,
    loteProductoId: (json['lote_producto_id'] as number | null) ?? null,
    productoNombre: json['producto_nombre'] as string,
    productoCodigo: json['producto_codigo'] as string,
    unidadMedida: json['unidad_medida'] as string,
    cantidad: String(json['cantidad']),
    precioUnitario: String(json['precio_unitario'] ?? json['precio'] ?? '0'),
    subtotal: String(json['subtotal']),
    esAveriado: (json['es_averiado'] as boolean) ?? false,
  };
}

function ventaSunatLineaFromJson(json: Record<string, unknown>): VentaSunatLineaModel {
  return {
    ...ventaLineaFromJson(json),
    valorUnitario: String(json['valor_unitario'] ?? '0'),
    igv: String(json['igv'] ?? '0'),
    valorVenta: String(json['valor_venta'] ?? '0'),
  };
}

function propuestaSunatItemFromJson(json: Record<string, unknown>): PropuestaSunatItem {
  return {
    loteProductoId: (json['lote_producto_id'] as number) ?? 0,
    loteProductoNombre: (json['lote_producto_nombre'] as string) ?? '',
    cantidad: String(json['cantidad'] ?? '0'),
    precio: String(json['precio'] ?? '0'),
    subtotal: String(json['subtotal'] ?? '0'),
    esRelleno: (json['es_relleno'] as boolean) ?? false,
    loteProductoOriginalId: (json['lote_producto_original_id'] as number | null) ?? null,
    motivo: (json['motivo'] as string) ?? '',
  };
}

function notaCreditoItemFromJson(json: Record<string, unknown>): NotaCreditoItemModel {
  return {
    loteProductoId: (json['lote_producto_id'] as number) ?? 0,
    ...(json['cantidad'] != null ? { cantidad: String(json['cantidad']) } : {}),
    ...(json['precio_nuevo'] != null ? { precioNuevo: String(json['precio_nuevo']) } : {}),
  };
}

function notaCreditoFromJson(json: Record<string, unknown>): NotaCreditoModel {
  return {
    id: (json['id'] as number) ?? 0,
    numero: String(json['numero_comprobante'] ?? json['numero'] ?? ''),
    tipoComprobante: String(json['tipo_comprobante'] ?? ''),
    tipoComprobanteDisplay: String(json['tipo_comprobante_display'] ?? ''),
    motivo: String(json['motivo'] ?? ''),
    fecha: String(json['fecha'] ?? json['fecha_emision'] ?? ''),
    urlPdfTicket: (json['url_pdf_ticket'] as string | null) ?? null,
    urlPdfA4: (json['url_pdf_a4'] as string | null) ?? null,
    hashCpe: String(json['hash_cpe'] ?? ''),
    urlXml: (json['url_xml'] as string | null) ?? null,
    urlCdr: (json['url_cdr'] as string | null) ?? null,
    itemsNc: ((json['items_nc'] as unknown[]) ?? []).map(i => notaCreditoItemFromJson(i as Record<string, unknown>)),
  };
}

export function ventaReadModelFromJson(json: Record<string, unknown>): VentaReadModel {
  const cliente = json['cliente'] as Record<string, unknown> | null;
  const tienda = json['tienda'] as Record<string, unknown> | null;
  const propuesta = json['propuesta_sunat'] as Record<string, unknown>[] | null;
  const nc = json['nota_credito'] as Record<string, unknown> | null;
  const detalles = (json['detalle'] as Record<string, unknown>[] | null) ?? [];
  const detallesSunat = (json['lineas_sunat'] as Record<string, unknown>[] | null) ?? [];

  return {
    id: (json['id'] as number) ?? 0,
    numero: (json['numero_comprobante'] as string) ?? (json['numero'] as string) ?? '',
    tiendaId: tienda ? (tienda['id'] as number) : 0,
    tiendaNombre: tienda ? String(tienda['nombre_sede'] ?? tienda['nombre'] ?? '') : '',
    tipoVenta: String(json['tipo'] ?? ''),
    tipoDisplay: String(json['tipo_display'] ?? ''),
    metodoPago: (json['metodo_pago'] as string | null) ?? null,
    metodoPagoDisplay: (json['metodo_pago_display'] as string | null) ?? null,
    tipoComprobante: (json['tipo_comprobante'] as string | null) ?? null,
    tipoComprobanteDisplay: String(json['tipo_comprobante_display'] ?? ''),
    estadoSunat: (json['estado_sunat'] as string | null) ?? null,
    estadoSunatDisplay: String(json['estado_sunat_display'] ?? ''),
    motivoRechazo: (json['motivo_rechazo'] as string | null) ?? null,
    clienteId: cliente ? (cliente['id'] as number) : null,
    clienteNombre: cliente ? (cliente['nombre'] as string) : null,
    total: String(json['total'] ?? '0'),
    igvTotal: json['igv_total'] != null ? String(json['igv_total']) : null,
    subtotal: String(json['subtotal'] ?? '0'),
    fechaCreacion: (json['fecha'] as string) ?? (json['fecha_creacion'] as string) ?? '',
    hashCpe: String(json['hash_cpe'] ?? ''),
    urlXml: (json['url_xml'] as string | null) ?? null,
    urlCdr: (json['url_cdr'] as string | null) ?? null,
    urlPdfTicket: (json['url_pdf_ticket'] as string | null) ?? null,
    urlPdfA4: (json['url_pdf_a4'] as string | null) ?? null,
    detalles: detalles.map(ventaLineaFromJson),
    detallesSunat: detallesSunat.map(ventaSunatLineaFromJson),
    propuestaSunat: propuesta ? propuesta.map(propuestaSunatItemFromJson) : [],
    notaCredito: nc ? notaCreditoFromJson(nc) : null,
    isCancelada: (json['is_active'] as boolean) === false,
  };
}
