import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthStore } from '../stores/auth.store';
import { adminGuard } from './admin.guard';
import { authGuard } from './auth.guard';

describe('Route Guards', () => {
  let mockAuthStore: {
    ensureInitialized: jest.Mock;
    isAuthenticated: jest.Mock;
    isAdmin: jest.Mock;
  };
  let router: Router;

  beforeEach(() => {
    mockAuthStore = {
      ensureInitialized: jest.fn().mockResolvedValue(undefined),
      isAuthenticated: jest.fn().mockReturnValue(false),
      isAdmin: jest.fn().mockReturnValue(false),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
      ],
    });

    router = TestBed.inject(Router);
  });

  it('authGuard redirects unauthenticated users to /auth/login with returnUrl', async () => {
    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/products' } as RouterStateSnapshot)
    );

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/auth/login?returnUrl=%2Fproducts');
  });

  it('adminGuard redirects non-admin users to /dashboard', async () => {
    mockAuthStore.isAuthenticated.mockReturnValue(true);
    mockAuthStore.isAdmin.mockReturnValue(false);

    const result = await TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, { url: '/users' } as RouterStateSnapshot)
    );

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/dashboard');
  });

  it('adminGuard allows authenticated Admin users', async () => {
    mockAuthStore.isAuthenticated.mockReturnValue(true);
    mockAuthStore.isAdmin.mockReturnValue(true);

    const result = await TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, { url: '/users' } as RouterStateSnapshot)
    );

    expect(result).toBe(true);
  });
});
