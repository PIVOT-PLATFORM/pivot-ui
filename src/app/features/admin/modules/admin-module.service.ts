/**
 * AdminModuleService — tenant-admin module list + activation/deactivation.
 *
 * Consumes (per US03.1.1 / US03.1.2 / US03.2.1 backend contract, confirmed
 * against `AdminModuleController` on the `pivot-core` branch built in
 * parallel):
 * - GET    /api/admin/modules               → AdminModuleDto[], filtered by the
 *   tenant's billing plan + SUPER_ADMIN overrides (US03.3.3) — a module outside
 *   the tenant's plan is simply absent from the list, never a 403. Each module
 *   carries a `source: 'plan' | 'override'` (`description` is currently always
 *   `""` — `PivotModule` has no description field yet, see `AdminModuleDto.java`
 *   on the backend for the documented limitation)
 * - POST   /api/admin/modules/{id}/activate → { id, enabled: true } · 409 if
 *   already active · 403 `{ error: 'MODULE_NOT_IN_PLAN', message }` if the
 *   module is not registered for the tenant's plan
 * - DELETE /api/admin/modules/{id}/activate → { id, enabled: false } (idempotent)
 *
 * State is optimistic: `activate()`/`deactivate()` flip the `enabled` flag in
 * the local signal immediately (before the HTTP response), and roll back on
 * error. Per-module in-flight and error state are tracked independently so
 * other cards remain interactive while one card's request is pending.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  AdminModuleDto,
  AdminModuleErrorKind,
  ModuleActivationResult,
} from './admin-module.model';

@Injectable({ providedIn: 'root' })
export class AdminModuleService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly _modules = signal<AdminModuleDto[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadError = signal(false);
  private readonly _inFlight = signal<Record<string, boolean>>({});
  private readonly _cardErrors = signal<Record<string, AdminModuleErrorKind>>({});

  /** Current module list (enriched, admin view). */
  readonly modules = this._modules.asReadonly();
  /** True while GET /api/admin/modules is in flight. */
  readonly loading = this._loading.asReadonly();
  /** True if the last GET failed — drives the error state + "Réessayer" button. */
  readonly loadError = this._loadError.asReadonly();

  /** True while an activate/deactivate call for this module id is pending. */
  isInFlight(id: string): boolean {
    return this._inFlight()[id] ?? false;
  }

  /** Inline card error for this module id, if any (cleared on next attempt). */
  cardError(id: string): AdminModuleErrorKind | null {
    return this._cardErrors()[id] ?? null;
  }

  /** Fetches the tenant's module list. Resets loading/error state. */
  loadModules(): Observable<AdminModuleDto[]> {
    this._loading.set(true);
    this._loadError.set(false);

    return this.http.get<AdminModuleDto[]>(`${this.apiUrl}/admin/modules`).pipe(
      tap(modules => {
        this._modules.set(modules);
        this._loading.set(false);
      }),
      catchError(() => {
        this._loading.set(false);
        this._loadError.set(true);
        return of([]);
      })
    );
  }

  /** Activates a module optimistically. Rolls back and sets inline error on failure. */
  activate(module: AdminModuleDto): Observable<void> {
    return this.mutate(module, true, () =>
      this.http.post<ModuleActivationResult>(`${this.apiUrl}/admin/modules/${module.id}/activate`, {})
    );
  }

  /** Deactivates a module optimistically. Rolls back and sets inline error on failure. */
  deactivate(module: AdminModuleDto): Observable<void> {
    return this.mutate(module, false, () =>
      this.http.delete<ModuleActivationResult>(`${this.apiUrl}/admin/modules/${module.id}/activate`)
    );
  }

  private mutate(
    module: AdminModuleDto,
    targetEnabled: boolean,
    request: () => Observable<ModuleActivationResult>
  ): Observable<void> {
    const { id } = module;
    const previousEnabled = module.enabled;

    this.setInFlight(id, true);
    this.clearCardError(id);
    this.applyEnabled(id, targetEnabled);

    return request().pipe(
      tap(result => {
        this.applyEnabled(id, result.enabled);
        this.setInFlight(id, false);
      }),
      map(() => undefined),
      catchError((err: HttpErrorResponse) => {
        this.applyEnabled(id, previousEnabled);
        this.setInFlight(id, false);
        this.setCardError(id, this.classifyError(err));
        return throwError(() => err);
      })
    );
  }

  private classifyError(err: HttpErrorResponse): AdminModuleErrorKind {
    return err.status === 403 && err.error?.error === 'MODULE_NOT_IN_PLAN' ? 'not-in-plan' : 'generic';
  }

  private applyEnabled(id: string, enabled: boolean): void {
    this._modules.update(list => list.map(m => (m.id === id ? { ...m, enabled } : m)));
  }

  private setInFlight(id: string, value: boolean): void {
    this._inFlight.update(map => ({ ...map, [id]: value }));
  }

  private setCardError(id: string, kind: AdminModuleErrorKind): void {
    this._cardErrors.update(map => ({ ...map, [id]: kind }));
  }

  private clearCardError(id: string): void {
    this._cardErrors.update(map => {
      if (!(id in map)) {
        return map;
      }
      const next = { ...map };
      delete next[id];
      return next;
    });
  }
}
