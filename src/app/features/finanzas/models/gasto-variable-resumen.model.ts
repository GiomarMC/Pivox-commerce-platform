export interface GastoVariableResumenModel {
  tienda: string;
  totalMes: string;
  mesCerrado: boolean;
}

export function gastoVariableResumenFromJson(json: Record<string, unknown>): GastoVariableResumenModel {
  return {
    tienda: String(json['tienda'] ?? ''),
    totalMes: String(json['total_mes'] ?? '0'),
    mesCerrado: (json['mes_cerrado'] as boolean) ?? false,
  };
}
