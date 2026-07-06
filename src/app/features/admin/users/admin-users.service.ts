/**
 * AdminUsersService — tenant-admin, paginated user listing (US06.1.2).
 *
 * Consumes `GET /api/admin/users` (`ROLE_ADMIN` only, US06.1.1 contract — see
 * `admin-user.model.ts` for the full contract notes). Pagination is 0-indexed;
 * page size is fixed at `DEFAULT_ADMIN_USERS_PAGE_SIZE`, matching the backend
 * default and not client-configurable in this US. Filters (`search`, `role`,
 * `status`) are only sent as query params when set — an unset filter is
 * omitted entirely rather than sent as an empty string, so the backend's own
 * "no filter" semantics apply.
 *
 * No `tenantId` is ever read from or sent by this service — the tenant scope
 * is resolved entirely server-side from the bearer token, per the platform
 * rule that tenant-filtering logic must never live client-side.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DEFAULT_ADMIN_USERS_PAGE_SIZE,
  EMPTY_ADMIN_USER_PAGE,
  type AdminUserFilters,
  type AdminUserPage,
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
}
