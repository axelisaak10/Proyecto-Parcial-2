import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { AuthUser, LoginPayload, LoginResponseItem, RegisterPayload } from '../models/auth.model';
import { ToastStore } from './toast.store';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastStore);

  private readonly userSignal = signal<AuthUser | null>(null);
  private readonly initializedSignal = signal<boolean>(false);
  private readonly loadingSignal = signal<boolean>(false);
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Re-validate session if browser restores page from Back-Forward Cache (bfcache)
    if (typeof window !== 'undefined') {
      window.addEventListener('pageshow', (event: PageTransitionEvent) => {
        if (event.persisted && this.initializedSignal()) {
          void this.revalidateAfterBfcache();
        }
      });
    }
  }

  readonly user = this.userSignal.asReadonly();
  readonly initialized = this.initializedSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly isAdmin = computed(() => this.userSignal()?.role === 'Admin');

  readonly fullName = computed(() => {
    const current = this.userSignal();
    if (!current) return '';
    const first = current.profile?.firstName ?? current.firstName ?? '';
    const last = current.profile?.lastName ?? current.lastName ?? '';
    const combined = `${first} ${last}`.trim();
    return combined || current.email;
  });

  readonly initials = computed(() => {
    const name = this.fullName();
    if (!name) return 'TS';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  async ensureInitialized(): Promise<void> {
    if (this.initializedSignal()) {
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.fetchCurrentUser()
      .finally(() => {
        this.initializedSignal.set(true);
        this.initPromise = null;
      });

    return this.initPromise;
  }

  async refreshUser(): Promise<void> {
    await this.fetchCurrentUser();
    this.initializedSignal.set(true);
  }

  async login(payload: LoginPayload): Promise<AuthUser> {
    this.loadingSignal.set(true);
    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<LoginResponseItem[]>>('/api/auth/login', payload)
      );
      const loginItem = response.data?.[0];
      if (!loginItem?.user) {
        throw new Error('Respuesta de autenticación inválida');
      }

      this.userSignal.set(loginItem.user);
      this.initializedSignal.set(true);
      await this.fetchCurrentUser();
      return this.userSignal()!;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async register(payload: RegisterPayload): Promise<void> {
    this.loadingSignal.set(true);
    try {
      await firstValueFrom(
        this.http.post<ApiResponse<unknown>>('/api/auth/register', payload)
      );
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post<ApiResponse<unknown>>('/api/auth/logout', {}));
    } catch {
      // Clear client state even if session already expired
    } finally {
      this.clearSession();
      this.toast.info('Sesión cerrada', 'Has salido de tu cuenta de forma segura.');
      await this.router.navigateByUrl('/auth/login', { replaceUrl: true });
    }
  }

  clearSession(): void {
    this.userSignal.set(null);
    this.initializedSignal.set(true);
  }

  private async revalidateAfterBfcache(): Promise<void> {
    await this.fetchCurrentUser();
    if (!this.userSignal() && !this.router.url.startsWith('/auth')) {
      await this.router.navigateByUrl('/auth/login', { replaceUrl: true });
    }
  }

  private async fetchCurrentUser(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<AuthUser[]>>('/api/auth/me')
      );
      this.userSignal.set(response.data?.[0] ?? null);
    } catch {
      this.userSignal.set(null);
    }
  }
}
