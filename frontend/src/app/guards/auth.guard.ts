import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../models/user.model';
import { AuthService } from '../services/auth.service';

// Logged-in users only
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isLoggedIn()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

// Logged in AND the right role. This is for user experience only;
// the real protection is on the backend.
export const roleGuard =
  (role: UserRole): CanActivateFn =>
  (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn()) {
      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url }
      });
    }

    if (auth.role() === role) {
      return true;
    }

    return router.createUrlTree([
      auth.isOrganiser() ? '/organiser/dashboard' : '/events'
    ]);
  };

// Login / Register are only for visitors who are not logged in
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree([
    auth.isOrganiser() ? '/organiser/dashboard' : '/events'
  ]);
};