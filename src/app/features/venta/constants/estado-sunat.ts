export const ESTADO_SUNAT_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente de envío',
  ENVIADO: 'Enviado a SUNAT',
  ACEPTADO: 'Aceptado por SUNAT',
  RECHAZADO: 'Rechazado por SUNAT',
  ANULADO: 'Anulado',
};

export const ESTADO_SUNAT_VALUES = Object.keys(ESTADO_SUNAT_LABELS);

export function getEstadoSunatLabel(code: string): string {
  return ESTADO_SUNAT_LABELS[code] ?? code;
}

export function getEstadoSunatColor(code: string): string {
  const map: Record<string, string> = {
    PENDIENTE: 'warning',
    ENVIADO: 'info',
    ACEPTADO: 'success',
    RECHAZADO: 'error',
    ANULADO: 'neutral',
  };
  return map[code] ?? 'neutral';
}
