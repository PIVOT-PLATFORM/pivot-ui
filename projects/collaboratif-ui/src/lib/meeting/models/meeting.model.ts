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

// ---------------------------------------------------------------------------
// Booking flow (US12.4.1) — pre-reservation from a roadmap event window +
// best-slot proposal + organizer confirmation.
// ---------------------------------------------------------------------------

/** Lifecycle status of a booking-flow meeting (US12.4.1), extending US12.1.1's `'DRAFT'`. */
export type MeetingBookingStatus = 'DRAFT' | 'PRE_RESERVED' | 'CONFIRMED';

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
  readonly status: MeetingBookingStatus;
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
