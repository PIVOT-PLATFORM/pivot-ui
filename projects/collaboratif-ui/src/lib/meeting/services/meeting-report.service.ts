import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { MeetingReport, MeetingReportExportFormat } from '../models/meeting.model';

/**
 * HTTP client for the MeetOps meeting compte-rendu resource (US12.3.1). Tenant/visibility
 * isolation is handled entirely server-side (`CollaboratifRequestPrincipal` — anti-enumeration
 * 404s never confirm cross-tenant existence); this service never sends `tenantId`/`userId`.
 * `COLLABORATIF_API_URL` is origin-agnostic (relative in production, absolute only in dev/E2E
 * fixtures) — see `MeetingApiService`'s own doc and this repo's collaboratif E2E "relative API"
 * reference note.
 */
@Injectable({ providedIn: 'root' })
export class MeetingReportService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(COLLABORATIF_API_URL);

  /**
   * Fetches the compte-rendu — the frozen snapshot for a closed meeting, or a live draft
   * otherwise (US12.3.1 AC nominal).
   */
  getReport(meetingId: string): Observable<MeetingReport> {
    return this.http.get<MeetingReport>(`${this.apiUrl}/meetings/${meetingId}/report`);
  }

  /**
   * Fetches the compte-rendu as native JSON (US12.3.1 AC nominal). Distinct from {@link getReport}
   * only in that it goes through the `/export` endpoint — same payload shape, useful when a
   * caller wants JSON via the same code path as {@link exportMarkdown}.
   */
  exportJson(meetingId: string): Observable<MeetingReport> {
    return this.http.get<MeetingReport>(`${this.apiUrl}/meetings/${meetingId}/report/export`, {
      params: { format: 'json' satisfies MeetingReportExportFormat },
    });
  }

  /**
   * Fetches the compte-rendu rendered as Markdown (US12.3.1 AC nominal,
   * `Content-Type: text/markdown`) — as raw text, ready to hand to a `Blob` for download.
   */
  exportMarkdown(meetingId: string): Observable<string> {
    return this.http.get(`${this.apiUrl}/meetings/${meetingId}/report/export`, {
      params: { format: 'markdown' satisfies MeetingReportExportFormat },
      responseType: 'text',
    });
  }

  /**
   * Explicitly shares a closed meeting's compte-rendu with the team (US12.3.1 AC7/AC8) —
   * organizer or `ROLE_ADMIN` only server-side; a `409 MEETING_NOT_CLOSED` before closure, `403`
   * for a non-organizer caller.
   */
  share(meetingId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/meetings/${meetingId}/report/share`, null);
  }
}
