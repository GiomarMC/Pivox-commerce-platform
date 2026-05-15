import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center py-12 text-center">
      <p class="text-4xl mb-3">{{ icon() }}</p>
      <p class="text-sm font-semibold text-[var(--color-text-primary)]">{{ title() }}</p>
      @if (message()) {
        <p class="text-xs text-[var(--color-text-secondary)] mt-1 max-w-xs">{{ message() }}</p>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input('📭');
  readonly title = input.required<string>();
  readonly message = input('');
}
