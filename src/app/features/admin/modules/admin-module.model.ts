/**
 * Admin module models — shape returned by the tenant-admin module endpoints.
 *
 * Backend mirror: `fr.pivot.modules.api.AdminModuleDto` (pivot-core).
 */

/**
 * Visibility source of a module for the current tenant (US03.3.3).
 *
 * - `'plan'` — the module is included in the tenant's billing plan, or the
 *   tenant has no plan assigned yet (no restriction applies in that case —
 *   see the backend `AdminModuleListService` Javadoc for the full rationale).
 * - `'override'` — the module is **not** in the tenant's plan but is made
 *   visible solely by an active SUPER_ADMIN override. The UI must render a
 *   distinct visual indicator for this case ("Activé par l'administrateur
 *   plateforme").
 */
export type AdminModuleSource = 'plan' | 'override';

/** Raw DTO returned by GET /api/admin/modules. */
export interface AdminModuleDto {
  /** Stable identifier, e.g. "whiteboard". */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Whether the module is enabled for the current tenant. */
  enabled: boolean;
  /**
   * Short description of the module. May be an empty string `""` — the
   * backend `PivotModule` interface currently has no description field
   * (documented backend limitation) — the UI must tolerate this gracefully.
   */
  description: string;
  /** Why this module is visible for this tenant — see {@link AdminModuleSource}. */
  source: AdminModuleSource;
}

/** Error body returned by POST/DELETE .../activate when the module is not in the tenant's plan. */
export interface ModuleNotInPlanError {
  error: 'MODULE_NOT_IN_PLAN';
  message: string;
}

/** Response body of POST/DELETE /api/admin/modules/{id}/activate on success. */
export interface ModuleActivationResult {
  id: string;
  enabled: boolean;
}

/** Per-module UI error kind used to render inline card messages. */
export type AdminModuleErrorKind = 'not-in-plan' | 'generic';
