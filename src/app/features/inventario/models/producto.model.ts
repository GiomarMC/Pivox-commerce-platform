export interface ProductoModel {
  id: number;
  nombre: string;
  codigo: string;
  tipoIgv: string;
  tipoIgvDisplay: string;
  imagen: string | null;
  isActive: boolean;
}

export function productoModelFromJson(json: Record<string, unknown>): ProductoModel {
  return {
    id: json['id'] as number,
    nombre: json['nombre'] as string,
    codigo: json['codigo'] as string,
    tipoIgv: json['tipo_igv'] as string,
    tipoIgvDisplay: json['tipo_igv_display'] as string,
    imagen: (json['imagen'] as string | null) ?? null,
    isActive: json['is_active'] as boolean,
  };
}

export interface ProductoCatalogoModel {
  productoId: number;
  nombre: string;
  codigo: string;
  imagen: string | null;
  tipoIgv: string;
  isActive: boolean;
  unidadMedida: string;
  cantidadDisponible: string;
  cantidadAveriada: string;
  tieneConFactura: boolean;
  tieneSinFactura: boolean;
  precioVentaMercado: string;
  precioVentaBase: number | null;
}

export function productoCatalogoFromJson(json: Record<string, unknown>): ProductoCatalogoModel {
  return {
    productoId: json['producto_id'] as number,
    nombre: json['nombre'] as string,
    codigo: json['codigo'] as string,
    imagen: (json['imagen'] as string | null) ?? null,
    tipoIgv: json['tipo_igv'] as string,
    isActive: json['is_active'] as boolean,
    unidadMedida: json['unidad_medida'] as string,
    cantidadDisponible: json['cantidad_disponible'] as string,
    cantidadAveriada: json['cantidad_averiada'] as string,
    tieneConFactura: json['tiene_con_factura'] as boolean,
    tieneSinFactura: json['tiene_sin_factura'] as boolean,
    precioVentaMercado: json['precio_venta_mercado'] as string,
    precioVentaBase: (json['precio_venta_base'] as number | null) ?? null,
  };
}
