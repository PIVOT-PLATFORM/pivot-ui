import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AGILITE_API_URL } from '../../../core/config/tokens';
import {
  CreateStandupSessionRequest,
  ExtendTimerRequest,
  ReorderParticipantsRequest,
  StandupSessionResponse,
  StandupSessionStatus,
  StandupStatsResponse,
  TeamMemberResponse,
  TeamResponse,
} from '../models/standup.model';

/**
 * HTTP client for the daily standup feature's backend (`pivot-agilite-core`,
 * `${environment.apiUrl}/standup`).
 *
 * No `Authorization` header is attached here: bearer token attachment is delegated to
 * `@pivot/ui-core`'s `AuthInterceptor` once that package is consumable (EN17.3), same as
 * `WheelApiService`. `tenantId`/`userId` are never sent by this service; the backend resolves
 * them exclusively from the bearer token.
 */
@Injectable({ providedIn: 'root' })
export class StandupApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(AGILITE_API_URL);

  /**
   * Lists the caller's own teams. Same endpoint as `WheelApiService#listTeams`.
   *
   * @returns the teams the caller belongs to
   */
  listTeams(): Observable<TeamResponse[]> {
    return this.http.get<TeamResponse[]>(`${this.baseUrl}/teams`);
  }

  /**
   * Lists the members of a team the caller belongs to. Same endpoint as
   * `WheelApiService#listTeamMembers`.
   *
   * @param teamId the team's identifier
   * @returns the team's members
   */
  listTeamMembers(teamId: number): Observable<TeamMemberResponse[]> {
    return this.http.get<TeamMemberResponse[]>(`${this.baseUrl}/teams/${teamId}/members`);
  }

  /**
   * Creates a new standup session with its participants (US10.1.1).
   *
   * @param request the session to create
   * @returns the created session, `status: 'PENDING'`
   */
  createSession(request: CreateStandupSessionRequest): Observable<StandupSessionResponse> {
    return this.http.post<StandupSessionResponse>(`${this.baseUrl}/standup/sessions`, request);
  }

  /**
   * Lists sessions accessible to the caller, optionally filtered by team and/or status.
   *
   * @param teamId an explicit team to scope the listing to, or `undefined` for every team
   * @param status an explicit status filter, or `undefined`
   * @returns the matching sessions, `createdAt` descending
   */
  listSessions(teamId?: number, status?: StandupSessionStatus): Observable<StandupSessionResponse[]> {
    let params = new HttpParams();
    if (teamId !== undefined) {
      params = params.set('teamId', teamId);
    }
    if (status !== undefined) {
      params = params.set('status', status);
    }
    return this.http.get<StandupSessionResponse[]>(`${this.baseUrl}/standup/sessions`, { params });
  }

  /**
   * Fetches a single session by id.
   *
   * @param sessionId the session's identifier
   * @returns the session, with its participants
   */
  getSession(sessionId: string): Observable<StandupSessionResponse> {
    return this.http.get<StandupSessionResponse>(`${this.baseUrl}/standup/sessions/${sessionId}`);
  }

  /**
   * Permanently deletes a `PENDING` or `DONE` session and its participants.
   *
   * @param sessionId the session's identifier
   */
  deleteSession(sessionId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/standup/sessions/${sessionId}`);
  }

  /**
   * Starts a `PENDING` session (US10.1.2).
   *
   * @param sessionId the session's identifier
   * @returns the started session
   */
  start(sessionId: string): Observable<StandupSessionResponse> {
    return this.http.post<StandupSessionResponse>(`${this.baseUrl}/standup/sessions/${sessionId}/start`, {});
  }

  /**
   * Rotates the speaking turn to the next `WAITING` participant, or ends the session
   * (US10.1.2). Idempotent — a redundant call after the rotation already happened returns the
   * current state rather than erroring.
   *
   * @param sessionId the session's identifier
   * @returns the session's current state after the rotation (or idempotent no-op)
   */
  next(sessionId: string): Observable<StandupSessionResponse> {
    return this.http.post<StandupSessionResponse>(`${this.baseUrl}/standup/sessions/${sessionId}/next`, {});
  }

  /**
   * Skips the current speaker (US10.2.2).
   *
   * @param sessionId the session's identifier
   * @returns the session's current state after the skip (or idempotent no-op)
   */
  skip(sessionId: string): Observable<StandupSessionResponse> {
    return this.http.post<StandupSessionResponse>(`${this.baseUrl}/standup/sessions/${sessionId}/skip`, {});
  }

  /**
   * Ends a `RUNNING` session early (US10.1.2).
   *
   * @param sessionId the session's identifier
   * @returns the ended session
   */
  end(sessionId: string): Observable<StandupSessionResponse> {
    return this.http.post<StandupSessionResponse>(`${this.baseUrl}/standup/sessions/${sessionId}/end`, {});
  }

  /**
   * Extends the current speaker's time (US10.2.2).
   *
   * @param sessionId the session's identifier
   * @param seconds   `30` or `60`
   * @returns the session's current state after the extension
   */
  extend(sessionId: string, seconds: 30 | 60): Observable<StandupSessionResponse> {
    const request: ExtendTimerRequest = { seconds };
    return this.http.post<StandupSessionResponse>(`${this.baseUrl}/standup/sessions/${sessionId}/extend`, request);
  }

  /**
   * Reorders the still-`WAITING` tail of the speaking queue (US10.2.2).
   *
   * @param sessionId      the session's identifier
   * @param participantIds the new order for the `WAITING` participants — must exactly match the
   *                       currently `WAITING` set
   * @returns the session's current state after the reorder
   */
  reorder(sessionId: string, participantIds: string[]): Observable<StandupSessionResponse> {
    const request: ReorderParticipantsRequest = { participantIds };
    return this.http.put<StandupSessionResponse>(
      `${this.baseUrl}/standup/sessions/${sessionId}/participants/reorder`,
      request,
    );
  }

  /**
   * Fetches a team's completed-session and per-participant speaking statistics over a period
   * (US10.3.1).
   *
   * @param teamId the team's identifier
   * @param from   inclusive lower bound (`YYYY-MM-DD`), omitted defaults to `to - 30 days`
   * @param to     inclusive upper bound (`YYYY-MM-DD`), omitted defaults to today
   * @returns the team's stats for the resolved period
   */
  getStats(teamId: number, from?: string, to?: string): Observable<StandupStatsResponse> {
    let params = new HttpParams().set('teamId', teamId);
    if (from !== undefined) {
      params = params.set('from', from);
    }
    if (to !== undefined) {
      params = params.set('to', to);
    }
    return this.http.get<StandupStatsResponse>(`${this.baseUrl}/standup/stats`, { params });
  }
}
