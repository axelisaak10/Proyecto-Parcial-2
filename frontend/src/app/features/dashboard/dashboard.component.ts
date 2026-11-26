import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideActivity,
  LucideAlertTriangle,
  LucideArrowRight,
  LucideBoxes,
  LucideDollarSign,
  LucidePackage,
  LucideShieldCheck,
  LucideUsers,
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { HealthResponse } from '../../core/models/api-response.model';
import { Product, ProductStats } from '../../core/models/product.model';
import { AdminService } from '../../core/services/admin.service';
import { ProductsService } from '../../core/services/products.service';
import { UsersService } from '../../core/services/users.service';
import { AuthStore } from '../../core/stores/auth.store';
import { BadgeComponent } from '../../shared/components/badge.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CurrencyPipe,
    RouterLink,
    BadgeComponent,
    SkeletonLoaderComponent,
    LucidePackage,
    LucideDollarSign,
    LucideAlertTriangle,
    LucideUsers,
    LucideActivity,
    LucideArrowRight,
    LucideBoxes,
    LucideShieldCheck,
  ],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">
            Hola, {{ authStore.fullName() }}
          </h1>
          <p class="text-sm text-[var(--text-secondary)] mt-1">
            Resumen operativo de inventario de juguetes, usuarios y estado del servicio.
          </p>
        </div>

        <div class="flex items-center gap-2.5 flex-wrap">
          @if (health(); as h) {
            <app-badge [variant]="h.status === 'ok' ? 'success' : 'warning'" [dot]="true">
              API {{ h.status.toUpperCase() }} · DB {{ h.database }}
            </app-badge>
          }
          <a
            routerLink="/products"
            class="px-4 py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold inline-flex items-center gap-2 transition focus-ring"
          >
            <span>Explorar productos</span>
            <svg lucideArrowRight [size]="16"></svg>
          </a>
        </div>
      </div>

      @if (loading()) {
        <app-skeleton-loader [rows]="3" />
      } @else {
        <!-- KPI Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div class="surface-card p-5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Total Productos
              </span>
              <div class="w-9 h-9 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-primary)] flex items-center justify-center">
                <svg lucideBoxes [size]="18"></svg>
              </div>
            </div>
            <p class="text-2xl font-bold mt-3 tabular-nums" data-testid="kpi-total-products">
              {{ stats().totalProducts }}
            </p>
            <p class="text-xs text-[var(--text-secondary)] mt-1">
              {{ stats().activeProducts }} activos en catálogo
            </p>
          </div>

          <div class="surface-card p-5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Valor de Inventario
              </span>
              <div class="w-9 h-9 rounded-xl bg-[var(--status-success-bg)] text-[var(--status-success)] flex items-center justify-center">
                <svg lucideDollarSign [size]="18"></svg>
              </div>
            </div>
            <p class="text-2xl font-bold mt-3 tabular-nums">
              {{ stats().totalInventoryValue | currency: 'USD' : 'symbol' : '1.0-0' }}
            </p>
            <p class="text-xs text-[var(--text-secondary)] mt-1">
              Stock activo valorizado
            </p>
          </div>

          <div class="surface-card p-5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Alertas Stock Bajo
              </span>
              <div class="w-9 h-9 rounded-xl bg-[var(--status-warning-bg)] text-[var(--status-warning)] flex items-center justify-center">
                <svg lucideAlertTriangle [size]="18"></svg>
              </div>
            </div>
            <p class="text-2xl font-bold mt-3 tabular-nums">
              {{ stats().lowStockCount }}
            </p>
            <p class="text-xs text-[var(--text-secondary)] mt-1">
              Artículos con &le; 10 unidades
            </p>
          </div>

          <div class="surface-card p-5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                @if (authStore.isAdmin()) {
                  Usuarios Registrados
                } @else {
                  Estado del Sistema
                }
              </span>
              <div class="w-9 h-9 rounded-xl bg-[var(--status-info-bg)] text-[var(--status-info)] flex items-center justify-center">
                @if (authStore.isAdmin()) {
                  <svg lucideUsers [size]="18"></svg>
                } @else {
                  <svg lucideActivity [size]="18"></svg>
                }
              </div>
            </div>
            @if (authStore.isAdmin()) {
              <p class="text-2xl font-bold mt-3 tabular-nums">{{ totalUsers() }}</p>
              <p class="text-xs text-[var(--text-secondary)] mt-1">Cuentas gestionadas en SQLite</p>
            } @else {
              <p class="text-2xl font-bold mt-3">Operativo</p>
              <p class="text-xs text-[var(--text-secondary)] mt-1">v{{ health()?.version ?? '2.0.0' }}</p>
            }
          </div>
        </div>

        <!-- Recent Products & Quick Links -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 surface-card overflow-hidden">
            <div class="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
              <div>
                <h2 class="text-base font-semibold">Juguetes Recientes</h2>
                <p class="text-xs text-[var(--text-secondary)]">Últimas actualizaciones del catálogo</p>
              </div>
              <a routerLink="/products" class="text-xs font-semibold text-[var(--brand-primary)] hover:underline">
                Ver todos
              </a>
            </div>
            <div class="divide-y divide-[var(--border-default)]">
              @for (item of recentProducts(); track item.id) {
                <div class="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-[var(--bg-subtle)]/50 transition">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] flex items-center justify-center shrink-0">
                      <svg lucidePackage [size]="18"></svg>
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-medium truncate">{{ item.name }}</p>
                      <p class="text-xs text-[var(--text-muted)] font-mono-code">{{ item.sku }} · {{ item.category }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 shrink-0">
                    <span class="text-sm font-semibold tabular-nums">
                      {{ item.price | currency: 'USD' : 'symbol' : '1.2-2' }}
                    </span>
                    <app-badge [variant]="item.stock <= 10 ? 'warning' : 'success'">
                      {{ item.stock }} uds
                    </app-badge>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="surface-card p-5 space-y-4">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-primary)] flex items-center justify-center">
                <svg lucideShieldCheck [size]="18"></svg>
              </div>
              <div>
                <h2 class="text-base font-semibold">Accesos Rápidos</h2>
                <p class="text-xs text-[var(--text-secondary)]">Operación según tu rol</p>
              </div>
            </div>

            <div class="space-y-2.5">
              <a
                routerLink="/products"
                class="block p-3.5 rounded-xl border border-[var(--border-default)] hover:border-[var(--brand-primary)] hover:bg-[var(--bg-subtle)]/50 transition"
              >
                <p class="text-sm font-semibold">Catálogo de Juguetes</p>
                <p class="text-xs text-[var(--text-secondary)] mt-0.5">
                  Buscar, filtrar y administrar juguetes y existencias.
                </p>
              </a>

              @if (authStore.isAdmin()) {
                <a
                  routerLink="/users"
                  class="block p-3.5 rounded-xl border border-[var(--border-default)] hover:border-[var(--brand-primary)] hover:bg-[var(--bg-subtle)]/50 transition"
                >
                  <p class="text-sm font-semibold">Gestión de Usuarios</p>
                  <p class="text-xs text-[var(--text-secondary)] mt-0.5">
                    Crear cuentas, editar perfiles y activar/desactivar accesos.
                  </p>
                </a>
                <a
                  routerLink="/admin"
                  class="block p-3.5 rounded-xl border border-[var(--border-default)] hover:border-[var(--brand-primary)] hover:bg-[var(--bg-subtle)]/50 transition"
                >
                  <p class="text-sm font-semibold">Respaldos y Telemetría</p>
                  <p class="text-xs text-[var(--text-secondary)] mt-0.5">
                    Generar snapshots SQLite y verificar salud de OpenTelemetry.
                  </p>
                </a>
              } @else {
                <a
                  routerLink="/profile"
                  class="block p-3.5 rounded-xl border border-[var(--border-default)] hover:border-[var(--brand-primary)] hover:bg-[var(--bg-subtle)]/50 transition"
                >
                  <p class="text-sm font-semibold">Mi Perfil y Seguridad</p>
                  <p class="text-xs text-[var(--text-secondary)] mt-0.5">
                    Actualiza tus datos de contacto o cambia tu contraseña.
                  </p>
                </a>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly productsService = inject(ProductsService);
  private readonly usersService = inject(UsersService);
  private readonly adminService = inject(AdminService);
  protected readonly authStore = inject(AuthStore);

  protected readonly loading = signal(true);
  protected readonly stats = signal<ProductStats>({
    totalProducts: 0,
    activeProducts: 0,
    lowStockCount: 0,
    totalInventoryValue: 0,
  });
  protected readonly recentProducts = signal<Product[]>([]);
  protected readonly totalUsers = signal(0);
  protected readonly health = signal<HealthResponse | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const [productsResp, healthResp] = await Promise.all([
        firstValueFrom(this.productsService.getAll({ page: 1, pageSize: 5 })),
        firstValueFrom(this.adminService.getHealth()),
      ]);

      this.stats.set(productsResp.data.stats);
      this.recentProducts.set(productsResp.data.products);
      this.health.set(healthResp);

      if (this.authStore.isAdmin()) {
        const usersResp = await firstValueFrom(this.usersService.getAll(1, 1));
        this.totalUsers.set(usersResp.data.total);
      }
    } finally {
      this.loading.set(false);
    }
  }
}
