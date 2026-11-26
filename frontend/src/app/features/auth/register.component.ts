import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideCircleAlert,
  LucideEye,
  LucideEyeOff,
  LucideToyBrick,
} from '@lucide/angular';
import { AuthStore } from '../../core/stores/auth.store';
import { ToastStore } from '../../core/stores/toast.store';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideToyBrick,
    LucideArrowRight,
    LucideCircleAlert,
    LucideEye,
    LucideEyeOff,
  ],
  template: `
    <div class="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <div class="w-full max-w-lg">
        <div class="flex items-center gap-2.5 mb-6 justify-center">
          <div class="w-10 h-10 rounded-xl bg-[var(--brand-primary)] text-white flex items-center justify-center">
            <svg lucideToyBrick [size]="20"></svg>
          </div>
          <div>
            <p class="text-base font-bold">ToyStore</p>
            <p class="text-xs text-[var(--text-muted)]">Registro de Cliente</p>
          </div>
        </div>

        <div class="surface-card p-6 sm:p-8" style="box-shadow: var(--shadow-md)">
          <div class="mb-6">
            <h1 class="text-2xl font-bold tracking-tight">Crear cuenta</h1>
            <p class="text-sm text-[var(--text-secondary)] mt-1">
              Regístrate para explorar el catálogo de juguetes y gestionar tu perfil.
            </p>
          </div>

          @if (errorMessage()) {
            <div
              data-testid="register-error"
              role="alert"
              class="mb-5 p-3.5 rounded-xl bg-[var(--status-danger-bg)] border border-rose-500/30 text-[var(--status-danger)] text-sm flex items-start gap-2.5"
            >
              <svg lucideCircleAlert [size]="18" class="shrink-0 mt-0.5"></svg>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4" novalidate>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="reg-first" class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  Nombre
                </label>
                <input
                  id="reg-first"
                  data-testid="register-first-name"
                  type="text"
                  formControlName="firstName"
                  placeholder="Sofía"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-orange-500/25"
                />
                @if (form.controls.firstName.touched && form.controls.firstName.invalid) {
                  <p class="text-xs text-[var(--status-danger)] mt-1">Nombre requerido.</p>
                }
              </div>

              <div>
                <label for="reg-last" class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  Apellido
                </label>
                <input
                  id="reg-last"
                  data-testid="register-last-name"
                  type="text"
                  formControlName="lastName"
                  placeholder="Navarro"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-orange-500/25"
                />
                @if (form.controls.lastName.touched && form.controls.lastName.invalid) {
                  <p class="text-xs text-[var(--status-danger)] mt-1">Apellido requerido.</p>
                }
              </div>
            </div>

            <div>
              <label for="reg-email" class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                Correo electrónico
              </label>
              <input
                id="reg-email"
                data-testid="register-email"
                type="email"
                formControlName="email"
                placeholder="sofia@toystore.com"
                class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-orange-500/25"
              />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <p class="text-xs text-[var(--status-danger)] mt-1">Ingresa un correo válido.</p>
              }
            </div>

            <div>
              <label for="reg-pass" class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                Contraseña (mínimo 6 caracteres)
              </label>
              <div class="relative">
                <input
                  id="reg-pass"
                  data-testid="register-password"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  (input)="passwordPreview.set(form.controls.password.value)"
                  placeholder="••••••••"
                  class="w-full px-3.5 pr-11 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-orange-500/25"
                />
                <button
                  type="button"
                  (click)="showPassword.update((v) => !v)"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[var(--text-muted)] cursor-pointer"
                >
                  @if (showPassword()) {
                    <svg lucideEyeOff [size]="16"></svg>
                  } @else {
                    <svg lucideEye [size]="16"></svg>
                  }
                </button>
              </div>
              <div class="mt-2 flex items-center gap-2">
                <div class="flex-1 h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                  <div
                    class="h-full transition-all duration-300"
                    [style.width.%]="strength().percent"
                    [class]="strength().barClass"
                  ></div>
                </div>
                <span class="text-[11px] font-medium text-[var(--text-muted)]">{{ strength().label }}</span>
              </div>
            </div>

            <div>
              <label for="reg-confirm" class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                Confirmar contraseña
              </label>
              <input
                id="reg-confirm"
                data-testid="register-confirm-password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="confirmPassword"
                placeholder="••••••••"
                class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-orange-500/25"
              />
            </div>

            <button
              type="submit"
              data-testid="register-submit"
              [disabled]="authStore.loading()"
              class="w-full py-2.5 px-4 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60 focus-ring min-h-[44px]"
            >
              <span>{{ authStore.loading() ? 'Creando cuenta...' : 'Registrar cuenta' }}</span>
              <svg lucideArrowRight [size]="16"></svg>
            </button>
          </form>

          <p class="text-center text-sm text-[var(--text-secondary)] mt-6">
            ¿Ya tienes cuenta?
            <a routerLink="/auth/login" class="font-semibold text-[var(--brand-primary)] hover:underline">
              Iniciar sesión
            </a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastStore);
  protected readonly authStore = inject(AuthStore);

  protected readonly showPassword = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly passwordPreview = signal('');

  protected readonly strength = computed(() => {
    const pw = this.passwordPreview();
    let score = 0;
    if (pw.length >= 6) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw) && pw.length >= 10) score++;

    if (!pw) return { percent: 0, label: 'Sin clave', barClass: 'bg-slate-400' };
    if (score <= 1) return { percent: 30, label: 'Débil', barClass: 'bg-[var(--status-danger)]' };
    if (score === 2) return { percent: 60, label: 'Media', barClass: 'bg-[var(--status-warning)]' };
    if (score === 3) return { percent: 85, label: 'Fuerte', barClass: 'bg-[var(--brand-primary)]' };
    return { percent: 100, label: 'Excelente', barClass: 'bg-[var(--status-success)]' };
  });

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.getRawValue();
    if (val.password !== val.confirmPassword) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    this.errorMessage.set(null);
    try {
      await this.authStore.register({
        firstName: val.firstName,
        lastName: val.lastName,
        email: val.email,
        password: val.password,
      });
      this.toast.success('Cuenta creada', 'Ahora puedes iniciar sesión con tus credenciales.');
      await this.router.navigateByUrl('/auth/login');
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse) {
        const apiMsg = (err.error as { message?: string } | null)?.message;
        this.errorMessage.set(apiMsg || 'No fue posible completar el registro.');
      } else {
        this.errorMessage.set('Error de conexión con el servidor.');
      }
    }
  }
}
