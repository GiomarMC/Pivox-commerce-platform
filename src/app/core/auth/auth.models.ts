export interface AuthResponseModel {
  access: string;
  refresh: string;
}

export interface UserTiendaModel {
  tiendaId: number;
  tiendaNombre: string;
}

export interface UserMeModel {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  rol: string | null;
  tiendas: UserTiendaModel[];
}

/** Roles tal como los devuelve la API */
export const Roles = {
  dueno: 'DUENO',
  administrador: 'ADMINISTRADOR',
  trabajador: 'TRABAJADOR',
} as const;

export function isProfileIncomplete(user: UserMeModel): boolean {
  return !user.firstName.trim() || !user.lastName.trim();
}

export function isDueno(user: UserMeModel): boolean {
  return user.rol === Roles.dueno;
}
