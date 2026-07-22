/**
 * Wire types for the Capacity Planning feature's backend contract (`pivot-agilite-core`,
 * `${environment.apiUrl}/agilite/capacity`). Derived from the Gate 1 AC files (US11.1.1→US11.4.2 —
 * Sprint 20 socle — plus US11.5.1, US11.6.1→US11.6.5, US11.7.1, US11.8.1 — Sprint 21 full engine —
 * `pivot-docs/docs/backlog/EPIC-capacity-planning/`) — the backend PR for the Sprint 21 lot was
 * still in progress when this was written, so the new field names mirror the AC's
 * precisely-specified request/response shapes rather than a live DTO inspection; a follow-up
 * reconciliation pass against the merged backend contract may be needed.
 *
 * `netCapacityDays`/`netCapacityPoints` on {@link CapacitySummaryResponse} carry `isProvisional`
 * (US11.6.5): `true` as long as the caller hasn't configured any real engine parameter (tenant
 * holidays, team maturity, an explicit focus factor) — same provisional S20 formula — and `false`
 * once the full F11.6 engine (holidays + focus factor + maturity + velocity) actually drove the
 * figure. Never hide the provisional badge once `true`.
 */

/**
 * Type of a capacity event (US11.1.1, extended US11.5.1). `PI_PLANNING` and `INCREMENT` are the
 * only valid parent types (`parentEventId`); `PI_PLANNING` alone supports `isIpIteration` children.
 * Neither carries members of its own — see US11.1.1.
 */
export type CapacityEventType = 'PI_PLANNING' | 'INCREMENT' | 'SPRINT' | 'RELEASE' | 'CUSTOM';

/** Team agile-maturity tier (US11.6.4) — drives the default focus factor / margin. */
export type CapacityMaturityLevel = 'FORMING' | 'NORMING' | 'PERFORMING';

/** Source of the margin/focus-factor actually applied to a summary (US11.6.4). */
export type CapacityMaturitySource = 'TEAM_MATURITY' | 'DEFAULT';

/** Confidence width of a velocity forecast (US11.6.3) — never conveyed by color alone in the UI. */
export type CapacityVelocityConfidence = 'NARROW' | 'WIDE';

/** Basis of a velocity forecast (US11.6.3) — `NO_HISTORY` when no completed sprint has velocity yet. */
export type CapacityVelocityForecastBasis = 'HISTORY' | 'NO_HISTORY';

/** A team the caller belongs to (same shape as the wheel/standup/pi-planning features' `TeamResponse`). */
export interface TeamResponse {
  readonly id: number;
  readonly name: string;
}

/** Summary reference to a parent or child event (US11.1.1 read AC — no full payload). */
export interface CapacityEventSummary {
  readonly id: string;
  readonly type: CapacityEventType;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  /** Whether this child is an IP-iteration SPRINT excluded from its PI's aggregated capacity (US11.5.1). Always `false` for a non-`SPRINT` or non-`PI_PLANNING`-child summary. */
  readonly isIpIteration: boolean;
}

/** A single capacity event, as returned by `GET .../events/{id}`. */
export interface CapacityEventResponse {
  readonly id: string;
  readonly tenantId: number;
  readonly teamId: number;
  readonly parentEventId: string | null;
  readonly type: CapacityEventType;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly pointsPerDay: number | null;
  readonly committedPoints: number | null;
  readonly completedPoints: number | null;
  /**
   * Only meaningful on a `SPRINT` child of a `PI_PLANNING` parent — excludes it from the parent's
   * aggregated capacity (US11.5.1/US11.6.5). Accepted (never rejected) on any other event, but
   * has no effect there.
   */
  readonly isIpIteration: boolean;
  /** Event-level focus factor override, `[10, 100]`, or `null` to fall back to team maturity/default (US11.6.2). */
  readonly focusFactorPercent: number | null;
  readonly createdBy: number;
  readonly parent: CapacityEventSummary | null;
  readonly children: CapacityEventSummary[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** List-view entry as returned by `GET /agilite/capacity/events` (no parent/children payload). */
export interface CapacityEventSummaryResponse {
  readonly id: string;
  readonly teamId: number;
  readonly type: CapacityEventType;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
}

/** Payload to create a new capacity event (US11.1.1, extended US11.5.1/US11.6.2). */
export interface CreateCapacityEventRequest {
  type: CapacityEventType;
  name: string;
  teamId: number;
  startDate: string;
  endDate: string;
  parentEventId?: string;
  focusFactorPercent?: number;
}

/** Payload for `PATCH .../events/{id}` — every field optional. */
export interface UpdateCapacityEventRequest {
  name?: string;
  startDate?: string;
  endDate?: string;
  isIpIteration?: boolean;
  focusFactorPercent?: number;
}

/**
 * Net-capacity summary of an event (US11.1.2, superseded by the full engine in US11.6.5).
 * `isProvisional` is `true` only while the caller hasn't configured any real engine parameter
 * (tenant holidays, team maturity, an explicit focus factor) — once any of those exist, the
 * backend switches to the full formula and `isProvisional` becomes `false`. Never treat `false`
 * as a technical capability check — it's a "has anyone configured this yet" signal.
 */
export interface CapacitySummaryResponse {
  readonly durationDays: number;
  readonly workingDays: number;
  readonly memberCount: number;
  readonly totalAbsenceDays: number;
  readonly netCapacityDays: number;
  readonly netCapacityPoints: number | null;
  readonly isProvisional: boolean;
  /** Margin applied to `engagementRecommendedPoints`, e.g. `15` for the global default (US11.6.4). Only present once the full engine is active. */
  readonly marginPercent: number | null;
  /** Where `marginPercent`/the effective focus factor came from (US11.6.4). `null` under the provisional S20 formula. */
  readonly maturitySource: CapacityMaturitySource | null;
  /** Velocity-forecast-derived point suggestion for a `SPRINT` still in preparation (US11.6.3/US11.6.5), or `null`. */
  readonly forecastPoints: number | null;
  /** `forecastPoints × (1 − marginPercent / 100)` (US11.6.5), or `null` if no forecast is available. */
  readonly engagementRecommendedPoints: number | null;
}

/** A member of a capacity event, auto-seeded from the team roster at event creation (US11.2.1). */
export interface CapacityEventMemberResponse {
  readonly id: string;
  readonly eventId: string;
  readonly teamMemberId: number;
  readonly name: string;
  readonly availabilityPercent: number;
  readonly excluded: boolean;
  /** Member-level focus factor override, `[10, 100]`, or `null` to inherit the event's/team's/default value (US11.6.2). */
  readonly focusFactorPercent: number | null;
  readonly absences: CapacityAbsenceResponse[];
}

/** Payload for `PATCH .../events/{id}/members/{memberId}` — every field optional. */
export interface UpdateCapacityEventMemberRequest {
  excluded?: boolean;
  availabilityPercent?: number;
  focusFactorPercent?: number;
}

/**
 * An absence period for a member. RGPD (Gate 1 — maintainer decision, US11.2.2): carries ONLY the
 * date range, deliberately no reason/category/comment field — do not add one, even client-side
 * only, even as an optional convenience. This mirrors the EPIC's own minimisation principle.
 */
export interface CapacityAbsenceResponse {
  readonly id: string;
  readonly dateDebut: string;
  readonly dateFin: string;
}

/** Payload to create an absence (US11.2.2) — date range only, no reason field. */
export interface CreateCapacityAbsenceRequest {
  dateDebut: string;
  dateFin: string;
}

/** Payload for `PATCH .../events/{id}/velocity` — both fields independently optional (US11.4.1). */
export interface UpdateCapacityVelocityRequest {
  committedPoints?: number;
  completedPoints?: number;
}

/** A single past sprint's velocity entry, as returned by the velocity-history endpoint (US11.4.1). */
export interface CapacityVelocityHistoryEntry {
  readonly id: string;
  readonly name: string;
  readonly endDate: string;
  readonly committedPoints: number | null;
  readonly completedPoints: number | null;
}

/** Rolling-average velocity + suggested next-sprint capacity (US11.4.1). */
export interface CapacityVelocityAverageResponse {
  readonly averageVelocity: number | null;
  readonly suggestedCapacity: number | null;
}

/** Payload for the idempotent daily burndown upsert, `PUT .../burndown/{date}` (US11.4.2). */
export interface UpsertBurndownEntryRequest {
  pointsRemaining: number;
}

/** A single point of a burndown curve (ideal or actual). */
export interface BurndownPoint {
  readonly date: string;
  readonly pointsRemaining: number;
}

/** Full burndown payload for a `SPRINT` event, as returned by `GET .../events/{id}/burndown` (US11.4.2). */
export interface CapacityBurndownResponse {
  readonly ideal: BurndownPoint[];
  readonly actual: BurndownPoint[];
  readonly atRisk: boolean;
  readonly stale: boolean;
}

/**
 * A tenant-level holiday (US11.6.1) — deliberately minimal, no locale/country dimension. Excluded
 * from working-day counts alongside weekends. Tenant-admin-only resource (403, not the team-scoped
 * 404-anti-enumeration convention used everywhere else in this module — see US11.6.1 §Architecture).
 */
export interface CapacityHolidayResponse {
  readonly id: string;
  readonly date: string;
  readonly label: string;
}

/** Payload to add a tenant holiday (US11.6.1). */
export interface CreateCapacityHolidayRequest {
  date: string;
  label: string;
}

/** A team's agile-maturity tier and its effective defaults (US11.6.4). */
export interface CapacityTeamMaturityResponse {
  readonly teamId: number;
  readonly maturity: CapacityMaturityLevel | null;
  readonly effectiveFocusFactorPercent: number;
  readonly effectiveMarginPercent: number;
}

/** Payload to set a team's maturity tier (US11.6.4). */
export interface UpdateCapacityTeamMaturityRequest {
  maturity: CapacityMaturityLevel;
}

/** Rolling velocity forecast for a team (US11.6.3). */
export interface CapacityVelocityForecastResponse {
  readonly forecastPoints: number | null;
  readonly confidenceInterval: CapacityVelocityConfidence | null;
  readonly basis: CapacityVelocityForecastBasis;
}

/** Per-row outcome of a CSV absence import (US11.7.1). */
export interface CapacityAbsenceImportError {
  readonly line: number;
  readonly code: string;
}

/** Result of a CSV absence import — never all-or-nothing, valid rows import even if others fail. */
export interface CapacityAbsenceImportResponse {
  readonly imported: number;
  readonly errors: CapacityAbsenceImportError[];
}

/** RFC 7807 error body returned by every `pivot-agilite-core` error response. */
export interface ProblemDetail {
  readonly title?: string;
  readonly status?: number;
  readonly detail?: string;
  readonly code?: string;
}
