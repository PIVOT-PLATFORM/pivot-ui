/**
 * moduleGuard — EN03.2 / US03.2.2.
 *
 * Route guard factory gating a PIVOT module's lazy-loaded routes behind the backend's
 * per-tenant activation status.
 *
 * Structural guarantee (AC "bundle du module non chargé si désactivé — lazy-loading
 * respecté"): attach the guard via `canActivate` (or `canMatch`) on the route that
 * itself carries `loadChildren` / `loadComponent`. Angular's Router only resolves a
 * lazy `import()` AFTER all guards on that route (and its ancestors) return `true` —
 * a route entry such as:
 *
 * ```ts
 * { path: 'whiteboard', canActivate: [moduleGuard('whiteboard')], loadComponent: () => import('...') }
 * ```
 *
 * never triggers the dynamic `import()` when the guard denies (returns a UrlTree or
 * `false`), so the module's JS chunk is never requested over the network. This is a
 * property of the Router itself (verified structurally, not just by this guard's own
 * logic) — see the accompanying Playwright E2E spec asserting no network request for
 * the module chunk when disabled.
 *
 * HTTP semantics consumed (see ModuleStatusDto TSDoc / pivot-core JavaDoc for the full
 * decision): GET /api/modules/{id}/status returns 200 `{enabled}` for any known module
 * (enabled or not) and 404 for an unknown module id. This guard treats "not enabled"
 * (`enabled: false`) and "any HTTP error" (404 unknown module, 401 unauthenticated,
 * network failure) identically: deny navigation, redirect to `/home`, show a toast.
 * The guard never inspects the HTTP status code itself — it only branches on the
 * resolved DTO vs. an error, keeping the 403-vs-404-vs-200 distinction entirely a
 * backend/API-contract concern.
 */
import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, map, catchError, of, finalize } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { ModuleStatusService } from './module-status.service';
import { ModuleGuardLoadingService } from './module-guard-loading.service';
import { AuthService } from '../auth/service/auth.service';
import { ToastService } from '../../shared/toast/toast.service';

/** Role granted the direct "manage modules" link inside the disabled-module toast. */
const ADMIN_ROLE = 'ROLE_ADMIN';

/**
 * Builds a `CanActivateFn` for the given module id.
 *
 * @param moduleId technical module identifier, e.g. `"whiteboard"` — must match both
 *                 the backend `ModuleRegistry` id and an entry under `modules.guard.names.*`
 *                 in the i18n catalogues (falls back to the raw id if missing).
 */
export function moduleGuard(moduleId: string): CanActivateFn {
  return (): Observable<boolean | UrlTree> => {
    const moduleStatusService = inject(ModuleStatusService);
    const router = inject(Router);
    const toast = inject(ToastService);
    const auth = inject(AuthService);
    const loading = inject(ModuleGuardLoadingService);
    const transloco = inject(TranslocoService);

    function denyAndRedirect(): UrlTree {
      const moduleName = transloco.translate(`modules.guard.names.${moduleId}`);
      const isAdmin = auth.currentUser()?.role === ADMIN_ROLE;

      toast.show(
        'modules.guard.disabled',
        'warning',
        { module: moduleName },
        isAdmin ? { labelKey: 'modules.guard.adminLink', route: '/admin/modules' } : undefined,
      );
      return router.createUrlTree(['/home']);
    }

    loading.start();

    return moduleStatusService.getStatus(moduleId).pipe(
      map(status => (status.enabled ? true : denyAndRedirect())),
      catchError(() => of(denyAndRedirect())),
      finalize(() => loading.end()),
    );
  };
}
