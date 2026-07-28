import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { CreateMeetingRequest, MeetingResponse } from '../models/meeting.model';

/**
 * HTTP client for the MeetOps meeting resource (E12, US12.1.1). Tenant isolation is handled
 * server-side — no `tenantId`/`userId` ever sent from Angular. Shares `COLLABORATIF_API_URL`
 * with the whiteboard/session features — same `collaboratif` backend module
 * (`fr.pivot.collaboratif`), just a different resource.
 */
@Injectable({ providedIn: 'root' })
export class MeetingApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(COLLABORATIF_API_URL);

  /** Creates a new meeting with its agenda (US12.1.1 AC1). */
  createMeeting(request: CreateMeetingRequest): Observable<MeetingResponse> {
    return this.http.post<MeetingResponse>(`${this.apiUrl}/meetings`, request);
  }
}
