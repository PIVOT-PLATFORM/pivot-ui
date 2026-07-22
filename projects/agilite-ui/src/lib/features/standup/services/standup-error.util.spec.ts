import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { extractErrorCode } from './standup-error.util';

describe('extractErrorCode', () => {
  it('returns the code from an HttpErrorResponse RFC 7807 body', () => {
    const error = new HttpErrorResponse({ error: { title: 'Conflict', code: 'INVALID_SESSION_STATUS' }, status: 409 });
    expect(extractErrorCode(error)).toBe('INVALID_SESSION_STATUS');
  });

  it('returns undefined when the body has no code (e.g. a plain 404/401/5xx)', () => {
    const error = new HttpErrorResponse({ error: { title: 'Not found' }, status: 404 });
    expect(extractErrorCode(error)).toBeUndefined();
  });

  it('returns undefined for a non-HttpErrorResponse value', () => {
    expect(extractErrorCode(new Error('boom'))).toBeUndefined();
  });
});
