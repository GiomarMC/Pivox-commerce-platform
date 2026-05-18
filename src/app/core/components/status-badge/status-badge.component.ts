import { Component, input, computed } from '@angular/core';

export type BadgeType = 'success' | 'error' | 'warning' | 'info';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span class="badge" [class]="badgeClass()">
      {{ label() }}
    </span>
  `,
})
export class StatusBadgeComponent {
  readonly label = input.required<string>();
  readonly type = input<BadgeType>('info');

  readonly badgeClass = computed(() => {
    const map: Record<BadgeType, string> = {
      success: 'badge-success',
      error:   'badge-error',
      warning: 'badge-warning',
      info:    'badge-info',
    };
    return map[this.type()];
  });
}
