/**
 * Locale-aware date/time formatting for the trusted devices list.
 *
 * Delegates to the shared `formatIsoDateTime` helper
 * (`src/app/shared/utils/date-format.util.ts`) — same
 * `Intl.DateTimeFormat`-based, UTC-forced pure-function pattern as
 * `sessions/session-date.util.ts`, factored out to avoid duplicating it
 * across both features.
 */
import { formatIsoDateTime } from '../../../../shared/utils/date-format.util';
export type { SupportedLang } from '../../../../shared/utils/date-format.util';

/**
 * Formats an ISO-8601 UTC instant (e.g. `createdAt` / `lastSeenAt` from
 * `GET /api/auth/devices`) as a localized, human-readable date + time.
 *
 * @param iso  ISO-8601 instant string
 * @param lang active Transloco lang (any value other than `'en'` is treated as `'fr'`)
 */
export function formatTrustedDeviceDateTime(iso: string, lang: string): string {
  return formatIsoDateTime(iso, lang);
}
