import { Component, inject } from '@angular/core';
import {
  LucideCircleAlert,
  LucideCircleCheck,
  LucideInfo,
  LucideTriangleAlert,
  LucideX,
} from '@lucide/angular';
import { ToastStore, ToastVariant } from '../../core/stores/toast.store';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [
    LucideCircleCheck,
    LucideCircleAlert,
    LucideTriangleAlert,
    LucideInfo,
    LucideX,
  ],
  template: `
    <div
      class="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] flex flex-col gap-2.5 sm:w-96 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      @for (toast of toastStore.items(); track toast.id) {
        <div
          class="pointer-events-auto surface-card p-3.5 shadow-lg flex items-start gap-3 border-l-4 transition"
          [class]="borderClass(toast.variant)"
          role="status"
        >
          <div class="shrink-0 mt-0.5" [class]="iconClass(toast.variant)">
            @switch (toast.variant) {
              @case ('success') {
                <svg lucideCircleCheck [size]="18"></svg>
              }
              @case ('error') {
                <svg lucideCircleAlert [size]="18"></svg>
              }
              @case ('warning') {
                <svg lucideTriangleAlert [size]="18"></svg>
              }
              @default {
                <svg lucideInfo [size]="18"></svg>
              }
            }
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-[var(--text-primary)]">{{ toast.title }}</p>
            @if (toast.message) {
              <p class="text-xs text-[var(--text-secondary)] mt-0.5 break-words">{{ toast.message }}</p>
            }
          </div>
          <button
            type="button"
            (click)="toastStore.dismiss(toast.id)"
            aria-label="Cerrar notificación"
            class="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
          >
            <svg lucideX [size]="16"></svg>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  protected readonly toastStore = inject(ToastStore);

  protected borderClass(variant: ToastVariant): string {
    switch (variant) {
      case 'success':
        return 'border-l-[var(--status-success)]';
      case 'error':
        return 'border-l-[var(--status-danger)]';
      case 'warning':
        return 'border-l-[var(--status-warning)]';
      default:
        return 'border-l-[var(--status-info)]';
    }
  }

  protected iconClass(variant: ToastVariant): string {
    switch (variant) {
      case 'success':
        return 'text-[var(--status-success)]';
      case 'error':
        return 'text-[var(--status-danger)]';
      case 'warning':
        return 'text-[var(--status-warning)]';
      default:
        return 'text-[var(--status-info)]';
    }
  }
}
