import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { StorageService } from '../storage/storage.service';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(StorageService);
  const auth = inject(AuthService);
  const http = inject(HttpClient);

  const token = storage.getToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || req.url.includes('auth/refresh/')) {
        return throwError(() => err);
      }

      const refreshToken = storage.getRefreshToken();
      if (!refreshToken) {
        auth.logout();
        return throwError(() => err);
      }

      return http
        .post<{ access: string; refresh: string }>(
          `${environment.apiBaseUrl}auth/refresh/`,
          { refresh: refreshToken },
        )
        .pipe(
          switchMap(tokens => {
            storage.saveToken(tokens.access);
            storage.saveRefreshToken(tokens.refresh);
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${tokens.access}` },
            });
            return next(retryReq);
          }),
          catchError(refreshErr => {
            auth.logout();
            return throwError(() => refreshErr);
          }),
        );
    }),
  );
};
