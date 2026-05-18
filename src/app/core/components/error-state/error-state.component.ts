import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-state',
  standalone: true,
  template: `
    <div class="empty-state anim-fade-up">
      <div class="empty-icon-wrap" style="border-color: var(--color-accent);">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="var(--color-accent)" stroke-width="1.5" stroke-linecap="square">
          <line x1="12" y1="8" x2="12" y2="14"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <p class="empty-title" style="color: var(--color-accent);">Error</p>
      <p class="empty-desc">{{ message() }}</p>
      @if (showRetry()) {
        <button type="button" (click)="retry.emit()" class="link-edit"
          style="margin-top: 1.5rem; font-size: 0.8125rem;">
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
