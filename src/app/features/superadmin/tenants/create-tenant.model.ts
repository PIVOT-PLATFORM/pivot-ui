/**
 * Create-tenant models — shape accepted/returned by the superadmin tenant
 * creation endpoints (US06.2.1).
 *
 * Backend contract (`pivot-core` PR #134, `SuperAdminTenantController` /
 * `SuperAdminTenantService`):
 * - `POST /api/superadmin/tenants` — requires `ROLE_SUPER_ADMIN`. Body and
 *   response are **camelCase** (`authMode`), unlike the query params of the
 *   sibling listing endpoint (US06.2.3, `auth_mode`/`is_active`, see
 *   `tenant.model.ts`) which stayed snake_case for AC-literal reasons — the
 *   two endpoints were built independently and this asymmetry is
 *   intentional/contractual, not a bug.
 * - `plan` reuses `TenantPlan` from `tenant.model.ts` (`SAAS`/`ENTERPRISE`/`TRIAL`)
 *   — same enum, same column, same semantics as the listing filter.
 * - `authMode` on **creation** is a *different* concept from the listing's
 *   `TenantAuthMode` (`SAAS`/`ENTERPRISE`/`HYBRID`, "deployment mode"): here
 *   it is the tenant's primary *authentication* mode (`LOCAL`/`OIDC`/`GOOGLE`).
 *   Both map to the same `tenants.auth_mode` DB column (backend migration
 *   `V4` widens the `CHECK` constraint additively) — see the PR #134 body.
 *   Modelled as a distinct type here (`TenantCreationAuthMode`) to avoid
 *   conflating the two unrelated value sets in the type system.
 * - Success `201`: `{ id, slug, invitationUrl }`.
 * - Errors: `400` (validation), `401`/`403` (auth), `409 TENANT_SLUG_ALREADY_EXISTS`
 *   (shown inline on the slug field), `422 TENANT_SLUG_RESERVED` (same), `429
 *   RATE_LIMITED` (+ `Retry-After` header / `retryAfterSeconds` body field).
 *
 * `GET /api/superadmin/tenants/check-slug?slug=...` — always `200`,
 * `{ available, reason }`, `reason ∈ INVALID_FORMAT | RESERVED | TAKEN | null`.
 * Called with a 500ms debounce as the operator edits the slug field.
 */
import type { TenantPlan } from './tenant.model';

export type { TenantPlan };

/** Primary authentication mode requested for a newly created tenant. */
export type TenantCreationAuthMode = 'LOCAL' | 'OIDC' | 'GOOGLE';

/** Body of `POST /api/superadmin/tenants`. */
export interface CreateTenantRequest {
  name: string;
  slug: string;
  plan: TenantPlan;
  authMode: TenantCreationAuthMode;
}

/** `201 Created` response body. */
export interface CreateTenantResponse {
  id: number;
  slug: string;
  invitationUrl: string;
}

/** Reason a candidate slug is unavailable, per `GET check-slug`. */
export type SlugUnavailableReason = 'INVALID_FORMAT' | 'RESERVED' | 'TAKEN';

/** `200 OK` response body of `GET check-slug` — always 200, availability is in the body. */
export interface SlugAvailability {
  available: boolean;
  reason: SlugUnavailableReason | null;
}

/** Slug regex enforced by the backend (`TenantSlugPolicy`) — mirrored client-side for instant feedback. */
export const TENANT_SLUG_PATTERN = /^[a-z0-9-]{3,50}$/;

/** Debounce delay (ms) before firing `GET check-slug` after a slug edit — per AC. */
export const SLUG_CHECK_DEBOUNCE_MS = 500;

/** Max length accepted by the backend for a candidate slug (`TenantSlugPolicy`). */
const SLUG_MAX_LENGTH = 50;

/**
 * Derives a candidate slug from a tenant name: lowercase, accents stripped,
 * non `[a-z0-9]` runs collapsed to a single hyphen, leading/trailing hyphens
 * trimmed, truncated to the backend's max length.
 *
 * Pure function — no HTTP, no component state — so it can auto-populate the
 * slug field in real time (AC) without putting business logic in the component.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH);
}
