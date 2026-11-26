import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../stores/auth.store';

export const adminGuard: CanActivateFn = async (_route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  await authStore.ensureInitialized();

  if (!authStore.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  if (authStore.isAdmin()) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
