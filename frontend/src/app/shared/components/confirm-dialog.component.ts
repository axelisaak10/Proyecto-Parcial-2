import { Component, HostListener, input, output } from '@angular/core';
import { LucideTriangleAlert, LucideX } from '@lucide/angular';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [LucideTriangleAlert, LucideX],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#140F1D]/65 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
        (click)="onBackdropClick()"
      >
        <div
          class="surface-card w-full max-w-md p-6 shadow-2xl"
          style="box-shadow: var(--shadow-lg)"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-3">
              <div
                class="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                [class]="
                  danger()
                    ? 'bg-[var(--status-danger-bg)] text-[var(--status-danger)]'
                    : 'bg-[var(--brand-soft)] text-[var(--brand-primary)]'
                "
              >
                <svg lucideTriangleAlert [size]="20"></svg>
              </div>
              <div>
                <h3 class="text-base font-semibold text-[var(--text-primary)]">{{ title() }}</h3>
                <p class="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">{{ message() }}</p>
              </div>
            </div>
            <button
              type="button"
              (click)="cancelled.emit()"
              aria-label="Cerrar diálogo"
              class="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer focus-ring"
            >
              <svg lucideX [size]="18"></svg>
            </button>
          </div>

          <div class="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <button
              type="button"
              data-testid="confirm-dialog-cancel"
              (click)="cancelled.emit()"
              class="px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition cursor-pointer focus-ring"
            >
              {{ cancelLabel() }}
            </button>
            <button
              type="button"
              data-testid="confirm-dialog-confirm"
              [disabled]="busy()"
              (click)="confirmed.emit()"
              class="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition cursor-pointer disabled:opacity-60 focus-ring"
              [class]="
                danger()
                  ? 'bg-[var(--status-danger)] hover:opacity-90'
                  : 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]'
              "
            >
              {{ busy() ? 'Procesando...' : confirmLabel() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  readonly open = input<boolean>(false);
  readonly title = input<string>('Confirmar acción');
  readonly message = input<string>('¿Deseas continuar con esta operación?');
  readonly confirmLabel = input<string>('Confirmar');
  readonly cancelLabel = input<string>('Cancelar');
  readonly danger = input<boolean>(true);
  readonly busy = input<boolean>(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open() && !this.busy()) {
      this.cancelled.emit();
    }
  }

  protected onBackdropClick(): void {
    if (!this.busy()) {
      this.cancelled.emit();
    }
  }
}
