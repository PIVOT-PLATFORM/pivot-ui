import { sanitizeReturnUrl } from './return-url';

/**
 * US01.1.5 — AC-08 : returnUrl validé comme URL relative interne uniquement
 * (protection open redirect).
 */
describe('sanitizeReturnUrl', () => {
  describe('AC-08 — accepted internal relative URLs', () => {
    it('accepts a simple internal path', () => {
      expect(sanitizeReturnUrl('/dashboard')).toBe('/dashboard');
    });

    it('accepts an internal path with query params', () => {
      expect(sanitizeReturnUrl('/teams?tab=members&page=2')).toBe('/teams?tab=members&page=2');
    });

    it('accepts a nested internal path', () => {
      expect(sanitizeReturnUrl('/legal/cgu')).toBe('/legal/cgu');
    });
  });

  describe('AC-08 — rejected URLs (open redirect protection)', () => {
    it('rejects protocol-relative URLs (//evil.com)', () => {
      expect(sanitizeReturnUrl('//evil.com/phishing')).toBeNull();
    });

    it('rejects backslash variant (/\\evil.com)', () => {
      expect(sanitizeReturnUrl('/\\evil.com')).toBeNull();
    });

    it('rejects absolute URLs (https://evil.com)', () => {
      expect(sanitizeReturnUrl('https://evil.com')).toBeNull();
    });

    it('rejects javascript: pseudo-URLs', () => {
      expect(sanitizeReturnUrl('javascript:alert(1)')).toBeNull();
    });

    it('rejects relative paths not starting with /', () => {
      expect(sanitizeReturnUrl('dashboard')).toBeNull();
    });

    it('rejects null, undefined and empty string', () => {
      expect(sanitizeReturnUrl(null)).toBeNull();
      expect(sanitizeReturnUrl(undefined)).toBeNull();
      expect(sanitizeReturnUrl('')).toBeNull();
    });
  });

  describe('AC-08 — useless return targets', () => {
    it('rejects the root path (nothing to return to)', () => {
      expect(sanitizeReturnUrl('/')).toBeNull();
    });

    it('rejects auth pages (avoid login → login loop)', () => {
      expect(sanitizeReturnUrl('/auth')).toBeNull();
      expect(sanitizeReturnUrl('/auth/login')).toBeNull();
      expect(sanitizeReturnUrl('/auth/register')).toBeNull();
    });

    it('accepts a path merely starting with the "auth" word segment', () => {
      expect(sanitizeReturnUrl('/authors')).toBe('/authors');
    });
  });
});
