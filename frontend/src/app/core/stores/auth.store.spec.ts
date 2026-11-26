import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthStore } from './auth.store';

describe('AuthStore', () => {
  let store: AuthStore;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });

    store = TestBed.inject(AuthStore);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('hydrates authenticated admin session via /api/auth/me without storing JWT in localStorage', async () => {
    const initPromise = store.ensureInitialized();

    const req = httpMock.expectOne('/api/auth/me');
    expect(req.request.method).toBe('GET');
    req.flush({
      statusCode: 200,
      message: 'OK',
      data: [
        {
          id: 1,
          email: 'admin@toystore.com',
          role: 'Admin',
          firstName: 'Admin',
          lastName: 'ToyStore',
        },
      ],
    });

    await initPromise;

    expect(store.isAuthenticated()).toBe(true);
    expect(store.isAdmin()).toBe(true);
    expect(store.fullName()).toBe('Admin ToyStore');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('clears session and navigates to /auth/login on logout', async () => {
    const navSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const logoutPromise = store.logout();
    const req = httpMock.expectOne('/api/auth/logout');
    expect(req.request.method).toBe('POST');
    req.flush({ statusCode: 200, message: 'Logged out', data: { loggedOut: true } });

    await logoutPromise;

    expect(store.isAuthenticated()).toBe(false);
    expect(store.user()).toBeNull();
    expect(navSpy).toHaveBeenCalledWith('/auth/login', { replaceUrl: true });
  });
});
