/**
 * ModuleStatusService — resolves the activation status of a single PIVOT module for
 * the current tenant, used by moduleGuard before allowing navigation into a module's
 * lazy-loaded routes.
 *
 * Distinct from ModuleRegistryService (GET /api/modules, list of all modules for the
 * home/catalogue grid): this service targets exactly one module id and is the source
 * of truth consulted on every navigation attempt — no client-side caching (see
 * `getStatus()` TSDoc for the no-store rationale).
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ModuleStatusDto } from './module.model';

/**
 * Bound on how long the guard waits for this call before treating it as failed. Without
 * this, a slow/hung backend leaves the router's `canActivate` unresolved and the module
 * access overlay spinning until nginx's own `proxy_read_timeout` (60s) finally 504s —
 * this fails fast well before that ceiling.
 */
const STATUS_CHECK_TIMEOUT_MS = 8_000;

@Injectable({ providedIn: 'root' })
export class ModuleStatusService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Fetches the activation status of one module for the current tenant.
   *
   * GET /api/modules/{id}/status — the backend responds with `Cache-Control: no-store`
   * (EN03.2 AC: "cache navigateur TTL court ou sans cache"). The `Cache-Control: no-cache`
   * request header is set defensively so that no intermediate cache (browser disk cache,
   * corporate proxy) serves a stale status to the guard even if the response header were
   * ever relaxed server-side — the guard must always see the freshest activation state.
   *
   * @param moduleId technical module identifier, e.g. "whiteboard"
   * @returns an Observable emitting the status DTO on 200, or erroring on 404 (unknown
   *          module) / 401 (unauthenticated) / {@link STATUS_CHECK_TIMEOUT_MS} timeout —
   *          the guard treats any error as "deny".
   */
  getStatus(moduleId: string): Observable<ModuleStatusDto> {
    return this.http
      .get<ModuleStatusDto>(`${this.apiUrl}/modules/${moduleId}/status`, {
        headers: new HttpHeaders({ 'Cache-Control': 'no-cache' }),
      })
      .pipe(timeout(STATUS_CHECK_TIMEOUT_MS));
  }
}
