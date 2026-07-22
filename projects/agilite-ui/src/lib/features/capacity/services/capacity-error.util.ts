import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetail } from '../models/capacity.model';

/**
 * Extracts the machine-readable `code` from a failed Capacity Planning API HTTP response, if
 * present. Mirrors `pi-planning/services/pi-error.util.ts#extractErrorCode` exactly.
 *
 * @param error the error thrown by an HttpClient call against the Capacity Planning API
 * @returns the `code` value (e.g. `INVALID_NAME`, `MAX_DEPTH_EXCEEDED`), or `undefined` if the
 *          response carries no RFC 7807 `code` property (e.g. a 401/404/5xx)
 */
export function extractErrorCode(error: unknown): string | undefined {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as ProblemDetail | undefined;
    return body?.code;
  }
  return undefined;
}
