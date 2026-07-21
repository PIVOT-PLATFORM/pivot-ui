/**
 * Wire types for the capacity feature's backend contract (`pivot-agilite-core`,
 * `${environment.apiUrl}` = `/api/agilite/capacity`, KPIs at `/api/agilite/kpi`). Mirrors
 * `fr.pivot.agilite.capacity.dto.*` (+ `cadence`/`kpi.dto`) exactly, field for field — see that
 * package for the full domain Javadoc (E11 — capacity planning).
 */

/** Kind of capacity event. */
export type CapacityEventType = 'PI_PLANNING' | 'SPRINT' | 'RELEASE' | 'CUSTOM';

/** Lifecycle status of a capacity event. */
export type CapacityEventStatus = 'PLANNING' | 'ACTIVE' | 'DONE';

/** Team maturity level driving the default focus-factor/margin/velocity-multiplier profile. */
export type CapacityMaturityLevel = 'FORMING' | 'NORMING' | 'PERFORMING';

/**
 * Request body for creating (`POST /events`) or updating (`PUT /events/{id}`) a capacity event.
 * `teamId` is create-only — ignored by the backend on update.
 */
export interface CapacityEventRequest {
  teamId?: number;
  type: CapacityEventType;
  name: string;
  startDate: string;
  endDate: string;
  parentId?: string | null;
  maturityLevel?: CapacityMaturityLevel | null;
  focusFactor?: number | null;
  margeSecurite?: number | null;
  pointsPerDay?: number | null;
  committedPoints?: number | null;
  workingDays?: number[] | null;
  notes?: string | null;
  status?: CapacityEventStatus | null;
}

/** A capacity event, as returned by the backend. */
export interface CapacityEventResponse {
  readonly id: string;
  readonly tenantId: number;
  readonly teamId: number;
  readonly type: CapacityEventType;
  readonly status: CapacityEventStatus;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly parentId: string | null;
  readonly maturityLevel: CapacityMaturityLevel | null;
  readonly focusFactor: number | null;
  readonly margeSecurite: number | null;
  readonly pointsPerDay: number | null;
  readonly committedPoints: number | null;
  readonly completedPoints: number | null;
  readonly workingDays: number[];
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Compact listing shape for a PI's direct children (`GET /events/{piId}/children`). */
export interface CapacityEventChildResponse {
  readonly id: string;
  readonly type: CapacityEventType;
  readonly status: CapacityEventStatus;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
}

/** Request body for adding/updating a capacity event member. */
export interface CapacityMemberRequest {
  teamMemberRef?: number | null;
  name: string;
  role?: string | null;
  quotite: number;
  focusFactor?: number | null;
  locality?: string | null;
  excluded?: boolean | null;
  position?: number | null;
}

/** A capacity event member, as returned by the backend. */
export interface CapacityMemberResponse {
  readonly id: string;
  readonly eventId: string;
  readonly teamMemberRef: number | null;
  readonly name: string;
  readonly role: string | null;
  readonly quotite: number;
  readonly focusFactor: number | null;
  readonly locality: string | null;
  readonly excluded: boolean;
  readonly position: number;
}

/** Request body for adding an absence to a capacity event member. Carries no motif — RGPD. */
export interface CapacityAbsenceRequest {
  startDate: string;
  endDate: string;
  fraction: number;
  source?: string | null;
}

/** A member absence, as returned by the backend. Carries no motif — RGPD. */
export interface CapacityAbsenceResponse {
  readonly id: string;
  readonly eventMemberId: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly fraction: number;
  readonly source: string;
}

/** One member's row in a capacity event summary (F11.6.5). */
export interface CapacityMemberBreakdownResponse {
  readonly memberId: string;
  readonly name: string;
  readonly role: string | null;
  readonly quotite: number;
  readonly excluded: boolean;
  readonly effectiveFocus: number;
  readonly absentWorkingDays: number;
  readonly workedDays: number;
  readonly netCapacity: number;
  readonly points: number | null;
  readonly recommendedEngagement: number;
}

/** A PI's capacity, consolidated from its direct sprint children. */
export interface PiCapacityResult {
  readonly totalJoursHommeNets: number;
  readonly totalCapaciteNette: number;
  readonly totalPoints: number | null;
  readonly includedSprintCount: number;
  readonly excludedIpSprintCount: number;
}

/** Engagement gauge for a capacity event (F11.6.6). */
export interface CapacityGaugeResponse {
  readonly engagedPoints: number;
  readonly referenceEngagement: number;
  readonly overflowThreshold: number;
  readonly engagementRatio: number | null;
  readonly overCommitted: boolean;
}

/** Full capacity summary for one event (`GET /events/{id}/summary`, F11.6.5 + F11.6.6). */
export interface CapacitySummaryResponse {
  readonly eventId: string;
  readonly eventType: CapacityEventType;
  readonly eventName: string;
  readonly totalWorkingDays: number;
  readonly members: readonly CapacityMemberBreakdownResponse[];
  readonly totalNetPersonDays: number;
  readonly totalNetCapacity: number;
  readonly totalPoints: number | null;
  readonly totalRecommendedEngagement: number;
  readonly loadRatio: number | null;
  readonly predictability: number | null;
  readonly consolidation: PiCapacityResult | null;
  readonly gauge: CapacityGaugeResponse;
}

/** Request body for upserting a sprint's velocity snapshot (`PATCH /events/{id}/velocity`). */
export interface CapacityVelocityRequest {
  pointsEngages: number;
  pointsLivres: number;
}

/** The upserted velocity snapshot of a sprint. */
export interface CapacityVelocityResponse {
  readonly id: string;
  readonly sprintEventId: string;
  readonly pointsEngages: number;
  readonly pointsLivres: number;
  readonly createdAt: string;
}

/** One sprint's contribution to the velocity history. */
export interface CapacityHistoryPoint {
  readonly sprintEventId: string;
  readonly name: string;
  readonly startDate: string;
  readonly pointsEngages: number | null;
  readonly pointsLivres: number | null;
}

/** Rolling-window velocity forecast derived from a team's last N sprints. */
export interface VelocityForecast {
  readonly sampleSize: number;
  readonly mean: number;
  readonly stdDev: number;
  readonly coefficientOfVariation: number;
  readonly lowerBound: number;
  readonly upperBound: number;
  readonly widened: boolean;
}

/** Response for a team's velocity history and rolling forecast (`GET /events/{id}/history`). */
export interface CapacityHistoryResponse {
  readonly history: readonly CapacityHistoryPoint[];
  readonly forecast: VelocityForecast | null;
}

/** One (date, remaining points) reading of a burndown line. */
export interface CapacityBurndownPoint {
  readonly date: string;
  readonly pointsRestants: number;
}

/** Response for a sprint's burndown chart (`GET /events/{id}/burndown`): real + ideal lines. */
export interface CapacityBurndownResponse {
  readonly real: readonly CapacityBurndownPoint[];
  readonly ideal: readonly CapacityBurndownPoint[];
}

/**
 * Request body for `POST /events/{piId}/cadence` (F11.5 — PI/SAFe cadence). Exactly one of
 * `sprintLengthDays`/`sprintLengthWeeks` must be supplied.
 */
export interface CadenceRequest {
  sprintLengthDays?: number | null;
  sprintLengthWeeks?: number | null;
  sprintCount: number;
  includeIpSprint: boolean;
  namePrefix?: string | null;
}

/** A single sprint generated by `POST /events/{piId}/cadence` (F11.5). */
export interface CadenceSprintResponse {
  readonly id: string;
  readonly status: CapacityEventStatus;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly ipSprint: boolean;
}

/**
 * Response of `GET /api/agilite/kpi?eventId=...` — the five E11 capacity KPIs, aggregated at
 * team level. RGPD posture: team-level aggregates only, never member-scoped.
 */
export interface KpiResponse {
  readonly teamId: number;
  readonly eventSampleSize: number;
  readonly sprintSampleSize: number;
  readonly kpis: Readonly<Record<string, number>>;
}
