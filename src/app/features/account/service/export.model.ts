/**
 * DTOs for US02.3.1 — "Export de ses données personnelles" (RGPD Art. 20).
 *
 * Mirrors the final backend contract from pivot-core PR #133
 * (`fr.pivot.account` — `AccountExportController`). Kept in a dedicated file
 * (rather than inline in the service) so both {@link ExportService} and its
 * consumers can import the shapes without pulling in HttpClient.
 */

/** Lifecycle of the current/last export request for the authenticated user. */
export type ExportRequestStatus = 'NONE' | 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

/**
 * Response body of `GET /api/account/export/status`.
 *
 * `nextAvailableAt` is the key field for the frontend: it lets the button be
 * rendered disabled (with the "Prochain export disponible à HH:MM" reason)
 * *before* the user ever attempts a POST, and is also used to detect the
 * PENDING/PROCESSING → READY/FAILED transition while polling after a submit.
 */
export interface ExportStatusResponse {
  status: ExportRequestStatus;
  requestedAt: string | null;
  completedAt: string | null;
  /** Download-link expiry (ISO-8601) — only populated when `status === 'READY'`. */
  expiresAt: string | null;
  /** ISO-8601 instant a new export may be requested — `null` means allowed now. */
  nextAvailableAt: string | null;
}

/** Response body of `POST /api/account/export` on success (202 Accepted). */
export interface ExportRequestResponse {
  requestId: number;
  status: 'PENDING';
  requestedAt: string;
}

/** Body of a `429 Too Many Requests` response from `POST /api/account/export`. */
export interface ExportRateLimitedError {
  code: 'RATE_LIMITED';
  retryAfterSeconds: number;
}
