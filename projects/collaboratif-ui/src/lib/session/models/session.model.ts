/**
 * Domain models for the Module Session live feature (E19). Mirrors the backend contract
 * described in the Gate 1 AC files (`pivot-docs` `EPIC-module-session`) — the backend branch
 * (`feat/sprint22-session-infra-backend`) was not pushed yet at authoring time, so these types
 * are built directly from the AC's precisely-specified fields/endpoints. A field-name
 * reconciliation pass against the real DTOs is recommended once that branch lands.
 */

/** The six interactive activity types a session can run (US19.1.1). */
export type SessionType = 'QUIZ' | 'POLL' | 'WORDCLOUD' | 'BRAINSTORM' | 'QA' | 'VOTE';

/** Session lifecycle status (US19.1.2) — strict state machine, see {@link SessionService}. */
export type SessionStatus = 'DRAFT' | 'LIVE' | 'PAUSED' | 'COMPLETED';

/** Opaque, type-dependent configuration payload — shape validated per {@link SessionType}. */
export type SessionConfig = Record<string, unknown>;

/** A live session, as returned by the create/detail endpoints (US19.1.1). */
export interface SessionResponse {
  readonly id: string;
  readonly title: string;
  readonly type: SessionType;
  readonly status: SessionStatus;
  readonly joinCode: string;
  readonly config: SessionConfig;
  readonly teamId: number | null;
  readonly participantCount: number;
  readonly createdBy: number;
  readonly createdAt: string;
  readonly startedAt: string | null;
  readonly endedAt: string | null;
}

/** A session summary row, as returned by the list endpoint (US19.1.1). */
export type SessionSummaryResponse = SessionResponse;

/** Request body for `POST /api/collaboratif/sessions` (US19.1.1). */
export interface CreateSessionRequest {
  readonly title: string;
  readonly type: SessionType;
  readonly config: SessionConfig;
  readonly teamId?: number;
}

/** Request body for `POST /api/collaboratif/sessions/join` (US19.2.1). */
export interface JoinSessionRequest {
  readonly code: string;
  readonly displayName: string;
}

/** Response of a successful join — authenticated or anonymous (US19.2.1). */
export interface JoinSessionResponse {
  readonly participantId: string;
  readonly token: string;
  readonly wsTopic: string;
  readonly sessionId: string;
}

/** Request body for the guest-only heartbeat (US19.2.1). */
export interface GuestHeartbeatRequest {
  readonly token: string;
}

/** Backend problem-detail error body, as used across PIVOT's REST error contract. */
export interface ProblemDetailResponse {
  readonly code?: string;
  readonly message?: string;
}

// ---------------------------------------------------------------------------------------------
// STOMP broadcast event payloads (US19.1.2 / US19.2.1 / US19.3.x)
// ---------------------------------------------------------------------------------------------

/** Discriminant carried by every event broadcast on `/topic/collaboratif/session/{id}`. */
export type SessionEventType =
  | 'SESSION_STARTED'
  | 'SESSION_PAUSED'
  | 'SESSION_RESUMED'
  | 'SESSION_ENDED'
  | 'PARTICIPANT_JOINED'
  | 'POLL_UPDATED'
  | 'WORD_ADDED'
  | 'WORD_REMOVED';

export interface SessionLifecycleEvent {
  readonly type: 'SESSION_STARTED' | 'SESSION_PAUSED' | 'SESSION_RESUMED' | 'SESSION_ENDED';
  readonly session: SessionResponse;
}

export interface ParticipantJoinedEvent {
  readonly type: 'PARTICIPANT_JOINED';
  readonly participantId: string;
  readonly displayName: string;
}

// ---------------------------------------------------------------------------------------------
// POLL activity (US19.3.2)
// ---------------------------------------------------------------------------------------------

export interface PollOption {
  readonly id: string;
  readonly label: string;
}

export interface PollConfig extends SessionConfig {
  readonly question: string;
  readonly options: PollOption[];
  readonly allowMultiple: boolean;
}

/** Request body for `POST .../sessions/{id}/poll/vote` (US19.3.2). */
export interface PollVoteRequest {
  readonly optionIds: string[];
}

/** A single option's live tally — omitted entirely from {@link PollUpdatedEvent} while hidden. */
export interface PollOptionResult {
  readonly optionId: string;
  readonly count: number;
  readonly percentage: number;
}

export interface PollUpdatedEvent {
  readonly type: 'POLL_UPDATED';
  /** `null` while the facilitator has hidden results (`hide-results`) — never guessable client-side. */
  readonly results: PollOptionResult[] | null;
}

// ---------------------------------------------------------------------------------------------
// WORDCLOUD activity (US19.3.3)
// ---------------------------------------------------------------------------------------------

export interface WordcloudConfig extends SessionConfig {
  readonly maxWordsPerParticipant: number;
  readonly blocklist: string[];
}

/** Request body for `POST .../sessions/{id}/wordcloud/words` (US19.3.3). */
export interface WordSubmitRequest {
  readonly word: string;
}

export interface WordEntry {
  readonly word: string;
  readonly frequency: number;
}

export interface WordAddedEvent {
  readonly type: 'WORD_ADDED';
  readonly word: string;
  readonly frequency: number;
}

export interface WordRemovedEvent {
  readonly type: 'WORD_REMOVED';
  readonly word: string;
}

/** Union of every event shape that can arrive on a session's STOMP topic. */
export type SessionTopicEvent =
  | SessionLifecycleEvent
  | ParticipantJoinedEvent
  | PollUpdatedEvent
  | WordAddedEvent
  | WordRemovedEvent;
