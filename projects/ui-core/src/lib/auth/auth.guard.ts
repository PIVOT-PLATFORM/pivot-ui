import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Blocks protected routes for unauthenticated visitors. Redirects to /auth/login. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });
};

/** canMatch guard — returns false (no redirect) so Angular falls through to public routes. */
export const authMatchGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated();
};

/** Blocks authenticated users from accessing guest-only routes (e.g. login page). */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return true;
  return router.createUrlTree(['/dashboard']);
};
