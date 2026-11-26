import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideLayoutGrid,
  LucideList,
  LucidePackage,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { Product } from '../../core/models/product.model';
import { safeImageUrlValidator, sanitizeImageUrl } from '../../core/security/url-sanitizer.util';
import { ProductsService } from '../../core/services/products.service';
import { AuthStore } from '../../core/stores/auth.store';
import { ToastStore } from '../../core/stores/toast.store';
import { BadgeComponent } from '../../shared/components/badge.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader.component';

const DEFAULT_CATEGORIES = [
  'Construcción',
  'Muñecos y Figuras',
  'Juegos de Mesa',
  'Vehículos RC',
  'Educativos STEM',
  'Peluches',
  'Aire Libre',
];

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    BadgeComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    SkeletonLoaderComponent,
    LucideSearch,
    LucidePlus,
    LucidePencil,
    LucideTrash2,
    LucidePackage,
    LucideLayoutGrid,
    LucideList,
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
            <h1 class="text-2xl font-bold tracking-tight">Catálogo de Juguetes</h1>
            @if (!loading()) {
              <app-badge variant="neutral">{{ total() }} juguetes</app-badge>
            }
          </div>
          <p class="text-sm text-[var(--text-secondary)] mt-1">
            {{ authStore.isAdmin() ? 'Administra inventario de juguetes, precios y disponibilidad.' : 'Consulta existencias y precios actualizados.' }}
          </p>
        </div>

        @if (authStore.isAdmin()) {
          <button
            type="button"
            data-testid="new-product-btn"
            (click)="openCreateModal()"
            class="px-4 py-2.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer focus-ring min-h-[44px]"
          >
            <svg lucidePlus [size]="18"></svg>
            <span>Nuevo Juguete</span>
          </button>
        }
      </div>

      <!-- Filters Toolbar -->
      <div class="surface-card p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div class="relative flex-1">
          <svg
            lucideSearch
            [size]="16"
            class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
          ></svg>
          <input
            type="search"
            data-testid="products-search"
            [value]="searchTerm()"
            (input)="onSearchInput($event)"
            placeholder="Buscar por nombre, SKU o categoría..."
            class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:border-[var(--brand-primary)] focus:outline-none"
          />
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <select
            data-testid="products-category-filter"
            [value]="selectedCategory()"
            (change)="onCategoryChange($event)"
            aria-label="Filtrar por categoría"
            class="px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:border-[var(--brand-primary)] focus:outline-none min-h-[44px]"
          >
            <option value="all">Todas las categorías</option>
            @for (cat of availableCategories(); track cat) {
              <option [value]="cat">{{ cat }}</option>
            }
          </select>

          <select
            [value]="selectedStatus()"
            (change)="onStatusChange($event)"
            aria-label="Filtrar por estado"
            class="px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:border-[var(--brand-primary)] focus:outline-none min-h-[44px]"
          >
            <option value="all">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
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

          @if (!isMobile()) {
            <div class="inline-flex rounded-xl border border-[var(--border-default)] p-1 bg-[var(--bg-subtle)]">
              <button
                type="button"
                (click)="viewMode.set('table')"
                aria-label="Vista tabla"
                class="p-2 rounded-lg transition cursor-pointer"
                [class]="viewMode() === 'table' ? 'bg-[var(--bg-surface)] text-[var(--brand-primary)] shadow-xs' : 'text-[var(--text-muted)]'"
              >
                <svg lucideList [size]="16"></svg>
              </button>
              <button
                type="button"
                (click)="viewMode.set('grid')"
                aria-label="Vista cuadrícula"
                class="p-2 rounded-lg transition cursor-pointer"
                [class]="viewMode() === 'grid' ? 'bg-[var(--bg-surface)] text-[var(--brand-primary)] shadow-xs' : 'text-[var(--text-muted)]'"
              >
                <svg lucideLayoutGrid [size]="16"></svg>
              </button>
            </div>
          }
        </div>
      </div>

      <!-- Content -->
      @if (loading()) {
        <app-skeleton-loader [rows]="5" />
      } @else if (products().length === 0) {
        <app-empty-state
          title="No hay juguetes que coincidan"
          description="Ajusta los filtros de búsqueda o registra un nuevo juguete."
          [actionLabel]="authStore.isAdmin() ? 'Agregar juguete' : ''"
          (action)="openCreateModal()"
        />
      } @else if (isMobile() || viewMode() === 'grid') {
        <!-- Responsive Cards (Mobile-first & Grid View) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          @for (product of products(); track product.id) {
            <article
              [attr.data-sku]="product.sku"
              class="surface-card p-4 flex flex-col justify-between gap-4 hover:shadow-md transition"
            >
              <div class="space-y-3">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-center gap-3 min-w-0">
                    @if (safeImg(product.imageUrl); as imgUrl) {
                      <img
                        [src]="imgUrl"
                        [alt]="product.name"
                        class="w-12 h-12 rounded-xl object-cover border border-[var(--border-default)] shrink-0"
                      />
                    } @else {
                      <div
                        class="w-12 h-12 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-primary)] flex items-center justify-center shrink-0"
                      >
                        <svg lucidePackage [size]="20"></svg>
                      </div>
                    }
                    <div class="min-w-0">
                      <span class="text-[11px] font-mono-code text-[var(--text-muted)] block truncate">
                        {{ product.sku }}
                      </span>
                      <h3 class="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {{ product.name }}
                      </h3>
                    </div>
                  </div>
                  <app-badge [variant]="product.isActive ? 'success' : 'neutral'">
                    {{ product.isActive ? 'Activo' : 'Inactivo' }}
                  </app-badge>
                </div>

                @if (product.description) {
                  <p class="text-xs text-[var(--text-secondary)] line-clamp-2">
                    {{ product.description }}
                  </p>
                }
              </div>

              <div class="pt-3 border-t border-[var(--border-default)] space-y-3">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-xs px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-medium">
                    {{ product.category }}
                  </span>
                  <div class="text-right">
                    <p class="font-bold tabular-nums">
                      {{ product.price | currency: 'USD' : 'symbol' : '1.2-2' }}
                    </p>
                    <p
                      class="text-xs tabular-nums"
                      [class]="product.stock <= 10 ? 'text-[var(--status-warning)] font-semibold' : 'text-[var(--text-muted)]'"
                    >
                      Stock: {{ product.stock }}
                    </p>
                  </div>
                </div>

                @if (authStore.isAdmin()) {
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      [attr.data-testid]="'edit-product-' + product.id"
                      (click)="openEditModal(product)"
                      class="flex-1 min-h-[44px] px-3 py-2 rounded-xl border border-[var(--border-default)] hover:bg-[var(--bg-subtle)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer focus-ring"
                    >
                      <svg lucidePencil [size]="14"></svg>
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      [attr.data-testid]="'delete-product-' + product.id"
                      (click)="promptDelete(product)"
                      class="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl border border-rose-500/30 bg-[var(--status-danger-bg)] text-[var(--status-danger)] hover:opacity-90 text-xs font-semibold inline-flex items-center justify-center cursor-pointer focus-ring"
                      aria-label="Eliminar producto"
                    >
                      <svg lucideTrash2 [size]="15"></svg>
                    </button>
                  </div>
                }
              </div>
            </article>
          }
        </div>
      } @else {
        <!-- Desktop/Tablet Table -->
        <div class="surface-card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-[var(--bg-subtle)] border-b border-[var(--border-default)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <th class="px-5 py-3.5">Producto</th>
                  <th class="px-4 py-3.5">SKU</th>
                  <th class="px-4 py-3.5">Categoría</th>
                  <th class="px-4 py-3.5 text-right">Precio</th>
                  <th class="px-4 py-3.5 text-right">Stock</th>
                  <th class="px-4 py-3.5">Estado</th>
                  @if (authStore.isAdmin()) {
                    <th class="px-5 py-3.5 text-right">Acciones</th>
                  }
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--border-default)] text-sm">
                @for (product of products(); track product.id) {
                  <tr
                    [attr.data-sku]="product.sku"
                    class="hover:bg-[var(--bg-subtle)]/50 transition"
                  >
                    <td class="px-5 py-3.5">
                      <div class="flex items-center gap-3">
                        @if (safeImg(product.imageUrl); as imgUrl) {
                          <img
                            [src]="imgUrl"
                            [alt]="product.name"
                            class="w-10 h-10 rounded-xl object-cover border border-[var(--border-default)] shrink-0"
                          />
                        } @else {
                          <div
                            class="w-10 h-10 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-primary)] flex items-center justify-center shrink-0"
                          >
                            <svg lucidePackage [size]="18"></svg>
                          </div>
                        }
                        <div class="min-w-0">
                          <p class="font-semibold text-[var(--text-primary)]">{{ product.name }}</p>
                          @if (product.description) {
                            <p class="text-xs text-[var(--text-muted)] truncate max-w-xs">
                              {{ product.description }}
                            </p>
                          }
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3.5 font-mono-code text-xs text-[var(--text-secondary)]">
                      {{ product.sku }}
                    </td>
                    <td class="px-4 py-3.5">
                      <span class="px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] text-xs font-medium text-[var(--text-secondary)]">
                        {{ product.category }}
                      </span>
                    </td>
                    <td class="px-4 py-3.5 text-right font-semibold tabular-nums">
                      {{ product.price | currency: 'USD' : 'symbol' : '1.2-2' }}
                    </td>
                    <td class="px-4 py-3.5 text-right tabular-nums">
                      <app-badge [variant]="product.stock === 0 ? 'danger' : product.stock <= 10 ? 'warning' : 'success'">
                        {{ product.stock }} uds
                      </app-badge>
                    </td>
                    <td class="px-4 py-3.5">
                      <app-badge [variant]="product.isActive ? 'success' : 'neutral'" [dot]="true">
                        {{ product.isActive ? 'Activo' : 'Inactivo' }}
                      </app-badge>
                    </td>
                    @if (authStore.isAdmin()) {
                      <td class="px-5 py-3.5 text-right">
                        <div class="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            [attr.data-testid]="'edit-product-' + product.id"
                            (click)="openEditModal(product)"
                            aria-label="Editar producto"
                            class="p-2 rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer focus-ring"
                          >
                            <svg lucidePencil [size]="15"></svg>
                          </button>
                          <button
                            type="button"
                            [attr.data-testid]="'delete-product-' + product.id"
                            (click)="promptDelete(product)"
                            aria-label="Eliminar producto"
                            class="p-2 rounded-lg border border-rose-500/30 bg-[var(--status-danger-bg)] text-[var(--status-danger)] hover:opacity-90 transition cursor-pointer focus-ring"
                          >
                            <svg lucideTrash2 [size]="15"></svg>
                          </button>
                        </div>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Pagination -->
      @if (totalPages() > 1) {
        <div class="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>Página {{ page() }} de {{ totalPages() }} · {{ total() }} productos</span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              [disabled]="page() <= 1"
              (click)="goToPage(page() - 1)"
              class="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
            >
              <svg lucideChevronLeft [size]="15"></svg>
              <span>Anterior</span>
            </button>
            <button
              type="button"
              [disabled]="page() >= totalPages()"
              (click)="goToPage(page() + 1)"
              class="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Siguiente</span>
              <svg lucideChevronRight [size]="15"></svg>
            </button>
          </div>
        </div>
      }
    </div>

    <!-- Create / Edit Modal -->
    @if (modalOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-[#140F1D]/65 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        data-testid="product-modal"
        (click)="closeModal()"
      >
        <div
          class="surface-card w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl"
          style="box-shadow: var(--shadow-lg)"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center justify-between pb-4 border-b border-[var(--border-default)]">
            <div>
              <h2 class="text-lg font-bold">
                {{ editingProduct() ? 'Editar Juguete' : 'Nuevo Juguete' }}
              </h2>
              <p class="text-xs text-[var(--text-secondary)]">
                Completa los atributos del juguete para el catálogo.
              </p>
            </div>
            <button
              type="button"
              (click)="closeModal()"
              aria-label="Cerrar modal"
              class="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] cursor-pointer"
            >
              <svg lucideX [size]="18"></svg>
            </button>
          </div>

          <form [formGroup]="productForm" (ngSubmit)="saveProduct()" class="mt-5 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  SKU
                </label>
                <input
                  data-testid="product-sku"
                  type="text"
                  formControlName="sku"
                  placeholder="SKU-CON-101"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm font-mono-code focus:border-[var(--brand-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  Categoría
                </label>
                <select
                  data-testid="product-category"
                  formControlName="category"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:border-[var(--brand-primary)] focus:outline-none"
                >
                  @for (cat of categoryOptions(); track cat) {
                    <option [value]="cat">{{ cat }}</option>
                  }
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                Nombre del juguete
              </label>
              <input
                data-testid="product-name"
                type="text"
                formControlName="name"
                placeholder="Nave Espacial Galaxia 1200 Piezas"
                class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:border-[var(--brand-primary)] focus:outline-none"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  Precio (USD)
                </label>
                <input
                  data-testid="product-price"
                  type="number"
                  step="0.01"
                  min="0"
                  formControlName="price"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm tabular-nums focus:border-[var(--brand-primary)] focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                  Stock disponible
                </label>
                <input
                  data-testid="product-stock"
                  type="number"
                  min="0"
                  formControlName="stock"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm tabular-nums focus:border-[var(--brand-primary)] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                Descripción
              </label>
              <textarea
                data-testid="product-description"
                rows="3"
                formControlName="description"
                placeholder="Edad recomendada, materiales y detalles del juguete..."
                class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:border-[var(--brand-primary)] focus:outline-none"
              ></textarea>
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">
                URL de imagen (opcional, solo https:// o /assets/...)
              </label>
              <input
                data-testid="product-image-url"
                type="text"
                formControlName="imageUrl"
                placeholder="https://cdn.toystore.com/juguete.webp"
                class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm focus:border-[var(--brand-primary)] focus:outline-none"
              />
              @if (productForm.controls.imageUrl.errors?.['unsafeImageUrl']) {
                <p class="text-xs text-[var(--status-danger)] mt-1">
                  Por seguridad solo se permiten URLs https:// o rutas relativas /.
                </p>
              }
            </div>

            <label class="inline-flex items-center gap-2.5 cursor-pointer select-none">
              <input
                data-testid="product-active"
                type="checkbox"
                formControlName="isActive"
                class="w-4 h-4 rounded accent-[var(--brand-primary)]"
              />
              <span class="text-sm font-medium">Producto activo en catálogo</span>
            </label>

            <div class="pt-4 border-t border-[var(--border-default)] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button
                type="button"
                (click)="closeModal()"
                class="px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-sm font-medium hover:bg-[var(--bg-subtle)] cursor-pointer min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                data-testid="product-save-btn"
                [disabled]="saving()"
                class="px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold cursor-pointer disabled:opacity-60 min-h-[44px]"
              >
                {{ saving() ? 'Guardando...' : editingProduct() ? 'Guardar cambios' : 'Crear producto' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <app-confirm-dialog
      [open]="deleteTarget() !== null"
      title="Eliminar producto"
      [message]="'¿Seguro que deseas eliminar ' + (deleteTarget()?.name ?? '') + '? Esta acción es irreversible.'"
      confirmLabel="Eliminar"
      [busy]="deleting()"
      (confirmed)="confirmDelete()"
      (cancelled)="deleteTarget.set(null)"
    />
  `,
})
export class ProductsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productsService = inject(ProductsService);
  private readonly toast = inject(ToastStore);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly authStore = inject(AuthStore);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);

  protected readonly products = signal<Product[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = 8;
  protected readonly availableCategories = signal<string[]>(DEFAULT_CATEGORIES);

  protected readonly searchTerm = signal('');
  protected readonly selectedCategory = signal('all');
  protected readonly selectedStatus = signal('all');
  protected readonly viewMode = signal<'table' | 'grid'>('table');
  protected readonly isMobile = signal(false);

  protected readonly modalOpen = signal(false);
  protected readonly editingProduct = signal<Product | null>(null);
  protected readonly deleteTarget = signal<Product | null>(null);

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));
  protected readonly hasActiveFilters = computed(
    () =>
      this.searchTerm().trim().length > 0 ||
      this.selectedCategory() !== 'all' ||
      this.selectedStatus() !== 'all'
  );
  protected readonly categoryOptions = computed(() => {
    const set = new Set([...DEFAULT_CATEGORIES, ...this.availableCategories()]);
    return Array.from(set).sort();
  });

  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  protected readonly productForm = this.fb.nonNullable.group({
    sku: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    category: ['Construcción', [Validators.required]],
    price: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    description: [''],
    imageUrl: ['', [safeImageUrlValidator()]],
    isActive: [true],
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
    await this.loadProducts();
  }

  protected safeImg(url: string | null | undefined): string | null {
    return sanitizeImageUrl(url);
  }

  async loadProducts(): Promise<void> {
    this.loading.set(true);
    try {
      const statusVal = this.selectedStatus();
      const isActive = statusVal === 'all' ? null : statusVal === 'true';
      const resp = await firstValueFrom(
        this.productsService.getAll({
          page: this.page(),
          pageSize: this.pageSize,
          q: this.searchTerm(),
          category: this.selectedCategory(),
          isActive,
        })
      );
      this.products.set(resp.data.products);
      this.total.set(resp.data.total);
      if (resp.data.categories?.length) {
        this.availableCategories.set(resp.data.categories);
      }
    } catch {
      this.toast.error('Error al cargar productos', 'Intenta recargar la vista.');
    } finally {
      this.loading.set(false);
    }
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.page.set(1);
      void this.loadProducts();
    }, 300);
  }

  onCategoryChange(event: Event): void {
    this.selectedCategory.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
    void this.loadProducts();
  }

  onStatusChange(event: Event): void {
    this.selectedStatus.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
    void this.loadProducts();
  }

  resetFilters(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchTerm.set('');
    this.selectedCategory.set('all');
    this.selectedStatus.set('all');
    this.page.set(1);
    void this.loadProducts();
  }

  goToPage(nextPage: number): void {
    this.page.set(nextPage);
    void this.loadProducts();
  }

  openCreateModal(): void {
    this.editingProduct.set(null);
    this.productForm.reset({
      sku: '',
      name: '',
      category: 'Construcción',
      price: 0,
      stock: 0,
      description: '',
      imageUrl: '',
      isActive: true,
    });
    this.modalOpen.set(true);
  }

  openEditModal(product: Product): void {
    this.editingProduct.set(product);
    this.productForm.reset({
      sku: product.sku,
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
      description: product.description ?? '',
      imageUrl: product.imageUrl ?? '',
      isActive: product.isActive,
    });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    if (!this.saving()) {
      this.modalOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalOpen() && !this.saving()) {
      this.modalOpen.set(false);
    }
  }

  async saveProduct(): Promise<void> {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const val = this.productForm.getRawValue();
    const payload = {
      sku: val.sku.trim(),
      name: val.name.trim(),
      category: val.category,
      price: Number(val.price),
      stock: Number(val.stock),
      description: val.description?.trim() || null,
      imageUrl: val.imageUrl?.trim() || null,
      isActive: val.isActive,
    };

    try {
      const current = this.editingProduct();
      if (current) {
        await firstValueFrom(this.productsService.update(current.id, payload));
        this.toast.success('Producto actualizado', payload.name);
      } else {
        await firstValueFrom(this.productsService.create(payload));
        this.toast.success('Producto creado', payload.name);
      }
      this.modalOpen.set(false);
      await this.loadProducts();
    } catch (err: unknown) {
      const msg = err instanceof HttpErrorResponse ? err.error?.message : null;
      this.toast.error('No se pudo guardar', msg || 'Verifica los datos del producto.');
    } finally {
      this.saving.set(false);
    }
  }

  promptDelete(product: Product): void {
    this.deleteTarget.set(product);
  }

  async confirmDelete(): Promise<void> {
    const target = this.deleteTarget();
    if (!target) return;

    this.deleting.set(true);
    try {
      await firstValueFrom(this.productsService.delete(target.id));
      this.toast.success('Producto eliminado', target.name);
      this.deleteTarget.set(null);
      await this.loadProducts();
    } catch (err: unknown) {
      const msg = err instanceof HttpErrorResponse ? err.error?.message : null;
      this.toast.error('Error al eliminar', msg || 'No fue posible eliminar el producto.');
    } finally {
      this.deleting.set(false);
    }
  }
}
