import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-deudas-widget',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  template: `
    @if (isLoading()) {
      <div class="dw-skeleton"></div>
    } @else if (count() === 0) {
      <div class="dw-empty">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="1.5">
          <path d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z"/>
          <path d="M8 12h8M12 8v8"/>
        </svg>
        <p class="dw-empty-txt">Sin deudas activas</p>
      </div>
    } @else {
      <div class="dw-body">
        <div class="dw-main">
          <span class="dw-amount">{{ total() | currency:'PEN':'S/ ' }}</span>
          <span class="dw-label">en créditos pendientes</span>
        </div>
        <div class="dw-divider"></div>
        <div class="dw-side">
          <span class="dw-count">{{ count() }}</span>
          <span class="dw-count-lbl">{{ count() === 1 ? 'deuda activa' : 'deudas activas' }}</span>
          <a routerLink="/finanzas/deudas" class="dw-link">Ver todas →</a>
        </div>
      </div>
    }
  `,
  styles: [`
    .dw-skeleton {
      height: 80px; border-radius: 8px;
      background: linear-gradient(90deg, #F3F4F6 25%, #E9EAEC 50%, #F3F4F6 75%);
      background-size: 200% 100%;
      animation: dw-shimmer 1.5s infinite;
    }
    @keyframes dw-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    .dw-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 0.4rem; padding: 1rem 0;
    }
    .dw-empty-txt { margin: 0; font-size: 0.82rem; color: #9CA3AF; }

    .dw-body {
      display: flex; align-items: center; gap: 1.25rem;
    }
    .dw-main {
      display: flex; flex-direction: column; gap: 0.2rem; flex: 1;
    }
    .dw-amount {
      font-size: 1.75rem; font-weight: 900; color: #DC2626;
      letter-spacing: -0.04em; line-height: 1;
    }
    .dw-label {
      font-size: 0.68rem; font-weight: 600; color: #9CA3AF;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .dw-divider {
      width: 1px; background: #F0F2F5; align-self: stretch; margin: 0.25rem 0;
    }
    .dw-side {
      display: flex; flex-direction: column; align-items: center; gap: 0.2rem; min-width: 80px;
    }
    .dw-count {
      font-size: 2rem; font-weight: 900; color: #111827; letter-spacing: -0.04em; line-height: 1;
    }
    .dw-count-lbl {
      font-size: 0.65rem; font-weight: 600; color: #9CA3AF;
      text-transform: uppercase; letter-spacing: 0.05em; text-align: center;
    }
    .dw-link {
      font-size: 0.75rem; font-weight: 700; color: #4F46E5;
      text-decoration: none; margin-top: 0.3rem;
    }
    .dw-link:hover { text-decoration: underline; }
  `],
})
export class DeudasWidgetComponent {
  readonly total     = input.required<number>();
  readonly count     = input.required<number>();
  readonly isLoading = input<boolean>(false);
}
