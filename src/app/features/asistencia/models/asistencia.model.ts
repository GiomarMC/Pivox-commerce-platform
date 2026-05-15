export interface AsistenciaModel {
  id: number;
  usuarioTienda: number;
  usuarioNombre: string;
  fecha: string;
  horaEntrada: string | null;
  horaSalida: string | null;
  almuerzo: boolean;
  horasTrabajadas: number | null;
}

export interface AsistenciaResumenModel {
  usuarioTiendaId: number;
  usuarioNombre: string;
  mes: number;
  anio: number;
  diasTrabajados: number;
  horasTotales: number;
}

export interface UsuarioConAsistencia {
  usuario: import('../../usuarios/models/usuario-tienda.model').UsuarioTiendaModel;
  asistencia: AsistenciaModel | null;
}

export function asistenciaFromJson(json: Record<string, unknown>): AsistenciaModel {
  return {
    id: json['id'] as number,
    usuarioTienda: json['usuario_tienda'] as number,
    usuarioNombre: (json['usuario_nombre'] as string) ?? '',
    fecha: json['fecha'] as string,
    horaEntrada: (json['hora_entrada'] as string) ?? null,
    horaSalida: (json['hora_salida'] as string) ?? null,
    almuerzo: (json['almuerzo'] as boolean) ?? false,
    horasTrabajadas: json['horas_trabajadas'] != null ? Number(json['horas_trabajadas']) : null,
  };
}

export function asistenciaResumenFromJson(json: Record<string, unknown>): AsistenciaResumenModel {
  return {
    usuarioTiendaId: json['usuario_tienda_id'] as number,
    usuarioNombre: (json['usuario_nombre'] as string) ?? '',
    mes: json['mes'] as number,
    anio: json['anio'] as number,
    diasTrabajados: json['dias_trabajados'] as number,
    horasTotales: Number(json['horas_totales']),
  };
}
