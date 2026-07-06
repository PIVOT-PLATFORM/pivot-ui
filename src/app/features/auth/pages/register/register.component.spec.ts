import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { RegisterComponent } from './register.component';
import { environment } from '../../../../../environments/environment';

@Component({ template: '', standalone: true })
class StubComponent {}

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let httpMock: HttpTestingController;

  /** US01.2.4 : la politique de mot de passe est chargée une fois au démarrage du composant. */
  function flushPasswordPolicy(): void {
    httpMock
      .expectOne(`${environment.apiUrl}/auth/password-policy`)
      .flush({ minLength: 12, minUppercase: 1, minDigits: 1, minSpecial: 1 });
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RegisterComponent,
        TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: StubComponent }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushPasswordPolicy();
  });

  afterEach(() => httpMock.verify());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('form is invalid when empty', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('does not submit when form is invalid', () => {
    component.submit();
    httpMock.expectNone(`${environment.apiUrl}/auth/register`);
    expect(component.loading()).toBe(false);
  });

  const validForm = () => ({
    firstName: 'Alice',
    lastName: 'Martin',
    email: 'alice@example.com',
    password: 'SecurePass1!',
    confirmPassword: 'SecurePass1!',
  });

  it('submits and sets success on 200', () => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/register`).flush({});
    expect(component.success()).toBe(true);
    expect(component.loading()).toBe(false);
  });

  it('sets success on 409 (RGPD — ne révèle pas si email existant)', () => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/register`).flush('', { status: 409, statusText: 'Conflict' });
    expect(component.success()).toBe(true);
  });

  it('sets generic error on 400 (validation @Valid — not a fake success)', () => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/register`).flush('', { status: 400, statusText: 'Bad Request' });
    expect(component.success()).toBe(false);
    expect(component.error()).toBe('common.error_generic');
  });

  it('sets rate limit error on 429', () => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/register`).flush('', { status: 429, statusText: 'Too Many Requests' });
    expect(component.error()).toBe('auth.register.error_rate_limit');
  });

  it('sets generic error on 500', () => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/register`).flush('', { status: 500, statusText: 'Server Error' });
    expect(component.error()).toBe('common.error_generic');
  });

  it('rate limit: formatRetryAfter affiche minutes+secondes (ex. 125 s)', () => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/register`)
      .flush({ retryAfterSeconds: 125 }, { status: 429, statusText: 'Too Many Requests' });
    expect(component.error()).toBe('auth.register.error_rate_limit');
    expect(component.errorParams()).toEqual({ time: '2m 5s' });
  });

  it('rate limit: formatRetryAfter affiche uniquement les minutes (ex. 120 s)', () => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/register`)
      .flush({ retryAfterSeconds: 120 }, { status: 429, statusText: 'Too Many Requests' });
    expect(component.errorParams()).toEqual({ time: '2m' });
  });

  it('rate limit: formatRetryAfter affiche uniquement les secondes (ex. 45 s)', () => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/register`)
      .flush({ retryAfterSeconds: 45 }, { status: 429, statusText: 'Too Many Requests' });
    expect(component.errorParams()).toEqual({ time: '45s' });
  });

  it('does not submit while loading', () => {
    component.form.setValue(validForm());
    component.submit();
    component.submit();
    const reqs = httpMock.match(`${environment.apiUrl}/auth/register`);
    expect(reqs).toHaveLength(1);
    reqs[0].flush({});
  });

  describe('US01.2.4 — politique de robustesse du mot de passe', () => {
    it('form is invalid (button disabled) while the password does not satisfy the policy', () => {
      component.form.patchValue({ password: 'short' });
      expect(component.form.controls.password.errors).toEqual({ passwordPolicy: true });
      expect(component.form.invalid).toBe(true);
    });

    it('is invalid without uppercase', () => {
      component.form.patchValue({ password: 'alllowercase1!' });
      expect(component.form.controls.password.errors).toBeTruthy();
    });

    it('is invalid without a digit', () => {
      component.form.patchValue({ password: 'NoDigitsHere!!' });
      expect(component.form.controls.password.errors).toBeTruthy();
    });

    it('is invalid without a special character', () => {
      component.form.patchValue({ password: 'NoSpecialChar123' });
      expect(component.form.controls.password.errors).toBeTruthy();
    });

    it('is valid once every criterion of the policy is satisfied', () => {
      component.form.patchValue({ password: 'SecurePass123!' });
      expect(component.form.controls.password.errors).toBeNull();
    });

    it('feeds passwordValue() in real time for PasswordStrengthComponent (no API call per keystroke)', () => {
      component.form.controls.password.setValue('Abcdefghi1!x');
      expect(component.passwordValue()).toBe('Abcdefghi1!x');
      httpMock.expectNone(`${environment.apiUrl}/auth/password-policy`);
    });

    it('button stays disabled while passwords differ (form-level passwordMismatch)', () => {
      component.form.setValue({ ...validForm(), confirmPassword: 'Different123!' });
      expect(component.form.invalid).toBe(true);
    });

    it('showMismatchError() is false until the confirm field has been touched (no error while typing)', () => {
      component.form.setValue({ ...validForm(), confirmPassword: 'Different123!' });
      expect(component.showMismatchError()).toBe(false);
    });

    it('showMismatchError() is true once the confirm field has been touched and values differ', () => {
      component.form.setValue({ ...validForm(), confirmPassword: 'Different123!' });
      component.form.controls.confirmPassword.markAsTouched();
      expect(component.showMismatchError()).toBe(true);
    });

    it('showMismatchError() is false when passwords match', () => {
      component.form.setValue(validForm());
      component.form.controls.confirmPassword.markAsTouched();
      expect(component.showMismatchError()).toBe(false);
    });

    it('does not submit when passwords differ, even if individually valid', () => {
      component.form.setValue({ ...validForm(), confirmPassword: 'Different123!' });
      component.submit();
      httpMock.expectNone(`${environment.apiUrl}/auth/register`);
      expect(component.loading()).toBe(false);
    });
  });
});
