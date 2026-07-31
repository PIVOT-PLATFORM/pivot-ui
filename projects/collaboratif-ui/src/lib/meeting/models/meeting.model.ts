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
 * Full lifecycle status of a meeting (US12.2.1, extended by US12.4.1's booking flow) — widens
 * {@link MeetingResponse.status}'s creation-time-only `'DRAFT'` literal for every animation-aware
 * view. `PRE_RESERVED` is a booking-flow-only status (a manually-created meeting never reaches
 * it); `CONFIRMED` is reachable from either flow — see backend `MeetingStatus` JavaDoc.
 */
export type MeetingLifecycleStatus = 'DRAFT' | 'PRE_RESERVED' | 'CONFIRMED' | 'IN_PROGRESS' | 'ENDED';

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

/** `MEETING_REPORT_READY` broadcast (US12.3.1 AC nominal) — sent once, at closure. Deliberately
 *  minimal (no report content on the bus, AC Security); a subscriber refetches via
 *  `MeetingReportService.getReport`. */
export interface MeetingReportReadyEvent {
  readonly type: 'MEETING_REPORT_READY';
  readonly meetingId: string;
  readonly generatedAt: string;
  readonly draft: boolean;
}

/** `MEETING_REPORT_SHARED` broadcast (US12.3.1 AC7/AC8) — sent every time the organizer triggers
 *  `POST .../report/share`, distinct from the automatic once-only `MEETING_REPORT_READY`. */
export interface MeetingReportSharedEvent {
  readonly type: 'MEETING_REPORT_SHARED';
  readonly meetingId: string;
  readonly sharedBy: number;
  readonly sharedAt: string;
}

/** Union of every message shape received on `/topic/collaboratif/meeting/{id}` (US12.2.1/US12.3.1). */
export type MeetingEvent =
  | MeetingStartedEvent
  | TimerTickEvent
  | AgendaItemChangedEvent
  | MeetingEndedEvent
  | MeetingActionAddedEvent
  | MeetingReportReadyEvent
  | MeetingReportSharedEvent;

// ---------------------------------------------------------------------------------------------
// Compte-rendu (US12.3.1)
// ---------------------------------------------------------------------------------------------

/** A participant present at the meeting (US12.3.1 AC nominal) — see backend `MeetingReportDto`'s
 *  own doc for the "no dedicated attendance log" interpretation this is derived from. */
export interface ParticipantReport {
  readonly userId: number;
  readonly organizer: boolean;
}

/** One agenda point's report line (US12.3.1 AC nominal). */
export interface AgendaItemReport {
  readonly id: string;
  readonly title: string;
  readonly plannedDurationMinutes: number;
  /** Absent while the item is still `PENDING`. */
  readonly actualDurationSeconds?: number;
  readonly overtime: boolean;
}

/** One recorded decision (US12.3.1 AC nominal). */
export interface DecisionReport {
  readonly id: string;
  readonly label: string;
  readonly decidedAt: string;
}

/** One captured action (US12.3.1 AC nominal). */
export interface ActionReport {
  readonly id: string;
  readonly label: string;
  readonly ownerUserId?: number;
  /** ISO-8601 date (`yyyy-MM-dd`), or absent if unassigned/no due date. */
  readonly dueDate?: string;
}

/**
 * Full compte-rendu shape (US12.3.1) — returned by `GET .../report` and
 * `GET .../report/export?format=json`. `draft=true` for a live, not-yet-closed meeting
 * (derived on every read, never persisted); `draft=false` for the frozen snapshot written once,
 * at closure — immutable from that point on even if a decision/action is edited afterward
 * (US12.3.2).
 */
export interface MeetingReport {
  readonly meetingId: string;
  readonly title: string;
  readonly status: MeetingLifecycleStatus;
  readonly draft: boolean;
  readonly participants: ParticipantReport[];
  readonly agendaItems: AgendaItemReport[];
  readonly decisions: DecisionReport[];
  readonly actions: ActionReport[];
  /** Absent until the meeting has started. */
  readonly actualDurationSeconds?: number;
  readonly generatedAt: string;
}

/** Supported `GET .../report/export` formats (US12.3.1 AC nominal / AC error case). */
export type MeetingReportExportFormat = 'json' | 'markdown';

// ---------------------------------------------------------------------------
// Booking flow (US12.4.1) — pre-reservation from a roadmap event window +
// best-slot proposal + organizer confirmation.
// ---------------------------------------------------------------------------

/** A single ranked candidate slot (US12.4.1 "Meilleur créneau"). */
export interface ProposedSlotResponse {
  readonly id: string;
  /** ISO-8601 date/time string. */
  readonly start: string;
  /** ISO-8601 date/time string. */
  readonly end: string;
  /** 1-based rank; `1` is the recommended slot. */
  readonly rank: number;
  readonly hasConflict: boolean;
  readonly conflictReason: string | null;
  /** `true` only for the `rank === 1` candidate — pre-selected by default in the validation UI. */
  readonly recommended: boolean;
}

/**
 * API response shape for a booking-flow meeting's state + proposed slots (US12.4.1) — returned by
 * `GET .../meetings/{id}`, `POST .../meetings/{id}/confirm` and `PATCH .../meetings/{id}/slot`,
 * and pushed on `/topic/collaboratif/meeting/{id}`.
 */
export interface MeetingBookingResponse {
  readonly id: string;
  readonly status: MeetingLifecycleStatus;
  readonly title: string;
  /** ISO-8601 date/time string. */
  readonly scheduledAt: string;
  readonly totalDurationMinutes: number;
  /** ISO-8601 date/time string, or `null` for a manually-created (non-booking-flow) meeting. */
  readonly bookingWindowStart: string | null;
  /** ISO-8601 date/time string, or `null` for a manually-created (non-booking-flow) meeting. */
  readonly bookingWindowEnd: string | null;
  readonly eventRef: string | null;
  readonly projectRef: string | null;
  /** `true` when a `window.updated`/`window.deleted` arrived while already `CONFIRMED`. */
  readonly rescheduleRequested: boolean;
  /** Ranked candidates, rank ascending (possibly empty). */
  readonly proposedSlots: ProposedSlotResponse[];
}

/** Request body for `POST /api/collaboratif/meetings/{id}/confirm` (US12.4.1). */
export interface ConfirmSlotRequest {
  readonly slotId: string;
}

/** Request body for `PATCH /api/collaboratif/meetings/{id}/slot` (US12.4.1). */
export interface AdjustSlotRequest {
  readonly slotId: string;
  /** ISO-8601 date/time string. */
  readonly start: string;
  /** ISO-8601 date/time string. */
  readonly end: string;
}
