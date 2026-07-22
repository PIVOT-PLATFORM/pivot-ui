import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetail } from '../models/standup.model';

/**
 * Extracts the machine-readable `code` from a failed standup-API HTTP response, if present.
 * Mirrors `wheels/services/wheel-error.util.ts#extractErrorCode` exactly.
 *
 * @param error the error thrown by an HttpClient call against the standup API
 * @returns the `code` value (e.g. `INVALID_NAME`, `INVALID_SESSION_STATUS`), or `undefined` if
 *          the response carries no RFC 7807 `code` property (e.g. a 401/404/5xx)
 */
export function extractErrorCode(error: unknown): string | undefined {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as ProblemDetail | undefined;
    return body?.code;
  }
  return undefined;
}
