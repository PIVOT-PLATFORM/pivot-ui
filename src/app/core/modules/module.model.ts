/**
 * Module model — shared types for the PIVOT module system.
 *
 * PivotModuleDto  — raw API shape (what GET /api/modules returns)
 * PivotModuleUi   — enriched with static UI metadata (icon, route, color, description)
 * ModuleStatus    — operational status as reported by the backend
 *
 * Backend mirror: fr.pivot.modules.registry.PivotModuleDto (pivot-core)
 */

/** Operational status of a module instance as reported by the backend. */
export type ModuleStatus = 'online' | 'preview' | 'offline';

/**
 * Raw DTO returned by GET /api/modules.
 * Maps directly to fr.pivot.modules.registry.PivotModuleDto.
 */
export interface PivotModuleDto {
  /** Stable identifier, e.g. "whiteboard", "session". */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Semver string, e.g. "1.2.0". */
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
  /** Inline SVG string (viewBox 0 0 24 24, Heroicons/Lucide-compatible). */
  icon: string;
  /** Short description shown in module cards, max ~80 characters. */
  description: string;
  /** Angular router path, e.g. /whiteboard. */
  route: string;
  /** True when the module is not yet available (shows "Coming soon" badge). */
  comingSoon: boolean;
  /** CSS accent color for the module card, e.g. '#3B82F6'. */
  color: string;
}
