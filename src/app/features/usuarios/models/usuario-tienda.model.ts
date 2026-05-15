export interface UsuarioTiendaModel {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  usuarioIsActive: boolean;
  tiendaId: number;
  tiendaNombre: string;
  usuarioEmail: string;
  rol: string;
  rolDisplay: string;
  salario: string;
}

export interface RefrescarInvitacionResponse {
  token: string;
  usuario: string;
  expiracion: string;
}

export function usuarioTiendaFromJson(json: Record<string, unknown>): UsuarioTiendaModel {
  return {
    id: json['id'] as number,
    usuarioId: json['usuario_id'] as number,
    usuarioNombre: (json['usuario_nombre'] as string) ?? '',
    usuarioIsActive: json['usuario_is_active'] as boolean,
    tiendaId: json['tienda_id'] as number,
    tiendaNombre: (json['tienda_nombre'] as string) ?? '',
    usuarioEmail: (json['usuario_email'] as string) ?? '',
    rol: (json['rol'] as string) ?? '',
    rolDisplay: (json['rol_display'] as string) ?? '',
    salario: (json['salario'] as string) ?? '',
  };
}
