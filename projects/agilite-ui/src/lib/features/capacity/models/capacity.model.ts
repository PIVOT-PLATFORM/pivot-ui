/**
 * Wire types for the Capacity Planning v1 feature's backend contract (`pivot-agilite-core`,
 * `${environment.apiUrl}/agilite/capacity`). Derived from the Gate 1 AC files (US11.1.1, US11.1.2,
 * US11.2.1, US11.2.2, US11.3.1, US11.4.1, US11.4.2 —
 * `pivot-docs/docs/backlog/EPIC-capacity-planning/`) — the backend PR was still in progress when
 * this was written, so field names mirror the AC's precisely-specified request/response shapes
 * rather than a live DTO inspection; a follow-up reconciliation pass against the merged backend
 * contract may be needed.
 *
 * Scope: this is the F11.1→F11.4 socle only. The full capacity-calculation engine (F11.6 — working
 * days/holidays by locale, focus factor, velocity-N-1 and maturity adjustments) is Sprint 21 —
 * `netCapacityDays`/`netCapacityPoints` below are an explicitly **provisional** approximation
 * (`isProvisional: true`), not the real model described in the EPIC README.
 */

/** Type of a capacity event (US11.1.1). `PI_PLANNING` carries no members of its own — see US11.1.1. */
export type CapacityEventType = 'PI_PLANNING' | 'SPRINT' | 'RELEASE' | 'CUSTOM';

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

/** Payload to create a new capacity event (US11.1.1). */
export interface CreateCapacityEventRequest {
  type: CapacityEventType;
  name: string;
  teamId: number;
  startDate: string;
  endDate: string;
  parentEventId?: string;
}

/** Payload for `PATCH .../events/{id}` — every field optional. */
export interface UpdateCapacityEventRequest {
  name?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Provisional net-capacity summary of an event (US11.1.2). `isProvisional` is always `true` at
 * this socle — the real F11.6 engine (Sprint 21) will replace, not supplement, this figure. See
 * the AC's own formula: `(workingDays − absenceDays) × availabilityPercent / 100` per member,
 * summed over non-excluded members; weekends excluded only, no holidays.
 */
export interface CapacitySummaryResponse {
  readonly durationDays: number;
  readonly workingDays: number;
  readonly memberCount: number;
  readonly totalAbsenceDays: number;
  readonly netCapacityDays: number;
  readonly netCapacityPoints: number | null;
  readonly isProvisional: true;
}

/** A member of a capacity event, auto-seeded from the team roster at event creation (US11.2.1). */
export interface CapacityEventMemberResponse {
  readonly id: string;
  readonly eventId: string;
  readonly teamMemberId: number;
  readonly name: string;
  readonly availabilityPercent: number;
  readonly excluded: boolean;
  readonly absences: CapacityAbsenceResponse[];
}

/** Payload for `PATCH .../events/{id}/members/{memberId}` — every field optional. */
export interface UpdateCapacityEventMemberRequest {
  excluded?: boolean;
  availabilityPercent?: number;
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

/** RFC 7807 error body returned by every `pivot-agilite-core` error response. */
export interface ProblemDetail {
  readonly title?: string;
  readonly status?: number;
  readonly detail?: string;
  readonly code?: string;
}
