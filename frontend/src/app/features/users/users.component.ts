import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucidePencil,
  LucideSearch,
  LucideUserCheck,
  LucideUserPlus,
  LucideUserX,
  LucideX,
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { ManagedUser } from '../../core/models/user.model';
import { UsersService } from '../../core/services/users.service';
import { AuthStore } from '../../core/stores/auth.store';
import { ToastStore } from '../../core/stores/toast.store';
import { BadgeComponent } from '../../shared/components/badge.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BadgeComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    SkeletonLoaderComponent,
    LucideSearch,
    LucideUserPlus,
    LucidePencil,
    LucideUserCheck,
    LucideUserX,
    LucideChevronLeft,
    LucideChevronRight,
    LucideX,
  ],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div class="flex items-center gap-2.5">
            <h1 class="text-2xl font-bold tracking-tight">Gestión de Usuarios</h1>
            @if (!loading()) {
              <app-badge variant="neutral">{{ total() }} cuentas</app-badge>
            }
          </div>
          <p class="text-sm text-[var(--text-secondary)] mt-1">
            Administra cuentas, roles de acceso y estado de activación.
          </p>
        </div>

        <button
          type="button"
          data-testid="new-user-btn"
          (click)="openCreateModal()"
          class="px-4 py-2.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer focus-ring min-h-[44px]"
        >
          <svg lucideUserPlus [size]="18"></svg>
          <span>Nuevo Usuario</span>
        </button>
      </div>

      <!-- Toolbar -->
      <div class="surface-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div class="relative flex-1">
          <svg
            lucideSearch
            [size]="16"
            class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
          ></svg>
          <input
            type="search"
            data-testid="users-search"
            [value]="searchTerm()"
            (input)="onSearchInput($event)"
            placeholder="Buscar por correo, nombre o apellido..."
            class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:border-[var(--brand-primary)] focus:outline-none"
          />
        </div>

        <select
          [value]="selectedStatus()"
          (change)="onStatusChange($event)"
          aria-label="Filtrar por estado"
          class="px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:border-[var(--brand-primary)] focus:outline-none min-h-[44px]"
        >
          <option value="all">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Desactivados</option>
        </select>

        @if (hasActiveFilters()) {
          <button
            type="button"
            (click)="resetFilters()"
            class="px-3 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1.5 transition cursor-pointer min-h-[44px]"
          >
            <svg lucideX [size]="14"></svg>
            <span>Limpiar</span>
          </button>
        }
      </div>

      <!-- List -->
      @if (loading()) {
        <app-skeleton-loader [rows]="5" />
      } @else if (users().length === 0) {
        <app-empty-state
          title="No se encontraron usuarios"
          description="Ajusta el filtro de búsqueda o crea una nueva cuenta."
          actionLabel="Crear usuario"
          (action)="openCreateModal()"
        />
      } @else if (isMobile()) {
        <!-- Mobile Stacked Cards -->
        <div class="grid grid-cols-1 gap-3.5">
          @for (u of users(); track u.id) {
            <article [attr.data-email]="u.email" class="surface-card p-4 space-y-3.5">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-semibold text-sm truncate">
                    {{ fullName(u) }}
                  </p>
                  <p class="text-xs font-mono-code text-[var(--text-muted)] truncate">{{ u.email }}</p>
                </div>
                <app-badge [variant]="u.isActive ? 'success' : 'danger'" [dot]="true">
                  {{ u.isActive ? 'Activo' : 'Inactivo' }}
                </app-badge>
              </div>

              <div class="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <app-badge [variant]="u.role === 'Admin' ? 'info' : 'neutral'">
                  {{ u.role }}
                </app-badge>
                <span>{{ u.profile?.city || 'Sin ciudad' }}</span>
              </div>

              <div class="flex items-center gap-2 pt-2 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  [attr.data-testid]="'edit-user-' + u.id"
                  (click)="openEditModal(u)"
                  class="flex-1 min-h-[44px] px-3 py-2 rounded-xl border border-[var(--border-default)] hover:bg-[var(--bg-subtle)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <svg lucidePencil [size]="14"></svg>
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  [attr.data-testid]="'toggle-user-' + u.id"
                  [disabled]="u.id === authStore.user()?.id"
                  (click)="promptToggleStatus(u)"
                  class="flex-1 min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                  [class]="
                    u.isActive
                      ? 'border-rose-500/30 bg-[var(--status-danger-bg)] text-[var(--status-danger)]'
                      : 'border-emerald-500/30 bg-[var(--status-success-bg)] text-[var(--status-success)]'
                  "
                >
                  @if (u.isActive) {
                    <svg lucideUserX [size]="14"></svg>
                    <span>Desactivar</span>
                  } @else {
                    <svg lucideUserCheck [size]="14"></svg>
                    <span>Activar</span>
                  }
                </button>
              </div>
            </article>
          }
        </div>
      } @else {
        <!-- Desktop Table -->
        <div class="surface-card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-[var(--bg-subtle)] border-b border-[var(--border-default)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <th class="px-5 py-3.5">Usuario</th>
                  <th class="px-4 py-3.5">Correo</th>
                  <th class="px-4 py-3.5">Ubicación</th>
                  <th class="px-4 py-3.5">Rol</th>
                  <th class="px-4 py-3.5">Estado</th>
                  <th class="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--border-default)] text-sm">
                @for (u of users(); track u.id) {
                  <tr [attr.data-email]="u.email" class="hover:bg-[var(--bg-subtle)]/50 transition">
                    <td class="px-5 py-3.5 font-semibold">{{ fullName(u) }}</td>
                    <td class="px-4 py-3.5 font-mono-code text-xs text-[var(--text-secondary)]">
                      {{ u.email }}
                    </td>
                    <td class="px-4 py-3.5 text-xs text-[var(--text-secondary)]">
                      {{ locationLabel(u) }}
                    </td>
                    <td class="px-4 py-3.5">
                      <app-badge [variant]="u.role === 'Admin' ? 'info' : 'neutral'">
                        {{ u.role }}
                      </app-badge>
                    </td>
                    <td class="px-4 py-3.5">
                      <app-badge [variant]="u.isActive ? 'success' : 'danger'" [dot]="true">
                        {{ u.isActive ? 'Activo' : 'Inactivo' }}
                      </app-badge>
                    </td>
                    <td class="px-5 py-3.5 text-right">
                      <div class="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          [attr.data-testid]="'edit-user-' + u.id"
                          (click)="openEditModal(u)"
                          aria-label="Editar usuario"
                          class="p-2 rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer focus-ring"
                        >
                          <svg lucidePencil [size]="15"></svg>
                        </button>
                        <button
                          type="button"
                          [attr.data-testid]="'toggle-user-' + u.id"
                          [disabled]="u.id === authStore.user()?.id"
                          (click)="promptToggleStatus(u)"
                          [attr.aria-label]="u.isActive ? 'Desactivar usuario' : 'Activar usuario'"
                          class="px-2.5 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer disabled:opacity-40 focus-ring"
                          [class]="
                            u.isActive
                              ? 'border-rose-500/30 bg-[var(--status-danger-bg)] text-[var(--status-danger)]'
                              : 'border-emerald-500/30 bg-[var(--status-success-bg)] text-[var(--status-success)]'
                          "
                        >
                          @if (u.isActive) {
                            <svg lucideUserX [size]="14"></svg>
                            <span>Desactivar</span>
                          } @else {
                            <svg lucideUserCheck [size]="14"></svg>
                            <span>Activar</span>
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (totalPages() > 1) {
        <div class="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>Página {{ page() }} de {{ totalPages() }} · {{ total() }} usuarios</span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              [disabled]="page() <= 1"
              (click)="goToPage(page() - 1)"
              class="px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
            >
              <svg lucideChevronLeft [size]="15"></svg>
              <span>Anterior</span>
            </button>
            <button
              type="button"
              [disabled]="page() >= totalPages()"
              (click)="goToPage(page() + 1)"
              class="px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Siguiente</span>
              <svg lucideChevronRight [size]="15"></svg>
            </button>
          </div>
        </div>
      }
    </div>

    <!-- Create User Modal -->
    @if (createModalOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-[#140F1D]/65 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        data-testid="user-create-modal"
        (click)="!saving() && createModalOpen.set(false)"
      >
        <div
          class="surface-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center justify-between pb-4 border-b border-[var(--border-default)]">
            <h2 class="text-lg font-bold">Registrar Nuevo Usuario</h2>
            <button
              type="button"
              (click)="createModalOpen.set(false)"
              class="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] cursor-pointer"
            >
              <svg lucideX [size]="18"></svg>
            </button>
          </div>

          <form [formGroup]="createForm" (ngSubmit)="submitCreate()" class="mt-5 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  Nombre
                </label>
                <input
                  data-testid="user-create-firstname"
                  type="text"
                  formControlName="firstName"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  Apellido
                </label>
                <input
                  data-testid="user-create-lastname"
                  type="text"
                  formControlName="lastName"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                Correo electrónico
              </label>
              <input
                data-testid="user-create-email"
                type="email"
                formControlName="email"
                class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  Contraseña inicial
                </label>
                <input
                  data-testid="user-create-password"
                  type="password"
                  formControlName="password"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  Rol
                </label>
                <select
                  data-testid="user-create-role"
                  formControlName="roleId"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm"
                >
                  <option [ngValue]="2">Customer</option>
                  <option [ngValue]="1">Admin</option>
                </select>
              </div>
            </div>

            <div class="pt-4 border-t border-[var(--border-default)] flex justify-end gap-2.5">
              <button
                type="button"
                (click)="createModalOpen.set(false)"
                class="px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-sm font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                data-testid="user-create-submit"
                [disabled]="saving()"
                class="px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
              >
                {{ saving() ? 'Creando...' : 'Crear usuario' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Edit User Modal -->
    @if (editTarget()) {
      <div
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-[#140F1D]/65 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        data-testid="user-edit-modal"
        (click)="!saving() && editTarget.set(null)"
      >
        <div
          class="surface-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center justify-between pb-4 border-b border-[var(--border-default)]">
            <div>
              <h2 class="text-lg font-bold">Editar Usuario</h2>
              <p class="text-xs font-mono-code text-[var(--text-muted)]">{{ editTarget()?.email }}</p>
            </div>
            <button
              type="button"
              (click)="editTarget.set(null)"
              class="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] cursor-pointer"
            >
              <svg lucideX [size]="18"></svg>
            </button>
          </div>

          <form [formGroup]="editForm" (ngSubmit)="submitEdit()" class="mt-5 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  Nombre
                </label>
                <input
                  data-testid="user-edit-firstname"
                  type="text"
                  formControlName="firstName"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  Apellido
                </label>
                <input
                  data-testid="user-edit-lastname"
                  type="text"
                  formControlName="lastName"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  Teléfono
                </label>
                <input
                  data-testid="user-edit-phone"
                  type="text"
                  formControlName="phone"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  Ciudad
                </label>
                <input
                  data-testid="user-edit-city"
                  type="text"
                  formControlName="city"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  País
                </label>
                <input
                  data-testid="user-edit-country"
                  type="text"
                  formControlName="country"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  Rol
                </label>
                <select
                  data-testid="user-edit-role"
                  formControlName="roleId"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm disabled:opacity-50"
                >
                  <option [ngValue]="2">Customer</option>
                  <option [ngValue]="1">Admin</option>
                </select>
              </div>
            </div>

            <div class="pt-4 border-t border-[var(--border-default)] flex justify-end gap-2.5">
              <button
                type="button"
                (click)="editTarget.set(null)"
                class="px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-sm font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                data-testid="user-edit-submit"
                [disabled]="saving()"
                class="px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
              >
                {{ saving() ? 'Guardando...' : 'Guardar cambios' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <app-confirm-dialog
      [open]="toggleTarget() !== null"
      [title]="toggleTarget()?.isActive ? 'Desactivar cuenta' : 'Activar cuenta'"
      [message]="
        toggleTarget()?.isActive
          ? '¿Deseas suspender el acceso de ' + (toggleTarget()?.email ?? '') + '?'
          : '¿Deseas reactivar el acceso de ' + (toggleTarget()?.email ?? '') + '?'
      "
      [confirmLabel]="toggleTarget()?.isActive ? 'Desactivar' : 'Activar'"
      [danger]="toggleTarget()?.isActive ?? true"
      [busy]="toggling()"
      (confirmed)="confirmToggleStatus()"
      (cancelled)="toggleTarget.set(null)"
    />
  `,
})
export class UsersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly toast = inject(ToastStore);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly authStore = inject(AuthStore);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly toggling = signal(false);

  protected readonly users = signal<ManagedUser[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = 10;

  protected readonly searchTerm = signal('');
  protected readonly selectedStatus = signal('all');
  protected readonly isMobile = signal(false);

  protected readonly createModalOpen = signal(false);
  protected readonly editTarget = signal<ManagedUser | null>(null);
  protected readonly toggleTarget = signal<ManagedUser | null>(null);

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));
  protected readonly hasActiveFilters = computed(
    () => this.searchTerm().trim().length > 0 || this.selectedStatus() !== 'all'
  );
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  protected readonly createForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    roleId: [2, Validators.required],
  });

  protected readonly editForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: [''],
    city: [''],
    country: [''],
    roleId: [2, Validators.required],
  });

  constructor() {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mq = window.matchMedia('(max-width: 767px)');
      this.isMobile.set(mq.matches);
      const listener = (e: MediaQueryListEvent) => this.isMobile.set(e.matches);
      mq.addEventListener('change', listener);
      this.destroyRef.onDestroy(() => mq.removeEventListener('change', listener));
    }
    this.destroyRef.onDestroy(() => {
      if (this.searchDebounce) clearTimeout(this.searchDebounce);
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  protected fullName(user: ManagedUser): string {
    const first = user.profile?.firstName ?? '';
    const last = user.profile?.lastName ?? '';
    const full = `${first} ${last}`.trim();
    return full || 'Sin perfil';
  }

  protected locationLabel(user: ManagedUser): string {
    const parts = [user.profile?.city, user.profile?.country].filter(Boolean);
    return parts.length ? parts.join(', ') : '—';
  }

  async loadUsers(): Promise<void> {
    this.loading.set(true);
    try {
      const statusVal = this.selectedStatus();
      const isActive = statusVal === 'all' ? null : statusVal === 'true';
      const resp = await firstValueFrom(
        this.usersService.getAll(this.page(), this.pageSize, this.searchTerm(), isActive)
      );
      this.users.set(resp.data.users);
      this.total.set(resp.data.total);
    } catch {
      this.toast.error('Error al cargar usuarios');
    } finally {
      this.loading.set(false);
    }
  }

  onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.page.set(1);
      void this.loadUsers();
    }, 300);
  }

  onStatusChange(event: Event): void {
    this.selectedStatus.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
    void this.loadUsers();
  }

  resetFilters(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchTerm.set('');
    this.selectedStatus.set('all');
    this.page.set(1);
    void this.loadUsers();
  }

  goToPage(nextPage: number): void {
    this.page.set(nextPage);
    void this.loadUsers();
  }

  openCreateModal(): void {
    this.createForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      roleId: 2,
    });
    this.createModalOpen.set(true);
  }

  openEditModal(user: ManagedUser): void {
    this.editTarget.set(user);
    this.editForm.reset({
      firstName: user.profile?.firstName ?? '',
      lastName: user.profile?.lastName ?? '',
      phone: user.profile?.phone ?? '',
      city: user.profile?.city ?? '',
      country: user.profile?.country ?? '',
      roleId: user.roleId,
    });
    if (user.id === this.authStore.user()?.id) {
      this.editForm.controls.roleId.disable();
    } else {
      this.editForm.controls.roleId.enable();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.saving()) {
      this.createModalOpen.set(false);
      this.editTarget.set(null);
    }
  }

  async submitCreate(): Promise<void> {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    try {
      const payload = this.createForm.getRawValue();
      await firstValueFrom(this.usersService.create(payload));
      this.toast.success('Usuario creado', payload.email);
      this.createModalOpen.set(false);
      await this.loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof HttpErrorResponse ? err.error?.message : null;
      this.toast.error('Error al crear usuario', msg || 'Verifica los datos ingresados.');
    } finally {
      this.saving.set(false);
    }
  }

  async submitEdit(): Promise<void> {
    const target = this.editTarget();
    if (!target || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    try {
      const val = this.editForm.getRawValue();
      await firstValueFrom(
        this.usersService.updateProfile(target.id, {
          firstName: val.firstName,
          lastName: val.lastName,
          phone: val.phone,
          city: val.city,
          country: val.country,
        })
      );

      if (target.id !== this.authStore.user()?.id && val.roleId !== target.roleId) {
        await firstValueFrom(this.usersService.updateRole(target.id, val.roleId));
      }

      this.toast.success('Usuario actualizado', target.email);
      this.editTarget.set(null);
      await this.loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof HttpErrorResponse ? err.error?.message : null;
      this.toast.error('No se pudo actualizar', msg || 'Error al guardar.');
    } finally {
      this.saving.set(false);
    }
  }

  promptToggleStatus(user: ManagedUser): void {
    this.toggleTarget.set(user);
  }

  async confirmToggleStatus(): Promise<void> {
    const target = this.toggleTarget();
    if (!target) return;

    this.toggling.set(true);
    try {
      await firstValueFrom(this.usersService.updateStatus(target.id, !target.isActive));
      this.toast.success(
        target.isActive ? 'Cuenta desactivada' : 'Cuenta reactivada',
        target.email
      );
      this.toggleTarget.set(null);
      await this.loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof HttpErrorResponse ? err.error?.message : null;
      this.toast.error('Error al actualizar estado', msg || 'No permitido.');
    } finally {
      this.toggling.set(false);
    }
  }
}
