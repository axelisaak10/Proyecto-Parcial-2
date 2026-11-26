import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: number;
  title: string;
  message?: string;
  variant: ToastVariant;
}

@Injectable({ providedIn: 'root' })
export class ToastStore {
  private nextId = 1;
  private readonly itemsSignal = signal<ToastItem[]>([]);

  readonly items = this.itemsSignal.asReadonly();

  show(title: string, variant: ToastVariant = 'info', message?: string, durationMs = 4200): void {
    const id = this.nextId++;
    this.itemsSignal.update((list) => [...list, { id, title, message, variant }]);

    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }
  }

  success(title: string, message?: string): void {
    this.show(title, 'success', message);
  }

  error(title: string, message?: string): void {
    this.show(title, 'error', message, 5500);
  }

  warning(title: string, message?: string): void {
    this.show(title, 'warning', message);
  }

  info(title: string, message?: string): void {
    this.show(title, 'info', message);
  }

  dismiss(id: number): void {
    this.itemsSignal.update((list) => list.filter((item) => item.id !== id));
  }
}
