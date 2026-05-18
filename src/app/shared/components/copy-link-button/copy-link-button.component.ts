import { Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-copy-link-button',
  standalone: true,
  styles: [`
    :host { display: block; }
    .clb-wrap {
      border: 1px solid var(--color-rule-bold);
      padding: 1rem 1.25rem;
      background: var(--color-surface-2);
    }
    .clb-label {
      font-family: var(--font-sans);
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-ink-2);
      margin: 0 0 0.625rem;
    }
    .clb-row {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }
    .clb-link {
      flex: 1;
      min-width: 0;
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      color: var(--color-ink);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-feature-settings: 'tnum';
    }
    .clb-btn {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.4375rem 0.75rem;
      background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 60%, #A855F7 100%); color: #FFFFFF;
      border: 1px solid var(--color-ink);
      font-family: var(--font-sans);
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-radius: 14px;
      cursor: pointer;
      transition: background 180ms;
    }
    .clb-btn:hover:not(:disabled) { background: var(--color-accent); border-color: var(--color-accent); }
    .clb-btn.done { background: var(--color-success); border-color: var(--color-success); }
  `],
  template: `
    <div class="clb-wrap anim-fade-up">
      @if (label()) {
        <p class="clb-label">{{ label() }}</p>
      }
      <div class="clb-row">
        <span class="clb-link" [title]="link()">{{ link() }}</span>
        <button type="button" (click)="copiar()" class="clb-btn" [class.done]="copiado()">
          @if (copiado()) {
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Copiado
          } @else {
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="square">
              <rect x="9" y="9" width="13" height="13"/>
              <path d="M5 15H4V4h11v1"/>
            </svg>
            Copiar
          }
        </button>
      </div>
    </div>
  `,
})
export class CopyLinkButtonComponent {
  readonly link = input.required<string>();
  readonly label = input('');

  readonly copiado = signal(false);

  async copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.link());
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2000);
    } catch {
      // silently fail; clipboard may not be available in non-secure contexts
    }
  }
}
