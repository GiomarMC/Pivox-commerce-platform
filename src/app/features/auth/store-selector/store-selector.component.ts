import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-store-selector',
  standalone: true,
  styles: [`
    :host { display: block; }
    .ss-bg {
      position: relative;
      min-height: 100dvh;
      background: var(--color-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1.5rem;
      overflow: hidden;
    }
    .ss-bg::before {
      content: '';
      position: absolute;
      top: -8rem;
      right: -8rem;
      width: 28rem;
      height: 28rem;
      border: 1px solid var(--color-rule);
      border-radius: 50%;
      pointer-events: none;
    }
    .ss-bg::after {
      content: '';
      position: absolute;
      bottom: -10rem;
      left: -10rem;
      width: 32rem;
      height: 32rem;
      border: 1px solid var(--color-rule);
      border-radius: 50%;
      pointer-events: none;
    }
    .ss-wrap {
      position: relative;
      width: 100%;
      max-width: 32rem;
      animation: ed-fade-up 720ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .ss-eyebrow {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      justify-content: center;
      margin-bottom: 1.25rem;
    }
    .ss-tick {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      color: var(--color-ink-3);
      letter-spacing: 0.05em;
    }
    .ss-label {
      font-family: var(--font-sans);
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-ink);
    }
    .ss-title {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: clamp(2.25rem, 5vw, 3.25rem);
      line-height: 1.02;
      letter-spacing: -0.025em;
      color: var(--color-ink);
      margin: 0 0 0.875rem;
      text-align: center;
      
    }
    .ss-title em {
      font-style: normal;
      color: var(--color-accent);
    }
    .ss-subtitle {
      font-family: var(--font-sans);
      font-size: 0.9375rem;
      color: var(--color-ink-2);
      text-align: center;
      margin: 0 auto 2.5rem;
      max-width: 32ch;
    }
    .ss-list {
      list-style: none;
      margin: 0;
      padding: 0;
      border-top: 1px solid var(--color-rule-bold);
    }
    .ss-row {
      display: grid;
      grid-template-columns: 3.5ch 1fr auto;
      align-items: center;
      gap: 1.25rem;
      padding: 1.5rem 0.5rem;
      border-bottom: 1px solid var(--color-rule);
      cursor: pointer;
      background: transparent;
      border-left: none;
      border-right: none;
      width: 100%;
      text-align: left;
      font: inherit;
      color: inherit;
      transition: padding 200ms cubic-bezier(0.4, 0, 0.2, 1),
                  background 200ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .ss-row:hover {
      padding-left: 1rem;
      padding-right: 1rem;
      background: var(--color-surface-2);
    }
    .ss-index {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      color: var(--color-ink-3);
      letter-spacing: 0.04em;
    }
    .ss-name {
      font-family: var(--font-display);
      font-weight: 500;
      font-style: normal;
      font-size: 1.375rem;
      line-height: 1.15;
      color: var(--color-ink);
      margin: 0;
      
    }
    .ss-arrow {
      font-family: var(--font-mono);
      font-size: 0.875rem;
      color: var(--color-ink-2);
      transition: color 180ms, transform 180ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .ss-row:hover .ss-arrow {
      color: var(--color-ink);
      transform: translateX(4px);
    }
    .ss-empty {
      font-family: var(--font-sans);
      font-size: 0.875rem;
      color: var(--color-ink-3);
      text-align: center;
      padding: 3rem 1rem;
      font-style: normal;
    }
  `],
  template: `
    <div class="ss-bg">
      <div class="ss-wrap">

        <div class="ss-eyebrow">
          <span class="ss-tick">01</span>
          <span class="ss-label">Pivox · Sucursales</span>
        </div>

        <h1 class="ss-title">Elige tu <em>sede</em>.</h1>
        <p class="ss-subtitle">La sucursal que selecciones será donde operes hoy. Podrás cambiarla en cualquier momento.</p>

        @if (tiendas.length === 0) {
          <div class="ss-empty">
            Tu cuenta aún no tiene sucursales asignadas. Contacta al dueño de la empresa.
          </div>
        } @else {
          <ul class="ss-list">
            @for (tienda of tiendas; track tienda.tiendaId; let i = $index) {
              <li>
                <button type="button"
                  (click)="seleccionar(tienda.tiendaId)"
                  class="ss-row"
                  [style.animation]="'ed-fade-up 600ms ' + (160 + i * 60) + 'ms cubic-bezier(0.16, 1, 0.3, 1) both'">
                  <span class="ss-index">{{ (i + 1).toString().padStart(2, '0') }}</span>
                  <h2 class="ss-name">{{ tienda.tiendaNombre }}</h2>
                  <span class="ss-arrow">→</span>
                </button>
              </li>
            }
          </ul>
        }
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
