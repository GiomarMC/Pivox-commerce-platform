import { Component, computed, input } from '@angular/core';

export type EditorialCardVariant = 'subtle' | 'emphasis' | 'inverse' | 'accent';

@Component({
  selector: 'app-editorial-card',
  standalone: true,
  styles: [`
    :host { display: block; }
    .ec {
      position: relative;
      transition: border-color 200ms cubic-bezier(0.4, 0, 0.2, 1),
                  background 200ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .ec.ec-interactive { cursor: pointer; }
    .ec.ec-interactive.ec-subtle:hover  { border-color: var(--color-rule-bold); }
    .ec.ec-interactive.ec-emphasis:hover { background: var(--color-surface-2); }
    .ec.ec-interactive.ec-inverse:hover { background: var(--color-accent); border-color: var(--color-accent); }
    .ec.ec-interactive.ec-accent:hover  { background: var(--color-accent-tint); }
  `],
  template: `
    <div class="ec" [class]="hostClass()">
      <ng-content></ng-content>
    </div>
  `,
})
export class EditorialCardComponent {
  readonly variant = input<EditorialCardVariant>('subtle');
  readonly interactive = input(false);

  readonly hostClass = computed(() => {
    const variantClass = {
      subtle:   'card ec-subtle',
      emphasis: 'card-emphasis ec-emphasis',
      inverse:  'card-inverse ec-inverse',
      accent:   'card-accent ec-accent',
    }[this.variant()];
    return `${variantClass}${this.interactive() ? ' ec-interactive' : ''}`;
  });
}
