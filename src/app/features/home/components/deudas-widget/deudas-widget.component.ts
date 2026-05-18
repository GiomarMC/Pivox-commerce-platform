import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-deudas-widget',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  template: `
    @if (isLoading()) {
      <div class="dw-skel"></div>
    } @else if (count() === 0) {
      <div class="dw-empty">
        <span class="text-mono-s dw-empty-glyph">✓</span>
        <p class="dw-empty-text">Sin deudas activas.</p>
      </div>
    } @else {
      <div class="dw-body">
        <div class="dw-main">
          <span class="text-eyebrow eyebrow-mark">Saldo pendiente</span>
          <span class="dw-amount">
            <span class="dw-amount-prefix">S/</span>{{ total() | number: '1.2-2' }}
          </span>
        </div>

        <div class="dw-rule"></div>

        <div class="dw-side">
          <span class="dw-count">{{ count() }}</span>
          <span class="text-eyebrow">{{ count() === 1 ? 'deuda activa' : 'deudas activas' }}</span>
          <a routerLink="/finanzas/deudas" class="link-edit dw-link">Ver todas</a>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .dw-skel {
      height: 88px;
      background: linear-gradient(90deg, var(--color-rule) 25%, var(--color-surface-2) 50%, var(--color-rule) 75%);
      background-size: 200% 100%;
      animation: dw-shimmer 1.5s infinite;
    }
    @keyframes dw-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    .dw-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 0.5rem; padding: 1.5rem 0;
    }
    .dw-empty-glyph { color: var(--color-success); font-size: 1.5rem; }
    .dw-empty-text {
      font-family: var(--font-sans);
      font-style: normal;
      font-size: 0.875rem;
      color: var(--color-ink-2);
      margin: 0;
    }

    .dw-body {
      display: flex; align-items: center; gap: 2rem;
      padding: 0.5rem 0;
    }
    .dw-main {
      flex: 1;
      display: flex; flex-direction: column; gap: 0.625rem;
    }
    .dw-amount {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: clamp(2.5rem, 5vw, 3.75rem);
      line-height: 0.95;
      letter-spacing: -0.03em;
      color: var(--color-accent);
      
      font-feature-settings: 'tnum';
    }
    .dw-amount-prefix {
      font-family: var(--font-mono);
      font-weight: 500;
      font-size: 0.6em;
      color: var(--color-ink-2);
      letter-spacing: 0;
      margin-right: 0.25em;
      vertical-align: 0.15em;
    }

    .dw-rule {
      width: 1px;
      align-self: stretch;
      background: var(--color-rule-bold);
      margin: 0.5rem 0;
    }

    .dw-side {
      display: flex; flex-direction: column; align-items: flex-start; gap: 0.5rem;
      min-width: 6rem;
    }
    .dw-count {
      font-family: var(--font-display);
      font-style: normal;
      font-weight: 600;
      font-size: 2.5rem;
      line-height: 1;
      letter-spacing: -0.03em;
      color: var(--color-ink);
      
    }
    .dw-link {
      font-family: var(--font-sans);
      font-size: 0.8125rem;
      font-weight: 600;
      margin-top: 0.5rem;
    }

    @media (max-width: 540px) {
      .dw-body { gap: 1rem; }
      .dw-amount { font-size: 2.25rem; }
      .dw-count { font-size: 2rem; }
    }
  `],
})
export class DeudasWidgetComponent {
  readonly total     = input.required<number>();
  readonly count     = input.required<number>();
  readonly isLoading = input<boolean>(false);
}
