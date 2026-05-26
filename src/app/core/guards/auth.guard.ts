import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Roles, isProfileIncomplete, isDueno as checkDueno } from '../auth/auth.models';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const path = state.url.split('?')[0];

  if (path.startsWith('/invite')) return true;

  if (!auth.isAuthenticated()) {
    return path === '/login' ? true : router.createUrlTree(['/login']);
  }

  const user = auth.userMe();
  if (!user) {
    auth.logout();
    return router.createUrlTree(['/login']);
  }
  const tiendas = user.tiendas;
  const isDueno = checkDueno(user);
  const esAdmin = user.rol === Roles.administrador;
  const puedeVerUsuarios = isDueno || esAdmin;

  if (isProfileIncomplete(user)) {
    return path === '/profile/complete' ? true : router.createUrlTree(['/profile/complete']);
  }

  if (isDueno && tiendas.length === 0) {
    return path === '/setup' ? true : router.createUrlTree(['/setup']);
  }

  // Restricción de rol: sólo dueño/admin puede ver usuarios y asistencia
  if (!puedeVerUsuarios && (path.startsWith('/usuarios') || path.startsWith('/asistencia'))) {
    return router.createUrlTree(['/home']);
  }

  // Sólo dueño puede ver gastos
  if (!isDueno && path.startsWith('/finanzas/gastos')) {
    return router.createUrlTree(['/finanzas']);
  }

  const hasTienda = auth.selectedTiendaId() !== null;
  if (!hasTienda && tiendas.length > 0) {
    return path === '/select-store' ? true : router.createUrlTree(['/select-store']);
  }

  if (hasTienda && path === '/select-store') {
    return router.createUrlTree(['/home']);
  }

  if (['/login', '/profile/complete', '/setup'].includes(path)) {
    return router.createUrlTree(['/home']);
  }

  return true;
};

export const duenioGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isDueno() ? true : router.createUrlTree(['/finanzas']);
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.canViewUsuarios() ? true : router.createUrlTree(['/home']);
};
