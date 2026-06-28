/**
 * Module system contracts for PIVOT — mirrors PivotModuleDto returned by the backend API.
 *
 * PivotModuleDto  — raw API shape (what /api/modules returns)
 * PivotModuleUi   — enriched with static UI metadata (icon, route, etc.)
 * ModuleStatus    — operational status reported by the backend
 */

/** Operational status of a module as reported by the backend. */
export type ModuleStatus = 'online' | 'preview' | 'offline';

/**
 * Raw DTO returned by GET /api/modules.
 * Maps directly to fr.pivot.modules.registry.PivotModuleDto (pivot-core).
 */
export interface PivotModuleDto {
  /** Stable identifier e.g. "whiteboard", "session". */
  id: string;
  /** Human-readable name provided by the backend. */
  name: string;
  /** Semver string e.g. "1.2.0". */
  version: string;
  /** Whether the module is enabled for the current tenant. */
  enabled: boolean;
  /** Operational status of the module instance. */
  status: ModuleStatus;
}

/**
 * DTO enriched with static UI metadata from MODULE_METADATA.
 * Used by components and guards — never sent to the API.
 */
export interface PivotModuleUi extends PivotModuleDto {
  /** Inline SVG string (viewBox 0 0 24 24, Heroicons/Lucide style). */
  icon: string;
  /** Short description shown in the UI, max 80 characters. */
  description: string;
  /** Angular router path, e.g. /whiteboard. */
  route: string;
  /** True when the module is not yet available (shows "Coming soon" badge). */
  comingSoon: boolean;
  /** CSS accent color for the module card, e.g. '#3B82F6'. */
  color: string;
}
