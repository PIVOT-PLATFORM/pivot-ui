import { HttpInterceptorFn, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * HTTP interceptor that attaches the Bearer token to outgoing requests,
 * handles server-side token rotation via X-New-Token, and clears the
 * local session on 401 from non-auth endpoints.
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const token = auth.accessToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    tap(event => {
      if (event instanceof HttpResponse) {
        const newToken = event.headers.get('X-New-Token');
        const newExpiresAt = event.headers.get('X-Token-Expires-At');
        if (newToken && newExpiresAt) {
          auth.updateToken(newToken, Number.parseInt(newExpiresAt, 10));
        }
      }
    }),
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('/auth/')) {
        auth.clearSession();
      }
      return throwError(() => err);
    })
  );
};
