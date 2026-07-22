import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AGILITE_API_URL } from '../../../core/config/tokens';
import {
  CapacityBurndownResponse,
  CapacityEventMemberResponse,
  CapacityEventResponse,
  CapacityEventSummary,
  CapacityEventSummaryResponse,
  CapacityEventType,
  CapacitySummaryResponse,
  CapacityVelocityAverageResponse,
  CapacityVelocityHistoryEntry,
  CreateCapacityAbsenceRequest,
  CreateCapacityEventRequest,
  TeamResponse,
  UpdateCapacityEventMemberRequest,
  UpdateCapacityEventRequest,
  UpdateCapacityVelocityRequest,
  UpsertBurndownEntryRequest,
} from '../models/capacity.model';

/**
 * HTTP client for the Capacity Planning v1 feature's backend (`pivot-agilite-core`,
 * `${environment.apiUrl}/capacity`) — F11.1→F11.4 (US11.1.1, US11.1.2, US11.2.1, US11.2.2,
 * US11.3.1, US11.4.1, US11.4.2). The full calculation engine (F11.6) is Sprint 21 — every summary
 * figure returned by this service is explicitly provisional, see `CapacitySummaryResponse`.
 *
 * No `Authorization` header is attached here: bearer token attachment is delegated to
 * `@pivot/ui-core`'s `AuthInterceptor`, same as `StandupApiService`/`PiCycleApiService`.
 * `tenantId`/`userId` are never sent by this service; the backend resolves them exclusively from
 * the bearer token.
 */
@Injectable({ providedIn: 'root' })
export class CapacityApiService {
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
   * Creates a new capacity event (US11.1.1). Non-`PI_PLANNING` types auto-seed their member list
   * from the team's current roster server-side.
   *
   * @param request the event to create
   * @returns the created event
   */
  createEvent(request: CreateCapacityEventRequest): Observable<CapacityEventResponse> {
    return this.http.post<CapacityEventResponse>(`${this.baseUrl}/capacity/events`, request);
  }

  /**
   * Lists events accessible to the caller, optionally filtered by team and/or type.
   *
   * @param teamId an explicit team to scope the listing to, or `undefined` for every team
   * @param type   an explicit type filter, or `undefined`
   * @returns the matching events, `startDate` descending
   */
  listEvents(teamId?: number, type?: CapacityEventType): Observable<CapacityEventSummaryResponse[]> {
    let params = new HttpParams();
    if (teamId !== undefined) {
      params = params.set('teamId', teamId);
    }
    if (type !== undefined) {
      params = params.set('type', type);
    }
    return this.http.get<CapacityEventSummaryResponse[]>(`${this.baseUrl}/capacity/events`, { params });
  }

  /**
   * Fetches a single event by id, with parent/children summaries.
   *
   * @param eventId the event's identifier
   * @returns the event
   */
  getEvent(eventId: string): Observable<CapacityEventResponse> {
    return this.http.get<CapacityEventResponse>(`${this.baseUrl}/capacity/events/${eventId}`);
  }

  /**
   * Updates an event's name/dates.
   *
   * @param eventId the event's identifier
   * @param request the fields to update
   * @returns the updated event
   */
  updateEvent(eventId: string, request: UpdateCapacityEventRequest): Observable<CapacityEventResponse> {
    return this.http.patch<CapacityEventResponse>(`${this.baseUrl}/capacity/events/${eventId}`, request);
  }

  /**
   * Permanently deletes an event created by the caller, cascading its members/absences/burndown
   * entries. Rejected (409) if the event has children — delete the Sprints under a PI first.
   *
   * @param eventId the event's identifier
   */
  deleteEvent(eventId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/capacity/events/${eventId}`);
  }

  /**
   * Lists a `PI_PLANNING` event's child events (US11.3.1).
   *
   * @param eventId the PI event's identifier
   * @returns the children, `startDate` ascending
   */
  listChildren(eventId: string): Observable<CapacityEventSummary[]> {
    return this.http.get<CapacityEventSummary[]>(`${this.baseUrl}/capacity/events/${eventId}/children`);
  }

  /**
   * Fetches an event's provisional net-capacity summary (US11.1.2). A `PI_PLANNING` event's
   * summary aggregates its children's summaries.
   *
   * @param eventId the event's identifier
   * @returns the provisional summary
   */
  getSummary(eventId: string): Observable<CapacitySummaryResponse> {
    return this.http.get<CapacitySummaryResponse>(`${this.baseUrl}/capacity/events/${eventId}/summary`);
  }

  /**
   * Lists an event's members with their availability, exclusion flag, and absences (US11.2.1).
   *
   * @param eventId the event's identifier
   * @returns the members, sorted by name
   */
  listMembers(eventId: string): Observable<CapacityEventMemberResponse[]> {
    return this.http.get<CapacityEventMemberResponse[]>(`${this.baseUrl}/capacity/events/${eventId}/members`);
  }

  /**
   * Adjusts a member's exclusion flag and/or availability percentage (US11.2.1).
   *
   * @param eventId  the event's identifier
   * @param memberId the member's identifier
   * @param request  the fields to update
   * @returns the updated member
   */
  updateMember(
    eventId: string,
    memberId: string,
    request: UpdateCapacityEventMemberRequest,
  ): Observable<CapacityEventMemberResponse> {
    return this.http.patch<CapacityEventMemberResponse>(
      `${this.baseUrl}/capacity/events/${eventId}/members/${memberId}`,
      request,
    );
  }

  /**
   * Records an absence for a member (US11.2.2). The request carries only a date range — no
   * reason/category field exists in the contract, per the RGPD Gate 1 decision.
   *
   * @param eventId  the event's identifier
   * @param memberId the member's identifier
   * @param request  the absence's date range
   * @returns the created absence
   */
  createAbsence(eventId: string, memberId: string, request: CreateCapacityAbsenceRequest) {
    return this.http.post(`${this.baseUrl}/capacity/events/${eventId}/members/${memberId}/absences`, request);
  }

  /**
   * Deletes an absence.
   *
   * @param eventId    the event's identifier
   * @param absenceId  the absence's identifier
   */
  deleteAbsence(eventId: string, absenceId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/capacity/events/${eventId}/absences/${absenceId}`);
  }

  /**
   * Updates a `SPRINT` event's committed/completed points (US11.4.1). Both fields are
   * independently modifiable — provide only the one being set.
   *
   * @param eventId the event's identifier
   * @param request the fields to update
   * @returns the updated event
   */
  updateVelocity(eventId: string, request: UpdateCapacityVelocityRequest): Observable<CapacityEventResponse> {
    return this.http.patch<CapacityEventResponse>(`${this.baseUrl}/capacity/events/${eventId}/velocity`, request);
  }

  /**
   * Lists a team's most recent `SPRINT` events with `completedPoints` recorded (US11.4.1).
   *
   * @param teamId the team's identifier
   * @param limit  the maximum number of entries, defaults to `10` server-side
   * @returns the matching sprints, `endDate` descending
   */
  getVelocityHistory(teamId: number, limit?: number): Observable<CapacityVelocityHistoryEntry[]> {
    let params = new HttpParams();
    if (limit !== undefined) {
      params = params.set('limit', limit);
    }
    return this.http.get<CapacityVelocityHistoryEntry[]>(
      `${this.baseUrl}/capacity/teams/${teamId}/velocity-history`,
      { params },
    );
  }

  /**
   * Fetches the rolling-average velocity and suggested next-sprint capacity for a team (US11.4.1).
   *
   * @param teamId the team's identifier
   * @param count  the number of most recent completed sprints to average, defaults to `3`
   * @param factor the multiplier applied to the average, defaults to `0.85`
   * @returns the average and suggestion, or `null` values if no sprint has `completedPoints` yet
   */
  getVelocityAverage(teamId: number, count?: number, factor?: number): Observable<CapacityVelocityAverageResponse> {
    let params = new HttpParams();
    if (count !== undefined) {
      params = params.set('count', count);
    }
    if (factor !== undefined) {
      params = params.set('factor', factor);
    }
    return this.http.get<CapacityVelocityAverageResponse>(
      `${this.baseUrl}/capacity/teams/${teamId}/velocity-history/average`,
      { params },
    );
  }

  /**
   * Fetches a `SPRINT` event's burndown — ideal + actual curves and at-risk/stale flags
   * (US11.4.2).
   *
   * @param eventId the event's identifier
   * @returns the burndown payload
   */
  getBurndown(eventId: string): Observable<CapacityBurndownResponse> {
    return this.http.get<CapacityBurndownResponse>(`${this.baseUrl}/capacity/events/${eventId}/burndown`);
  }

  /**
   * Idempotently records (or replaces) a day's remaining-points entry (US11.4.2).
   *
   * @param eventId the event's identifier
   * @param date    the entry's date (`YYYY-MM-DD`), must fall within the event's period
   * @param pointsRemaining the remaining points as of that date
   */
  upsertBurndownEntry(eventId: string, date: string, pointsRemaining: number): Observable<void> {
    const request: UpsertBurndownEntryRequest = { pointsRemaining };
    return this.http.put<void>(`${this.baseUrl}/capacity/events/${eventId}/burndown/${date}`, request);
  }
}
