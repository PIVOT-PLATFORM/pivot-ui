import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { DEFAULT_PASSWORD_POLICY, PasswordPolicyService } from './password-policy.service';
import { environment } from '../../../../environments/environment';

/**
 * Unit tests for {@link PasswordPolicyService} (US01.2.4).
 *
 * Traceability:
 * - AC "Validation temps réel côté Angular (pas d'appel API par frappe)"
 * - AC "Politique configurable — cohérence front/backend via GET /api/auth/password-policy"
 * - AC "Formulaire bloqué tant que le mot de passe ne satisfait pas tous les critères"
 */
describe('PasswordPolicyService', () => {
  let service: PasswordPolicyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PasswordPolicyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('exposes DEFAULT_PASSWORD_POLICY as the initial policy signal value', () => {
    expect(service.policy()).toEqual(DEFAULT_PASSWORD_POLICY);
  });

  describe('load()', () => {
    it('fetches the policy from GET /auth/password-policy and updates the signal', () => {
      service.load();
      httpMock
        .expectOne(`${environment.apiUrl}/auth/password-policy`)
        .flush({ minLength: 16, minUppercase: 2, minDigits: 2, minSpecial: 2 });

      expect(service.policy()).toEqual({ minLength: 16, minUppercase: 2, minDigits: 2, minSpecial: 2 });
    });

    it('issues a single HTTP call no matter how many times load() is invoked (no per-keystroke API call)', () => {
      service.load();
      service.load();
      service.load();

      httpMock
        .expectOne(`${environment.apiUrl}/auth/password-policy`)
        .flush(DEFAULT_PASSWORD_POLICY);
    });

    it('falls back silently to defaults on network error — backend remains the source of truth', () => {
      service.load();
      httpMock
        .expectOne(`${environment.apiUrl}/auth/password-policy`)
        .flush('boom', { status: 500, statusText: 'Server Error' });

      expect(service.policy()).toEqual(DEFAULT_PASSWORD_POLICY);
    });
  });

  describe('evaluate()', () => {
    it('reports every criterion unmet for an empty password', () => {
      expect(service.evaluate('', DEFAULT_PASSWORD_POLICY)).toEqual({
        minLength: false,
        uppercase: false,
        digit: false,
        special: false,
      });
    });

    it('reports each criterion isolated when only that one is missing', () => {
      expect(service.evaluate('abcdefghij1!', DEFAULT_PASSWORD_POLICY).uppercase).toBe(false);
      expect(service.evaluate('Abcdefghijk!', DEFAULT_PASSWORD_POLICY).digit).toBe(false);
      expect(service.evaluate('Abcdefghijk1', DEFAULT_PASSWORD_POLICY).special).toBe(false);
      expect(service.evaluate('Abcdefgh1!x', DEFAULT_PASSWORD_POLICY).minLength).toBe(false); // 11 chars
    });

    it('reports every criterion met for a compliant password', () => {
      expect(service.evaluate('Abcdefghi1!x', DEFAULT_PASSWORD_POLICY)).toEqual({
        minLength: true,
        uppercase: true,
        digit: true,
        special: true,
      });
    });

    it('is Unicode-aware — accented uppercase counts, accented lowercase is not special', () => {
      expect(service.evaluate('Épicerie123!', DEFAULT_PASSWORD_POLICY).uppercase).toBe(true);
      expect(service.evaluate('épicerie123!', DEFAULT_PASSWORD_POLICY).uppercase).toBe(false);
      expect(service.evaluate('Abcdefghié12', DEFAULT_PASSWORD_POLICY).special).toBe(false);
    });

    it('counts emoji as a special character', () => {
      expect(service.evaluate('Abcdefghi1😀', DEFAULT_PASSWORD_POLICY).special).toBe(true);
    });

    it('respects a configurable stricter policy', () => {
      const strict = { minLength: 16, minUppercase: 2, minDigits: 2, minSpecial: 2 };
      expect(service.evaluate('Abcdefghijk1!xyz', strict)).toEqual({
        minLength: true,
        uppercase: false,
        digit: false,
        special: false,
      });
      expect(service.evaluate('ABcdefghij12!?xy', strict)).toEqual({
        minLength: true,
        uppercase: true,
        digit: true,
        special: true,
      });
    });
  });

  describe('isCompliant()', () => {
    it('is false when any criterion is unmet', () => {
      expect(service.isCompliant('weakpassword', DEFAULT_PASSWORD_POLICY)).toBe(false);
    });

    it('is true when every criterion is met', () => {
      expect(service.isCompliant('Abcdefghi1!x', DEFAULT_PASSWORD_POLICY)).toBe(true);
    });
  });

  describe('strengthLevel()', () => {
    it('returns null for an empty password', () => {
      expect(service.strengthLevel('', DEFAULT_PASSWORD_POLICY)).toBeNull();
    });

    it('returns "weak" when the policy is not satisfied', () => {
      expect(service.strengthLevel('short', DEFAULT_PASSWORD_POLICY)).toBe('weak');
    });

    it('returns "medium" when compliant but under the strong-length threshold', () => {
      expect(service.strengthLevel('Abcdefghi1!x', DEFAULT_PASSWORD_POLICY)).toBe('medium'); // 12 chars
    });

    it('returns "strong" when compliant and length >= minLength + 4', () => {
      expect(service.strengthLevel('Abcdefghi1!xyzzy', DEFAULT_PASSWORD_POLICY)).toBe('strong'); // 16 chars
    });
  });

  describe('validator()', () => {
    it('returns null for an empty control value (Validators.required owns that rule)', () => {
      const errors = service.validator()({ value: '' } as never);
      expect(errors).toBeNull();
    });

    it('returns { passwordPolicy: true } for a non-compliant password', () => {
      const errors = service.validator()({ value: 'weak' } as never);
      expect(errors).toEqual({ passwordPolicy: true });
    });

    it('returns null for a compliant password', () => {
      const errors = service.validator()({ value: 'Abcdefghi1!x' } as never);
      expect(errors).toBeNull();
    });
  });
});
