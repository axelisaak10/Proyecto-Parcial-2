import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideKeyRound, LucideUser } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { UsersService } from '../../core/services/users.service';
import { AuthStore } from '../../core/stores/auth.store';
import { ToastStore } from '../../core/stores/toast.store';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, LucideUser, LucideKeyRound],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Mi Perfil</h1>
        <p class="text-sm text-[var(--text-secondary)] mt-1">
          Administra tu información personal y contraseña de acceso.
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Profile Details Form -->
        <div class="surface-card p-6">
          <div class="flex items-center gap-3 mb-5">
            <div class="w-10 h-10 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-primary)] flex items-center justify-center">
              <svg lucideUser [size]="18"></svg>
            </div>
            <div>
              <h2 class="text-base font-semibold">Datos Personales</h2>
              <p class="text-xs text-[var(--text-secondary)]">{{ authStore.user()?.email }}</p>
            </div>
          </div>

          <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  Nombre
                </label>
                <input
                  data-testid="profile-first-name"
                  type="text"
                  formControlName="firstName"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:border-[var(--brand-primary)] focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  Apellido
                </label>
                <input
                  data-testid="profile-last-name"
                  type="text"
                  formControlName="lastName"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:border-[var(--brand-primary)] focus:outline-none"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  Teléfono
                </label>
                <input
                  data-testid="profile-phone"
                  type="text"
                  formControlName="phone"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:border-[var(--brand-primary)] focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  Ciudad
                </label>
                <input
                  data-testid="profile-city"
                  type="text"
                  formControlName="city"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:border-[var(--brand-primary)] focus:outline-none"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  País
                </label>
                <input
                  data-testid="profile-country"
                  type="text"
                  formControlName="country"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:border-[var(--brand-primary)] focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  Dirección
                </label>
                <input
                  data-testid="profile-address"
                  type="text"
                  formControlName="address"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:border-[var(--brand-primary)] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              data-testid="profile-save-btn"
              [disabled]="savingProfile()"
              class="px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold transition cursor-pointer disabled:opacity-60 focus-ring min-h-[44px]"
            >
              {{ savingProfile() ? 'Guardando...' : 'Guardar cambios' }}
            </button>
          </form>
        </div>

        <!-- Change Password Form -->
        <div class="surface-card p-6">
          <div class="flex items-center gap-3 mb-5">
            <div class="w-10 h-10 rounded-xl bg-[var(--status-warning-bg)] text-[var(--status-warning)] flex items-center justify-center">
              <svg lucideKeyRound [size]="18"></svg>
            </div>
            <div>
              <h2 class="text-base font-semibold">Seguridad y Contraseña</h2>
              <p class="text-xs text-[var(--text-secondary)]">Actualiza tu contraseña periódicamente</p>
            </div>
          </div>

          <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                Contraseña actual
              </label>
              <input
                data-testid="profile-current-password"
                type="password"
                formControlName="currentPassword"
                class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:border-[var(--brand-primary)] focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                Nueva contraseña (mínimo 6 caracteres)
              </label>
              <input
                data-testid="profile-new-password"
                type="password"
                formControlName="newPassword"
                class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:border-[var(--brand-primary)] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              data-testid="profile-password-btn"
              [disabled]="savingPassword()"
              class="px-5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] hover:bg-[var(--brand-primary)] hover:text-white text-sm font-semibold transition cursor-pointer disabled:opacity-60 focus-ring min-h-[44px]"
            >
              {{ savingPassword() ? 'Actualizando...' : 'Actualizar contraseña' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly toast = inject(ToastStore);
  protected readonly authStore = inject(AuthStore);

  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);

  protected readonly profileForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: [''],
    city: [''],
    country: [''],
    address: [''],
  });

  protected readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit(): void {
    const user = this.authStore.user();
    if (user) {
      this.profileForm.patchValue({
        firstName: user.profile?.firstName ?? user.firstName ?? '',
        lastName: user.profile?.lastName ?? user.lastName ?? '',
        phone: user.profile?.phone ?? '',
        city: user.profile?.city ?? '',
        country: user.profile?.country ?? '',
        address: user.profile?.address ?? '',
      });
    }
  }

  async saveProfile(): Promise<void> {
    const user = this.authStore.user();
    if (!user || this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.savingProfile.set(true);
    try {
      await firstValueFrom(this.usersService.updateProfile(user.id, this.profileForm.getRawValue()));
      await this.authStore.refreshUser();
      this.toast.success('Perfil actualizado', 'Tus datos se guardaron correctamente.');
    } catch (err: unknown) {
      const msg = err instanceof HttpErrorResponse ? err.error?.message : null;
      this.toast.error('Error al actualizar', msg || 'Verifica los campos ingresados.');
    } finally {
      this.savingProfile.set(false);
    }
  }

  async changePassword(): Promise<void> {
    const user = this.authStore.user();
    if (!user || this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.savingPassword.set(true);
    try {
      await firstValueFrom(this.usersService.changePassword(user.id, this.passwordForm.getRawValue()));
      this.passwordForm.reset();
      this.toast.success('Contraseña actualizada', 'Tu contraseña ha sido modificada.');
    } catch (err: unknown) {
      const msg = err instanceof HttpErrorResponse ? err.error?.message : null;
      this.toast.error('No se pudo cambiar', msg || 'Verifica tu contraseña actual.');
    } finally {
      this.savingPassword.set(false);
    }
  }
}
