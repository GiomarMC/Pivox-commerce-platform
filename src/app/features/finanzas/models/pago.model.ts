export interface PagoModel {
  id: number;
  clienteId: number;
  origenId: number;
  tipoOrigen: string;
  numeroComprobante: string | null;
  fecha: string;
  monto: string;
}

export function pagoFromJson(json: Record<string, unknown>): PagoModel {
  return {
    id: (json['id'] as number) ?? 0,
    clienteId: (json['cliente_id'] as number) ?? 0,
    origenId: (json['origen_id'] as number) ?? 0,
    tipoOrigen: String(json['tipo_origen'] ?? ''),
    numeroComprobante: (json['numero_comprobante'] as string | null) ?? null,
    fecha: String(json['fecha'] ?? ''),
    monto: String(json['monto'] ?? '0'),
  };
}
