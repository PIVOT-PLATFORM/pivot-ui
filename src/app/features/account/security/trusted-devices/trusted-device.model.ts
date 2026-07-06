/**
 * Trusted device models — shape returned by the account trusted-devices
 * endpoints.
 *
 * Backend mirror: `fr.pivot.auth.api.TrustedDeviceDto` (pivot-core PR #152,
 * US01.4.2). Identity (`userId`) is never part of this contract — it is
 * resolved server-side from the bearer token, never accepted from the client.
 *
 * A device becomes "trusted" only after an OTP confirmation on first login
 * from it (US01.4.1) — that flow is unrelated to this screen, which only
 * lists/revokes devices already confirmed.
 */

/** Raw DTO returned by `GET /api/auth/devices`. */
export interface TrustedDeviceDto {
  /** Trusted device id — the identifier used for revocation (`DELETE .../{id}`). */
  id: number;
  /**
   * Human-readable device/browser label (e.g. "Chrome sur Windows").
   *
   * `null` when no device name was captured at confirmation time — the UI
   * must render an i18n fallback (`account.devices.list.unknown_device`),
   * never an empty cell. Already HTML-stripped and truncated to 200
   * characters server-side, but MUST still be rendered via Angular text
   * binding here, never `innerHTML` — defence-in-depth against stored XSS
   * (explicit backend security AC, see PR #152).
   */
  device: string | null;
  /** IP address the device was confirmed from (IPv4 or IPv6). */
  ip: string;
  /** ISO-8601 UTC instant the device was confirmed as trusted (OTP, US01.4.1). */
  createdAt: string;
  /** ISO-8601 UTC instant the device was last seen (most recent authenticated use). */
  lastSeenAt: string;
  /** True for the device backing the current request's bearer token — never revocable from this list. */
  isCurrent: boolean;
}
