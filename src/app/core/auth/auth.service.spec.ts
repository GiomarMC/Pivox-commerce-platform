import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

const BASE = environment.apiBaseUrl;

const mockAuthResponse = { access: 'access-token', refresh: 'refresh-token' };
const mockUserMe = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Juan',
  last_name: 'Pérez',
  rol: 'TRABAJADOR',
  tiendas: [{ tienda_id: 10, tienda_nombre: 'Sede Central' }],
};

/** Cede al event loop para que las Promises pendientes se resuelvan. */
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('AuthService', () => {
  let svc: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('isAuthenticated es false antes del login', () => {
    expect(svc.isAuthenticated()).toBe(false);
  });

  it('isAuthenticated es true tras login exitoso', async () => {
    const loginPromise = svc.login('testuser', 'password');

    // flush login → deja que el await interno avance al siguiente step
    httpMock.expectOne(`${BASE}auth/login/`).flush(mockAuthResponse);
    await tick();

    // ahora auth/me/ ya está pendiente
    httpMock.expectOne(`${BASE}auth/me/`).flush(mockUserMe);
    await loginPromise;

    expect(svc.isAuthenticated()).toBe(true);
    expect(svc.userMe()?.username).toBe('testuser');
    expect(svc.userMe()?.firstName).toBe('Juan');
  });

  it('state().errorMessage contiene el mensaje si login falla', async () => {
    const loginPromise = svc.login('bad', 'wrong');

    httpMock.expectOne(`${BASE}auth/login/`).flush(
      { detail: 'Credenciales inválidas.' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await loginPromise;

    expect(svc.isAuthenticated()).toBe(false);
    expect(svc.state().errorMessage).toBe('Credenciales inválidas.');
  });

  it('logout limpia el estado y deja isAuthenticated en false', async () => {
    const loginPromise = svc.login('testuser', 'password');
    httpMock.expectOne(`${BASE}auth/login/`).flush(mockAuthResponse);
    await tick();
    httpMock.expectOne(`${BASE}auth/me/`).flush(mockUserMe);
    await loginPromise;

    svc.logout();

    expect(svc.isAuthenticated()).toBe(false);
    expect(svc.userMe()).toBeNull();
    expect(svc.selectedTiendaId()).toBeNull();
  });
});
