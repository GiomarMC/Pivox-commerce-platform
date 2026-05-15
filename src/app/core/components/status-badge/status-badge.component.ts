import { Component, input, computed } from '@angular/core';

export type BadgeType = 'success' | 'error' | 'warning' | 'info';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium" [class]="badgeClass()">
      {{ label() }}
    </span>
  `,
})
export class StatusBadgeComponent {
  readonly label = input.required<string>();
  readonly type = input<BadgeType>('info');

  readonly badgeClass = computed(() => {
    const map: Record<BadgeType, string> = {
      success: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      info: 'bg-blue-100 text-blue-800',
    };
    return map[this.type()];
  });
}
