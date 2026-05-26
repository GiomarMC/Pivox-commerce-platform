import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly platformId = inject(PLATFORM_ID);
  private get isBrowser(): boolean { return isPlatformBrowser(this.platformId); }

  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_KEY = 'refresh_token';
  private readonly LAST_TIENDA_KEY = 'last_tienda_id';

  saveToken(token: string): void {
    if (!this.isBrowser) return;
    localStorage.setItem(this.TOKEN_KEY, token.trim());
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  saveRefreshToken(token: string): void {
    if (!this.isBrowser) return;
    localStorage.setItem(this.REFRESH_KEY, token.trim());
  }

  getRefreshToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.REFRESH_KEY);
  }

  clearAuthTokens(): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
  }

  setLastTiendaId(id: number): void {
    if (!this.isBrowser) return;
    localStorage.setItem(this.LAST_TIENDA_KEY, String(id));
  }

  getLastTiendaId(): number | null {
    if (!this.isBrowser) return null;
    const val = localStorage.getItem(this.LAST_TIENDA_KEY);
    return val ? parseInt(val, 10) : null;
  }
}
