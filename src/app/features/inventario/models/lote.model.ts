export interface TiendaLoteInfo {
  id: number;
  nombreSede: string;
}

export function tiendaLoteInfoFromJson(json: Record<string, unknown>): TiendaLoteInfo {
  return {
    id: json['id'] as number,
    nombreSede: json['nombre_sede'] as string,
  };
}

export interface LoteProductoResponse {
  id: number;
  producto: number;
  productoNombre: string;
  productoCodigo: string;
  unidadMedida: string;
  unidadMedidaDisplay: string;
  conFactura: boolean;
  cantidadInicial: string;
  cantidadActual: string;
  cantidadAveriada: string;
  cantidadDisponible: number;
  costoTotal: string;
  precioCompra: string;
  precioVentaBase: string | null;
  precioVentaMercado: string;
  isActive: boolean;
}

export function loteProductoResponseFromJson(json: Record<string, unknown>): LoteProductoResponse {
  return {
    id: json['id'] as number,
    producto: json['producto'] as number,
    productoNombre: json['producto_nombre'] as string,
    productoCodigo: json['producto_codigo'] as string,
    unidadMedida: json['unidad_medida'] as string,
    unidadMedidaDisplay: json['unidad_medida_display'] as string,
    conFactura: json['con_factura'] as boolean,
    cantidadInicial: String(json['cantidad_inicial']),
    cantidadActual: String(json['cantidad_actual']),
    cantidadAveriada: String(json['cantidad_averiada']),
    cantidadDisponible: json['cantidad_disponible'] as number,
    costoTotal: String(json['costo_total']),
    precioCompra: String(json['precio_compra']),
    precioVentaBase: json['precio_venta_base'] != null ? String(json['precio_venta_base']) : null,
    precioVentaMercado: String(json['precio_venta_mercado']),
    isActive: json['is_active'] as boolean,
  };
}

export interface LoteResponse {
  id: number;
  tienda: TiendaLoteInfo;
  fechaLlegada: string;
  costoOperacion: string;
  costoTransporte: string;
  isActive: boolean;
  productos: LoteProductoResponse[];
}

export function loteResponseFromJson(json: Record<string, unknown>): LoteResponse {
  return {
    id: json['id'] as number,
    tienda: tiendaLoteInfoFromJson(json['tienda'] as Record<string, unknown>),
    fechaLlegada: json['fecha_llegada'] as string,
    costoOperacion: String(json['costo_operacion']),
    costoTransporte: String(json['costo_transporte']),
    isActive: json['is_active'] as boolean,
    productos: (json['productos'] as Record<string, unknown>[]).map(loteProductoResponseFromJson),
  };
}

export interface LoteProductoInput {
  productoId?: number;
  nombre?: string;
  unidadMedida: string;
  conFactura: boolean;
  cantidad: string;
  cantidadAveriada: string;
  costoTotal: string;
  precioVentaBase?: string;
  precioVentaMercado: string;
}

export interface LoteCreateModel {
  tienda: number;
  fechaLlegada: string;
  costoOperacion: string;
  costoTransporte: string;
  productos: LoteProductoInput[];
}

export function loteCreateModelToJson(m: LoteCreateModel): Record<string, unknown> {
  return {
    tienda: m.tienda,
    fecha_llegada: m.fechaLlegada,
    costo_operacion: m.costoOperacion,
    costo_transporte: m.costoTransporte,
    productos: m.productos.map(p => {
      const item: Record<string, unknown> = {
        unidad_medida: p.unidadMedida,
        con_factura: p.conFactura,
        cantidad: p.cantidad,
        cantidad_averiada: p.cantidadAveriada,
        costo_total: p.costoTotal,
        precio_venta_mercado: p.precioVentaMercado,
      };
      if (p.productoId != null) item['producto_id'] = p.productoId;
      if (p.nombre != null) item['nombre'] = p.nombre;
      if (p.precioVentaBase != null) item['precio_venta_base'] = p.precioVentaBase;
      return item;
    }),
  };
}
