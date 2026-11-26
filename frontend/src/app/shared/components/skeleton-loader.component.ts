import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  template: `
    <div class="space-y-3" aria-hidden="true">
      @for (row of rowsArray(); track $index) {
        <div
          class="h-12 rounded-xl bg-[var(--bg-subtle)] animate-pulse border border-[var(--border-default)]"
        ></div>
      }
    </div>
  `,
})
export class SkeletonLoaderComponent {
  readonly rows = input<number>(4);

  protected rowsArray(): number[] {
    return Array.from({ length: Math.max(1, this.rows()) }, (_, i) => i);
  }
}
