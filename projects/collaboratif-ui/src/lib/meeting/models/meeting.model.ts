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

// ---------------------------------------------------------------------------------------------
// Animation (US12.2.1)
// ---------------------------------------------------------------------------------------------

/**
 * Full lifecycle status of a meeting (US12.2.1) — widens {@link MeetingResponse.status}'s
 * creation-time-only `'DRAFT'` literal for every animation-aware view. `CONFIRMED` is not yet
 * producible by any endpoint (US12.4.1's future booking flow) but is a legal value the backend
 * `MeetingStatus` enum already accepts for `POST .../start` (see backend `MeetingStatus` JavaDoc).
 */
export type MeetingLifecycleStatus = 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'ENDED';

/** Animation status of a single agenda item within its meeting (US12.2.1). */
export type AgendaItemStatus = 'PENDING' | 'CURRENT' | 'DONE';

/** Agenda item shape carried within {@link MeetingLiveState} (US12.2.1 AC-07). */
export interface AgendaItemState {
  readonly id: string;
  readonly position: number;
  readonly title: string;
  readonly durationMinutes: number;
  readonly type: AgendaItemType;
  readonly facilitator: string | null;
  readonly itemStatus: AgendaItemStatus;
}

/**
 * Full animation state of a meeting (US12.2.1 AC-07) — returned by `GET .../live` and embedded in
 * the `MEETING_STARTED` STOMP event. Every timer field is server-computed; the UI never derives
 * `elapsedSeconds`/`remainingSeconds` from a client-side clock alone (AC-S4) — see
 * `useMeetingTimer` for how a component re-anchors a local per-second tick on the latest value.
 */
export interface MeetingLiveState {
  readonly meetingId: string;
  readonly status: MeetingLifecycleStatus;
  /** Absent (not even `null`) once the meeting has no current item — before start, or after end. */
  readonly currentIndex?: number;
  readonly totalItems: number;
  readonly currentAgendaItemId?: string;
  readonly elapsedSeconds: number;
  readonly remainingSeconds: number;
  readonly overtime: boolean;
  readonly overtimeSeconds: number;
  readonly agendaItems: AgendaItemState[];
}

/** Request body for `POST /api/collaboratif/meetings/{id}/actions` (US12.2.1 AC-08/AC-E4). */
export interface AddMeetingActionRequest {
  readonly label: string;
  readonly ownerUserId?: number;
  /** ISO-8601 date (`yyyy-MM-dd`); rejected server-side if strictly before today. */
  readonly dueDate?: string;
}

/** API/STOMP response shape for a captured meeting action (US12.2.1 AC-08). */
export interface MeetingActionResponse {
  readonly id: string;
  readonly meetingId: string;
  readonly agendaItemId?: string;
  readonly label: string;
  readonly ownerUserId?: number;
  readonly dueDate?: string;
  readonly status: string;
  readonly createdAt: string;
}

/** Discriminator values for every STOMP message on `/topic/collaboratif/meeting/{id}` (US12.2.1). */
export type MeetingEventType =
  | 'MEETING_STARTED'
  | 'TIMER_TICK'
  | 'AGENDA_ITEM_CHANGED'
  | 'MEETING_ENDED'
  | 'MEETING_ACTION_ADDED';

/** `MEETING_STARTED` broadcast (US12.2.1 AC-01) — carries the full live state. */
export interface MeetingStartedEvent {
  readonly type: 'MEETING_STARTED';
  readonly state: MeetingLiveState;
}

/**
 * `TIMER_TICK` broadcast (US12.2.1 AC-02/AC-04), sent once per second by the server — a
 * reconciliation signal, never the sole authority: the UI re-anchors its local per-second render
 * on the latest one received rather than treating a missed tick as an error (see
 * `useMeetingTimer`).
 */
export interface TimerTickEvent {
  readonly type: 'TIMER_TICK';
  readonly meetingId: string;
  readonly agendaItemId: string;
  readonly elapsedSeconds: number;
  readonly remainingSeconds: number;
  readonly overtimeSeconds: number;
}

/** `AGENDA_ITEM_CHANGED` broadcast (US12.2.1 AC-03/AC-05). */
export interface AgendaItemChangedEvent {
  readonly type: 'AGENDA_ITEM_CHANGED';
  readonly meetingId: string;
  readonly index: number;
  readonly total: number;
  readonly currentAgendaItemId: string;
}

/** `MEETING_ENDED` broadcast (US12.2.1 AC-06). */
export interface MeetingEndedEvent {
  readonly type: 'MEETING_ENDED';
  readonly meetingId: string;
}

/** `MEETING_ACTION_ADDED` broadcast (US12.2.1 AC-08). */
export interface MeetingActionAddedEvent {
  readonly type: 'MEETING_ACTION_ADDED';
  readonly action: MeetingActionResponse;
}

/** Union of every message shape received on `/topic/collaboratif/meeting/{id}` (US12.2.1). */
export type MeetingEvent =
  | MeetingStartedEvent
  | TimerTickEvent
  | AgendaItemChangedEvent
  | MeetingEndedEvent
  | MeetingActionAddedEvent;
