import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'toystore_ui_theme';

  readonly theme = signal<AppTheme>(this.readInitialTheme());

  constructor() {
    effect(() => {
      const active = this.theme();
      const root = this.document.documentElement;
      if (active === 'dark') {
        root.setAttribute('data-theme', 'dark');
      } else {
        root.removeAttribute('data-theme');
      }
      try {
        localStorage.setItem(this.storageKey, active);
      } catch {
        // Ignore storage restriction errors in sandboxed contexts
      }
    });
  }

  toggle(): void {
    this.theme.update((current) => (current === 'light' ? 'dark' : 'light'));
  }

  private readInitialTheme(): AppTheme {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch {
      // Ignore storage access errors
    }
    return 'light';
  }
}
