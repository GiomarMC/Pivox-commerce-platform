export interface StoreModel {
  id: number;
  nombreSede: string;
  direccion: string;
  ubigeo: string;
  ruc: string;
  serieFactura: string;
  serieBoleta: string;
  serieTicket: string;
  empresaId: number | null;
  isActive: boolean;
  createdAt?: string;
}

export function storeFromJson(json: Record<string, unknown>): StoreModel {
  return {
    id: json['id'] as number,
    nombreSede: json['nombre_sede'] as string,
    direccion: json['direccion'] as string,
    ubigeo: json['ubigeo'] as string,
    ruc: (json['ruc'] as string) ?? '',
    serieFactura: (json['serie_factura'] as string) ?? '',
    serieBoleta: (json['serie_boleta'] as string) ?? '',
    serieTicket: (json['serie_ticket'] as string) ?? '',
    empresaId: (json['empresa_id'] as number | null) ?? null,
    isActive: (json['is_active'] as boolean) ?? true,
    createdAt: json['created_at'] as string | undefined,
  };
}
