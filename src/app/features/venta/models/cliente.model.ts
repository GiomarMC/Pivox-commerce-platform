export interface ClienteModel {
  id: number;
  tipoDocumento: string;
  tipoDocumentoDisplay: string;
  numeroDocumento: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  saldoTotal: string;
}

export function clienteFromJson(json: Record<string, unknown>): ClienteModel {
  return {
    id: json['id'] as number,
    tipoDocumento: String(json['tipo_documento'] ?? ''),
    tipoDocumentoDisplay: String(json['tipo_documento_display'] ?? ''),
    numeroDocumento: String(json['numero_documento'] ?? ''),
    nombre: String(json['nombre'] ?? ''),
    email: (json['email'] as string | null) ?? null,
    telefono: (json['telefono'] as string | null) ?? null,
    direccion: (json['direccion'] as string | null) ?? null,
    saldoTotal: String(json['saldo_total'] ?? '0.00'),
  };
}
