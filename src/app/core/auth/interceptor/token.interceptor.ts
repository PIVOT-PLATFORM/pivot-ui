import { HttpInterceptorFn, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';
import { AuthService } from '../service/auth.service';
import { SessionExpiryService } from '../service/session-expiry.service';

/**
 * HTTP interceptor for opaque session token management (US-AUTH-002, US01.1.5).
 *
 * Responsibilities:
 * 1. Attach Bearer token from memory to outgoing requests.
 * 2. Read X-New-Token response header — when present, the server has rotated the
 *    token (threshold crossed); update in-memory token via AuthService.updateToken().
 * 3. On 401 from a non-auth endpoint: session expired — delegate to
 *    SessionExpiryService (logout local + toast + BroadcastChannel multi-onglets
 *    + redirection /auth/login avec returnUrl validé).
 *
 * US01.1.5 — pas de silent refresh : le modèle opaque tokens PIVOT n'a pas de
 * refresh token. Le 401 backend est le seul signal d'expiration ; aucun retry
 * via /auth/refresh n'est tenté (l'ancien flux « restore-then-retry » a été
 * retiré conformément à l'AC de suppression du silent refresh).
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const sessionExpiry = inject(SessionExpiryService);

  const token = auth.accessToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    tap(event => {
      // Server-side rotation: update in-memory token when X-New-Token is present
      if (event instanceof HttpResponse) {
        const newToken = event.headers.get('X-New-Token');
        const newExpiresAt = event.headers.get('X-Token-Expires-At');
        if (newToken && newExpiresAt) {
          auth.updateToken(newToken, Number.parseInt(newExpiresAt, 10));
        }
      }
    }),
    catchError((err: HttpErrorResponse) => {
      // 401 hors endpoints /auth/ = session expirée (seul signal du modèle opaque token).
      // Les 401 des endpoints /auth/ (login, refresh au boot…) sont des erreurs métier
      // gérées par leurs appelants — pas une expiration de session.
      if (err.status === 401 && !req.url.includes('/auth/')) {
        sessionExpiry.onSessionExpired();
      }
      return throwError(() => err);
    })
  );
};
