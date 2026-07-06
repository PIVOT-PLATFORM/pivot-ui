/**
 * Session (access token) models — shape returned by the account sessions
 * endpoints.
 *
 * Backend mirror: `fr.pivot.auth.api.SessionDto` (pivot-core PR #132, US02.2.3).
 * Identity (`userId`) is never part of this contract — it is resolved
 * server-side from the bearer token, never accepted from the client.
 */

/** Raw DTO returned by `GET /api/account/sessions`. */
export interface SessionDto {
  /** Access token id — the identifier used for revocation (`DELETE .../{id}`). */
  id: number;
  /**
   * Human-readable device/browser label (e.g. "Chrome sur Windows").
   *
   * `null` when no device name was captured at login — the UI must render an
   * i18n fallback (`account.sessions.list.unknown_device`), never an empty
   * cell. Already HTML-stripped and truncated to 200 characters server-side,
   * but MUST still be rendered via Angular text binding here, never
   * `innerHTML` — defence-in-depth against stored XSS (explicit backend
   * security AC, see PR #132).
   */
  device: string | null;
  /** IP address the session was created from (IPv4 or IPv6). */
  ip: string;
  /** ISO-8601 UTC instant the session (token) was created. */
  createdAt: string;
  /** ISO-8601 UTC instant the session (token) expires. */
  expiresAt: string;
  /** True for the session backing the current request's bearer token — never revocable from this list. */
  isCurrent: boolean;
}
