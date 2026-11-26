import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../stores/auth.store';

export const guestGuard: CanActivateFn = async () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  await authStore.ensureInitialized();

  if (authStore.isAuthenticated()) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
