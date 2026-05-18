import { Component, input } from '@angular/core';

@Component({
  selector: 'app-editorial-page-header',
  standalone: true,
  styles: [`
    :host { display: block; }
    .eph-wrap {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--color-rule);
    }
    @media (min-width: 768px) {
      .eph-wrap {
        flex-direction: row;
        align-items: flex-end;
        justify-content: space-between;
        gap: 2rem;
      }
    }
    .eph-main { flex: 1; min-width: 0; }
    .eph-meta {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
    }
    @media (min-width: 768px) {
      .eph-meta { align-items: flex-end; text-align: right; }
    }
    .eph-eyebrow {
      display: none;
    }
    .eph-tick {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--color-ink-3);
      letter-spacing: 0.04em;
    }
    .eph-label {
      font-family: var(--font-sans);
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-ink-2);
    }
    .eph-title {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: clamp(1.375rem, 2.5vw, 1.75rem);
      line-height: 1.2;
      letter-spacing: -0.025em;
      color: var(--color-ink);
      margin: 0;
    }
    .eph-subtitle {
      font-family: var(--font-sans);
      font-size: 0.875rem;
      color: var(--color-ink-2);
      margin: 0.375rem 0 0;
      max-width: 60ch;
    }
  `],
  template: `
    <div class="eph-wrap anim-fade-up">
      <div class="eph-main">
        @if (eyebrow() || tick()) {
          <div class="eph-eyebrow">
            @if (tick()) { <span class="eph-tick">{{ tick() }}</span> }
            @if (eyebrow()) { <span class="eph-label">{{ eyebrow() }}</span> }
          </div>
        }
        <h1 class="eph-title">{{ title() }}</h1>
        @if (subtitle()) { <p class="eph-subtitle">{{ subtitle() }}</p> }
      </div>
      @if (hasMeta) {
        <div class="eph-meta">
          <ng-content select="[slot=meta]"></ng-content>
        </div>
      }
      <ng-content></ng-content>
    </div>
  `,
})
export class EditorialPageHeaderComponent {
  readonly eyebrow = input('');
  readonly tick = input('');
  readonly title = input.required<string>();
  readonly subtitle = input('');
  protected hasMeta = true;
}
