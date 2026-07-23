import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import {
  CreateSessionRequest,
  GuestHeartbeatRequest,
  BrainstormCard,
  BrainstormCardRequest,
  CategorizeCardRequest,
  SubmitBallotRequest,
  VoteResults,
  QuizResults,
  QuizState,
  SubmitAnswerRequest,
  JoinSessionRequest,
  JoinSessionResponse,
  ParticipantSessionResponse,
  PollVoteRequest,
  QaQuestion,
  QuestionSubmitRequest,
  SessionResponse,
  SessionSummaryResponse,
  WordEntry,
  WordSubmitRequest,
} from '../models/session.model';

/** Native header carrying a Module Session guest token, mirroring `SessionWsService`'s own constant. */
const GUEST_TOKEN_HEADER = 'X-Guest-Token';

/** Query filters for `GET /api/collaboratif/sessions` (US19.1.1). */
export interface SessionListQuery {
  readonly teamId?: number;
  readonly status?: string;
}

/**
 * HTTP client for the Module Session live resource (E19). Tenant isolation is handled
 * server-side — no `tenantId`/`userId` ever sent from Angular.
 */
@Injectable({ providedIn: 'root' })
export class SessionApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(COLLABORATIF_API_URL);

  /** Creates a new session (US19.1.1) — facilitator only, requires authentication. */
  createSession(request: CreateSessionRequest): Observable<SessionResponse> {
    return this.http.post<SessionResponse>(`${this.apiUrl}/sessions`, request);
  }

  /** Lists sessions accessible to the current user (US19.1.1). */
  listSessions(query: SessionListQuery = {}): Observable<SessionSummaryResponse[]> {
    const params: Record<string, string> = {};
    if (query.teamId !== undefined) {
      params['teamId'] = String(query.teamId);
    }
    if (query.status) {
      params['status'] = query.status;
    }
    return this.http.get<SessionSummaryResponse[]>(`${this.apiUrl}/sessions`, { params });
  }

  /**
   * Fetches a single session by id (US19.1.1) — facilitator-oriented, requires a bearer token
   * (`CollaboratifRequestPrincipal` server-side). Used by the facilitator's session-runner view;
   * an anonymous `ROLE_GUEST` participant must use {@link getParticipantSessionState} instead.
   */
  getSession(sessionId: string): Observable<SessionResponse> {
    return this.http.get<SessionResponse>(`${this.apiUrl}/sessions/${sessionId}`);
  }

  /**
   * Fetches the participant-safe view of a session's current state (US19.2.2) — reachable by any
   * caller already joined to this exact session, authenticated or anonymous `ROLE_GUEST` alike.
   * Used by {@link SessionParticipantShellComponent} to load state on join and reload it on every
   * STOMP reconnect. Same dual-credential shape as the backend's `SessionCallerResolver`: the
   * caller's bearer token, if any, is attached ambiently by the shell's HTTP interceptor; an
   * anonymous guest instead passes the sealed token received from {@link joinSession} explicitly,
   * carried here as an `X-Guest-Token` header (never both) — the same header {@link
   * SessionWsService} already sends on STOMP `CONNECT` for the same guest.
   *
   * @param sessionId  the session's id
   * @param guestToken the sealed guest token from the join response, for an anonymous
   *   `ROLE_GUEST` participant — omit (or pass `null`) for an authenticated caller.
   */
  getParticipantSessionState(
    sessionId: string,
    guestToken: string | null = null,
  ): Observable<ParticipantSessionResponse> {
    const headers = guestToken ? new HttpHeaders({ [GUEST_TOKEN_HEADER]: guestToken }) : undefined;
    return this.http.get<ParticipantSessionResponse>(
      `${this.apiUrl}/sessions/${sessionId}/state`,
      headers ? { headers } : {},
    );
  }

  /** Starts a `DRAFT` session (US19.1.2) — creator or `ROLE_ADMIN` only. */
  startSession(sessionId: string): Observable<SessionResponse> {
    return this.http.post<SessionResponse>(`${this.apiUrl}/sessions/${sessionId}/start`, {});
  }

  /** Pauses a `LIVE` session (US19.1.2). */
  pauseSession(sessionId: string): Observable<SessionResponse> {
    return this.http.post<SessionResponse>(`${this.apiUrl}/sessions/${sessionId}/pause`, {});
  }

  /** Resumes a `PAUSED` session (US19.1.2). */
  resumeSession(sessionId: string): Observable<SessionResponse> {
    return this.http.post<SessionResponse>(`${this.apiUrl}/sessions/${sessionId}/resume`, {});
  }

  /** Ends a `LIVE`/`PAUSED` session — results are frozen from this point on (US19.1.2). */
  endSession(sessionId: string): Observable<SessionResponse> {
    return this.http.post<SessionResponse>(`${this.apiUrl}/sessions/${sessionId}/end`, {});
  }

  /**
   * Joins a session by its short code, authenticated or anonymous (US19.2.1). The caller's
   * bearer token, if any, is attached by the shell's existing HTTP interceptor — this method
   * never inspects or forwards it explicitly, so the same call transparently yields an
   * authenticated or a `ROLE_GUEST` participant depending on ambient auth state.
   */
  joinSession(request: JoinSessionRequest): Observable<JoinSessionResponse> {
    return this.http.post<JoinSessionResponse>(`${this.apiUrl}/sessions/join`, request);
  }

  /** Refreshes a guest participant's presence TTL (US19.2.1) — no-op contract for authenticated participants. */
  guestHeartbeat(
    sessionId: string,
    participantId: string,
    request: GuestHeartbeatRequest,
  ): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/sessions/${sessionId}/participants/${participantId}/heartbeat`,
      request,
    );
  }

  // -----------------------------------------------------------------------------------------
  // POLL activity (US19.3.2)
  // -----------------------------------------------------------------------------------------

  /** Casts (or replaces) the caller's vote on the session's active POLL (US19.3.2). */
  submitPollVote(sessionId: string, request: PollVoteRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/sessions/${sessionId}/poll/vote`, request);
  }

  /** Hides live results from participants (facilitator only, US19.3.2). */
  hidePollResults(sessionId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/sessions/${sessionId}/poll/hide-results`, {});
  }

  /** Restores live results to participants (facilitator only, US19.3.2). */
  showPollResults(sessionId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/sessions/${sessionId}/poll/show-results`, {});
  }

  // -----------------------------------------------------------------------------------------
  // WORDCLOUD activity (US19.3.3)
  // -----------------------------------------------------------------------------------------

  /** Submits a word to the session's WORDCLOUD (US19.3.3) — normalized/aggregated server-side. */
  submitWord(sessionId: string, request: WordSubmitRequest): Observable<WordEntry> {
    return this.http.post<WordEntry>(`${this.apiUrl}/sessions/${sessionId}/wordcloud/words`, request);
  }

  /** Removes a word entirely from the WORDCLOUD (facilitator only, US19.3.3). */
  removeWord(sessionId: string, word: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/sessions/${sessionId}/wordcloud/words/${encodeURIComponent(word)}`,
    );
  }

  // -----------------------------------------------------------------------------------------
  // Q&A activity (US19.3.5)
  // -----------------------------------------------------------------------------------------

  /**
   * Lists a session's Q&A questions, most-upvoted first (US19.3.5) — participant-accessible, used
   * to hydrate the participant view on join. Server-sorted; the client re-sorts on every live
   * `QUESTION_UPVOTED`/`QUESTION_ADDED` broadcast.
   */
  listQaQuestions(sessionId: string): Observable<QaQuestion[]> {
    return this.http.get<QaQuestion[]>(`${this.apiUrl}/sessions/${sessionId}/qa/questions`);
  }

  /** Submits a question to the session's Q&A (US19.3.5) — optionally anonymous. */
  submitQaQuestion(sessionId: string, request: QuestionSubmitRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/sessions/${sessionId}/qa/questions`, request);
  }

  /** Upvotes a question (US19.3.5) — one upvote per participant, a repeat is a 409 server-side. */
  upvoteQaQuestion(sessionId: string, questionId: string): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/sessions/${sessionId}/qa/questions/${questionId}/upvote`,
      {},
    );
  }

  /** Marks a question as answered (facilitator only, US19.3.5). */
  markQaQuestionAnswered(sessionId: string, questionId: string): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/sessions/${sessionId}/qa/questions/${questionId}/answered`,
      {},
    );
  }

  // -----------------------------------------------------------------------------------------
  // BRAINSTORM activity (US19.3.4)
  // -----------------------------------------------------------------------------------------

  /** Lists a session's BRAINSTORM cards (US19.3.4) — participant-accessible, hydrates the view. */
  listBrainstormCards(sessionId: string): Observable<BrainstormCard[]> {
    return this.http.get<BrainstormCard[]>(`${this.apiUrl}/sessions/${sessionId}/brainstorm/cards`);
  }

  /** Adds a post-it (US19.3.4). */
  addBrainstormCard(sessionId: string, request: BrainstormCardRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/sessions/${sessionId}/brainstorm/cards`, request);
  }

  /** Edits one of the caller's own post-its (US19.3.4) — a non-author edit is a 403 server-side. */
  updateBrainstormCard(
    sessionId: string,
    cardId: string,
    request: BrainstormCardRequest,
  ): Observable<void> {
    return this.http.patch<void>(
      `${this.apiUrl}/sessions/${sessionId}/brainstorm/cards/${cardId}`,
      request,
    );
  }

  /** Deletes one of the caller's own post-its (US19.3.4) — a non-author delete is a 403. */
  deleteBrainstormCard(sessionId: string, cardId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/sessions/${sessionId}/brainstorm/cards/${cardId}`,
    );
  }

  /** Groups a card under a category (facilitator only, US19.3.4). */
  categorizeBrainstormCard(
    sessionId: string,
    cardId: string,
    request: CategorizeCardRequest,
  ): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/sessions/${sessionId}/brainstorm/cards/${cardId}/category`,
      request,
    );
  }

  // -----------------------------------------------------------------------------------------
  // VOTE activity (US19.3.6)
  // -----------------------------------------------------------------------------------------

  /** Casts the caller's ballot (US19.3.6) — one per participant, a second is a 409 server-side. */
  submitVoteBallot(sessionId: string, request: SubmitBallotRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/sessions/${sessionId}/vote/ballot`, request);
  }

  /** Closes the vote and reveals results (facilitator only, US19.3.6). */
  closeVote(sessionId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/sessions/${sessionId}/vote/close`, {});
  }

  /** Fetches the current vote results (US19.3.6) — tally-less until the facilitator closes it. */
  getVoteResults(sessionId: string): Observable<VoteResults> {
    return this.http.get<VoteResults>(`${this.apiUrl}/sessions/${sessionId}/vote/results`);
  }

  // -----------------------------------------------------------------------------------------
  // QUIZ activity (US19.3.1)
  // -----------------------------------------------------------------------------------------

  /** Opens the next question (facilitator only, US19.3.1). */
  quizNext(sessionId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/sessions/${sessionId}/quiz/next`, {});
  }

  /** Ends the current question, revealing the answer + leaderboard (facilitator only, US19.3.1). */
  quizEnd(sessionId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/sessions/${sessionId}/quiz/end`, {});
  }

  /** Submits the caller's answer to the live question (US19.3.1) — one per question. */
  submitQuizAnswer(sessionId: string, request: SubmitAnswerRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/sessions/${sessionId}/quiz/answer`, request);
  }

  /** Fetches the caller's reconnect snapshot (US19.3.1) — current question, own score, answered. */
  getQuizState(sessionId: string): Observable<QuizState> {
    return this.http.get<QuizState>(`${this.apiUrl}/sessions/${sessionId}/quiz/state`);
  }

  /** Fetches the final quiz results — ranking + per-question correct-rate (US19.3.1). */
  getQuizResults(sessionId: string): Observable<QuizResults> {
    return this.http.get<QuizResults>(`${this.apiUrl}/sessions/${sessionId}/quiz/results`);
  }
}
