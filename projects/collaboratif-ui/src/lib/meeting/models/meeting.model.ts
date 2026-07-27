/** Category of a single agenda item (US12.1.1 AC2). Stored/transmitted as ASCII. */
export type AgendaItemType = 'INFO' | 'DISCUSSION' | 'DECISION';

/** Request payload for a single agenda item within {@link CreateMeetingRequest} (US12.1.1 AC2). */
export interface AgendaItemRequest {
  readonly title: string;
  readonly durationMinutes: number;
  readonly type: AgendaItemType;
  readonly facilitator?: string;
}

/** Request body for `POST /api/collaboratif/meetings` (US12.1.1 AC1). */
export interface CreateMeetingRequest {
  readonly title: string;
  /** ISO-8601 date/time string. */
  readonly scheduledAt: string;
  readonly totalDurationMinutes: number;
  readonly teamId?: number;
  readonly agendaItems?: AgendaItemRequest[];
}

/** API response shape for a single agenda item (US12.1.1 AC1/AC2). */
export interface AgendaItemResponse {
  readonly id: string;
  readonly title: string;
  readonly durationMinutes: number;
  readonly type: AgendaItemType;
  readonly facilitator: string | null;
  readonly position: number;
}

/**
 * Non-blocking warning surfaced when a meeting's agenda item durations do not sum to its
 * `totalDurationMinutes` (US12.1.1 AC3).
 */
export interface AgendaDurationMismatch {
  readonly expectedMinutes: number;
  readonly sumMinutes: number;
  readonly deltaMinutes: number;
}

/** API response shape for a meeting (US12.1.1 AC1) — returned by `POST .../meetings`. */
export interface MeetingResponse {
  readonly id: string;
  readonly title: string;
  readonly status: 'DRAFT';
  readonly scheduledAt: string;
  readonly totalDurationMinutes: number;
  readonly teamId: number | null;
  readonly agendaItems: AgendaItemResponse[];
  readonly createdAt: string;
  /** Absent (not even `null`) when there is no reconciliation warning — see backend `@JsonInclude(NON_NULL)`. */
  readonly agendaDurationMismatch?: AgendaDurationMismatch;
}

/** Backend problem-detail error body (RFC 7807), as used across PIVOT's REST error contract. */
export interface MeetingProblemDetailResponse {
  readonly code?: string;
  readonly detail?: string;
}
