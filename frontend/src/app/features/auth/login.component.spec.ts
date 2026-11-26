import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideLucideConfig } from '@lucide/angular';
import { AuthStore } from '../../core/stores/auth.store';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let mockAuthStore: {
    loading: ReturnType<typeof signal<boolean>>;
    login: jest.Mock;
  };
  let router: Router;

  beforeEach(async () => {
    mockAuthStore = {
      loading: signal(false),
      login: jest.fn().mockResolvedValue({
        id: 1,
        email: 'admin@toystore.com',
        role: 'Admin',
      }),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideLucideConfig({ size: 18, strokeWidth: 1.75 }),
        { provide: AuthStore, useValue: mockAuthStore },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('submits valid credentials and navigates to /dashboard', async () => {
    const navSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(LoginComponent);
    await fixture.whenStable();

    const comp = fixture.componentInstance as unknown as {
      form: { setValue: (v: { email: string; password: string }) => void };
      submit: () => Promise<void>;
    };

    comp.form.setValue({
      email: 'admin@toystore.com',
      password: 'Admin123!',
    });

    await comp.submit();

    expect(mockAuthStore.login).toHaveBeenCalledWith({
      email: 'admin@toystore.com',
      password: 'Admin123!',
    });
    expect(navSpy).toHaveBeenCalledWith('/dashboard', { replaceUrl: true });
  });

  it('does not call AuthStore.login when form is invalid', async () => {
    const fixture = TestBed.createComponent(LoginComponent);
    await fixture.whenStable();

    await fixture.componentInstance.submit();
    expect(mockAuthStore.login).not.toHaveBeenCalled();
  });
});
