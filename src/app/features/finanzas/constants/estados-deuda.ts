export const ESTADOS_DEUDA = {
  activa: 'ACTIVA',
  pagada: 'PAGADA',
} as const;

export const ESTADOS_DEUDA_LABELS: Record<string, string> = {
  ACTIVA: 'Activa',
  PAGADA: 'Pagada',
};

export const ESTADOS_DEUDA_VALUES = ['ACTIVA', 'PAGADA'] as const;

export function getEstadoDeudaLabel(estado: string): string {
  return ESTADOS_DEUDA_LABELS[estado] ?? estado;
}
