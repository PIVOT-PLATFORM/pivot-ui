/**
 * CreateTenantService — super admin, platform-wide tenant creation (US06.2.1).
 *
 * Consumes `POST /api/superadmin/tenants` and `GET
 * /api/superadmin/tenants/check-slug` (both `ROLE_SUPER_ADMIN` only). Kept
 * separate from `TenantsService` (US06.2.3, listing): the two features share
 * a route prefix but have unrelated state shapes (a paginated read-model vs.
 * a single create-form submission), so a thin, stateless HTTP wrapper here
 * avoids overloading one service with two concerns.
 *
 * No `tenantId` is ever read from or sent by this service — cross-tenant,
 * platform-level action reserved for `ROLE_SUPER_ADMIN`, backed entirely by
 * the bearer token's role claim.
 */
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { CreateTenantRequest, CreateTenantResponse, SlugAvailability } from './create-tenant.model';

@Injectable({ providedIn: 'root' })
export class CreateTenantService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Creates a tenant. Rejects with the raw `HttpErrorResponse` on failure —
   * callers map `409`/`422`/`429`/`400` to the appropriate UI feedback.
   */
  create(request: CreateTenantRequest): Observable<CreateTenantResponse> {
    return this.http.post<CreateTenantResponse>(`${this.apiUrl}/superadmin/tenants`, request);
  }

  /**
   * Checks candidate slug availability. Always resolves `200` per contract —
   * unavailability is carried in the response body (`available`/`reason`),
   * never as an HTTP error status.
   */
  checkSlug(slug: string): Observable<SlugAvailability> {
    const params = new HttpParams().set('slug', slug);
    return this.http.get<SlugAvailability>(`${this.apiUrl}/superadmin/tenants/check-slug`, { params });
  }
}
