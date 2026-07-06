/**
 * Plan models — shape returned/accepted by the superadmin plan endpoints (US03.3.1).
 *
 * Backend contract (`pivot-core` PR #153, `SuperAdminPlanController`):
 * - `POST /api/superadmin/plans` — requires `ROLE_SUPER_ADMIN`. Body
 *   `{ name }` (required, non-blank, max {@link PLAN_NAME_MAX_LENGTH} chars)
 *   → `201` with the created `PlanDto`. `409 PLAN_NAME_ALREADY_EXISTS` if the
 *   name is taken, `400` if blank/too long.
 * - `GET /api/superadmin/plans` → `200` with `PlanDto[]` — no pagination,
 *   this is a small platform-level configuration list.
 * - `GET /api/superadmin/plans/{planId}` → `200` with `PlanDto`. `404
 *   PLAN_NOT_FOUND` if unknown.
 * - `PUT /api/superadmin/plans/{planId}/modules` — body `{ moduleIds }`, a
 *   **full replacement** of the plan's module list (an explicit empty array
 *   is valid and clears all modules — not an error) → `200` with the current
 *   `{ moduleIds }`. `404` unknown plan, `400 UNKNOWN_MODULE_ID` if any id
 *   isn't registered in the backend's module registry.
 * - `POST /api/superadmin/plans/{planId}/modules/{moduleId}` — no body,
 *   single-module add, **idempotent** (adding an already-present module is a
 *   no-op, not an error) → `200` with the current `{ moduleIds }`. Same `404`
 *   / `400 UNKNOWN_MODULE_ID` errors as the full-replace endpoint.
 *
 * There is no dedicated "remove a single module" endpoint and no
 * super-admin-scoped "list every known module id" endpoint — the Angular
 * side is designed around both constraints (see `plan-detail.component.ts`).
 *
 * `moduleIds` is sorted alphabetically by the backend; `createdAt` is an ISO
 * instant string.
 */

/** Raw plan row returned by the superadmin plan endpoints. */
export interface PlanDto {
  id: number;
  name: string;
  moduleIds: string[];
  createdAt: string;
}

/** Body of `POST /api/superadmin/plans`. */
export interface CreatePlanRequest {
  name: string;
}

/** Body of `PUT /api/superadmin/plans/{planId}/modules`. */
export interface ReplaceModulesRequest {
  moduleIds: string[];
}

/** Response body shared by the full-replace and single-add module endpoints. */
export interface PlanModulesResult {
  moduleIds: string[];
}

/** Error body when a plan name is already taken (`POST /superadmin/plans`, `409`). */
export interface PlanNameAlreadyExistsError {
  error: 'PLAN_NAME_ALREADY_EXISTS';
  message: string;
}

/** Error body when a planId doesn't exist (`404` on any per-plan endpoint). */
export interface PlanNotFoundError {
  error: 'PLAN_NOT_FOUND';
  message: string;
}

/** Error body when a moduleId isn't registered in the backend's module registry (`400`). */
export interface UnknownModuleIdError {
  error: 'UNKNOWN_MODULE_ID';
  message: string;
}

/** Max length accepted by the backend for a plan name. */
export const PLAN_NAME_MAX_LENGTH = 100;
