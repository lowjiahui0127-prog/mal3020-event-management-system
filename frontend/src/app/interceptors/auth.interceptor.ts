import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();

  // Only attach the token to our own API
  const request =
    token && req.url.startsWith('/api/')
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthAttempt =
        req.url.startsWith('/api/auth/login') ||
        req.url.startsWith('/api/auth/register');

      // Token rejected (expired or account removed): log out and go to /login
      if (error.status === 401 && token && !isAuthAttempt) {
        auth.handleUnauthorized();
      }

      return throwError(() => error);
    })
  );
};