import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideLucideConfig } from '@lucide/angular';
import { of } from 'rxjs';
import { ProductsService } from '../../core/services/products.service';
import { AuthStore } from '../../core/stores/auth.store';
import { ProductsComponent } from './products.component';

describe('ProductsComponent', () => {
  let mockProductsService: {
    getAll: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let isAdminSignal: ReturnType<typeof signal<boolean>>;

  beforeEach(async () => {
    isAdminSignal = signal(true);
    mockProductsService = {
      getAll: jest.fn().mockReturnValue(
        of({
          statusCode: 200,
          message: 'OK',
          data: {
            total: 1,
            page: 1,
            pageSize: 8,
            categories: ['Construcción'],
            stats: {
              totalProducts: 1,
              activeProducts: 1,
              lowStockCount: 0,
              totalInventoryValue: 1490,
            },
            products: [
              {
                id: 1,
                sku: 'SKU-CON-001',
                name: 'Nave Espacial Galaxia',
                description: 'Set de construcción espacial',
                category: 'Construcción',
                price: 1490,
                stock: 28,
                imageUrl: null,
                isActive: true,
                createdAt: '2026-01-01T00:00:00Z',
                updatedAt: '2026-01-01T00:00:00Z',
              },
            ],
          },
        })
      ),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProductsComponent],
      providers: [
        provideLucideConfig({ size: 18, strokeWidth: 1.75 }),
        { provide: ProductsService, useValue: mockProductsService },
        {
          provide: AuthStore,
          useValue: {
            isAdmin: isAdminSignal,
            user: signal({ id: 1, email: 'admin@toystore.com', role: 'Admin' }),
          },
        },
      ],
    }).compileComponents();
  });

  it('loads products and renders creation button for Admin users', async () => {
    const fixture = TestBed.createComponent(ProductsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Nave Espacial Galaxia');
    expect(el.querySelector('[data-testid="new-product-btn"]')).not.toBeNull();
  });

  it('hides creation button for non-admin Customer users', async () => {
    isAdminSignal.set(false);
    const fixture = TestBed.createComponent(ProductsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="new-product-btn"]')).toBeNull();
  });
});
