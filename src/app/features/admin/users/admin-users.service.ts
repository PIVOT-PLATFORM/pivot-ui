/**
 * AdminUsersService — tenant-admin, paginated user listing (US06.1.2) and
 * per-user role change (US06.1.3).
 *
 * Consumes `GET /api/admin/users` (`ROLE_ADMIN` only, US06.1.1 contract — see
 * `admin-user.model.ts` for the full contract notes). Pagination is 0-indexed;
 * page size is fixed at `DEFAULT_ADMIN_USERS_PAGE_SIZE`, matching the backend
 * default and not client-configurable in this US. Filters (`search`, `role`,
 * `status`) are only sent as query params when set — an unset filter is
 * omitted entirely rather than sent as an empty string, so the backend's own
 * "no filter" semantics apply.
 *
 * Also consumes `PATCH /api/admin/users/{id}/role` (US06.1.3 backend contract,
 * `{ role: 'ROLE_ADMIN' | 'ROLE_USER' }` → `200` updated user / `400` invalid
 * role / `403` self-demotion / `404` cross-tenant). Like `AdminModuleService`'s
 * activate/deactivate, `changeRole` is optimistic: the row's `role` flips in
 * the local `_users` signal immediately, and rolls back to the previous value
 * on any error. Per-row in-flight and error state are tracked independently
 * (keyed by user id) so other rows stay interactive while one row's request
 * is pending.
 *
 * Also consumes `PATCH /api/admin/users/{id}/status` (US06.1.4 deactivate /
 * US06.1.5 reactivate backend contract, `{ status: 'ACTIVE' | 'INACTIVE' }` →
 * `200` updated user — reactivating an already-`ACTIVE` account is idempotent
 * / `400` invalid status / `403` self-deactivation or revoked token / `404`
 * cross-tenant). `changeStatus` follows the exact same optimistic convention
 * as `changeRole` above — one endpoint, one status field, shared by both
 * user stories — with its own independent per-row in-flight/error tracking.
 *
 * No `tenantId` is ever read from or sent by this service — the tenant scope
 * is resolved entirely server-side from the bearer token, per the platform
 * rule that tenant-filtering logic must never live client-side.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DEFAULT_ADMIN_USERS_PAGE_SIZE,
  EMPTY_ADMIN_USER_PAGE,
  type AdminUserDto,
  type AdminUserFilters,
  type AdminUserPage,
  type AdminUserRole,
  type AdminUserRoleChangeErrorKind,
  type AdminUserStatusChangeErrorKind,
  type AdminUserToggleableStatus,
} from './admin-user.model';

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly _users = signal<AdminUserPage['content']>([]);
  private readonly _loading = signal(false);
  private readonly _loadError = signal(false);
  private readonly _page = signal(0);
  private readonly _size = signal(DEFAULT_ADMIN_USERS_PAGE_SIZE);
  private readonly _totalPages = signal(0);
  private readonly _totalElements = signal(0);
  private readonly _roleChangeInFlight = signal<Record<number, boolean>>({});
  private readonly _roleChangeErrors = signal<Record<number, AdminUserRoleChangeErrorKind>>({});
  private readonly _statusChangeInFlight = signal<Record<number, boolean>>({});
  private readonly _statusChangeErrors = signal<Record<number, AdminUserStatusChangeErrorKind>>({});

  /** Current page content. */
  readonly users = this._users.asReadonly();
  /** True while GET /api/admin/users is in flight. */
  readonly loading = this._loading.asReadonly();
  /**
   * True if the last GET failed — drives the network error state + retry
   * button. Covers both a genuine network/5xx failure and the (structurally
   * unreachable from this UI, see `admin-user.model.ts`) `400 INVALID_FILTER`
   * case, so a future contract drift fails safe instead of throwing unhandled.
   */
  readonly loadError = this._loadError.asReadonly();
  /** 0-indexed current page number, as returned by the backend. */
  readonly page = this._page.asReadonly();
  /** Page size, as returned by the backend (fixed, but echoed defensively). */
  readonly size = this._size.asReadonly();
  /** Total number of pages for the current filter set. */
  readonly totalPages = this._totalPages.asReadonly();
  /** Total number of users matching the current filter set. */
  readonly totalElements = this._totalElements.asReadonly();

  /** Fetches a page of users for the given 0-indexed page and filters. Resets loading/error state. */
  load(page: number, filters: AdminUserFilters): Observable<AdminUserPage> {
    this._loading.set(true);
    this._loadError.set(false);

    let params = new HttpParams().set('page', page).set('size', DEFAULT_ADMIN_USERS_PAGE_SIZE);
    const search = filters.search.trim();
    if (search !== '') {
      params = params.set('search', search);
    }
    if (filters.role !== '') {
      params = params.set('role', filters.role);
    }
    if (filters.status !== '') {
      params = params.set('status', filters.status);
    }

    return this.http.get<AdminUserPage>(`${this.apiUrl}/admin/users`, { params }).pipe(
      tap(result => {
        this._users.set(result.content);
        this._page.set(result.number);
        this._size.set(result.size);
        this._totalPages.set(result.totalPages);
        this._totalElements.set(result.totalElements);
        this._loading.set(false);
      }),
      catchError(() => {
        // Both a genuine network/5xx failure and the (structurally unreachable
        // from this UI) 400 INVALID_FILTER case land here — see the `loadError`
        // doc comment above for why a distinct branch isn't warranted today.
        this._loading.set(false);
        this._loadError.set(true);
        this._users.set([]);
        return of(EMPTY_ADMIN_USER_PAGE);
      })
    );
  }

  /** True while a `PATCH /api/admin/users/{id}/role` call for this user id is pending. */
  isRoleChangeInFlight(id: number): boolean {
    return this._roleChangeInFlight()[id] ?? false;
  }

  /** Classified error for the last failed role change on this user id, if any (cleared on the next attempt). */
  roleChangeError(id: number): AdminUserRoleChangeErrorKind | null {
    return this._roleChangeErrors()[id] ?? null;
  }

  /**
   * Changes a user's role optimistically. Flips `role` in the local row
   * immediately, then reconciles with the backend's response (`200` returns
   * the updated user — its `role` is applied verbatim rather than assuming
   * the request echoed back). Rolls back to the previous role and records a
   * classified error on failure.
   */
  changeRole(user: AdminUserDto, role: AdminUserRole): Observable<void> {
    const { id } = user;
    const previousRole = user.role;

    this.setRoleChangeInFlight(id, true);
    this.clearRoleChangeError(id);
    this.applyRole(id, role);

    return this.http.patch<AdminUserDto>(`${this.apiUrl}/admin/users/${id}/role`, { role }).pipe(
      tap(updated => {
        this.applyRole(id, updated.role);
        this.setRoleChangeInFlight(id, false);
      }),
      map(() => undefined),
      catchError((err: HttpErrorResponse) => {
        this.applyRole(id, previousRole);
        this.setRoleChangeInFlight(id, false);
        this.setRoleChangeError(id, this.classifyRoleChangeError(err));
        return throwError(() => err);
      })
    );
  }

  private classifyRoleChangeError(err: HttpErrorResponse): AdminUserRoleChangeErrorKind {
    switch (err.status) {
      case 400:
        return 'invalid-role';
      case 403:
        return 'self-demotion';
      case 404:
        return 'not-found';
      default:
        return 'generic';
    }
  }

  private applyRole(id: number, role: string): void {
    this._users.update(list => list.map(u => (u.id === id ? { ...u, role } : u)));
  }

  private setRoleChangeInFlight(id: number, value: boolean): void {
    this._roleChangeInFlight.update(map => ({ ...map, [id]: value }));
  }

  private setRoleChangeError(id: number, kind: AdminUserRoleChangeErrorKind): void {
    this._roleChangeErrors.update(map => ({ ...map, [id]: kind }));
  }

  private clearRoleChangeError(id: number): void {
    this._roleChangeErrors.update(map => {
      if (!(id in map)) {
        return map;
      }
      const next = { ...map };
      delete next[id];
      return next;
    });
  }

  /** True while a `PATCH /api/admin/users/{id}/status` call for this user id is pending. */
  isStatusChangeInFlight(id: number): boolean {
    return this._statusChangeInFlight()[id] ?? false;
  }

  /** Classified error for the last failed status change on this user id, if any (cleared on the next attempt). */
  statusChangeError(id: number): AdminUserStatusChangeErrorKind | null {
    return this._statusChangeErrors()[id] ?? null;
  }

  /**
   * Deactivates or reactivates a user optimistically — the single shared code
   * path behind both US06.1.4 (Désactiver) and US06.1.5 (Réactiver): one
   * endpoint, one `status` field, only the target value differs. Flips
   * `status` in the local row immediately, then reconciles with the
   * backend's response (`200` returns the updated user — its `status` is
   * applied verbatim rather than assuming the request echoed back). Rolls
   * back to the previous status and records a classified error on failure.
   */
  changeStatus(user: AdminUserDto, status: AdminUserToggleableStatus): Observable<void> {
    const { id } = user;
    const previousStatus = user.status;

    this.setStatusChangeInFlight(id, true);
    this.clearStatusChangeError(id);
    this.applyStatus(id, status);

    return this.http.patch<AdminUserDto>(`${this.apiUrl}/admin/users/${id}/status`, { status }).pipe(
      tap(updated => {
        this.applyStatus(id, updated.status);
        this.setStatusChangeInFlight(id, false);
      }),
      map(() => undefined),
      catchError((err: HttpErrorResponse) => {
        this.applyStatus(id, previousStatus);
        this.setStatusChangeInFlight(id, false);
        this.setStatusChangeError(id, this.classifyStatusChangeError(err));
        return throwError(() => err);
      })
    );
  }

  private classifyStatusChangeError(err: HttpErrorResponse): AdminUserStatusChangeErrorKind {
    switch (err.status) {
      case 400:
        return 'invalid-status';
      case 403:
        return 'self-deactivation';
      case 404:
        return 'not-found';
      default:
        return 'generic';
    }
  }

  private applyStatus(id: number, status: AdminUserDto['status']): void {
    this._users.update(list => list.map(u => (u.id === id ? { ...u, status } : u)));
  }

  private setStatusChangeInFlight(id: number, value: boolean): void {
    this._statusChangeInFlight.update(map => ({ ...map, [id]: value }));
  }

  private setStatusChangeError(id: number, kind: AdminUserStatusChangeErrorKind): void {
    this._statusChangeErrors.update(map => ({ ...map, [id]: kind }));
  }

  private clearStatusChangeError(id: number): void {
    this._statusChangeErrors.update(map => {
      if (!(id in map)) {
        return map;
      }
      const next = { ...map };
      delete next[id];
      return next;
    });
  }
}
