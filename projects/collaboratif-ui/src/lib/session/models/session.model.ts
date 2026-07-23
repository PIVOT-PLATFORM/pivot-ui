/**
 * Domain models for the Module Session live feature (E19). Reconciled against the real backend
 * DTOs on `pivot-core` branch `feat/sprint22-session-infra-backend` (`fr.pivot.collaboratif.session`
 * and `.session.{poll,wordcloud}.dto`) — field names/shapes below are the verified contract, not
 * AC-spec guesses.
 *
 * Two distinct session-detail shapes exist server-side, deliberately not unified: {@link
 * SessionResponse} (`SessionController#getById`, `GET /sessions/{id}`, bearer-only, used by the
 * facilitator-only {@link SessionRunnerComponent}-equivalent views) and {@link
 * ParticipantSessionResponse} (`SessionParticipantController#getState`,
 * `GET /sessions/{id}/state`, US19.2.2 — reachable by any caller, authenticated or anonymous
 * `ROLE_GUEST`, who has already joined that exact session). The participant shape deliberately
 * omits `joinCode`/`teamId`/`createdAt` — see that interface's own TSDoc.
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

/**
 * Participant-safe session-detail shape, as returned by the guest-accessible
 * `GET /sessions/{id}/state` (US19.2.2, `ParticipantSessionResponse.java`) — reachable by any
 * caller (authenticated or anonymous `ROLE_GUEST`) already joined to this exact session, used by
 * {@link SessionParticipantShellComponent} to load/reload state on join and on STOMP reconnect.
 *
 * Deliberately narrower than {@link SessionResponse}: no `joinCode` (not needed once already
 * joined), no `teamId`/`createdAt` (internal/facilitator-only bookkeeping). Never carries other
 * participants' identities or POLL vote tallies — those arrive exclusively over the session's WS
 * topic (`PollUpdatedEvent`), which already respects the facilitator's hide/show-results state.
 */
export interface ParticipantSessionResponse {
  readonly id: string;
  readonly title: string;
  readonly type: SessionType;
  readonly status: SessionStatus;
  readonly config: SessionConfig;
  readonly participantCount: number;
  readonly startedAt: string | null;
  readonly endedAt: string | null;
}

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
  | 'WORD_REMOVED'
  | 'QUESTION_ADDED'
  | 'QUESTION_UPVOTED'
  | 'QUESTION_ANSWERED'
  | 'CARD_ADDED'
  | 'CARD_UPDATED'
  | 'CARD_REMOVED'
  | 'VOTE_SUBMITTED'
  | 'VOTE_CLOSED'
  | 'QUESTION_STARTED'
  | 'QUESTION_ENDED'
  | 'QUIZ_ANSWERED';

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

// ---------------------------------------------------------------------------------------------
// Q&A activity (US19.3.5)
// ---------------------------------------------------------------------------------------------

/**
 * A single Q&A question (`QaQuestionDto.java`). `authorName` is `null` when the question was
 * submitted anonymously — the author's display name is withheld server-side, never sent over the
 * wire; the authoring participant id is never exposed at all.
 */
export interface QaQuestion {
  readonly id: string;
  readonly text: string;
  readonly authorName: string | null;
  readonly anonymous: boolean;
  readonly answered: boolean;
  readonly upvotes: number;
  readonly createdAt: string;
}

/** Request body for `POST .../sessions/{id}/qa/questions` (US19.3.5). */
export interface QuestionSubmitRequest {
  readonly text: string;
  readonly anonymous: boolean;
}

/** `QUESTION_ADDED` carries the full new question (`QuestionAddedEvent.java`). */
export interface QuestionAddedEvent {
  readonly type: 'QUESTION_ADDED';
  readonly sessionId: string;
  readonly question: QaQuestion;
}

/**
 * `QUESTION_UPVOTED` carries only the affected question id and its new tally
 * (`QuestionUpvotedEvent.java`) — clients update a single row and re-sort, no full refetch.
 */
export interface QuestionUpvotedEvent {
  readonly type: 'QUESTION_UPVOTED';
  readonly sessionId: string;
  readonly questionId: string;
  readonly upvotes: number;
}

/** `QUESTION_ANSWERED` carries the answered question id (`QuestionAnsweredEvent.java`). */
export interface QuestionAnsweredEvent {
  readonly type: 'QUESTION_ANSWERED';
  readonly sessionId: string;
  readonly questionId: string;
}

// ---------------------------------------------------------------------------------------------
// BRAINSTORM activity (US19.3.4)
// ---------------------------------------------------------------------------------------------

/** The five post-it colours (`BrainstormCardColor.java`). */
export type BrainstormCardColor = 'YELLOW' | 'PINK' | 'BLUE' | 'GREEN' | 'ORANGE';

/**
 * A single BRAINSTORM post-it (`BrainstormCardDto.java`). `authorParticipantId` is the
 * session-scoped participant id (never a user id) — the client compares it to its own participant
 * id to decide whether to offer edit/delete; the server enforces the same ownership rule.
 */
export interface BrainstormCard {
  readonly id: string;
  readonly text: string;
  readonly color: BrainstormCardColor;
  readonly category: string | null;
  readonly authorParticipantId: string;
  readonly createdAt: string;
}

/** Request body for adding/editing a card (`AddCardRequest`/`UpdateCardRequest`). */
export interface BrainstormCardRequest {
  readonly text: string;
  readonly color: BrainstormCardColor;
}

/** Request body for `POST .../brainstorm/cards/{cardId}/category` (facilitator). */
export interface CategorizeCardRequest {
  readonly category: string | null;
}

/** `CARD_ADDED` carries the full new card (`CardAddedEvent.java`). */
export interface CardAddedEvent {
  readonly type: 'CARD_ADDED';
  readonly sessionId: string;
  readonly card: BrainstormCard;
}

/** `CARD_UPDATED` carries the full updated card — author edit or facilitator re-categorization. */
export interface CardUpdatedEvent {
  readonly type: 'CARD_UPDATED';
  readonly sessionId: string;
  readonly card: BrainstormCard;
}

/** `CARD_REMOVED` carries the deleted card id (`CardRemovedEvent.java`). */
export interface CardRemovedEvent {
  readonly type: 'CARD_REMOVED';
  readonly sessionId: string;
  readonly cardId: string;
}

// ---------------------------------------------------------------------------------------------
// VOTE activity (US19.3.6)
// ---------------------------------------------------------------------------------------------

/** The supported structured-decision vote modes (`VoteType.java`). MATRIX is a later increment. */
export type VoteType = 'FIST_TO_FIVE' | 'WEIGHTED';

/** Type-dependent VOTE setup (`config`). */
export interface VoteConfig extends SessionConfig {
  readonly voteType?: VoteType;
  readonly proposal?: string;
  readonly options?: string[];
  readonly pointsPerParticipant?: number;
}

/** Request body for `POST .../vote/ballot` — the field used depends on the vote type. */
export interface SubmitBallotRequest {
  readonly value?: number;
  readonly allocations?: Record<string, number>;
}

/** A single WEIGHTED option's points total (`WeightedOptionResult.java`). */
export interface WeightedOptionResult {
  readonly optionIndex: number;
  readonly label: string;
  readonly points: number;
}

/**
 * VOTE results (`VoteResultsDto.java`). While `closed` is `false`, only `voteType`/`ballotCount`
 * are populated — every tally field stays `null`/empty so nothing leaks before the facilitator
 * closes the vote.
 */
export interface VoteResults {
  readonly voteType: VoteType;
  readonly closed: boolean;
  readonly ballotCount: number;
  readonly average: number | null;
  readonly consensusLevel: string | null;
  readonly veto: boolean;
  readonly options: WeightedOptionResult[];
}

/** `VOTE_SUBMITTED` carries only the running ballot count, never a value (`VoteSubmittedEvent.java`). */
export interface VoteSubmittedEvent {
  readonly type: 'VOTE_SUBMITTED';
  readonly sessionId: string;
  readonly ballotCount: number;
}

/** `VOTE_CLOSED` carries the revealed results (`VoteClosedEvent.java`). */
export interface VoteClosedEvent {
  readonly type: 'VOTE_CLOSED';
  readonly sessionId: string;
  readonly results: VoteResults;
}

// ---------------------------------------------------------------------------------------------
// QUIZ activity (US19.3.1)
// ---------------------------------------------------------------------------------------------

/** One leaderboard row (`LeaderboardEntry.java`) — `participantId` lets a client highlight its own. */
export interface LeaderboardEntry {
  readonly participantId: string;
  readonly displayName: string;
  readonly score: number;
}

/** Request body for `POST .../quiz/answer` (US19.3.1). */
export interface SubmitAnswerRequest {
  readonly questionIndex: number;
  readonly selectedIndices: number[];
}

/**
 * A reconnecting player's QUIZ snapshot (`QuizStateDto.java`) — current question (its correct
 * answer withheld until ended), own score, whether already answered; correct indices and
 * leaderboard only once the question has ended.
 */
export interface QuizState {
  readonly started: boolean;
  readonly currentQuestionIndex: number;
  readonly totalQuestions: number;
  readonly questionText: string | null;
  readonly options: string[];
  readonly durationSeconds: number | null;
  readonly questionStartedAt: string | null;
  readonly questionEnded: boolean;
  readonly hasAnswered: boolean;
  readonly myScore: number;
  readonly correctIndices: number[];
  readonly leaderboard: LeaderboardEntry[];
}

/** Final QUIZ results (`QuizResultsDto.java`). */
export interface QuizResults {
  readonly leaderboard: LeaderboardEntry[];
  readonly correctRatePerQuestion: number[];
}

/**
 * `QUESTION_STARTED` opens a question (`QuestionStartedEvent.java`) — carries the options but never
 * the correct answer, revealed only at `QUESTION_ENDED`.
 */
export interface QuestionStartedEvent {
  readonly type: 'QUESTION_STARTED';
  readonly sessionId: string;
  readonly questionIndex: number;
  readonly totalQuestions: number;
  readonly text: string;
  readonly options: string[];
  readonly durationSeconds: number;
}

/** `QUESTION_ENDED` reveals the correct indices + refreshed leaderboard (`QuestionEndedEvent.java`). */
export interface QuestionEndedEvent {
  readonly type: 'QUESTION_ENDED';
  readonly sessionId: string;
  readonly questionIndex: number;
  readonly correctIndices: number[];
  readonly leaderboard: LeaderboardEntry[];
}

/** `QUIZ_ANSWERED` carries only the running answer count (`QuizAnsweredEvent.java`). */
export interface QuizAnsweredEvent {
  readonly type: 'QUIZ_ANSWERED';
  readonly sessionId: string;
  readonly questionIndex: number;
  readonly answerCount: number;
}

/** Union of every event shape that can arrive on a session's STOMP topic. */
export type SessionTopicEvent =
  | SessionStartedEvent
  | SessionLifecycleEvent
  | ParticipantJoinedEvent
  | PollUpdatedEvent
  | WordAddedEvent
  | WordRemovedEvent
  | QuestionAddedEvent
  | QuestionUpvotedEvent
  | QuestionAnsweredEvent
  | CardAddedEvent
  | CardUpdatedEvent
  | CardRemovedEvent
  | VoteSubmittedEvent
  | VoteClosedEvent
  | QuestionStartedEvent
  | QuestionEndedEvent
  | QuizAnsweredEvent;
