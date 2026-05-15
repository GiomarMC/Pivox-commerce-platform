export const UNIDAD_MEDIDA_LABELS: Record<string, string> = {
  NIU: 'Unidad',
  KGM: 'Kilogramo',
  MTR: 'Metro',
  LTR: 'Litro',
  BG: 'Bolsa',
  BX: 'Caja',
  MTK: 'Metro cuadrado',
  MTQ: 'Metro cúbico',
  KT: 'Kit',
  SET: 'Juego',
  PK: 'Paquete',
  TU: 'Tubo',
  PR: 'Par',
  CA: 'Lata',
  BJ: 'Balde',
  CY: 'Cilindro',
  CMT: 'Centímetro lineal',
  MMT: 'Milímetro',
  GLL: 'Galón',
  DZN: 'Docena',
  C62: 'Pieza',
  GRM: 'Gramo',
  MLT: 'Mililitro',
  FOT: 'Pie',
  ZZ: 'Servicio',
};

export const UNIDAD_MEDIDA_VALUES = Object.keys(UNIDAD_MEDIDA_LABELS);

export function getUnidadMedidaLabel(code: string): string {
  return UNIDAD_MEDIDA_LABELS[code] ?? code;
}
