import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import {
  AddMeetingActionRequest,
  CreateMeetingRequest,
  MeetingActionResponse,
  MeetingLiveState,
  MeetingResponse,
} from '../models/meeting.model';

/**
 * HTTP client for the MeetOps meeting resource (E12, US12.1.1/US12.2.1). Tenant isolation is
 * handled server-side — no `tenantId`/`userId` ever sent from Angular. Shares
 * `COLLABORATIF_API_URL` with the whiteboard/session features — same `collaboratif` backend
 * module (`fr.pivot.collaboratif`), just a different resource.
 */
@Injectable({ providedIn: 'root' })
export class MeetingApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(COLLABORATIF_API_URL);

  /** Creates a new meeting with its agenda (US12.1.1 AC1). */
  createMeeting(request: CreateMeetingRequest): Observable<MeetingResponse> {
    return this.http.post<MeetingResponse>(`${this.apiUrl}/meetings`, request);
  }

  // -----------------------------------------------------------------------------------------
  // Animation (US12.2.1) — owner/ROLE_ADMIN-only actions, except live()
  // -----------------------------------------------------------------------------------------

  /** Starts the meeting (US12.2.1 AC-01) — owner or `ROLE_ADMIN` only. */
  start(meetingId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/meetings/${meetingId}/start`, {});
  }

  /**
   * Advances to the next agenda item, or ends the meeting if the current item was the last
   * (US12.2.1 AC-03) — owner or `ROLE_ADMIN` only.
   */
  next(meetingId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/meetings/${meetingId}/agenda/next`, {});
  }

  /** Ends the meeting (US12.2.1 AC-06) — owner or `ROLE_ADMIN` only. */
  end(meetingId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/meetings/${meetingId}/end`, {});
  }

  /** Captures a minimal action during the live meeting (US12.2.1 AC-08) — owner or `ROLE_ADMIN` only. */
  addAction(meetingId: string, request: AddMeetingActionRequest): Observable<MeetingActionResponse> {
    return this.http.post<MeetingActionResponse>(`${this.apiUrl}/meetings/${meetingId}/actions`, request);
  }

  /**
   * Fetches the meeting's full live animation state (US12.2.1 AC-07) — any visible participant
   * (owner or team member), not just the animator. Used both on initial join and on every STOMP
   * reconnect to resynchronize without depending on missed broker history.
   */
  live(meetingId: string): Observable<MeetingLiveState> {
    return this.http.get<MeetingLiveState>(`${this.apiUrl}/meetings/${meetingId}/live`);
  }
}
