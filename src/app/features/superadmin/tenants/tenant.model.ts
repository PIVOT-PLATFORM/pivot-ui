/**
 * Tenant models — shape returned by the superadmin tenant listing endpoint.
 *
 * Backend contract (US06.2.3, `pivot-core` `SuperAdminTenantController` /
 * `TenantSummaryDto`):
 * - `GET /api/superadmin/tenants` — requires `ROLE_SUPER_ADMIN`.
 * - Response body follows the Spring `Page` JSON envelope
 *   (`{ content, totalElements, totalPages, number, size }`), returned
 *   verbatim (not the newer nested `PagedModel` shape).
 * - Default page size: 20. Default sort: `createdAt` DESC.
 * - Response fields are **camelCase** (`authMode`, `isActive`), consistent
 *   with the rest of the pivot-core API (e.g. `AdminModuleDto.enabled`) —
 *   only the **query parameters** are snake_case (`is_active`, `auth_mode`),
 *   copied literally from the US acceptance criteria.
 * - `plan`/`auth_mode` are backend-enforced enums (`CHECK` constraints on
 *   `tenants.plan` / `tenants.auth_mode`), not free text — filters for both
 *   are exact-match server-side, hence rendered as `<select>` inputs.
 */

/** Authentication mode configured for a tenant (`tenants.auth_mode` CHECK constraint). */
export type TenantAuthMode = 'SAAS' | 'ENTERPRISE' | 'HYBRID';

/** Subscription plan for a tenant (`tenants.plan` CHECK constraint). */
export type TenantPlan = 'SAAS' | 'ENTERPRISE' | 'TRIAL';

/** Raw tenant row returned by GET /api/superadmin/tenants. */
export interface TenantDto {
  id: number;
  slug: string;
  name: string;
  plan: TenantPlan;
  authMode: TenantAuthMode;
  isActive: boolean;
  userCount: number;
  createdAt: string;
}

/** Spring `Page<TenantDto>` envelope. */
export interface TenantPage {
  content: TenantDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/** Tri-state boolean filter value — `''` means "no filter applied". */
export type TenantActiveFilter = '' | 'true' | 'false';

/** Query filters accepted by GET /api/superadmin/tenants. */
export interface TenantFilters {
  name: string;
  isActive: TenantActiveFilter;
  plan: '' | TenantPlan;
  authMode: '' | TenantAuthMode;
}

/** Default page size, mirrors the backend default (also sent explicitly on every request). */
export const DEFAULT_TENANT_PAGE_SIZE = 20;

/** Filters with no criteria applied — initial component state. */
export const EMPTY_TENANT_FILTERS: TenantFilters = {
  name: '',
  isActive: '',
  plan: '',
  authMode: '',
};

/** Empty Page result used as a safe fallback after a failed request. */
export const EMPTY_TENANT_PAGE: TenantPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: DEFAULT_TENANT_PAGE_SIZE,
};
