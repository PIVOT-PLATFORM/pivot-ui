import { HttpErrorResponse } from '@angular/common/http';

/**
 * RFC 7807 Problem Detail shape returned by the backend on validation/auth failures, with the
 * PIVOT-specific `code` extension property. Mirrors `ProblemDetailResponse` in the scrum-poker
 * feature (`room.model.ts`) — duplicated locally rather than imported since this component may
 * only create files under `capacity-detail/`.
 */
export interface CapacityProblemDetailResponse {
  readonly type?: string;
  readonly title?: string;
  readonly status?: number;
  readonly detail?: string;
  readonly code?: string;
}

/**
 * Maps an HTTP error to an i18n key under the given namespace (e.g. `capacity.members.errors`),
 * falling back to `${fallbackKey}` when the backend's `code` extension is missing/unrecognized.
 *
 * @param error       the HTTP error response
 * @param errorsNs    the i18n namespace holding the per-`code` messages (e.g. `capacity.members.errors`)
 * @param knownCodes  the backend `code` values this namespace has a translation for
 * @param fallbackKey the i18n key to use when `code` is absent/unknown (e.g. `capacity.members.saveError`)
 * @returns the resolved i18n key
 */
export function resolveCapacityErrorKey(
  error: HttpErrorResponse,
  errorsNs: string,
  knownCodes: readonly string[],
  fallbackKey: string,
): string {
  const body = error.error as CapacityProblemDetailResponse | null;
  const code = body?.code;
  if (code && knownCodes.includes(code)) {
    return `${errorsNs}.${code}`;
  }
  return fallbackKey;
}
