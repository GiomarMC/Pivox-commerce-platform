export const TIPO_IGV_LABELS: Record<string, string> = {
  '10': 'Gravado (IGV 18%)',
  '20': 'Exonerado',
  '30': 'Inafecto',
};

export const TIPO_IGV_VALUES = Object.keys(TIPO_IGV_LABELS);

export function getTipoIgvLabel(code: string): string {
  return TIPO_IGV_LABELS[code] ?? code;
}
