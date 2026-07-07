import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, map, catchError, of } from 'rxjs';
import { ModuleStatusService } from './module-status.service';

/**
 * Route guard factory gating a PIVOT module's lazy-loaded routes behind the backend's
 * per-tenant activation status. Redirects to /home if the module is disabled or unknown.
 *
 * @param moduleId technical module identifier, e.g. "whiteboard"
 */
export function moduleGuard(moduleId: string): CanActivateFn {
  return (): Observable<boolean | UrlTree> => {
    const moduleStatusService = inject(ModuleStatusService);
    const router = inject(Router);

    return moduleStatusService.getStatus(moduleId).pipe(
      map(status => status.enabled ? true : router.createUrlTree(['/home'])),
      catchError(() => of(router.createUrlTree(['/home']))),
    );
  };
}
