export interface ResumenOperaciones {
  totalGeneral: string;
  totalContado: string;
  totalCredito: string;
  totalEfectivo: string;
  totalYape: string;
  totalPlin: string;
  totalTransferencia: string;
  totalTarjeta: string;
}

export interface CajaResumenModel {
  fecha: string;
  tiendaId: number;
  resumenVentas: ResumenOperaciones | null;
  resumenServicios: ResumenOperaciones | null;
  totalEfectivo: string;
  totalYape: string;
  totalPlin: string;
  totalTransferencia: string;
  totalTarjeta: string;
  totalContado: string;
  totalCredito: string;
  totalGeneral: string;
}

function resumenOperacionesFromJson(json: Record<string, unknown>): ResumenOperaciones {
  return {
    totalGeneral: String(json['total_general'] ?? '0'),
    totalContado: String(json['total_contado'] ?? '0'),
    totalCredito: String(json['total_credito'] ?? '0'),
    totalEfectivo: String(json['total_efectivo'] ?? '0'),
    totalYape: String(json['total_yape'] ?? '0'),
    totalPlin: String(json['total_plin'] ?? '0'),
    totalTransferencia: String(json['total_transferencia'] ?? '0'),
    totalTarjeta: String(json['total_tarjeta'] ?? '0'),
  };
}

export function cajaResumenFromJson(json: Record<string, unknown>): CajaResumenModel {
  return {
    fecha: String(json['fecha'] ?? ''),
    tiendaId: (json['tienda_id'] as number) ?? 0,
    resumenVentas: json['resumen_ventas']
      ? resumenOperacionesFromJson(json['resumen_ventas'] as Record<string, unknown>)
      : null,
    resumenServicios: json['resumen_servicios']
      ? resumenOperacionesFromJson(json['resumen_servicios'] as Record<string, unknown>)
      : null,
    totalEfectivo: String(json['total_efectivo'] ?? '0'),
    totalYape: String(json['total_yape'] ?? '0'),
    totalPlin: String(json['total_plin'] ?? '0'),
    totalTransferencia: String(json['total_transferencia'] ?? '0'),
    totalTarjeta: String(json['total_tarjeta'] ?? '0'),
    totalContado: String(json['total_contado'] ?? '0'),
    totalCredito: String(json['total_credito'] ?? '0'),
    totalGeneral: String(json['total_general'] ?? '0'),
  };
}
