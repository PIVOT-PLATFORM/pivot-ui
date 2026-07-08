import {
  DEFAULT_POST_LOGIN_URL,
  isSafeReturnUrl,
  sanitizeReturnUrl,
  sanitizeReturnUrlOrDefault,
} from './return-url';

/**
 * US01.1.4 / US01.1.5 — AC open redirect commun aux deux appelants :
 * « returnUrl n'accepte que des URLs relatives internes (commence par /).
 *   Valeur absolue ou externe ignorée. »
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

    // Bornes exactes de la plage de caractères de contrôle : U+001F (unit
    // separator) est le dernier code rejeté, U+0020 (espace) le premier
    // accepté ; U+007F (DEL) est rejeté, U+007E (~) est accepté.
    it('rejette le caractère U+001F (borne haute de la plage basse)', () => {
      expect(isSafeReturnUrl('/home' + String.fromCharCode(0x1f))).toBe(false);
    });

    it('accepte le caractère U+0020 espace (juste au-dessus de la plage basse)', () => {
      expect(isSafeReturnUrl('/home' + String.fromCharCode(0x20) + 'x')).toBe(true);
    });

    it('rejette le caractère U+007F DEL', () => {
      expect(isSafeReturnUrl('/home' + String.fromCharCode(0x7f))).toBe(false);
    });

    it('accepte le caractère U+007E ~ (juste en dessous de DEL)', () => {
      expect(isSafeReturnUrl('/home' + String.fromCharCode(0x7e))).toBe(true);
    });
  });

  describe('valeurs vides ou absentes', () => {
    it.each([null, undefined, ''])('rejette %s', (url) => {
      expect(isSafeReturnUrl(url)).toBe(false);
    });
  });

  describe('cas particuliers US01.1.5 — restent des URLs internes sûres', () => {
    // La racine et les pages /auth* sont des URLs relatives internes sûres au
    // sens open redirect : leur exclusion (« pas la peine d'y retourner »,
    // « pas de boucle login → login ») est un filtrage métier propre à
    // SessionExpiryService, pas une règle de sécurité — voir
    // isUselessReturnTarget dans session-expiry.service.ts.
    it.each(['/', '/auth', '/auth/login', '/authors'])('accepte %s', (url) => {
      expect(isSafeReturnUrl(url)).toBe(true);
    });
  });
});

describe('sanitizeReturnUrl', () => {
  describe('accepted internal relative URLs', () => {
    it('accepts a simple internal path', () => {
      expect(sanitizeReturnUrl('/dashboard')).toBe('/dashboard');
    });

    it('accepts an internal path with query params', () => {
      expect(sanitizeReturnUrl('/teams?tab=members&page=2')).toBe('/teams?tab=members&page=2');
    });

    it('accepts a nested internal path', () => {
      expect(sanitizeReturnUrl('/legal/cgu')).toBe('/legal/cgu');
    });

    it('retourne la valeur telle quelle quand elle est interne sûre', () => {
      expect(sanitizeReturnUrl('/dashboard?tab=2')).toBe('/dashboard?tab=2');
    });
  });

  describe('rejected URLs (open redirect protection) — returns null', () => {
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
});

describe('sanitizeReturnUrlOrDefault', () => {
  it('retourne la valeur telle quelle quand elle est interne sûre', () => {
    expect(sanitizeReturnUrlOrDefault('/dashboard?tab=2')).toBe('/dashboard?tab=2');
  });

  it('retombe sur /home pour une URL externe', () => {
    expect(sanitizeReturnUrlOrDefault('https://evil.com')).toBe(DEFAULT_POST_LOGIN_URL);
  });

  it('retombe sur /home pour une URL protocol-relative', () => {
    expect(sanitizeReturnUrlOrDefault('//evil.com')).toBe(DEFAULT_POST_LOGIN_URL);
  });

  it('retombe sur /home pour un scheme javascript:', () => {
    expect(sanitizeReturnUrlOrDefault('javascript:alert(1)')).toBe(DEFAULT_POST_LOGIN_URL);
  });

  it('retombe sur /home quand la valeur est absente', () => {
    expect(sanitizeReturnUrlOrDefault(null)).toBe(DEFAULT_POST_LOGIN_URL);
  });

  it('DEFAULT_POST_LOGIN_URL vaut /home', () => {
    expect(DEFAULT_POST_LOGIN_URL).toBe('/home');
  });
});
