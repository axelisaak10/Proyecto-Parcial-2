import { Component, computed, input } from '@angular/core';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

@Component({
  selector: 'app-badge',
  standalone: true,
  template: `
    <span
      class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-tight whitespace-nowrap border"
      [class]="classes()"
    >
      @if (dot()) {
        <span class="w-1.5 h-1.5 rounded-full" [class]="dotClass()"></span>
      }
      <ng-content />
    </span>
  `,
})
export class BadgeComponent {
  readonly variant = input<BadgeVariant>('neutral');
  readonly dot = input<boolean>(false);

  protected readonly classes = computed(() => {
    switch (this.variant()) {
      case 'success':
        return 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-teal-500/25';
      case 'warning':
        return 'bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-amber-500/25';
      case 'danger':
        return 'bg-[var(--status-danger-bg)] text-[var(--status-danger)] border-rose-500/25';
      case 'info':
        return 'bg-[var(--status-info-bg)] text-[var(--status-info)] border-violet-500/25';
      default:
        return 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-default)]';
    }
  });

  protected readonly dotClass = computed(() => {
    switch (this.variant()) {
      case 'success':
        return 'bg-[var(--status-success)]';
      case 'warning':
        return 'bg-[var(--status-warning)]';
      case 'danger':
        return 'bg-[var(--status-danger)]';
      case 'info':
        return 'bg-[var(--status-info)]';
      default:
        return 'bg-[var(--text-muted)]';
    }
  });
}
