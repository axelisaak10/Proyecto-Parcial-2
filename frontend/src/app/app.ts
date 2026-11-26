import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeStore } from './core/stores/theme.store';
import { ToastContainerComponent } from './shared/components/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // Eagerly initialize theme signal on root startup
  protected readonly _theme = inject(ThemeStore);
}
