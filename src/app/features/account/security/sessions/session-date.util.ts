/**
 * Locale-aware date/time formatting for the sessions list.
 *
 * Delegates to the shared `formatIsoDateTime` helper
 * (`src/app/shared/utils/date-format.util.ts`) — extracted once
 * `trusted-device-date.util.ts` (US01.4.2) needed the exact same
 * `Intl.DateTimeFormat`-based formatting, to avoid duplicating it across both
 * features. This file keeps its own public function name/signature (and its
 * existing tests) unchanged — only the implementation moved.
 */
import { formatIsoDateTime } from '../../../../shared/utils/date-format.util';
export type { SupportedLang } from '../../../../shared/utils/date-format.util';

/**
 * Formats an ISO-8601 UTC instant (e.g. `createdAt` / `expiresAt` from
 * `GET /api/account/sessions`) as a localized, human-readable date + time.
 *
 * @param iso  ISO-8601 instant string
 * @param lang active Transloco lang (any value other than `'en'` is treated as `'fr'`)
 */
export function formatSessionDateTime(iso: string, lang: string): string {
  return formatIsoDateTime(iso, lang);
}
