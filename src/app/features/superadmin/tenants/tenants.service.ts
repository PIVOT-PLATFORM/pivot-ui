/**
 * TenantsService — super admin, platform-wide tenant listing (US06.2.3).
 *
 * Consumes `GET /api/superadmin/tenants` (`ROLE_SUPER_ADMIN` only). Pagination
 * is 0-indexed and page size is fixed at `DEFAULT_TENANT_PAGE_SIZE`, matching
 * the backend default. Filters (`name`, `is_active`, `plan`, `auth_mode`) are
 * only sent as query params when set — an unset filter is omitted entirely
 * rather than sent as an empty string, so the backend's own "no filter"
 * semantics apply.
 *
 * No `tenantId` is ever read from or sent by this service: this is a
 * cross-tenant, platform-level view reserved for `ROLE_SUPER_ADMIN`, backed
 * entirely by the bearer token's role claim (never a client-supplied id).
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DEFAULT_TENANT_PAGE_SIZE,
  EMPTY_TENANT_PAGE,
  type TenantDto,
  type TenantFilters,
  type TenantPage,
} from './tenant.model';

@Injectable({ providedIn: 'root' })
export class TenantsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly _tenants = signal<TenantDto[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadError = signal(false);
  private readonly _page = signal(0);
  private readonly _totalPages = signal(0);
  private readonly _totalElements = signal(0);

  /** Current page content. */
  readonly tenants = this._tenants.asReadonly();
  /** True while GET /api/superadmin/tenants is in flight. */
  readonly loading = this._loading.asReadonly();
  /** True if the last GET failed — drives the error state + retry button. */
  readonly loadError = this._loadError.asReadonly();
  /** 0-indexed current page number, as returned by the backend. */
  readonly page = this._page.asReadonly();
  /** Total number of pages for the current filter set. */
  readonly totalPages = this._totalPages.asReadonly();
  /** Total number of tenants matching the current filter set. */
  readonly totalElements = this._totalElements.asReadonly();

  /** Fetches a page of tenants for the given 0-indexed page and filters. Resets loading/error state. */
  load(page: number, filters: TenantFilters): Observable<TenantPage> {
    this._loading.set(true);
    this._loadError.set(false);

    let params = new HttpParams().set('page', page).set('size', DEFAULT_TENANT_PAGE_SIZE);
    if (filters.name.trim() !== '') {
      params = params.set('name', filters.name.trim());
    }
    if (filters.isActive !== '') {
      params = params.set('is_active', filters.isActive);
    }
    if (filters.plan !== '') {
      params = params.set('plan', filters.plan);
    }
    if (filters.authMode !== '') {
      params = params.set('auth_mode', filters.authMode);
    }

    return this.http.get<TenantPage>(`${this.apiUrl}/superadmin/tenants`, { params }).pipe(
      tap(result => {
        this._tenants.set(result.content);
        this._page.set(result.number);
        this._totalPages.set(result.totalPages);
        this._totalElements.set(result.totalElements);
        this._loading.set(false);
      }),
      catchError(() => {
        this._loading.set(false);
        this._loadError.set(true);
        this._tenants.set([]);
        return of(EMPTY_TENANT_PAGE);
      })
    );
  }
}
