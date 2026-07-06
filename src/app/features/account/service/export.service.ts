import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, interval, switchMap, takeWhile } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { IN_FLIGHT_EXPORT_STATUSES } from './export.model';
import type { ExportRequestResponse, ExportStatusResponse } from './export.model';

/** Poll interval while a request is PENDING/PROCESSING (ms). */
const POLL_INTERVAL_MS = 5000;
/** Safety cap on poll attempts (5 min at the default interval) — avoids indefinite
 *  polling if the backend `@Async` job never settles. */
const MAX_POLL_ATTEMPTS = 60;

/**
 * ExportService — RGPD Art. 20 data portability (US02.3.1).
 *
 * Consumes the pivot-core contract (PR #133 `AccountExportController`):
 * - `GET  /api/account/export/status`             → current export state + rate-limit hint
 * - `POST /api/account/export`                    → 202 Accepted, creates a PENDING request
 * - `GET  /api/account/export/download/{token}`   → authenticated blob download
 *
 * `userId` is never sent from the client — the backend resolves the owner from
 * the bearer session token (`TokenAuthenticationFilter`), per CLAUDE.md.
 */
@Injectable({ providedIn: 'root' })
export class ExportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/account/export`;

  /**
   * Fetches the current export state for the authenticated user.
   * Used to render the button's enabled/disabled state before any POST attempt,
   * and to poll for the PENDING/PROCESSING → READY/FAILED transition afterwards.
   */
  getStatus(): Observable<ExportStatusResponse> {
    return this.http.get<ExportStatusResponse>(`${this.baseUrl}/status`);
  }

  /**
   * Polls {@link getStatus} on a fixed interval (AC-13) until the request
   * leaves PENDING/PROCESSING — emitting the settling value too — or the
   * attempt cap is reached. Encapsulates *how* the status is polled; the
   * caller (component) still owns *when* to stop listening, e.g. via
   * `takeUntilDestroyed`.
   */
  pollStatus(): Observable<ExportStatusResponse> {
    return interval(POLL_INTERVAL_MS).pipe(
      switchMap(() => this.getStatus()),
      takeWhile(
        (res, index) => IN_FLIGHT_EXPORT_STATUSES.has(res.status) && index < MAX_POLL_ATTEMPTS - 1,
        true,
      ),
    );
  }

  /**
   * Requests a new export archive. Resolves with 202 body on success.
   *
   * Rejects with an `HttpErrorResponse` on:
   * - 409 — a request is already PENDING/PROCESSING for this user
   * - 429 — rate-limited (< 24h since the last request), body carries `retryAfterSeconds`
   * - 401 — no/invalid session (handled globally by `tokenInterceptor`)
   */
  requestExport(): Observable<ExportRequestResponse> {
    return this.http.post<ExportRequestResponse>(this.baseUrl, null);
  }

  /**
   * Downloads a ready archive via the authenticated endpoint.
   *
   * Returns the full `HttpResponse<Blob>` (not just the body) so the caller can
   * read the `Content-Disposition` filename. This can never be a plain
   * `<a href>` to the API: the endpoint requires the bearer `Authorization`
   * header (attached by `tokenInterceptor`), which a bare anchor cannot send —
   * the caller must trigger a client-side blob download instead.
   *
   * @param exportToken raw download token from the emailed link's `token` query param
   */
  download(exportToken: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.baseUrl}/download/${encodeURIComponent(exportToken)}`, {
      observe: 'response',
      responseType: 'blob',
    });
  }
}
