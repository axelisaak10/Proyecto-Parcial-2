import { Component, input, output } from '@angular/core';
import { LucidePackage, LucidePlus } from '@lucide/angular';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [LucidePackage, LucidePlus],
  template: `
    <div class="surface-card p-8 sm:p-12 text-center flex flex-col items-center justify-center">
      <div
        class="w-12 h-12 rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-primary)] flex items-center justify-center mb-4"
      >
        <svg lucidePackage [size]="24"></svg>
      </div>
      <h3 class="text-base font-semibold text-[var(--text-primary)]">{{ title() }}</h3>
      <p class="text-sm text-[var(--text-secondary)] mt-1 max-w-md">{{ description() }}</p>
      @if (actionLabel()) {
        <button
          type="button"
          (click)="action.emit()"
          class="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[var(--brand-contrast)] transition cursor-pointer focus-ring"
        >
          <svg lucidePlus [size]="16"></svg>
          <span>{{ actionLabel() }}</span>
        </button>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly actionLabel = input<string>('');
  readonly action = output<void>();
}
