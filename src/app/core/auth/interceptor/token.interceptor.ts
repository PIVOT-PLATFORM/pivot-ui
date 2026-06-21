import { HttpInterceptorFn, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, tap, throwError } from 'rxjs';
import { AuthService } from '../service/auth.service';
import { Router } from '@angular/router';

/**
 * HTTP interceptor for opaque session token management (US-AUTH-002).
 *
 * Responsibilities:
 * 1. Attach Bearer token from memory to outgoing requests.
 * 2. Read X-New-Token response header — when present, the server has rotated the
 *    token (threshold crossed); update in-memory token via AuthService.updateToken().
 * 3. On 401 from non-auth endpoint: attempt session restore via POST /auth/refresh,
 *    then retry once. Redirect to login if restore fails.
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

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
          auth.updateToken(newToken, parseInt(newExpiresAt, 10));
        }
      }
    }),
    catchError((err: HttpErrorResponse) => {
      // 401 on non-auth endpoint: try session restore once then redirect
      if (err.status === 401 && !req.url.includes('/auth/')) {
        return auth.refresh().pipe(
          switchMap(res => {
            const retried = req.clone({
              setHeaders: { Authorization: `Bearer ${res.accessToken}` }
            });
            return next(retried);
          }),
          catchError(() => {
            router.navigate(['/auth/login']);
            return throwError(() => err);
          })
        );
      }
      return throwError(() => err);
    })
  );
};
