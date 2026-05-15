export interface PagoInfo {
  fecha: string;
  monto: string;
}

export interface DeudaModel {
  id: number;
  origenId: number;
  tipoOrigen: string;
  numeroComprobante: string | null;
  montoTotal: string;
  saldo: string;
  estado: string;
  pagos: PagoInfo[];
}

function pagoInfoFromJson(json: Record<string, unknown>): PagoInfo {
  return {
    fecha: String(json['fecha'] ?? ''),
    monto: String(json['monto'] ?? '0'),
  };
}

export function deudaFromJson(json: Record<string, unknown>): DeudaModel {
  return {
    id: (json['id'] as number) ?? 0,
    origenId: (json['origen_id'] as number) ?? 0,
    tipoOrigen: String(json['tipo_origen'] ?? ''),
    numeroComprobante: (json['numero_comprobante'] as string | null) ?? null,
    montoTotal: String(json['monto_total'] ?? '0'),
    saldo: String(json['saldo'] ?? '0'),
    estado: String(json['estado'] ?? 'ACTIVA'),
    pagos: ((json['pagos'] as unknown[]) ?? []).map(p => pagoInfoFromJson(p as Record<string, unknown>)),
  };
}
