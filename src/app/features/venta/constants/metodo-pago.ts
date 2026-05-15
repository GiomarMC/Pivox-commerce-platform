export const METODO_PAGO_LABELS: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia Bancaria',
  TARJETA: 'Tarjeta',
  YAPE: 'Yape',
  PLIN: 'Plin',
  CHEQUE: 'Cheque',
};

export const METODO_PAGO_VALUES = Object.keys(METODO_PAGO_LABELS);

export function getMetodoPagoLabel(code: string | null | undefined): string {
  if (!code) return '—';
  return METODO_PAGO_LABELS[code] ?? code;
}
