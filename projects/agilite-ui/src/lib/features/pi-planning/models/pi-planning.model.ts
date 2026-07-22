/**
 * Wire types for the PI Planning feature's backend contract (`pivot-agilite-core`,
 * `${environment.apiUrl}/agilite/pi`). Derived from the Gate 1 AC files (US50.1.1/US50.3.1/
 * US50.3.2, `pivot-docs/docs/backlog/EPIC-pi-planning/`) — the backend PR was still in progress
 * when this was written, so field names mirror the AC's precisely-specified request/response
 * shapes rather than a live DTO inspection; a follow-up reconciliation pass against the merged
 * backend contract may be needed.
 */

/** Lifecycle status of a PI cycle (US50.1.1). No strict state machine at socle. */
export type PiCycleStatus = 'PREPARATION' | 'ACTIVE' | 'CLOSED';

/** Type of a Program Board ticket (US50.3.1). */
export type PiTicketType = 'FEATURE' | 'MILESTONE' | 'RISK' | 'OBJECTIVE' | 'STORY' | 'ENABLER';

/** Visual status of a dependency between two tickets (US50.3.2). */
export type PiDependencyStatus = 'OK' | 'BLOCKED';

/** A team the caller belongs to (same shape as the wheel/standup features' `TeamResponse`). */
export interface TeamResponse {
  readonly id: number;
  readonly name: string;
}

/** A single generated iteration of a PI cycle (`IT1`…`ITn`, or the final `"IP Sprint"`). */
export interface PiIterationResponse {
  readonly id: string;
  readonly number: number;
  readonly label: string;
  readonly startDate: string;
  readonly endDate: string;
}

/**
 * A Train team of a PI cycle — either a snapshot import of a PIVOT team (`sourceTeamId` set at
 * import time, `null` once the source team is later deleted — the snapshot never breaks) or a
 * manually-entered team (`sourceTeamId` always `null`, no PIVOT-team membership grants access).
 */
export interface PiCycleTeamResponse {
  readonly id: string;
  readonly name: string;
  readonly color: string | null;
  readonly order: number;
  readonly sourceTeamId: number | null;
}

/** A PI cycle with its iterations and Train teams, as returned by `GET .../cycles/{id}`. */
export interface PiCycleResponse {
  readonly id: string;
  readonly tenantId: number;
  readonly name: string;
  readonly artName: string | null;
  readonly status: PiCycleStatus;
  readonly startDate: string;
  readonly endDate: string;
  readonly eventDay1: string | null;
  readonly eventDay2: string | null;
  readonly eventLocation: string | null;
  readonly createdBy: number;
  readonly iterations: PiIterationResponse[];
  readonly teams: PiCycleTeamResponse[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Summary entry as returned by `GET /agilite/pi/cycles` (list view — no iterations/teams payload). */
export interface PiCycleSummaryResponse {
  readonly id: string;
  readonly name: string;
  readonly artName: string | null;
  readonly status: PiCycleStatus;
  readonly startDate: string;
  readonly endDate: string;
  readonly iterationCount: number;
  readonly teamCount: number;
}

/**
 * Payload to create a new PI cycle (US50.1.1). `iterationCount`/`iterationWeeks` omitted default
 * to `5`/`2` server-side (same defaults as the reference POC). Iterations are generated
 * server-side, purely from these parameters — no dependency on Capacity Planning (Gate 1
 * architecture decision, see US50.1.1 AC).
 */
export interface CreatePiCycleRequest {
  name: string;
  artName?: string;
  startDate: string;
  iterationCount?: number;
  iterationWeeks?: number;
}

/** Payload for `PATCH .../cycles/{id}` — every field optional, only provided ones are updated. */
export interface UpdatePiCycleRequest {
  name?: string;
  artName?: string;
  status?: PiCycleStatus;
  eventDay1?: string;
  eventDay2?: string;
  eventLocation?: string;
}

/** Payload for `PATCH .../cycles/{id}/iterations/{iterationId}`. */
export interface UpdatePiIterationRequest {
  label?: string;
  startDate?: string;
  endDate?: string;
}

/** Payload to manually add a Train team not sourced from a PIVOT team. */
export interface AddManualTeamRequest {
  name: string;
  color?: string;
}

/** Payload for `PATCH .../cycles/{id}/teams/{teamId}`. */
export interface UpdatePiCycleTeamRequest {
  name?: string;
  color?: string;
  order?: number;
}

/** Payload for `POST .../cycles/{id}/teams/import` — `teamIds` must contain 1 to 30 entries. */
export interface ImportTeamsRequest {
  teamIds: number[];
}

/** Response of a team import — the number actually imported (duplicates/inaccessible silently skipped). */
export interface ImportTeamsResponse {
  readonly importedCount: number;
  readonly teams: PiCycleTeamResponse[];
}

/** A single Program Board ticket. `teamId: null` = Train row, `iterationId: null` = "Unplanned" column. */
export interface PiTicketResponse {
  readonly id: string;
  readonly cycleId: string;
  readonly type: PiTicketType;
  readonly title: string;
  readonly description: string | null;
  readonly teamId: string | null;
  readonly iterationId: string | null;
  readonly order: number;
}

/** Payload to create a ticket (US50.3.1). */
export interface CreatePiTicketRequest {
  type: PiTicketType;
  title: string;
  description?: string;
  teamId?: string | null;
  iterationId?: string | null;
}

/**
 * Payload for `PATCH .../tickets/{ticketId}` — the SAME endpoint used both for field edits and
 * for drag-drop moves (new `teamId`/`iterationId`/`order`). No separate `/move` endpoint.
 */
export interface UpdatePiTicketRequest {
  type?: PiTicketType;
  title?: string;
  description?: string | null;
  teamId?: string | null;
  iterationId?: string | null;
  order?: number;
}

/** A dependency arrow between two tickets of the same cycle (US50.3.2). */
export interface PiDependencyResponse {
  readonly id: string;
  readonly cycleId: string;
  readonly fromTicketId: string;
  readonly toTicketId: string;
  readonly status: PiDependencyStatus;
  readonly note: string | null;
}

/** Payload to create a dependency — `status` defaults to `"OK"` server-side if omitted. */
export interface CreatePiDependencyRequest {
  fromTicketId: string;
  toTicketId: string;
  status?: PiDependencyStatus;
  note?: string | null;
}

/** Payload for `PATCH .../dependencies/{depId}` — only `status`/`note` are ever modifiable. */
export interface UpdatePiDependencyRequest {
  status?: PiDependencyStatus;
  note?: string | null;
}

/** Aggregated single-payload response of `GET .../cycles/{id}/board` (US50.3.1). */
export interface PiBoardResponse {
  readonly cycleId: string;
  readonly iterations: PiIterationResponse[];
  readonly teams: PiCycleTeamResponse[];
  readonly tickets: PiTicketResponse[];
  readonly dependencies: PiDependencyResponse[];
}

/** RFC 7807 error body returned by every `pivot-agilite-core` error response. */
export interface ProblemDetail {
  readonly title?: string;
  readonly status?: number;
  readonly detail?: string;
  readonly code?: string;
}
