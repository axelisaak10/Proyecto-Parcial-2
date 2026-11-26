import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideChevronRight,
  LucideLayoutDashboard,
  LucideLogOut,
  LucideMenu,
  LucideMoon,
  LucidePackage,
  LucidePanelLeftClose,
  LucidePanelLeftOpen,
  LucideShieldCheck,
  LucideSun,
  LucideToyBrick,
  LucideUserCircle,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import { filter } from 'rxjs';
import { AuthStore } from '../core/stores/auth.store';
import { ThemeStore } from '../core/stores/theme.store';
import { BadgeComponent } from '../shared/components/badge.component';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    BadgeComponent,
    ConfirmDialogComponent,
    LucideLayoutDashboard,
    LucidePackage,
    LucideUsers,
    LucideUserCircle,
    LucideShieldCheck,
    LucideSun,
    LucideMoon,
    LucideLogOut,
    LucideMenu,
    LucideX,
    LucidePanelLeftClose,
    LucidePanelLeftOpen,
    LucideToyBrick,
    LucideChevronRight,
  ],
  template: `
    <div class="min-h-screen flex bg-[var(--bg-canvas)] text-[var(--text-primary)] overflow-x-hidden">
      <!-- Desktop Sidebar -->
      <aside
        class="hidden lg:flex flex-col shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-surface)] transition-all duration-200 sticky top-0 h-screen"
        [class]="sidebarCollapsed() ? 'w-[76px]' : 'w-64'"
      >
        <div class="h-16 px-4 flex items-center justify-between border-b border-[var(--border-default)]">
          <a routerLink="/dashboard" class="flex items-center gap-2.5 min-w-0 focus-ring rounded-lg">
            <div
              class="w-9 h-9 rounded-xl bg-[var(--brand-primary)] text-white flex items-center justify-center shrink-0 shadow-xs"
            >
              <svg lucideToyBrick [size]="18"></svg>
            </div>
            @if (!sidebarCollapsed()) {
              <div class="min-w-0">
                <p class="text-sm font-bold tracking-tight truncate">ToyStore</p>
                <p class="text-[11px] text-[var(--text-muted)] truncate">Juguetería Digital</p>
              </div>
            }
          </a>
          <button
            type="button"
            (click)="sidebarCollapsed.update((v) => !v)"
            aria-label="Alternar barra lateral"
            class="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer focus-ring"
          >
            @if (sidebarCollapsed()) {
              <svg lucidePanelLeftOpen [size]="18"></svg>
            } @else {
              <svg lucidePanelLeftClose [size]="18"></svg>
            }
          </button>
        </div>

        <nav class="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Navegación principal">
          <a
            routerLink="/dashboard"
            routerLinkActive="bg-[var(--brand-soft)] text-[var(--brand-primary)] font-semibold"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition focus-ring"
            [title]="sidebarCollapsed() ? 'Dashboard' : ''"
          >
            <svg lucideLayoutDashboard [size]="18" class="shrink-0"></svg>
            @if (!sidebarCollapsed()) {
              <span class="truncate">Dashboard</span>
            }
          </a>

          <a
            routerLink="/products"
            routerLinkActive="bg-[var(--brand-soft)] text-[var(--brand-primary)] font-semibold"
            data-testid="nav-products"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition focus-ring"
            [title]="sidebarCollapsed() ? 'Productos' : ''"
          >
            <svg lucidePackage [size]="18" class="shrink-0"></svg>
            @if (!sidebarCollapsed()) {
              <span class="truncate">Productos</span>
            }
          </a>

          @if (authStore.isAdmin()) {
            <a
              routerLink="/users"
              routerLinkActive="bg-[var(--brand-soft)] text-[var(--brand-primary)] font-semibold"
              data-testid="nav-users"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition focus-ring"
              [title]="sidebarCollapsed() ? 'Usuarios' : ''"
            >
              <svg lucideUsers [size]="18" class="shrink-0"></svg>
              @if (!sidebarCollapsed()) {
                <span class="truncate">Usuarios</span>
              }
            </a>
          }

          <a
            routerLink="/profile"
            routerLinkActive="bg-[var(--brand-soft)] text-[var(--brand-primary)] font-semibold"
            data-testid="nav-profile"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition focus-ring"
            [title]="sidebarCollapsed() ? 'Mi Perfil' : ''"
          >
            <svg lucideUserCircle [size]="18" class="shrink-0"></svg>
            @if (!sidebarCollapsed()) {
              <span class="truncate">Mi Perfil</span>
            }
          </a>

          @if (authStore.isAdmin()) {
            <a
              routerLink="/admin"
              routerLinkActive="bg-[var(--brand-soft)] text-[var(--brand-primary)] font-semibold"
              data-testid="nav-admin"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition focus-ring"
              [title]="sidebarCollapsed() ? 'Sistema y Respaldos' : ''"
            >
              <svg lucideShieldCheck [size]="18" class="shrink-0"></svg>
              @if (!sidebarCollapsed()) {
                <span class="truncate">Administración</span>
              }
            </a>
          }
        </nav>

        <div class="p-3 border-t border-[var(--border-default)]">
          <a
            routerLink="/profile"
            [title]="sidebarCollapsed() ? 'Ver mi perfil' : ''"
            class="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--brand-soft)] transition focus-ring"
          >
            <div
              class="w-9 h-9 rounded-full bg-[var(--brand-primary)] text-white text-xs font-bold flex items-center justify-center shrink-0"
            >
              {{ authStore.initials() }}
            </div>
            @if (!sidebarCollapsed()) {
              <div class="min-w-0 flex-1">
                <p class="text-xs font-semibold truncate text-[var(--text-primary)]">
                  {{ authStore.fullName() }}
                </p>
                <p class="text-[11px] text-[var(--text-muted)] truncate">
                  {{ authStore.user()?.email }}
                </p>
              </div>
            }
          </a>
        </div>
      </aside>

      <!-- Mobile Drawer Backdrop -->
      @if (mobileMenuOpen()) {
        <div
          class="fixed inset-0 z-40 bg-[#140F1D]/65 backdrop-blur-xs lg:hidden"
          (click)="mobileMenuOpen.set(false)"
        ></div>
      }

      <!-- Mobile Drawer -->
      <aside
        data-testid="mobile-drawer"
        class="fixed inset-y-0 left-0 z-50 w-72 bg-[var(--bg-surface)] border-r border-[var(--border-default)] flex flex-col transform transition-transform duration-200 lg:hidden"
        [class]="mobileMenuOpen() ? 'translate-x-0' : '-translate-x-full'"
        aria-label="Menú móvil"
      >
        <div class="h-16 px-4 flex items-center justify-between border-b border-[var(--border-default)]">
          <div class="flex items-center gap-2.5">
            <div
              class="w-9 h-9 rounded-xl bg-[var(--brand-primary)] text-white flex items-center justify-center"
            >
              <svg lucideToyBrick [size]="18"></svg>
            </div>
            <div>
              <p class="text-sm font-bold">ToyStore</p>
              <p class="text-[11px] text-[var(--text-muted)]">Juguetería Digital</p>
            </div>
          </div>
          <button
            type="button"
            data-testid="mobile-menu-close"
            (click)="mobileMenuOpen.set(false)"
            aria-label="Cerrar menú"
            class="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer focus-ring"
          >
            <svg lucideX [size]="20"></svg>
          </button>
        </div>

        <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
          <a
            routerLink="/dashboard"
            (click)="mobileMenuOpen.set(false)"
            routerLinkActive="bg-[var(--brand-soft)] text-[var(--brand-primary)] font-semibold"
            class="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
          >
            <svg lucideLayoutDashboard [size]="18"></svg>
            <span>Dashboard</span>
          </a>
          <a
            routerLink="/products"
            (click)="mobileMenuOpen.set(false)"
            routerLinkActive="bg-[var(--brand-soft)] text-[var(--brand-primary)] font-semibold"
            class="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
          >
            <svg lucidePackage [size]="18"></svg>
            <span>Productos</span>
          </a>
          @if (authStore.isAdmin()) {
            <a
              routerLink="/users"
              (click)="mobileMenuOpen.set(false)"
              routerLinkActive="bg-[var(--brand-soft)] text-[var(--brand-primary)] font-semibold"
              class="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            >
              <svg lucideUsers [size]="18"></svg>
              <span>Usuarios</span>
            </a>
          }
          <a
            routerLink="/profile"
            (click)="mobileMenuOpen.set(false)"
            routerLinkActive="bg-[var(--brand-soft)] text-[var(--brand-primary)] font-semibold"
            class="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
          >
            <svg lucideUserCircle [size]="18"></svg>
            <span>Mi Perfil</span>
          </a>
          @if (authStore.isAdmin()) {
            <a
              routerLink="/admin"
              (click)="mobileMenuOpen.set(false)"
              routerLinkActive="bg-[var(--brand-soft)] text-[var(--brand-primary)] font-semibold"
              class="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            >
              <svg lucideShieldCheck [size]="18"></svg>
              <span>Administración</span>
            </a>
          }
        </nav>

        <div class="p-4 border-t border-[var(--border-default)] space-y-3">
          <a
            routerLink="/profile"
            (click)="mobileMenuOpen.set(false)"
            class="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[var(--bg-subtle)] transition"
          >
            <div
              class="w-9 h-9 rounded-full bg-[var(--brand-primary)] text-white text-xs font-bold flex items-center justify-center shrink-0"
            >
              {{ authStore.initials() }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold truncate">{{ authStore.fullName() }}</p>
              <p class="text-xs text-[var(--text-muted)] truncate">{{ authStore.user()?.email }}</p>
            </div>
          </a>
          <button
            type="button"
            data-testid="mobile-logout-btn"
            (click)="promptLogoutFromMobile()"
            class="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-rose-500/30 bg-[var(--status-danger-bg)] text-[var(--status-danger)] text-xs font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer focus-ring"
          >
            <svg lucideLogOut [size]="16"></svg>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <!-- Main Column -->
      <div class="flex-1 flex flex-col min-w-0">
        <!-- Unified Top Header -->
        <header
          class="h-16 sticky top-0 z-30 px-4 sm:px-6 border-b border-[var(--border-default)] bg-[var(--bg-surface)]/95 backdrop-blur-xs flex items-center justify-between gap-3"
        >
          <div class="flex items-center gap-3 min-w-0">
            <button
              type="button"
              data-testid="mobile-menu-btn"
              (click)="mobileMenuOpen.set(true)"
              aria-label="Abrir menú"
              class="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer focus-ring"
            >
              <svg lucideMenu [size]="20"></svg>
            </button>
            <div class="flex items-center gap-2 min-w-0">
              <span class="hidden sm:inline text-xs font-medium text-[var(--text-muted)]">
                ToyStore
              </span>
              <svg lucideChevronRight [size]="14" class="hidden sm:inline text-[var(--text-muted)] shrink-0"></svg>
              <span class="text-sm font-semibold text-[var(--text-primary)] truncate">
                {{ currentSectionLabel() }}
              </span>
              <app-badge [variant]="authStore.isAdmin() ? 'info' : 'neutral'" [dot]="true">
                {{ roleLabel() }}
              </app-badge>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              type="button"
              data-testid="theme-toggle"
              (click)="themeStore.toggle()"
              [attr.aria-label]="themeStore.theme() === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'"
              class="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:px-3 sm:py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center justify-center gap-2 text-xs font-medium transition cursor-pointer focus-ring"
            >
              @if (themeStore.theme() === 'light') {
                <svg lucideMoon [size]="16"></svg>
                <span class="hidden sm:inline">Oscuro</span>
              } @else {
                <svg lucideSun [size]="16"></svg>
                <span class="hidden sm:inline">Claro</span>
              }
            </button>

            <button
              type="button"
              data-testid="logout-btn"
              (click)="logoutConfirmOpen.set(true)"
              aria-label="Cerrar sesión"
              class="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:px-3.5 sm:py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--status-danger-bg)] hover:text-[var(--status-danger)] hover:border-rose-500/30 text-[var(--text-secondary)] inline-flex items-center justify-center gap-2 text-xs font-semibold transition cursor-pointer focus-ring"
            >
              <svg lucideLogOut [size]="16"></svg>
              <span class="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        <!-- Page Content -->
        <main class="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-[1440px] mx-auto">
          <router-outlet />
        </main>
      </div>
    </div>

    <app-confirm-dialog
      [open]="logoutConfirmOpen()"
      title="¿Cerrar sesión?"
      message="¿Estás seguro de que deseas cerrar tu sesión actual en ToyStore?"
      confirmLabel="Sí, cerrar sesión"
      cancelLabel="Seguir conectado"
      [danger]="true"
      [busy]="loggingOut()"
      (confirmed)="confirmLogout()"
      (cancelled)="logoutConfirmOpen.set(false)"
    />
  `,
})
export class AppShellComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly authStore = inject(AuthStore);
  protected readonly themeStore = inject(ThemeStore);

  protected readonly sidebarCollapsed = signal(false);
  protected readonly mobileMenuOpen = signal(false);
  protected readonly logoutConfirmOpen = signal(false);
  protected readonly loggingOut = signal(false);
  protected readonly currentPath = signal(this.router.url);

  protected readonly roleLabel = computed(() =>
    this.authStore.isAdmin() ? 'Administrador' : 'Cliente'
  );

  protected readonly currentSectionLabel = computed(() => {
    const url = this.currentPath();
    if (url.startsWith('/products')) return 'Catálogo de Juguetes';
    if (url.startsWith('/users')) return 'Gestión de Usuarios';
    if (url.startsWith('/profile')) return 'Mi Perfil';
    if (url.startsWith('/admin')) return 'Administración';
    return 'Dashboard';
  });

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((e) => {
        this.currentPath.set(e.urlAfterRedirects);
      });
  }

  protected promptLogoutFromMobile(): void {
    this.mobileMenuOpen.set(false);
    this.logoutConfirmOpen.set(true);
  }

  protected async confirmLogout(): Promise<void> {
    this.loggingOut.set(true);
    try {
      await this.authStore.logout();
    } finally {
      this.loggingOut.set(false);
      this.logoutConfirmOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.mobileMenuOpen.set(false);
  }
}
