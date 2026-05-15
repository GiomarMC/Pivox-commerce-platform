import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-state',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center py-10 text-center">
      <p class="text-3xl mb-3">⚠️</p>
      <p class="text-sm text-[var(--color-error)] max-w-xs">{{ message() }}</p>
      @if (showRetry()) {
        <button type="button" (click)="retry.emit()"
          class="mt-4 px-4 py-2 text-sm border border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg">
          Reintentar
        </button>
      }
    </div>
  `,
})
export class ErrorStateComponent {
  readonly message = input.required<string>();
  readonly showRetry = input(true);
  readonly retry = output<void>();
}
