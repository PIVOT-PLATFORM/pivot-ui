import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ChangePasswordComponent } from './change-password.component';
import { AuthService } from '../../../../core/auth/service/auth.service';
import { environment } from '../../../../../environments/environment';

@Component({ template: '', standalone: true })
class StubComponent {}

describe('ChangePasswordComponent', () => {
  let fixture: ComponentFixture<ChangePasswordComponent>;
  let component: ChangePasswordComponent;
  let httpMock: HttpTestingController;
  let auth: AuthService;

  /** US01.2.4 : la politique de mot de passe est chargée une fois au démarrage du composant. */
  function flushPasswordPolicy(): void {
    httpMock
      .expectOne(`${environment.apiUrl}/auth/password-policy`)
      .flush({ minLength: 12, minUppercase: 1, minDigits: 1, minSpecial: 1 });
  }

  const validForm = () => ({
    currentPassword: 'OldPassword1!',
    newPassword: 'SecurePass123!',
    confirmPassword: 'SecurePass123!',
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ChangePasswordComponent,
        TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: StubComponent }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangePasswordComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    fixture.detectChanges();
    flushPasswordPolicy();
  });

  afterEach(() => httpMock.verify());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('form is invalid when empty (submit button stays disabled)', () => {
    expect(component.form.invalid).toBe(true);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(btn?.disabled).toBe(true);
  });

  it('does not submit when form is invalid', () => {
    component.submit();
    httpMock.expectNone(`${environment.apiUrl}/account/password`);
    expect(component.loading()).toBe(false);
  });

  it('button becomes enabled once all three fields are filled and valid', () => {
    component.form.setValue(validForm());
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(btn?.disabled).toBe(false);
  });

  it('button stays disabled while new password does not satisfy the policy', () => {
    component.form.setValue({ ...validForm(), newPassword: 'short', confirmPassword: 'short' });
    expect(component.form.invalid).toBe(true);
  });

  it('button stays disabled while new and confirm passwords differ', () => {
    component.form.setValue({ ...validForm(), confirmPassword: 'Different123!' });
    expect(component.form.invalid).toBe(true);
  });

  it('showMismatchError() is false until the confirm field has been touched', () => {
    component.form.setValue({ ...validForm(), confirmPassword: 'Different123!' });
    expect(component.showMismatchError()).toBe(false);
  });

  it('showMismatchError() is true once the confirm field has been touched and values differ', () => {
    component.form.setValue({ ...validForm(), confirmPassword: 'Different123!' });
    component.form.controls.confirmPassword.markAsTouched();
    expect(component.showMismatchError()).toBe(true);
  });

  it('feeds passwordValue() in real time for PasswordStrengthComponent (no API call per keystroke)', () => {
    component.form.controls.newPassword.setValue('Abcdefghi1!x');
    expect(component.passwordValue()).toBe('Abcdefghi1!x');
    httpMock.expectNone(`${environment.apiUrl}/auth/password-policy`);
  });

  it('renders the reused piv-password-strength component (US01.2.4), not a bespoke widget', () => {
    fixture.detectChanges();
    const strength = fixture.nativeElement.querySelector('piv-password-strength');
    expect(strength).not.toBeNull();
  });

  // ─── Submission ────────────────────────────────────────────────────────────

  it('POSTs currentPassword/newPassword to /account/password on submit', () => {
    component.form.setValue(validForm());
    component.submit();
    const req = httpMock.expectOne(`${environment.apiUrl}/account/password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      currentPassword: 'OldPassword1!',
      newPassword: 'SecurePass123!',
    });
    req.flush({ accessToken: 'new-token', expiresAt: Date.now() + 3600_000, user: { id: 1, email: 'a@b.com', firstName: null, lastName: null, role: 'USER', emailVerified: true, tenantId: 1, tenantSlug: 't' } });
  });

  it('disables the submit button and shows a spinner while the request is in-flight', () => {
    component.form.setValue(validForm());
    component.submit();
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(btn?.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.spinner')).not.toBeNull();
    httpMock.expectOne(`${environment.apiUrl}/account/password`).flush({
      accessToken: 'new-token', expiresAt: Date.now() + 3600_000,
      user: { id: 1, email: 'a@b.com', firstName: null, lastName: null, role: 'USER', emailVerified: true, tenantId: 1, tenantSlug: 't' },
    });
  });

  it('does not submit while already loading (no duplicate request)', () => {
    component.form.setValue(validForm());
    component.submit();
    component.submit();
    const reqs = httpMock.match(`${environment.apiUrl}/account/password`);
    expect(reqs).toHaveLength(1);
    reqs[0].flush({
      accessToken: 'new-token', expiresAt: Date.now() + 3600_000,
      user: { id: 1, email: 'a@b.com', firstName: null, lastName: null, role: 'USER', emailVerified: true, tenantId: 1, tenantSlug: 't' },
    });
  });

  it('replaces the in-memory access token with the fresh one on success (session stays alive)', () => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/account/password`).flush({
      accessToken: 'brand-new-token',
      expiresAt: Date.now() + 3600_000,
      user: { id: 1, email: 'a@b.com', firstName: null, lastName: null, role: 'USER', emailVerified: true, tenantId: 1, tenantSlug: 't' },
    });
    expect(auth.accessToken()).toBe('brand-new-token');
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('resets the form and stops loading on success', () => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/account/password`).flush({
      accessToken: 'brand-new-token', expiresAt: Date.now() + 3600_000,
      user: { id: 1, email: 'a@b.com', firstName: null, lastName: null, role: 'USER', emailVerified: true, tenantId: 1, tenantSlug: 't' },
    });
    expect(component.loading()).toBe(false);
    expect(component.form.value.currentPassword).toBeFalsy();
  });

  // ─── 401 / 429 (anti-énumération) ───────────────────────────────────────────

  it('shows an inline error on the current-password field with role="alert" on 401 (wrong current password)', () => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/account/password`).flush('', { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(component.currentPasswordError()).toBe('account.security.password.error_current_incorrect');
    expect(component.error()).toBeNull();
    const alert = fixture.nativeElement.querySelector('#current-password-error[role="alert"]');
    expect(alert).not.toBeNull();
  });

  it('shows the EXACT SAME inline message on 429 as on 401 (anti-énumération — indistinguishable)', () => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/account/password`).flush('', { status: 429, statusText: 'Too Many Requests' });
    fixture.detectChanges();
    expect(component.currentPasswordError()).toBe('account.security.password.error_current_incorrect');
    expect(component.error()).toBeNull();
  });

  it('does not show a generic toast/banner for 401 (inline field error only, per AC)', () => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/account/password`).flush('', { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.account__error')).toBeNull();
  });

  it('shows a generic banner error on 500 (not the inline current-password error)', () => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/account/password`).flush('', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(component.error()).toBe('account.security.password.error_generic');
    expect(component.currentPasswordError()).toBeNull();
  });

  it('clears the previous inline current-password error as soon as the user retypes it', () => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/account/password`).flush('', { status: 401, statusText: 'Unauthorized' });
    expect(component.currentPasswordError()).not.toBeNull();
    component.form.controls.currentPassword.setValue('AnotherTry1!');
    expect(component.currentPasswordError()).toBeNull();
  });

  // ─── Accessibility ───────────────────────────────────────────────────────

  it('show/hide buttons expose an adapted aria-label per field', () => {
    fixture.detectChanges();
    const toggles: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.toggle-password'));
    expect(toggles).toHaveLength(3);
    toggles.forEach(btn => expect(btn.getAttribute('aria-label')).toContain('show_password'));
    component.showCurrentPassword.set(true);
    fixture.detectChanges();
    expect(toggles[0].getAttribute('aria-label')).toContain('hide_password');
  });

  it('links the new-password input to the reused PasswordStrengthComponent via aria-describedby', () => {
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#newPassword');
    expect(input?.getAttribute('aria-describedby')).toBe('change-password-meter change-password-criteria');
  });

  it('has a main landmark with an aria-label', () => {
    fixture.detectChanges();
    const main = fixture.nativeElement.querySelector('main');
    expect(main).not.toBeNull();
    expect(main?.getAttribute('aria-label')).toBeTruthy();
  });
});
