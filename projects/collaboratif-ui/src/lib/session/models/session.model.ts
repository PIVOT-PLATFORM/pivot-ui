/**
 * Domain models for the Module Session live feature (E19). Reconciled against the real backend
 * DTOs on `pivot-core` branch `feat/sprint22-session-infra-backend` (`fr.pivot.collaboratif.session`
 * and `.session.{poll,wordcloud}.dto`) — field names/shapes below are the verified contract, not
 * AC-spec guesses.
 *
 * KNOWN GAP (cross-repo, not resolvable from this side alone): `SessionController#getById`
 * (`GET /sessions/{id}`) always requires a `CollaboratifRequestPrincipal` (bearer token) — there
 * is no guest-accessible endpoint returning a session's `config` (poll question/options,
 * wordcloud limits, ...). An anonymous `ROLE_GUEST` participant who joins therefore has no REST
 * path to fetch session details today; `SessionApiService.getSession()` cannot be called from a
 * genuinely anonymous participant context. Needs a `pivot-core` follow-up (either a guest-token
 * variant of `getById`, or embedding the session in `JoinSessionResponse`) before the anonymous
 * participant view is functionally complete.
 */

/** The six interactive activity types a session can run (US19.1.1). */
export type SessionType = 'QUIZ' | 'POLL' | 'WORDCLOUD' | 'BRAINSTORM' | 'QA' | 'VOTE';

/** Session lifecycle status (US19.1.2) — strict state machine, see {@link SessionService}. */
export type SessionStatus = 'DRAFT' | 'LIVE' | 'PAUSED' | 'COMPLETED';

/** Opaque, type-dependent configuration payload — shape validated per {@link SessionType}. */
export type SessionConfig = Record<string, unknown>;

/** A live session, as returned by the create/detail endpoints (US19.1.1, `SessionResponse.java`). */
export interface SessionResponse {
  readonly id: string;
  readonly title: string;
  readonly type: SessionType;
  readonly status: SessionStatus;
  readonly joinCode: string;
  readonly config: SessionConfig;
  readonly teamId: number | null;
  readonly participantCount: number;
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

/**
 * Response of a successful join — authenticated or anonymous (US19.2.1, `JoinSessionResponse.java`).
 * No `sessionId` field on the backend DTO — derive it from {@link wsTopic}
 * (`/topic/collaboratif/session/{id}`, see `sessionIdFromTopic()`).
 */
export interface JoinSessionResponse {
  readonly participantId: string;
  /** The sealed guest token — present only for anonymous joins, `null` for authenticated ones. */
  readonly token: string | null;
  readonly wsTopic: string;
}

/**
 * Extracts the session id from a {@link JoinSessionResponse.wsTopic}
 * (`/topic/collaboratif/session/{id}`, `SessionDestinations.TOPIC_PREFIX` backend-side) — the
 * only field carrying it, since `JoinSessionResponse` itself has no `sessionId`.
 */
export function sessionIdFromTopic(wsTopic: string): string {
  return wsTopic.split('/').pop() ?? '';
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
// STOMP broadcast event payloads (US19.1.2 / US19.2.1 / US19.3.x) — every one carries a
// `sessionId`, mirroring the backend's per-event records (`SessionLifecycleEvent.java`,
// `SessionStartedEvent.java`, `PollUpdatedEvent.java`, `Word{Added,Removed}Event.java`).
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

/** `SESSION_STARTED` carries the full, started session (`SessionStartedEvent.java`). */
export interface SessionStartedEvent {
  readonly type: 'SESSION_STARTED';
  readonly session: SessionResponse;
}

/**
 * `SESSION_PAUSED`/`SESSION_RESUMED`/`SESSION_ENDED` carry only the session id
 * (`SessionLifecycleEvent.java`) — never a full session, unlike {@link SessionStartedEvent}.
 */
export interface SessionLifecycleEvent {
  readonly type: 'SESSION_PAUSED' | 'SESSION_RESUMED' | 'SESSION_ENDED';
  readonly sessionId: string;
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

/**
 * A single option's live tally (`PollOptionResult.java`). `count`/`percent` are absent
 * (`undefined` after `JSON.parse`) — never `null` — while the facilitator has hidden results;
 * `optionId`/`label` are always present.
 */
export interface PollOptionResult {
  readonly optionId: string;
  readonly label: string;
  readonly count?: number;
  readonly percent?: number;
}

/**
 * `results` is always an array (never `null`) — hidden results omit `count`/`percent` per entry,
 * they never omit the whole array (`PollUpdatedEvent.java`).
 */
export interface PollUpdatedEvent {
  readonly type: 'POLL_UPDATED';
  readonly sessionId: string;
  readonly results: PollOptionResult[];
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

/** `WordEntryDto.java`. */
export interface WordEntry {
  readonly word: string;
  readonly frequency: number;
}

/** The updated entry is nested under `entry`, not flattened (`WordAddedEvent.java`). */
export interface WordAddedEvent {
  readonly type: 'WORD_ADDED';
  readonly sessionId: string;
  readonly entry: WordEntry;
}

export interface WordRemovedEvent {
  readonly type: 'WORD_REMOVED';
  readonly sessionId: string;
  readonly word: string;
}

/** Union of every event shape that can arrive on a session's STOMP topic. */
export type SessionTopicEvent =
  | SessionStartedEvent
  | SessionLifecycleEvent
  | ParticipantJoinedEvent
  | PollUpdatedEvent
  | WordAddedEvent
  | WordRemovedEvent;
