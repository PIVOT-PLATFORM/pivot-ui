import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import {
  DEFAULT_PASSWORD_POLICY,
  DESIGN_SYSTEM_API_URL,
  PasswordPolicy,
  PasswordPolicyService,
} from './password-policy.service';

/**
 * Unit tests for {@link PasswordPolicyService} (design-system lib, EN17.8).
 *
 * Focus on branch coverage of the pure evaluation logic (evaluate / isCompliant /
 * strengthLevel / validator) plus the load() idempotence and network-fallback paths.
 */
describe('PasswordPolicyService (design-system lib)', () => {
  const TEST_API_URL = 'http://localhost:8080/api';
  const POLICY_URL = `${TEST_API_URL}/auth/password-policy`;

  function configure(apiUrl: string | null): {
    service: PasswordPolicyService;
    httpMock: HttpTestingController;
  } {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ...(apiUrl === null ? [] : [{ provide: DESIGN_SYSTEM_API_URL, useValue: apiUrl }]),
      ],
    });
    return {
      service: TestBed.inject(PasswordPolicyService),
      httpMock: TestBed.inject(HttpTestingController),
    };
  }

  describe('load()', () => {
    it('fetches the policy exactly once even when called repeatedly (idempotent)', () => {
      const { service, httpMock } = configure(TEST_API_URL);

      service.load();
      service.load();
      service.load();

      const req = httpMock.expectOne(POLICY_URL);
      req.flush({ minLength: 10, minUppercase: 2, minDigits: 2, minSpecial: 1 });
      // A single outstanding request proves the idempotence guard fired.
      httpMock.verify();

      expect(service.policy()).toEqual({
        minLength: 10,
        minUppercase: 2,
        minDigits: 2,
        minSpecial: 1,
      });
    });

    it('keeps the backend-mirrored defaults when no API URL is configured (no HTTP call)', () => {
      // Factory default of DESIGN_SYSTEM_API_URL is '' -> early return, no request.
      const { service, httpMock } = configure(null);

      service.load();

      httpMock.expectNone(POLICY_URL);
      httpMock.verify();
      expect(service.policy()).toEqual(DEFAULT_PASSWORD_POLICY);
    });

    it('falls back silently to the defaults on a network error', () => {
      const { service, httpMock } = configure(TEST_API_URL);

      service.load();
      httpMock
        .expectOne(POLICY_URL)
        .error(new ProgressEvent('network error'), { status: 0, statusText: 'Unknown Error' });
      httpMock.verify();

      expect(service.policy()).toEqual(DEFAULT_PASSWORD_POLICY);
    });
  });

  describe('evaluate()', () => {
    const strict: PasswordPolicy = {
      minLength: 12,
      minUppercase: 1,
      minDigits: 1,
      minSpecial: 1,
    };

    it('treats an empty password as failing every criterion', () => {
      const { service } = configure(null);
      expect(service.evaluate('', strict)).toEqual({
        minLength: false,
        uppercase: false,
        digit: false,
        special: false,
      });
    });

    it('counts only uppercase and leaves the digit/special branches unmet for a pure-lowercase+upper input', () => {
      // Exercises the branch where a char is uppercase (first if) AND the branch
      // where a char is a lowercase letter (falls through every if/else-if).
      const { service } = configure(null);
      const c = service.evaluate('Abcdefghijkl', strict); // 12 chars, 1 upper, 0 digit, 0 special
      expect(c.minLength).toBe(true);
      expect(c.uppercase).toBe(true);
      expect(c.digit).toBe(false);
      expect(c.special).toBe(false);
    });

    it('takes the digit else-if branch and the special else-if branch independently', () => {
      const { service } = configure(null);
      // digit only, still too short -> minLength false, digit true, others false
      const digitOnly = service.evaluate('1234', strict);
      expect(digitOnly).toEqual({
        minLength: false,
        uppercase: false,
        digit: true,
        special: false,
      });

      // special only
      const specialOnly = service.evaluate('!@#$', strict);
      expect(specialOnly).toEqual({
        minLength: false,
        uppercase: false,
        digit: false,
        special: true,
      });
    });

    it('honours a policy that requires several occurrences of each class', () => {
      const { service } = configure(null);
      const demanding: PasswordPolicy = {
        minLength: 8,
        minUppercase: 2,
        minDigits: 2,
        minSpecial: 2,
      };
      // 1 upper, 1 digit, 1 special -> every count-based criterion unmet despite presence.
      const c = service.evaluate('Abcdef1!', demanding);
      expect(c).toEqual({
        minLength: true,
        uppercase: false,
        digit: false,
        special: false,
      });
    });

    it('uses the current signal policy when none is passed explicitly', () => {
      const { service } = configure(null); // default policy (minLength 12)
      const c = service.evaluate('Ab1!');
      expect(c.minLength).toBe(false);
      expect(c.uppercase).toBe(true);
      expect(c.digit).toBe(true);
      expect(c.special).toBe(true);
    });

    it('classifies non-ASCII letters/digits via Unicode properties (accented upper, Arabic-Indic digit)', () => {
      const { service } = configure(null);
      const lenient: PasswordPolicy = {
        minLength: 1,
        minUppercase: 1,
        minDigits: 1,
        minSpecial: 1,
      };
      // "É" is \p{Lu}, "٣" (Arabic-Indic 3) is \p{Nd}, "€" is neither -> special.
      const c = service.evaluate('É٣€', lenient);
      expect(c).toEqual({
        minLength: true,
        uppercase: true,
        digit: true,
        special: true,
      });
    });
  });

  describe('isCompliant()', () => {
    it('returns true only when every criterion holds', () => {
      const { service } = configure(null);
      expect(service.isCompliant('Abcdefghi1!x')).toBe(true);
    });

    it('returns false when a single criterion (special) is missing', () => {
      const { service } = configure(null);
      expect(service.isCompliant('Abcdefghi1xy')).toBe(false);
    });

    it('short-circuits false on the length criterion', () => {
      const { service } = configure(null);
      expect(service.isCompliant('Ab1!')).toBe(false);
    });
  });

  describe('strengthLevel()', () => {
    it('returns null for an empty password', () => {
      const { service } = configure(null);
      expect(service.strengthLevel('')).toBeNull();
    });

    it('returns "weak" when the policy is not fully satisfied', () => {
      const { service } = configure(null);
      expect(service.strengthLevel('Abcdefghijkl')).toBe('weak'); // no digit/special
    });

    it('returns "medium" at exactly minLength when compliant (boundary, not yet strong)', () => {
      const { service } = configure(null);
      // 12 chars, compliant, length === minLength (< minLength + 4).
      expect(service.strengthLevel('Abcdefghi1!x')).toBe('medium');
    });

    it('returns "medium" one char below the strong threshold (minLength + 3)', () => {
      const { service } = configure(null);
      expect(service.strengthLevel('Abcdefghi1!xyz')).toBe('medium'); // 15 chars = 12 + 3
    });

    it('returns "strong" exactly at the minLength + 4 boundary', () => {
      const { service } = configure(null);
      expect(service.strengthLevel('Abcdefghi1!xyzzy')).toBe('strong'); // 16 chars = 12 + 4
    });
  });

  describe('validator()', () => {
    it('returns null for an empty control (delegated to Validators.required)', () => {
      const { service } = configure(null);
      const validator = service.validator();
      expect(validator(new FormControl(''))).toBeNull();
    });

    it('returns null when the control value is nullish (coalesced to empty string)', () => {
      const { service } = configure(null);
      const validator = service.validator();
      expect(validator(new FormControl(null))).toBeNull();
    });

    it('returns { passwordPolicy: true } for a non-compliant value', () => {
      const { service } = configure(null);
      const validator = service.validator();
      expect(validator(new FormControl('weak'))).toEqual({ passwordPolicy: true });
    });

    it('returns null for a compliant value', () => {
      const { service } = configure(null);
      const validator = service.validator();
      expect(validator(new FormControl('Abcdefghi1!x'))).toBeNull();
    });
  });
});
