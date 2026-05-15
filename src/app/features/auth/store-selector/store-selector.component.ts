import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-store-selector',
  standalone: true,
  styles: [`
    .ss-wrap { min-height:100dvh; display:flex; align-items:center; justify-content:center; background:#F2F4FA; padding:1rem; }
    .ss-card { background:#fff; border:1px solid #E2E6F0; border-radius:16px; padding:2rem; width:100%; max-width:360px; box-shadow:0 4px 24px rgba(0,0,0,0.06); }
    .ss-store-btn { width:100%; padding:0.875rem 1rem; background:#fff; border:1.5px solid #E2E6F0; border-radius:12px; cursor:pointer; font-size:0.9rem; font-weight:600; color:#111827; text-align:left; display:flex; align-items:center; gap:0.75rem; transition:border-color 0.15s,background 0.15s; font-family:inherit; }
    .ss-store-btn:hover { border-color:#1F2A7C; background:#F8F9FF; }
    .ss-icon { width:36px; height:36px; background:#EEF0FF; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  `],
  template: `
    <div class="ss-wrap">
      <div class="ss-card">
        <div style="text-align:center;margin-bottom:1.5rem">
          <div style="width:48px;height:48px;background:#1F2A7C;border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 0.875rem">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <h1 style="font-size:1.15rem;font-weight:800;color:#111827;margin:0 0 0.25rem">Selecciona una sede</h1>
          <p style="font-size:0.8rem;color:#9CA3AF;margin:0">Elige la sede en la que trabajarás hoy</p>
        </div>

        <div style="display:flex;flex-direction:column;gap:0.5rem">
          @for (tienda of tiendas; track tienda.tiendaId) {
            <button type="button" (click)="seleccionar(tienda.tiendaId)" class="ss-store-btn">
              <div class="ss-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1F2A7C" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                </svg>
              </div>
              {{ tienda.tiendaNombre }}
            </button>
          }
        </div>
      </div>
    </div>
  `,
})
export class StoreSelectorComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  get tiendas() {
    return this.auth.userMe()?.tiendas ?? [];
  }

  seleccionar(tiendaId: number): void {
    this.auth.selectTienda(tiendaId);
    this.router.navigate(['/home']);
  }
}
