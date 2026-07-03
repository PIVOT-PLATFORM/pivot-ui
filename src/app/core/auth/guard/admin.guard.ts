import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../service/auth.service';

/**
 * adminGuard — restricts a route to authenticated users with ROLE_ADMIN.
 *
 * No dedicated 403/forbidden page exists yet in pivot-ui (checked
 * `features/` — only `coming-soon`, legal pages and auth pages). Non-admin
 * users are redirected to `/home` rather than left on a blank/broken route.
 *
 * This guard assumes `authMatchGuard` already ran on the parent shell route,
 * so `currentUser()` is expected to be populated for genuinely authenticated
 * users; it still redirects safely to `/home` if not (fail closed).
 */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.currentUser()?.role === 'ROLE_ADMIN' ? true : router.createUrlTree(['/home']);
};
