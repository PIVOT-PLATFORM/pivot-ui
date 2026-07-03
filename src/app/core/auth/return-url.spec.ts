import { DEFAULT_POST_LOGIN_URL, isSafeReturnUrl, sanitizeReturnUrl } from './return-url';

/**
 * US01.1.4 — AC open redirect :
 * « returnUrl n'accepte que des URLs relatives internes (commence par /).
 *   Valeur absolue ou externe ignorée → redirection par défaut. »
 */
describe('isSafeReturnUrl', () => {
  describe('URLs relatives internes valides', () => {
    it.each([
      '/home',
      '/dashboard',
      '/dashboard?tab=2',
      '/legal/cgu',
      '/teams#section',
      '/a/b/c?x=1&y=2',
    ])('accepte %s', (url) => {
      expect(isSafeReturnUrl(url)).toBe(true);
    });
  });

  describe('open redirect — URLs absolues ou externes', () => {
    it.each([
      'https://evil.com',
      'http://evil.com/phishing',
      'https://evil.com/%2Fhome',
      'ftp://evil.com',
      'evil.com',
      'www.evil.com/login',
    ])('rejette %s', (url) => {
      expect(isSafeReturnUrl(url)).toBe(false);
    });
  });

  describe('open redirect — URLs protocol-relative', () => {
    it.each(['//evil.com', '//evil.com/home', '///evil.com', '/\\evil.com', '\\/evil.com', '\\\\evil.com'])(
      'rejette %s',
      (url) => {
        expect(isSafeReturnUrl(url)).toBe(false);
      },
    );
  });

  describe('open redirect — schemes dangereux', () => {
    it.each(['javascript:alert(1)', 'javascript://%0aalert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)'])(
      'rejette %s',
      (url) => {
        expect(isSafeReturnUrl(url)).toBe(false);
      },
    );
  });

  describe('open redirect — encodage URL (défense en profondeur)', () => {
    it.each([
      '%2F%2Fevil.com', //          → //evil.com après décodage (et pas de / initial brut)
      '/%2Fevil.com', //            → //evil.com après décodage
      '/%2F%2Fevil.com', //         → ///evil.com après décodage
      '/%252Fevil.com', //          → //evil.com après double décodage
      '/%5Cevil.com', //            → /\evil.com après décodage
      '/%255Cevil.com', //          → /\evil.com après double décodage
      '/%09/evil.com', //           → tab décodé, supprimé par les navigateurs → //evil.com
      '/%0A/evil.com', //           → newline décodé
      '/%00home', //                → NUL décodé
      '/%zzinvalid', //             → encodage malformé
    ])('rejette %s', (url) => {
      expect(isSafeReturnUrl(url)).toBe(false);
    });
  });

  describe('open redirect — caractères de contrôle et backslash', () => {
    // Construits via String.fromCharCode pour garder la source lisible
    // (tab, LF, CR, NUL, DEL) + backslash (normalise en / par les navigateurs).
    const forbidden = [9, 10, 13, 0, 127].map((code) => '/home' + String.fromCharCode(code) + 'x');
    forbidden.push('/home' + String.fromCharCode(92) + '..' + String.fromCharCode(92) + 'admin');
    it.each(forbidden)(
      'rejette la valeur avec caractère interdit',
      (url) => {
        expect(isSafeReturnUrl(url)).toBe(false);
      },
    );
  });

  describe('valeurs vides ou absentes', () => {
    it.each([null, undefined, ''])('rejette %s', (url) => {
      expect(isSafeReturnUrl(url)).toBe(false);
    });
  });
});

describe('sanitizeReturnUrl', () => {
  it('retourne la valeur telle quelle quand elle est interne sûre', () => {
    expect(sanitizeReturnUrl('/dashboard?tab=2')).toBe('/dashboard?tab=2');
  });

  it('retombe sur /home pour une URL externe', () => {
    expect(sanitizeReturnUrl('https://evil.com')).toBe(DEFAULT_POST_LOGIN_URL);
  });

  it('retombe sur /home pour une URL protocol-relative', () => {
    expect(sanitizeReturnUrl('//evil.com')).toBe(DEFAULT_POST_LOGIN_URL);
  });

  it('retombe sur /home pour un scheme javascript:', () => {
    expect(sanitizeReturnUrl('javascript:alert(1)')).toBe(DEFAULT_POST_LOGIN_URL);
  });

  it('retombe sur /home quand la valeur est absente', () => {
    expect(sanitizeReturnUrl(null)).toBe(DEFAULT_POST_LOGIN_URL);
  });

  it('DEFAULT_POST_LOGIN_URL vaut /home', () => {
    expect(DEFAULT_POST_LOGIN_URL).toBe('/home');
  });
});
