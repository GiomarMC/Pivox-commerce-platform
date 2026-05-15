export interface TiendaGastoFijoDetalle {
  tienda: string;
  detalle: Record<string, string>;
  totalGeneral: string;
  mesCerrado: boolean;
}

export interface GastoFijoResumenModel {
  tiendas: TiendaGastoFijoDetalle[];
  totalGlobal: string;
}

function tiendaDetalleFromJson(json: Record<string, unknown>): TiendaGastoFijoDetalle {
  const detalleRaw = (json['detalle'] as Record<string, unknown>) ?? {};
  const detalle: Record<string, string> = {};
  for (const [k, v] of Object.entries(detalleRaw)) {
    detalle[k] = String(v ?? '0');
  }
  return {
    tienda: String(json['tienda'] ?? ''),
    detalle,
    totalGeneral: String(json['total_general'] ?? '0'),
    mesCerrado: (json['mes_cerrado'] as boolean) ?? false,
  };
}

export function gastoFijoResumenFromJson(json: Record<string, unknown>): GastoFijoResumenModel {
  if ('tiendas' in json) {
    return {
      tiendas: ((json['tiendas'] as unknown[]) ?? []).map(t => tiendaDetalleFromJson(t as Record<string, unknown>)),
      totalGlobal: String(json['total_global'] ?? '0'),
    };
  }
  return {
    tiendas: [tiendaDetalleFromJson(json)],
    totalGlobal: String(json['total_general'] ?? '0'),
  };
}
