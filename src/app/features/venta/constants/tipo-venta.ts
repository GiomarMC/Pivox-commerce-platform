export const TIPO_VENTA_LABELS: Record<string, string> = {
  NORMAL: 'Venta Normal',
  CREDITO: 'Venta a Crédito',
  SUNAT: 'Venta con SUNAT',
};

export const TIPO_VENTA_VALUES = Object.keys(TIPO_VENTA_LABELS);

export function getTipoVentaLabel(code: string): string {
  return TIPO_VENTA_LABELS[code] ?? code;
}
