import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { extractErrorCode } from './capacity-error.util';

describe('extractErrorCode', () => {
  it('extracts the code from an HttpErrorResponse RFC 7807 body', () => {
    const error = new HttpErrorResponse({ error: { code: 'MAX_DEPTH_EXCEEDED' }, status: 400 });
    expect(extractErrorCode(error)).toBe('MAX_DEPTH_EXCEEDED');
  });

  it('returns undefined when the error body has no code', () => {
    const error = new HttpErrorResponse({ error: {}, status: 500 });
    expect(extractErrorCode(error)).toBeUndefined();
  });

  it('returns undefined for a non-HttpErrorResponse error', () => {
    expect(extractErrorCode(new Error('boom'))).toBeUndefined();
  });
});
