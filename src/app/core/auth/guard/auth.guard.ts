import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../service/auth.service';
import { PostLoginRedirectService } from '../service/post-login-redirect.service';

/**
 * Bloque les routes protégées pour les visiteurs non authentifiés.
 *
 * US01.1.4 — l'URL tentée est conservée sur deux canaux pour la redirection
 * post-login : le query param `returnUrl` (prioritaire) et la session Angular
 * en mémoire ({@link PostLoginRedirectService}) en secours.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) return true;
  inject(PostLoginRedirectService).remember(state.url);
  return inject(Router).createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });
};

/**
 * Utilisé sur la route shell — retourne `false` (sans redirection) pour laisser
 * Angular retomber sur les routes publiques.
 *
 * US01.1.4 — `canMatch` ne reçoit pas de `RouterStateSnapshot` : l'URL tentée est
 * reconstituée depuis la navigation en cours puis mémorisée en session Angular
 * (mémoire uniquement) pour la redirection post-login.
 */
export const authMatchGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) return true;
  const attempted = inject(Router).getCurrentNavigation()?.extractedUrl.toString();
  if (attempted && attempted !== '/') {
    inject(PostLoginRedirectService).remember(attempted);
  }
  return false;
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return true;
  return router.createUrlTree(['/dashboard']);
};
