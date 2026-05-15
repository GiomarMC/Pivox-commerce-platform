export interface CarritoItem {
  productoId: number;
  loteProductoId: number | null;
  nombre: string;
  codigo: string;
  imagen: string | null;
  tipoIgv: string;
  unidadMedida: string;
  cantidad: number;
  precioUnitario: number;
  esAveriado: boolean;
  precioVentaMercado: number;
  precioVentaBase: number | null;
  stockDisponible: number;
}
