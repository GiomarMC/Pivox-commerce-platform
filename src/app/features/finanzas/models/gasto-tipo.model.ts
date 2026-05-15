export interface GastoTipoModel {
  valor: string;
  etiqueta: string;
}

export function gastoTipoFromJson(json: Record<string, unknown>): GastoTipoModel {
  return {
    valor: String(json['valor'] ?? ''),
    etiqueta: String(json['etiqueta'] ?? ''),
  };
}
