import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import {
  AdjustSlotRequest,
  ConfirmSlotRequest,
  CreateMeetingRequest,
  MeetingBookingResponse,
  MeetingResponse,
} from '../models/meeting.model';

/**
 * HTTP client for the MeetOps meeting resource (E12, US12.1.1 creation + US12.4.1 booking flow).
 * Tenant isolation is handled server-side — no `tenantId`/`userId` ever sent from Angular. Shares
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

  /** Fetches a booking-flow meeting's current state and ranked proposed slots (US12.4.1). */
  getMeeting(meetingId: string): Observable<MeetingBookingResponse> {
    return this.http.get<MeetingBookingResponse>(`${this.apiUrl}/meetings/${meetingId}`);
  }

  /** Confirms a proposed (or manually adjusted) slot — organizer-only (US12.4.1). */
  confirmSlot(meetingId: string, request: ConfirmSlotRequest): Observable<MeetingBookingResponse> {
    return this.http.post<MeetingBookingResponse>(`${this.apiUrl}/meetings/${meetingId}/confirm`, request);
  }

  /** Manually adjusts a proposed slot's boundaries while still pre-reserved (US12.4.1). */
  adjustSlot(meetingId: string, request: AdjustSlotRequest): Observable<MeetingBookingResponse> {
    return this.http.patch<MeetingBookingResponse>(`${this.apiUrl}/meetings/${meetingId}/slot`, request);
  }
}
