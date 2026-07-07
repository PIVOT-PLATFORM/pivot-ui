import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { By } from '@angular/platform-browser';
import { PasswordStrengthComponent } from './password-strength.component';
import { DESIGN_SYSTEM_API_URL } from './password-policy.service';

/**
 * Unit tests for PasswordStrengthComponent (design-system lib version, EN17.8).
 *
 * Uses DESIGN_SYSTEM_API_URL injection token instead of the app environment.
 */
describe('PasswordStrengthComponent (design-system lib)', () => {
  let fixture: ComponentFixture<PasswordStrengthComponent>;
  let component: PasswordStrengthComponent;
  let httpMock: HttpTestingController;

  const TEST_API_URL = 'http://localhost:8080/api';

  function flushDefaultPolicy(): void {
    httpMock
      .expectOne(`${TEST_API_URL}/auth/password-policy`)
      .flush({ minLength: 12, minUppercase: 1, minDigits: 1, minSpecial: 1 });
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        PasswordStrengthComponent,
        TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DESIGN_SYSTEM_API_URL, useValue: TEST_API_URL },
      ],
    });
    fixture = TestBed.createComponent(PasswordStrengthComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates the component and loads the policy once', () => {
    fixture.detectChanges();
    flushDefaultPolicy();
    expect(component).toBeTruthy();
  });

  describe('level()', () => {
    it('is null when the password is empty', () => {
      fixture.componentRef.setInput('password', '');
      fixture.detectChanges();
      flushDefaultPolicy();
      expect(component.level()).toBeNull();
    });

    it('is "weak" when the policy is not satisfied', () => {
      fixture.componentRef.setInput('password', 'short');
      fixture.detectChanges();
      flushDefaultPolicy();
      expect(component.level()).toBe('weak');
    });

    it('is "medium" when compliant but under the strong-length threshold', () => {
      fixture.componentRef.setInput('password', 'Abcdefghi1!x');
      fixture.detectChanges();
      flushDefaultPolicy();
      expect(component.level()).toBe('medium');
    });

    it('is "strong" when compliant and length >= minLength + 4', () => {
      fixture.componentRef.setInput('password', 'Abcdefghi1!xyzzy');
      fixture.detectChanges();
      flushDefaultPolicy();
      expect(component.level()).toBe('strong');
    });
  });

  describe('criteriaView()', () => {
    it('exposes the four policy criteria in a stable order with their met state', () => {
      fixture.componentRef.setInput('password', 'Abcdefghijk!');
      fixture.detectChanges();
      flushDefaultPolicy();

      const view = component.criteriaView();
      expect(view.map((c) => c.labelKey)).toEqual([
        'auth.password.strength.criteria.min_length',
        'auth.password.strength.criteria.uppercase',
        'auth.password.strength.criteria.digit',
        'auth.password.strength.criteria.special',
      ]);
      expect(view.find((c) => c.labelKey.endsWith('digit'))?.met).toBe(false);
      expect(view.find((c) => c.labelKey.endsWith('uppercase'))?.met).toBe(true);
    });
  });

  describe('DOM — accessibility', () => {
    it('exposes meterId/criteriaId derived from idPrefix for aria-describedby wiring', () => {
      fixture.componentRef.setInput('idPrefix', 'register-password');
      fixture.componentRef.setInput('password', 'Abcdefghi1!x');
      fixture.detectChanges();
      flushDefaultPolicy();

      expect(component.meterId()).toBe('register-password-meter');
      expect(component.criteriaId()).toBe('register-password-criteria');

      const meterEl: HTMLElement = fixture.nativeElement.querySelector('#register-password-meter');
      const criteriaEl: HTMLElement = fixture.nativeElement.querySelector('#register-password-criteria');
      expect(meterEl).not.toBeNull();
      expect(criteriaEl).not.toBeNull();
    });

    it('marks the strength meter as aria-live="polite"', () => {
      fixture.componentRef.setInput('password', 'Abcdefghi1!x');
      fixture.detectChanges();
      flushDefaultPolicy();

      const meterEl: HTMLElement = fixture.nativeElement.querySelector('.password-strength__meter');
      expect(meterEl.getAttribute('aria-live')).toBe('polite');
    });

    it('shows the strength level as visible text, not only a color', () => {
      fixture.componentRef.setInput('password', 'weak');
      fixture.detectChanges();
      flushDefaultPolicy();
      fixture.detectChanges();

      const levelEl: HTMLElement = fixture.nativeElement.querySelector('.password-strength__level');
      expect(levelEl.textContent?.trim().length).toBeGreaterThan(0);
    });

    it('renders each criterion as a native <li> with an SR-only met/unmet label', () => {
      fixture.componentRef.setInput('password', 'Abcdefghi1!x');
      fixture.detectChanges();
      flushDefaultPolicy();
      fixture.detectChanges();

      const items = fixture.debugElement.queryAll(By.css('li.password-strength__criterion'));
      expect(items).toHaveLength(4);
      for (const item of items) {
        const srOnly: HTMLElement = item.nativeElement.querySelector('.sr-only');
        expect(srOnly).not.toBeNull();
        expect(srOnly.textContent?.trim().length).toBeGreaterThan(0);
      }
    });

    it('wraps the criteria list in a native <ul> referencing criteriaId', () => {
      fixture.componentRef.setInput('password', 'Abcdefghi1!x');
      fixture.detectChanges();
      flushDefaultPolicy();
      fixture.detectChanges();

      const list: HTMLElement = fixture.nativeElement.querySelector('ul.password-strength__criteria');
      expect(list).not.toBeNull();
      expect(list.id).toBe(component.criteriaId());
    });
  });
});
