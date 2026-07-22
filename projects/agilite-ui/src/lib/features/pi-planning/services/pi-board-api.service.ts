import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AGILITE_API_URL } from '../../../core/config/tokens';
import {
  CreatePiDependencyRequest,
  CreatePiTicketRequest,
  PiBoardResponse,
  PiDependencyResponse,
  PiTicketResponse,
  UpdatePiDependencyRequest,
  UpdatePiTicketRequest,
} from '../models/pi-planning.model';

/**
 * HTTP client for the PI Planning Program Board feature (`pivot-agilite-core`,
 * `${environment.apiUrl}/pi/cycles/{id}`) — US50.3.1 (tickets) and US50.3.2 (dependencies).
 *
 * No WebSocket: the board is plain REST with manual/focus refresh and optimistic local updates
 * (Gate 1 architecture decision, US50.3.1 AC — explicitly out of socle scope, see the EPIC
 * README's "Hors périmètre socle"). Callers refetch {@link getBoard} on focus/manual refresh
 * rather than subscribing to a topic.
 */
@Injectable({ providedIn: 'root' })
export class PiBoardApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(AGILITE_API_URL);

  /**
   * Fetches the full board payload for a cycle in one request: iterations, Train teams, tickets
   * and dependencies.
   *
   * @param cycleId the cycle's identifier
   * @returns the aggregated board payload
   */
  getBoard(cycleId: string): Observable<PiBoardResponse> {
    return this.http.get<PiBoardResponse>(`${this.baseUrl}/pi/cycles/${cycleId}/board`);
  }

  /**
   * Creates a new ticket. `teamId: null` places it on the Train row, `iterationId: null` places
   * it in the "Unplanned" column.
   *
   * @param cycleId the cycle's identifier
   * @param request the ticket to create
   * @returns the created ticket
   */
  createTicket(cycleId: string, request: CreatePiTicketRequest): Observable<PiTicketResponse> {
    return this.http.post<PiTicketResponse>(`${this.baseUrl}/pi/cycles/${cycleId}/tickets`, request);
  }

  /**
   * Updates a ticket — the SAME endpoint used both for field edits (title/description/type) and
   * for drag-drop moves (new `teamId`/`iterationId`/`order`). No separate `/move` endpoint.
   *
   * @param cycleId  the cycle's identifier
   * @param ticketId the ticket's identifier
   * @param request  the fields to update
   * @returns the updated ticket
   */
  updateTicket(
    cycleId: string,
    ticketId: string,
    request: UpdatePiTicketRequest,
  ): Observable<PiTicketResponse> {
    return this.http.patch<PiTicketResponse>(`${this.baseUrl}/pi/cycles/${cycleId}/tickets/${ticketId}`, request);
  }

  /**
   * Deletes a ticket, cascading its dependencies (entering and leaving).
   *
   * @param cycleId  the cycle's identifier
   * @param ticketId the ticket's identifier
   */
  deleteTicket(cycleId: string, ticketId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/pi/cycles/${cycleId}/tickets/${ticketId}`);
  }

  /**
   * Creates a dependency between two tickets of the same cycle. Rejected (`DEPENDENCY_CYCLE`) if
   * it would introduce a cycle in the cycle's dependency graph.
   *
   * @param cycleId the cycle's identifier
   * @param request the dependency to create — `status` defaults to `"OK"` if omitted
   * @returns the created dependency
   */
  createDependency(cycleId: string, request: CreatePiDependencyRequest): Observable<PiDependencyResponse> {
    return this.http.post<PiDependencyResponse>(`${this.baseUrl}/pi/cycles/${cycleId}/dependencies`, request);
  }

  /**
   * Updates a dependency's status/note — `fromTicketId`/`toTicketId` are never modifiable
   * (delete and recreate to change the link itself).
   *
   * @param cycleId the cycle's identifier
   * @param depId   the dependency's identifier
   * @param request the fields to update
   * @returns the updated dependency
   */
  updateDependency(
    cycleId: string,
    depId: string,
    request: UpdatePiDependencyRequest,
  ): Observable<PiDependencyResponse> {
    return this.http.patch<PiDependencyResponse>(`${this.baseUrl}/pi/cycles/${cycleId}/dependencies/${depId}`, request);
  }

  /**
   * Deletes a dependency.
   *
   * @param cycleId the cycle's identifier
   * @param depId   the dependency's identifier
   */
  deleteDependency(cycleId: string, depId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/pi/cycles/${cycleId}/dependencies/${depId}`);
  }
}
