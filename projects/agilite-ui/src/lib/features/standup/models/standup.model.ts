/**
 * Wire types for the daily standup feature's backend contract (`pivot-agilite-core`,
 * `${environment.apiUrl}` = `/api/agilite/standup`). Mirrors `fr.pivot.agilite.standup.dto`
 * exactly (field-for-field) — see the Gate 1 AC files (US10.1.1/US10.1.2/US10.2.1/US10.2.2/
 * US10.3.1, `pivot-docs/docs/backlog/EPIC-daily-standup/`) for the full contract.
 */

/** Lifecycle status of a standup session (US10.1.1/US10.1.2). */
export type StandupSessionStatus = 'PENDING' | 'RUNNING' | 'DONE';

/** Turn-taking status of a single participant (US10.1.1/US10.1.2/US10.2.2). */
export type StandupParticipantStatus = 'WAITING' | 'SPEAKING' | 'DONE' | 'SKIPPED';

/** A team the caller belongs to (same shape as the wheel feature's `TeamResponse`). */
export interface TeamResponse {
  readonly id: number;
  readonly name: string;
}

/** A member of a team, resolved server-side to a display name. */
export interface TeamMemberResponse {
  readonly id: number;
  readonly userId: number;
  readonly displayName: string;
}

/** A single participant of a standup session, as returned by the backend. */
export interface StandupParticipantResponse {
  readonly id: string;
  readonly teamMemberId: number;
  readonly name: string;
  readonly order: number;
  readonly status: StandupParticipantStatus;
  readonly speakingAt: string | null;
  readonly doneSpeaking: string | null;
  readonly extraSeconds: number;
}

/** A standup session and its participants, as returned by the backend. */
export interface StandupSessionResponse {
  readonly id: string;
  readonly teamId: number;
  readonly tenantId: number;
  readonly name: string;
  readonly status: StandupSessionStatus;
  readonly currentIndex: number;
  readonly timePerPersonSeconds: number;
  readonly participants: StandupParticipantResponse[];
  readonly startedAt: string | null;
  readonly endedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Payload to create a new standup session (US10.1.1). `participantTeamMemberIds` order is the
 * exact speaking rotation order — the server never randomizes it. `timePerPersonSeconds` omitted
 * defaults to 120s server-side; when provided must be within [30, 1800].
 */
export interface CreateStandupSessionRequest {
  teamId: number;
  name: string;
  timePerPersonSeconds?: number;
  participantTeamMemberIds: number[];
}

/** Payload for `POST .../extend` (US10.2.2) — `seconds` must be exactly `30` or `60`. */
export interface ExtendTimerRequest {
  seconds: 30 | 60;
}

/**
 * Payload for `PUT .../participants/reorder` (US10.2.2) — must be exactly the set of currently
 * `WAITING` participant ids, in the new order (may be empty if none are `WAITING`).
 */
export interface ReorderParticipantsRequest {
  participantIds: string[];
}

/** A single completed session's stats entry (US10.3.1). */
export interface StandupSessionStatsEntry {
  readonly id: string;
  readonly name: string;
  readonly startedAt: string;
  readonly durationSeconds: number;
}

/**
 * A single participant's aggregated speaking stats over a stats period (US10.3.1). `SKIPPED`
 * turns always contribute `0` to `totalSpeakingSeconds`.
 */
export interface StandupParticipantStatsEntry {
  readonly name: string;
  readonly sessionCount: number;
  readonly totalSpeakingSeconds: number;
}

/** Response payload for `GET .../stats` (US10.3.1). */
export interface StandupStatsResponse {
  readonly sessions: StandupSessionStatsEntry[];
  readonly participants: StandupParticipantStatsEntry[];
}

/** RFC 7807 error body returned by every `pivot-agilite-core` error response. */
export interface ProblemDetail {
  readonly title?: string;
  readonly status?: number;
  readonly detail?: string;
  readonly code?: string;
}

/**
 * Discriminated union of every event broadcast on a standup session's STOMP topic
 * (`/topic/agilite/standup/{sessionId}`) — mirrors backend `fr.pivot.agilite.standup.dto`'s
 * six event records exactly. Switch on {@link StandupTopicEvent.type} to narrow.
 */
export type StandupTopicEvent =
  | SessionStartedEvent
  | ParticipantChangedEvent
  | SessionEndedEvent
  | ParticipantSkippedEvent
  | TimerExtendedEvent
  | ParticipantsReorderedEvent;

/** `SESSION_STARTED` — fired once, right after an animator starts a `PENDING` session. */
export interface SessionStartedEvent {
  readonly type: 'SESSION_STARTED';
  readonly session: StandupSessionResponse;
}

/** `PARTICIPANT_CHANGED` — the speaking turn rotated to a new participant (or none, session end pending). */
export interface ParticipantChangedEvent {
  readonly type: 'PARTICIPANT_CHANGED';
  readonly sessionId: string;
  readonly currentParticipant: StandupParticipantResponse | null;
}

/** `SESSION_ENDED` — the session reached its terminal `DONE` status. */
export interface SessionEndedEvent {
  readonly type: 'SESSION_ENDED';
  readonly sessionId: string;
  readonly durationSeconds: number;
  readonly participantCount: number;
}

/** `PARTICIPANT_SKIPPED` — same payload shape as {@link ParticipantChangedEvent}, distinct type. */
export interface ParticipantSkippedEvent {
  readonly type: 'PARTICIPANT_SKIPPED';
  readonly sessionId: string;
  readonly currentParticipant: StandupParticipantResponse | null;
}

/** `TIMER_EXTENDED` — the current speaker's time was extended; recompute the visual timer. */
export interface TimerExtendedEvent {
  readonly type: 'TIMER_EXTENDED';
  readonly sessionId: string;
  readonly participantId: string;
  readonly extraSeconds: number;
}

/** `PARTICIPANTS_REORDERED` — the `WAITING` tail of the queue was reordered. */
export interface ParticipantsReorderedEvent {
  readonly type: 'PARTICIPANTS_REORDERED';
  readonly sessionId: string;
  readonly participants: StandupParticipantResponse[];
}
