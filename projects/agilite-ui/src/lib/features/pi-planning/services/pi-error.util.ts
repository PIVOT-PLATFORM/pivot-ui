import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetail } from '../models/pi-planning.model';

/**
 * Extracts the machine-readable `code` from a failed PI Planning API HTTP response, if present.
 * Mirrors `standup/services/standup-error.util.ts#extractErrorCode` exactly.
 *
 * @param error the error thrown by an HttpClient call against the PI Planning API
 * @returns the `code` value (e.g. `INVALID_NAME`, `DEPENDENCY_CYCLE`), or `undefined` if the
 *          response carries no RFC 7807 `code` property (e.g. a 401/404/5xx)
 */
export function extractErrorCode(error: unknown): string | undefined {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as ProblemDetail | undefined;
    return body?.code;
  }
  return undefined;
}
