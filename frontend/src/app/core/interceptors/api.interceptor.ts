import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from '../stores/auth.store';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  const isApiCall = req.url.startsWith('/api');
  const modifiedReq = isApiCall
    ? req.clone({
        withCredentials: true,
        setHeaders: {
          'X-Requested-With': 'XMLHttpRequest',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      })
    : req;

  return next(modifiedReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isApiCall &&
        !req.url.includes('/api/auth/login') &&
        !req.url.includes('/api/auth/me')
      ) {
        authStore.clearSession();
        void router.navigateByUrl('/auth/login', { replaceUrl: true });
      }
      return throwError(() => error);
    })
  );
};
