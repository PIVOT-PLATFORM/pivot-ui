import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../service/auth.service';

/**
 * superAdminGuard — restricts a route to authenticated users with ROLE_SUPER_ADMIN.
 *
 * Mirrors `adminGuard` exactly (same fail-closed redirect target): no dedicated
 * 403/forbidden page exists yet in pivot-ui, so non-super-admin users are
 * redirected to `/home` rather than left on a blank/broken route.
 *
 * This guard assumes `authMatchGuard` already ran on the parent shell route,
 * so `currentUser()` is expected to be populated for genuinely authenticated
 * users; it still redirects safely to `/home` if not (fail closed).
 *
 * Introduced by US06.2.3 (super admin tenant listing) — reusable as-is by
 * sibling super-admin stories (US06.2.1 / US06.2.2).
 */
export const superAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.currentUser()?.role === 'ROLE_SUPER_ADMIN' ? true : router.createUrlTree(['/home']);
};
