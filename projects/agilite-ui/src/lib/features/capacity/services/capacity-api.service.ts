import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AGILITE_API_URL } from '../../../core/config/tokens';
import {
  CadenceRequest,
  CadenceSprintResponse,
  CapacityAbsenceRequest,
  CapacityAbsenceResponse,
  CapacityBurndownResponse,
  CapacityEventChildResponse,
  CapacityEventRequest,
  CapacityEventResponse,
  CapacityEventStatus,
  CapacityEventType,
  CapacityHistoryResponse,
  CapacityMemberRequest,
  CapacityMemberResponse,
  CapacitySummaryResponse,
  CapacityVelocityRequest,
  CapacityVelocityResponse,
  KpiResponse,
} from '../models/capacity.model';

/**
 * HTTP client for the capacity feature's backend (`pivot-agilite-core`, `${environment.apiUrl}`),
 * base path `/capacity` (KPIs under `/kpi`, a sibling of `/capacity` — see {@link getKpis}).
 *
 * No `Authorization` header is attached here: bearer token attachment is delegated to
 * `@pivot/ui-core`'s `AuthInterceptor` once that package is consumable (EN17.3) — see this
 * repo's CLAUDE.md, section "Auth (déléguée)". `tenantId`/`userId` are never sent by this
 * service; the backend resolves them exclusively from the bearer token.
 */
@Injectable({ providedIn: 'root' })
export class CapacityApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(AGILITE_API_URL);

  /**
   * Creates a new capacity event.
   *
   * @param request the event to create
   * @returns the created event
   */
  createEvent(request: CapacityEventRequest): Observable<CapacityEventResponse> {
    return this.http.post<CapacityEventResponse>(`${this.baseUrl}/capacity/events`, request);
  }

  /**
   * Lists the caller's capacity events, optionally filtered.
   *
   * @param teamId restricts the listing to a single team, or omitted for all of the caller's teams
   * @param type   restricts the listing to a single event type, or omitted for all
   * @param status restricts the listing to a single lifecycle status, or omitted for all
   * @returns the matching events
   */
  listEvents(
    teamId?: number,
    type?: CapacityEventType,
    status?: CapacityEventStatus,
  ): Observable<CapacityEventResponse[]> {
    let params = new HttpParams();
    if (teamId !== undefined) {
      params = params.set('teamId', teamId);
    }
    if (type !== undefined) {
      params = params.set('type', type);
    }
    if (status !== undefined) {
      params = params.set('status', status);
    }
    return this.http.get<CapacityEventResponse[]>(`${this.baseUrl}/capacity/events`, { params });
  }

  /**
   * Fetches a single capacity event by id.
   *
   * @param eventId the event's identifier
   * @returns the event
   */
  getEvent(eventId: string): Observable<CapacityEventResponse> {
    return this.http.get<CapacityEventResponse>(`${this.baseUrl}/capacity/events/${eventId}`);
  }

  /**
   * Updates a capacity event's mutable fields. `teamId` is ignored by the backend.
   *
   * @param eventId the event's identifier
   * @param request the new event data
   * @returns the updated event
   */
  updateEvent(eventId: string, request: CapacityEventRequest): Observable<CapacityEventResponse> {
    return this.http.put<CapacityEventResponse>(`${this.baseUrl}/capacity/events/${eventId}`, request);
  }

  /**
   * Permanently deletes a capacity event.
   *
   * @param eventId the event's identifier
   */
  deleteEvent(eventId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/capacity/events/${eventId}`);
  }

  /**
   * Lists a PI's direct children (e.g. its sprints).
   *
   * @param piId the parent event's identifier
   * @returns the parent's direct children
   */
  listChildren(piId: string): Observable<CapacityEventChildResponse[]> {
    return this.http.get<CapacityEventChildResponse[]>(`${this.baseUrl}/capacity/events/${piId}/children`);
  }

  /**
   * Auto-generates a PI's child sprints from a cadence spec (F11.5).
   *
   * @param piId    the parent PI event's identifier
   * @param request the cadence spec
   * @returns the generated sprints, in chronological order
   */
  generateCadence(piId: string, request: CadenceRequest): Observable<CadenceSprintResponse[]> {
    return this.http.post<CadenceSprintResponse[]>(`${this.baseUrl}/capacity/events/${piId}/cadence`, request);
  }

  /**
   * Adds a member to a capacity event.
   *
   * @param eventId the owning event's identifier
   * @param request the member's data
   * @returns the created member
   */
  addMember(eventId: string, request: CapacityMemberRequest): Observable<CapacityMemberResponse> {
    return this.http.post<CapacityMemberResponse>(`${this.baseUrl}/capacity/events/${eventId}/members`, request);
  }

  /**
   * Updates an existing capacity event member.
   *
   * @param memberId the member's identifier
   * @param request  the member's new data
   * @returns the updated member
   */
  updateMember(memberId: string, request: CapacityMemberRequest): Observable<CapacityMemberResponse> {
    return this.http.put<CapacityMemberResponse>(`${this.baseUrl}/capacity/members/${memberId}`, request);
  }

  /**
   * Removes a member from its event, cascading its absences.
   *
   * @param memberId the member's identifier
   */
  deleteMember(memberId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/capacity/members/${memberId}`);
  }

  /**
   * Adds an absence to a capacity event member.
   *
   * @param memberId the owning member's identifier
   * @param request  the absence's data
   * @returns the created absence
   */
  addAbsence(memberId: string, request: CapacityAbsenceRequest): Observable<CapacityAbsenceResponse> {
    return this.http.post<CapacityAbsenceResponse>(`${this.baseUrl}/capacity/members/${memberId}/absences`, request);
  }

  /**
   * Removes an absence.
   *
   * @param absenceId the absence's identifier
   */
  deleteAbsence(absenceId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/capacity/absences/${absenceId}`);
  }

  /**
   * Upserts a sprint's velocity snapshot (committed/completed points).
   *
   * @param eventId the sprint event's identifier
   * @param request the committed/completed points
   * @returns the upserted velocity snapshot
   */
  upsertVelocity(eventId: string, request: CapacityVelocityRequest): Observable<CapacityVelocityResponse> {
    return this.http.patch<CapacityVelocityResponse>(`${this.baseUrl}/capacity/events/${eventId}/velocity`, request);
  }

  /**
   * Returns the sprint's team's recent velocity history and rolling forecast.
   *
   * @param eventId the sprint event's identifier
   * @returns the velocity history and forecast
   */
  getHistory(eventId: string): Observable<CapacityHistoryResponse> {
    return this.http.get<CapacityHistoryResponse>(`${this.baseUrl}/capacity/events/${eventId}/history`);
  }

  /**
   * Returns the sprint's real burndown line plus a derived ideal line.
   *
   * @param eventId the sprint event's identifier
   * @returns the real and ideal burndown lines
   */
  getBurndown(eventId: string): Observable<CapacityBurndownResponse> {
    return this.http.get<CapacityBurndownResponse>(`${this.baseUrl}/capacity/events/${eventId}/burndown`);
  }

  /**
   * Returns the full capacity summary of one event — per-member breakdown, event totals, PI
   * consolidation, and engagement gauge.
   *
   * @param eventId the event's identifier
   * @returns the full summary
   */
  getSummary(eventId: string): Observable<CapacitySummaryResponse> {
    return this.http.get<CapacitySummaryResponse>(`${this.baseUrl}/capacity/events/${eventId}/summary`);
  }

  /**
   * Returns the team-aggregated capacity KPIs for the team owning `eventId`.
   *
   * @param eventId any capacity event id belonging to the team to report on
   * @returns the team's KPIs
   */
  getKpis(eventId: string): Observable<KpiResponse> {
    const params = new HttpParams().set('eventId', eventId);
    return this.http.get<KpiResponse>(`${this.baseUrl}/kpi`, { params });
  }
}
