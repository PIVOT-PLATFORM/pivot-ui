/**
 * Supported UI languages (US02.1.2 — "Préférence de langue").
 *
 * Mirrors the backend contract (`pivot-core` PR #130, stacked on the `fr.pivot.account`
 * profile feature from PR #129): the `users.locale` column is exposed under the JSON field
 * `preferredLanguage` on `GET`/`PATCH /account/profile` and on `AuthResponse.user` (login,
 * Google, OIDC, restore-session) — always lowercase `"fr"` | `"en"`, never any other value,
 * never `null` on the profile endpoints.
 *
 * Kept in `core/i18n` (not `features/account/profile`) so core-layer consumers — `AuthService`
 * and `NavbarComponent`, both under `core/` — can depend on this type without reaching into a
 * portal feature module, which would invert the intended dependency direction (`features/*`
 * depends on `core/*`, never the other way around).
 */
export type SupportedLanguage = 'fr' | 'en';

/**
 * Runtime guard for a value coming from an untyped source (HTTP response body, `<select>`
 * DOM value, `localStorage`) — the backend contract guarantees `fr`/`en`, but nothing at the
 * type level enforces it once the value has crossed an HTTP boundary.
 */
export function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return value === 'fr' || value === 'en';
}
