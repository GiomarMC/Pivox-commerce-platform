import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="empty-state anim-fade-up">
      <div class="empty-icon-wrap">
        <span class="text-mono-s" style="letter-spacing: 0.04em;">{{ icon() }}</span>
      </div>
      <p class="empty-title">{{ title() }}</p>
      @if (message()) {
        <p class="empty-desc">{{ message() }}</p>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input('—');
  readonly title = input.required<string>();
  readonly message = input('');
}
