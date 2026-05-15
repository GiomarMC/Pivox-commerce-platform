export const TIPO_COMPROBANTE_LABELS: Record<string, string> = {
  '01': 'Factura',
  '03': 'Boleta',
};

export const TIPO_COMPROBANTE_VALUES = Object.keys(TIPO_COMPROBANTE_LABELS);

export function getTipoComprobanteLabel(code: string): string {
  return TIPO_COMPROBANTE_LABELS[code] ?? code;
}
