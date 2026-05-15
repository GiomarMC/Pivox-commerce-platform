export interface StockModel {
  productoId: number;
  productoNombre: string;
  unidadMedida: string;
  cantidadDisponible: string;
  cantidadAveriada: string;
  precioVentaMercado: string;
}

export function stockFromJson(json: Record<string, unknown>): StockModel {
  return {
    productoId: json['producto_id'] as number,
    productoNombre: json['producto_nombre'] as string,
    unidadMedida: json['unidad_medida'] as string,
    cantidadDisponible: String(json['cantidad_disponible']),
    cantidadAveriada: json['cantidad_averiada'] != null ? String(json['cantidad_averiada']) : '0',
    precioVentaMercado: String(json['precio_venta_mercado']),
  };
}
