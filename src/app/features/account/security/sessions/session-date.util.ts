/**
 * Locale-aware date/time formatting for the sessions list.
 *
 * `LOCALE_ID` is not configured in pivot-ui (checked `app.config.ts` — only
 * Transloco's active lang is provided, no `registerLocaleData` /
 * `LOCALE_ID` provider), so Angular's `DatePipe` would always render dates
 * in `en-US` regardless of the active UI language. This small pure helper
 * formats ISO-8601 instants with `Intl.DateTimeFormat`, keyed off the
 * active Transloco lang, instead of pulling in locale data just for this
 * one screen.
 */

/** Transloco langs supported by pivot-ui (`app.config.ts` `availableLangs`). */
export type SupportedLang = 'fr' | 'en';

/**
 * Formats an ISO-8601 UTC instant (e.g. `createdAt` / `expiresAt` from
 * `GET /api/account/sessions`) as a localized, human-readable date + time.
 *
 * Rendered in the `UTC` time zone explicitly rather than the browser's local
 * zone: pivot-ui has no per-user timezone preference anywhere yet, so
 * defaulting to the host machine's zone would make the displayed time
 * non-deterministic across users/environments (and across test runs/CI).
 * UTC is unambiguous and matches what the backend actually stores.
 *
 * @param iso  ISO-8601 instant string
 * @param lang active Transloco lang (any value other than `'en'` is treated as `'fr'`)
 */
export function formatSessionDateTime(iso: string, lang: string): string {
  const locale = lang === 'en' ? 'en-US' : 'fr-FR';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(iso));
}
