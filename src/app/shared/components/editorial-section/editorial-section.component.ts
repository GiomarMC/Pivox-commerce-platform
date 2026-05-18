import { Component, input } from '@angular/core';

@Component({
  selector: 'app-editorial-section',
  standalone: true,
  styles: [`
    :host { display: block; }
    .es-wrap { margin-bottom: 2rem; }
    .es-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding-bottom: 0.875rem;
      margin-bottom: 1rem;
    }
    .es-head.es-rule { border-bottom: 1px solid var(--color-rule); }
    .es-head.es-rule-bold { border-bottom: 1px solid var(--color-rule); }
    .es-eyebrow { display: none; }
    .es-tick { display: none; }
    .es-label {
      font-family: var(--font-sans);
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-ink-2);
    }
    .es-title {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1rem;
      line-height: 1.3;
      letter-spacing: -0.015em;
      color: var(--color-ink);
      margin: 0;
    }
    .es-aside {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }
  `],
  template: `
    <section class="es-wrap">
      <header class="es-head" [class.es-rule]="rule() === 'subtle'" [class.es-rule-bold]="rule() === 'bold'">
        <div>
          @if (eyebrow() || tick()) {
            <div class="es-eyebrow">
              @if (tick()) { <span class="es-tick">{{ tick() }}</span> }
              @if (eyebrow()) { <span class="es-label">{{ eyebrow() }}</span> }
            </div>
          }
          @if (title()) { <h2 class="es-title">{{ title() }}</h2> }
        </div>
        <div class="es-aside">
          <ng-content select="[slot=action]"></ng-content>
        </div>
      </header>
      <ng-content></ng-content>
    </section>
  `,
})
export class EditorialSectionComponent {
  readonly eyebrow = input('');
  readonly tick = input('');
  readonly title = input('');
  readonly rule = input<'none' | 'subtle' | 'bold'>('subtle');
}
