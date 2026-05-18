import { Component, computed, input } from '@angular/core';

export type HeroSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-hero-number',
  standalone: true,
  styles: [`
    :host { display: block; }
    .hn-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .hn-eyebrow {
      font-family: var(--font-sans);
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-ink-2);
    }
    .hn-value {
      font-family: var(--font-display);
      font-weight: 600;
      color: var(--color-ink);
      letter-spacing: -0.025em;
      line-height: 1.05;
    }
    .hn-value-mono {
      font-family: var(--font-mono);
      font-weight: 500;
      color: var(--color-ink);
      letter-spacing: -0.01em;
      line-height: 1;
      font-feature-settings: 'tnum';
    }
    .hn-prefix {
      font-family: var(--font-mono);
      font-weight: 500;
      color: var(--color-ink-2);
      margin-right: 0.25em;
      font-feature-settings: 'tnum';
    }
    .hn-suffix {
      font-family: var(--font-sans);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-ink-2);
      margin-left: 0.375em;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .hn-meta {
      font-family: var(--font-sans);
      font-size: 0.8125rem;
      color: var(--color-ink-2);
      margin: 0;
    }

    /* Sizes */
    .hn-sm  .hn-value      { font-size: 1.25rem; }
    .hn-sm  .hn-value-mono { font-size: 1.125rem; }
    .hn-sm  .hn-prefix     { font-size: 0.875rem; }

    .hn-md  .hn-value      { font-size: 1.5rem; }
    .hn-md  .hn-value-mono { font-size: 1.375rem; }
    .hn-md  .hn-prefix     { font-size: 1rem; }

    .hn-lg  .hn-value      { font-size: clamp(1.75rem, 2.5vw, 2.25rem); }
    .hn-lg  .hn-value-mono { font-size: clamp(1.5rem, 2vw, 1.875rem); }
    .hn-lg  .hn-prefix     { font-size: 1.25rem; }

    .hn-xl  .hn-value      { font-size: clamp(2.25rem, 3.5vw, 3rem); }
    .hn-xl  .hn-value-mono { font-size: clamp(1.875rem, 3vw, 2.5rem); }
    .hn-xl  .hn-prefix     { font-size: 1.5rem; }
  `],
  template: `
    <div class="hn-wrap" [class]="sizeClass()">
      @if (label()) {
        <span class="hn-eyebrow">{{ label() }}</span>
      }
      <span [class]="mono() ? 'hn-value-mono' : 'hn-value'">
        @if (prefix()) { <span class="hn-prefix">{{ prefix() }}</span> }{{ value() }}@if (suffix()) { <span class="hn-suffix">{{ suffix() }}</span> }
      </span>
      @if (meta()) {
        <p class="hn-meta">{{ meta() }}</p>
      }
    </div>
  `,
})
export class HeroNumberComponent {
  readonly label = input('');
  readonly value = input.required<string | number>();
  readonly prefix = input('');
  readonly suffix = input('');
  readonly meta = input('');
  readonly size = input<HeroSize>('md');
  readonly mono = input(false);

  readonly sizeClass = computed(() => `hn-${this.size()}`);
}
