import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { signal } from '@angular/core';
import { authGuard } from './auth.guard';
import { AuthService } from '../auth/auth.service';

function makeState(url: string): RouterStateSnapshot {
  return { url } as RouterStateSnapshot;
}

const EMPTY_ROUTE = {} as ActivatedRouteSnapshot;
const mockRouter = { createUrlTree: (commands: string[]) => ({ commands }) };

function createAuthMock(opts: {
  isAuthenticated?: boolean;
  firstName?: string;
  lastName?: string;
  rol?: string;
  tiendas?: { tiendaId: number; tiendaNombre: string }[];
  selectedTiendaId?: number | null;
}) {
  const {
    isAuthenticated = false,
    firstName = '',
    lastName = '',
    rol = null,
    tiendas = [],
    selectedTiendaId = null,
  } = opts;
  const userMe = isAuthenticated
    ? { id: 1, username: 'u', email: 'e', firstName, lastName, rol, tiendas }
    : null;
  return {
    isAuthenticated: signal(isAuthenticated),
    userMe: signal(userMe),
    isDueno: signal(rol === 'DUENO'),
    isAdmin: signal(rol === 'ADMINISTRADOR'),
    canViewUsuarios: signal(rol === 'DUENO' || rol === 'ADMINISTRADOR'),
    selectedTiendaId: signal(selectedTiendaId),
  };
}

function setup(authMock: ReturnType<typeof createAuthMock>): void {
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: authMock },
      { provide: Router, useValue: mockRouter },
    ],
  });
}

function runGuard(url: string): boolean | UrlTree {
  return TestBed.runInInjectionContext(
    () => authGuard(EMPTY_ROUTE, makeState(url)) as boolean | UrlTree,
  );
}

describe('authGuard', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('redirige a /login cuando el usuario no está autenticado', () => {
    setup(createAuthMock({ isAuthenticated: false }));
    const result = runGuard('/home');
    expect((result as unknown as { commands: string[] }).commands).toEqual(['/login']);
  });

  it('permite acceso a /login cuando no está autenticado', () => {
    setup(createAuthMock({ isAuthenticated: false }));
    expect(runGuard('/login')).toBe(true);
  });

  it('redirige a /profile/complete cuando el perfil está incompleto', () => {
    setup(
      createAuthMock({
        isAuthenticated: true,
        firstName: '',
        lastName: '',
        rol: 'TRABAJADOR',
        tiendas: [{ tiendaId: 1, tiendaNombre: 'Sede' }],
        selectedTiendaId: 1,
      }),
    );
    const result = runGuard('/home');
    expect((result as unknown as { commands: string[] }).commands).toEqual(['/profile/complete']);
  });

  it('permite acceso a /profile/complete cuando el perfil está incompleto', () => {
    setup(
      createAuthMock({
        isAuthenticated: true,
        firstName: '',
        lastName: '',
        rol: 'TRABAJADOR',
        tiendas: [{ tiendaId: 1, tiendaNombre: 'Sede' }],
        selectedTiendaId: 1,
      }),
    );
    expect(runGuard('/profile/complete')).toBe(true);
  });

  it('permite acceso a /invite sin autenticación', () => {
    setup(createAuthMock({ isAuthenticated: false }));
    expect(runGuard('/invite?token=abc')).toBe(true);
  });
});
