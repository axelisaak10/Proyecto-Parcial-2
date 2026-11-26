import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideCircleAlert,
  LucideEye,
  LucideEyeOff,
  LucideLock,
  LucideMail,
  LucideShieldCheck,
  LucideToyBrick,
} from '@lucide/angular';
import { sanitizeReturnUrl } from '../../core/security/url-sanitizer.util';
import { AuthStore } from '../../core/stores/auth.store';
import { ToastStore } from '../../core/stores/toast.store';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideToyBrick,
    LucideMail,
    LucideLock,
    LucideEye,
    LucideEyeOff,
    LucideArrowRight,
    LucideCircleAlert,
    LucideShieldCheck,
  ],
  template: `
    <div class="min-h-screen flex bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <!-- Brand Panel (Desktop) -->
      <div
        class="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-[#1E1233] text-white p-12 flex-col justify-between relative overflow-hidden"
      >
        <div
          class="absolute inset-0 opacity-30 pointer-events-none"
          style="background: radial-gradient(circle at 20% 20%, #EA580C 0%, transparent 55%), radial-gradient(circle at 80% 80%, #7C3AED 0%, transparent 45%);"
        ></div>

        <div class="relative z-10 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center shadow-lg">
            <svg lucideToyBrick [size]="20"></svg>
          </div>
          <div>
            <p class="text-base font-bold tracking-tight">ToyStore</p>
            <p class="text-xs text-violet-200/80">Gestión de Juguetería, Inventario y Observabilidad</p>
          </div>
        </div>

        <div class="relative z-10 max-w-md space-y-5">
          <div
            class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-200 text-xs font-medium"
          >
            <svg lucideShieldCheck [size]="14"></svg>
            <span>Sesiones HttpOnly + Telemetría OpenTelemetry</span>
          </div>
          <h1 class="text-3xl xl:text-4xl font-bold tracking-tight leading-tight">
            Control centralizado de juguetes, usuarios y entregas continuas.
          </h1>
          <p class="text-sm text-violet-100/80 leading-relaxed">
            Administra inventarios de juguetería en tiempo real con trazabilidad distribuida hacia OpenObserve,
            autenticación endurecida y despliegue automatizado verificado por Playwright.
          </p>
        </div>

        <p class="relative z-10 text-xs text-violet-300/70">
          ToyStore Platform v2.0 · Express + Angular 22 + OpenObserve
        </p>
      </div>

      <!-- Auth Form Column -->
      <div class="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div class="w-full max-w-md">
          <div class="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div class="w-10 h-10 rounded-xl bg-[var(--brand-primary)] text-white flex items-center justify-center">
              <svg lucideToyBrick [size]="20"></svg>
            </div>
            <div>
              <p class="text-base font-bold">ToyStore</p>
              <p class="text-xs text-[var(--text-muted)]">Juguetería Digital</p>
            </div>
          </div>

          <div class="surface-card p-6 sm:p-8" style="box-shadow: var(--shadow-md)">
            <div class="mb-6">
              <h2 class="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Iniciar sesión</h2>
              <p class="text-sm text-[var(--text-secondary)] mt-1">
                Ingresa tus credenciales para acceder a la consola.
              </p>
            </div>

            @if (errorMessage()) {
              <div
                data-testid="login-error"
                role="alert"
                class="mb-5 p-3.5 rounded-xl bg-[var(--status-danger-bg)] border border-rose-500/30 text-[var(--status-danger)] text-sm flex items-start gap-2.5"
              >
                <svg lucideCircleAlert [size]="18" class="shrink-0 mt-0.5"></svg>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4" novalidate>
              <div>
                <label for="login-email" class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  Correo electrónico
                </label>
                <div class="relative">
                  <svg
                    lucideMail
                    [size]="16"
                    class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                  ></svg>
                  <input
                    id="login-email"
                    data-testid="login-email"
                    type="email"
                    formControlName="email"
                    autocomplete="email"
                    placeholder="admin@toystore.com"
                    class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-orange-500/25"
                  />
                </div>
                @if (form.controls.email.touched && form.controls.email.invalid) {
                  <p class="text-xs text-[var(--status-danger)] mt-1">Ingresa un correo electrónico válido.</p>
                }
              </div>

              <div>
                <label for="login-password" class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  Contraseña
                </label>
                <div class="relative">
                  <svg
                    lucideLock
                    [size]="16"
                    class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                  ></svg>
                  <input
                    id="login-password"
                    data-testid="login-password"
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="password"
                    autocomplete="current-password"
                    placeholder="••••••••"
                    class="w-full pl-10 pr-11 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-orange-500/25"
                  />
                  <button
                    type="button"
                    (click)="showPassword.update((v) => !v)"
                    [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    @if (showPassword()) {
                      <svg lucideEyeOff [size]="16"></svg>
                    } @else {
                      <svg lucideEye [size]="16"></svg>
                    }
                  </button>
                </div>
                @if (form.controls.password.touched && form.controls.password.invalid) {
                  <p class="text-xs text-[var(--status-danger)] mt-1">La contraseña es obligatoria.</p>
                }
              </div>

              <button
                type="submit"
                data-testid="login-submit"
                [disabled]="authStore.loading()"
                class="w-full py-2.5 px-4 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60 focus-ring min-h-[44px]"
              >
                <span>{{ authStore.loading() ? 'Verificando...' : 'Entrar a la consola' }}</span>
                <svg lucideArrowRight [size]="16"></svg>
              </button>
            </form>

            <p class="text-center text-sm text-[var(--text-secondary)] mt-6">
              ¿No tienes cuenta?
              <a routerLink="/auth/register" class="font-semibold text-[var(--brand-primary)] hover:underline">
                Crear cuenta de cliente
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastStore);
  protected readonly authStore = inject(AuthStore);

  protected readonly showPassword = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    try {
      const user = await this.authStore.login(this.form.getRawValue());
      this.toast.success('Bienvenido de nuevo', user.email);
      const returnUrl = sanitizeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
      await this.router.navigateByUrl(returnUrl, { replaceUrl: true });
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse) {
        const apiMsg = (err.error as { message?: string } | null)?.message;
        if (err.status === 429) {
          this.errorMessage.set('Demasiados intentos. Espera un minuto antes de reintentar.');
        } else {
          this.errorMessage.set(apiMsg || 'Credenciales inválidas o cuenta desactivada.');
        }
      } else {
        this.errorMessage.set('No se pudo establecer conexión con el servidor.');
      }
    }
  }
}
