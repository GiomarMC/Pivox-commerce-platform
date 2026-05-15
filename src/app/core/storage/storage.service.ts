import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_KEY = 'refresh_token';
  private readonly LAST_TIENDA_KEY = 'last_tienda_id';

  saveToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token.trim());
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  saveRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_KEY, token.trim());
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  clearAuthTokens(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
  }

  setLastTiendaId(id: number): void {
    localStorage.setItem(this.LAST_TIENDA_KEY, String(id));
  }

  getLastTiendaId(): number | null {
    const val = localStorage.getItem(this.LAST_TIENDA_KEY);
    return val ? parseInt(val, 10) : null;
  }
}
