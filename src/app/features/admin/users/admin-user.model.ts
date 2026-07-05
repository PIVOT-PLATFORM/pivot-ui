/**
 * Admin user models — shape returned by the tenant-admin user listing endpoint.
 *
 * Backend contract (US06.1.1, `pivot-core` `AdminUserController` / `AdminUserDto`,
 * PR #127 — not yet merged at implementation time, contract confirmed stable):
 * - `GET /api/admin/users` — requires `ROLE_ADMIN`, scoped to the caller's own
 *   tenant (resolved server-side from the bearer token — never a client-supplied id).
 * - Response body follows the Spring `Page` JSON envelope verbatim
 *   (`{ content, totalElements, totalPages, number, size, ... }`), not a custom envelope.
 * - Default page size: 20 (fixed — not client-configurable in this US). Default
 *   sort: `createdAt DESC` (also fixed, no sort UI in this US).
 * - `size` out of bounds is silently clamped server-side (never a 400). `status`
 *   with an invalid value **is** rejected with `400 { error: "INVALID_FILTER",
 *   field: "status", ... }` — asymmetric on purpose. Since `role`/`status` are
 *   only ever sent from closed `<select>` inputs restricted to the values below,
 *   the frontend cannot structurally trigger that 400 in normal use; it is still
 *   mapped to the generic load-error state in `AdminUsersService` rather than
 *   left unhandled, in case the contract drifts later.
 * - `firstName`/`lastName` may both be `null` (see `AdminUserDto` Javadoc) — the
 *   UI must tolerate this gracefully (falls back to the email as display name).
 */

/**
 * Tenant-scoped user roles. Per `us-modifier-role.md`, `ROLE_ADMIN` and
 * `ROLE_USER` are the only two values ever assigned to a tenant user
 * (`ROLE_SUPER_ADMIN` is platform-level, `ROLE_GUEST` is session-only) — but the
 * backend DTO field is a plain `String`, so the UI still falls back gracefully
 * (see `AdminUsersComponent.roleLabelKey`) if an unexpected value appears.
 */
export type AdminUserRole = 'ROLE_ADMIN' | 'ROLE_USER';

/**
 * Synthetic 3-value status derived server-side from the `is_active`/`is_blocked`
 * columns (`BLOCKED` takes priority) — never expose separate booleans, only
 * these 3 exact values.
 */
export type AdminUserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

/** Raw user row returned by GET /api/admin/users. */
export interface AdminUserDto {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  status: AdminUserStatus;
  /** ISO-8601 instant string, e.g. `"2026-07-01T10:15:30Z"`. */
  createdAt: string;
}

/** Spring `Page<AdminUserDto>` envelope, only the fields this UI consumes. */
export interface AdminUserPage {
  content: AdminUserDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/** Tri-state role filter value — `''` means "no filter applied" (all roles). */
export type AdminUserRoleFilter = '' | AdminUserRole;

/** Tri-state status filter value — `''` means "no filter applied" (all statuses). */
export type AdminUserStatusFilter = '' | AdminUserStatus;

/** Query filters accepted by GET /api/admin/users. */
export interface AdminUserFilters {
  search: string;
  role: AdminUserRoleFilter;
  status: AdminUserStatusFilter;
}

/** Fixed page size for this US — mirrors the backend default, sent explicitly on every request. */
export const DEFAULT_ADMIN_USERS_PAGE_SIZE = 20;

/** Filters with no criteria applied — initial component state. */
export const EMPTY_ADMIN_USER_FILTERS: AdminUserFilters = {
  search: '',
  role: '',
  status: '',
};

/** Empty Page result used as a safe fallback after a failed request. */
export const EMPTY_ADMIN_USER_PAGE: AdminUserPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: DEFAULT_ADMIN_USERS_PAGE_SIZE,
};
