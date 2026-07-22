import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AGILITE_API_URL } from '../../../core/config/tokens';
import {
  AddManualTeamRequest,
  CreatePiCycleRequest,
  ImportTeamsRequest,
  ImportTeamsResponse,
  PiCycleResponse,
  PiCycleSummaryResponse,
  PiCycleTeamResponse,
  PiIterationResponse,
  TeamResponse,
  UpdatePiCycleRequest,
  UpdatePiCycleTeamRequest,
  UpdatePiIterationRequest,
} from '../models/pi-planning.model';

/**
 * HTTP client for the PI Planning cycle/iteration/Train-team feature (`pivot-agilite-core`,
 * `${environment.apiUrl}/pi/cycles`) — US50.1.1.
 *
 * No `Authorization` header is attached here: bearer token attachment is delegated to
 * `@pivot/ui-core`'s `AuthInterceptor`, same as `StandupApiService`/`WheelApiService`.
 * `tenantId`/`userId` are never sent by this service; the backend resolves them exclusively
 * from the bearer token.
 */
@Injectable({ providedIn: 'root' })
export class PiCycleApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(AGILITE_API_URL);

  /**
   * Lists the caller's own teams, for the Train-team import checklist. Same endpoint as
   * `WheelApiService#listTeams`/`StandupApiService#listTeams`.
   *
   * @returns the teams the caller belongs to
   */
  listTeams(): Observable<TeamResponse[]> {
    return this.http.get<TeamResponse[]>(`${this.baseUrl}/teams`);
  }

  /**
   * Creates a new PI cycle with its iterations generated server-side (US50.1.1).
   *
   * @param request the cycle to create
   * @returns the created cycle, `status: 'PREPARATION'`
   */
  createCycle(request: CreatePiCycleRequest): Observable<PiCycleResponse> {
    return this.http.post<PiCycleResponse>(`${this.baseUrl}/pi/cycles`, request);
  }

  /**
   * Lists cycles accessible to the caller (creator or member of an imported Train team).
   *
   * @returns the accessible cycles, `startDate` descending
   */
  listCycles(): Observable<PiCycleSummaryResponse[]> {
    return this.http.get<PiCycleSummaryResponse[]>(`${this.baseUrl}/pi/cycles`);
  }

  /**
   * Fetches a single cycle by id, with its iterations and Train teams.
   *
   * @param cycleId the cycle's identifier
   * @returns the cycle
   */
  getCycle(cycleId: string): Observable<PiCycleResponse> {
    return this.http.get<PiCycleResponse>(`${this.baseUrl}/pi/cycles/${cycleId}`);
  }

  /**
   * Updates a cycle's fields. `status` transitions freely between `PREPARATION`/`ACTIVE`/`CLOSED`
   * — no strict state machine at socle.
   *
   * @param cycleId the cycle's identifier
   * @param request the fields to update
   * @returns the updated cycle
   */
  updateCycle(cycleId: string, request: UpdatePiCycleRequest): Observable<PiCycleResponse> {
    return this.http.patch<PiCycleResponse>(`${this.baseUrl}/pi/cycles/${cycleId}`, request);
  }

  /**
   * Permanently deletes a cycle created by the caller, cascading its iterations, teams, tickets
   * and dependencies.
   *
   * @param cycleId the cycle's identifier
   */
  deleteCycle(cycleId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/pi/cycles/${cycleId}`);
  }

  /**
   * Adjusts a single generated iteration after creation (e.g. a shifted IP Sprint).
   *
   * @param cycleId     the cycle's identifier
   * @param iterationId the iteration's identifier
   * @param request     the fields to update
   * @returns the updated iteration
   */
  updateIteration(
    cycleId: string,
    iterationId: string,
    request: UpdatePiIterationRequest,
  ): Observable<PiIterationResponse> {
    return this.http.patch<PiIterationResponse>(
      `${this.baseUrl}/pi/cycles/${cycleId}/iterations/${iterationId}`,
      request,
    );
  }

  /**
   * Adds a manually-entered Train team (no PIVOT team behind it — external partners are not
   * modeled in PIVOT). Grants no membership-based access to anyone but the cycle's creator.
   *
   * @param cycleId the cycle's identifier
   * @param request the team's name/color
   * @returns the created Train team
   */
  addManualTeam(cycleId: string, request: AddManualTeamRequest): Observable<PiCycleTeamResponse> {
    return this.http.post<PiCycleTeamResponse>(`${this.baseUrl}/pi/cycles/${cycleId}/teams`, request);
  }

  /**
   * Imports one or more PIVOT teams as Train-team snapshots (1 to 30 per call). Already-imported
   * or inaccessible/cross-tenant teams are silently skipped — never a partial-batch error.
   *
   * @param cycleId the cycle's identifier
   * @param teamIds the PIVOT team ids to import
   * @returns the count actually imported and the resulting Train teams
   */
  importTeams(cycleId: string, teamIds: number[]): Observable<ImportTeamsResponse> {
    const request: ImportTeamsRequest = { teamIds };
    return this.http.post<ImportTeamsResponse>(`${this.baseUrl}/pi/cycles/${cycleId}/teams/import`, request);
  }

  /**
   * Updates a Train team's name, color, or order.
   *
   * @param cycleId the cycle's identifier
   * @param teamId  the Train team's identifier
   * @param request the fields to update
   * @returns the updated Train team
   */
  updateTeam(
    cycleId: string,
    teamId: string,
    request: UpdatePiCycleTeamRequest,
  ): Observable<PiCycleTeamResponse> {
    return this.http.patch<PiCycleTeamResponse>(`${this.baseUrl}/pi/cycles/${cycleId}/teams/${teamId}`, request);
  }

  /**
   * Removes a Train team from the cycle. Its tickets fall back to the "Unplanned" team column
   * (`teamId: null`) — never deleted.
   *
   * @param cycleId the cycle's identifier
   * @param teamId  the Train team's identifier
   */
  deleteTeam(cycleId: string, teamId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/pi/cycles/${cycleId}/teams/${teamId}`);
  }
}
