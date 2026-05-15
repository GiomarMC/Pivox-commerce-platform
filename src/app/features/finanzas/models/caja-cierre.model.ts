export interface CajaCierreModel {
  id: number;
  tienda: number;
  usuarioTienda: number;
  fechaHora: string;
  montoEsperado: string;
  montoReal: string;
  diferencia: string;
  estado: string;
  observaciones: string;
}

export function cajaCierreFromJson(json: Record<string, unknown>): CajaCierreModel {
  return {
    id: (json['id'] as number) ?? 0,
    tienda: (json['tienda'] as number) ?? 0,
    usuarioTienda: (json['usuario_tienda'] as number) ?? 0,
    fechaHora: String(json['fecha_hora'] ?? ''),
    montoEsperado: String(json['monto_esperado'] ?? '0'),
    montoReal: String(json['monto_real'] ?? '0'),
    diferencia: String(json['diferencia'] ?? '0'),
    estado: String(json['estado'] ?? ''),
    observaciones: String(json['observaciones'] ?? ''),
  };
}
