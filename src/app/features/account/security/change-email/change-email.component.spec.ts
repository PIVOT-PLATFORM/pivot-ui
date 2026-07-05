import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ChangeEmailComponent } from './change-email.component';
import { environment } from '../../../../../environments/environment';

@Component({ template: '', standalone: true })
class StubComponent {}

describe('ChangeEmailComponent', () => {
  let fixture: ComponentFixture<ChangeEmailComponent>;
  let component: ChangeEmailComponent;
  let httpMock: HttpTestingController;

  const validForm = () => ({
    newEmail: 'nouvelle@exemple.com',
    currentPassword: 'CurrentPass1!',
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ChangeEmailComponent,
        TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: StubComponent }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangeEmailComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
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
    httpMock.expectNone(`${environment.apiUrl}/account/email`);
    expect(component.loading()).toBe(false);
  });

  it('button stays disabled while newEmail is not a valid email', () => {
    component.form.setValue({ ...validForm(), newEmail: 'not-an-email' });
    expect(component.form.invalid).toBe(true);
  });

  it('button becomes enabled once both fields are filled and valid', () => {
    component.form.setValue(validForm());
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(btn?.disabled).toBe(false);
  });

  // ─── Champs / accessibilité ──────────────────────────────────────────────

  it('newEmail input has autocomplete="email"', () => {
    const input = fixture.nativeElement.querySelector('#newEmail');
    expect(input?.getAttribute('autocomplete')).toBe('email');
  });

  it('currentPassword input has autocomplete="current-password"', () => {
    const input = fixture.nativeElement.querySelector('#currentPassword');
    expect(input?.getAttribute('autocomplete')).toBe('current-password');
  });

  it('shows a required error with role="alert" when newEmail is touched and empty', () => {
    component.form.controls.newEmail.markAsTouched();
    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector('#new-email-error[role="alert"]');
    expect(alert).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#newEmail')?.getAttribute('aria-describedby')).toBe('new-email-error');
  });

  it('shows an invalid-format error once newEmail is touched with a malformed value', () => {
    component.form.controls.newEmail.setValue('not-an-email');
    component.form.controls.newEmail.markAsTouched();
    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector('#new-email-error[role="alert"]');
    expect(alert?.textContent).toContain('account.security.email.invalid_email');
  });

  it('shows a required error with role="alert" and matching aria-describedby when currentPassword is touched and empty', () => {
    component.form.controls.currentPassword.markAsTouched();
    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector('#current-password-error[role="alert"]');
    expect(alert).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#currentPassword')?.getAttribute('aria-describedby')).toBe(
      'current-password-error',
    );
  });

  it('has a main landmark with an aria-label', () => {
    fixture.detectChanges();
    const main = fixture.nativeElement.querySelector('main');
    expect(main).not.toBeNull();
    expect(main?.getAttribute('aria-label')).toBeTruthy();
  });

  // ─── Submission ────────────────────────────────────────────────────────────

  it('POSTs newEmail/currentPassword to /account/email on submit', () => {
    component.form.setValue(validForm());
    component.submit();
    const req = httpMock.expectOne(`${environment.apiUrl}/account/email`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(validForm());
    req.flush(null, { status: 202, statusText: 'Accepted' });
  });

  it('disables the submit button and shows a spinner while the request is in-flight', () => {
    component.form.setValue(validForm());
    component.submit();
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(btn?.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.spinner')).not.toBeNull();
    httpMock.expectOne(`${environment.apiUrl}/account/email`).flush(null, { status: 202, statusText: 'Accepted' });
  });

  it('does not submit while already loading (no duplicate request)', () => {
    component.form.setValue(validForm());
    component.submit();
    component.submit();
    const reqs = httpMock.match(`${environment.apiUrl}/account/email`);
    expect(reqs).toHaveLength(1);
    reqs[0].flush(null, { status: 202, statusText: 'Accepted' });
  });

  // ─── Anti-énumération : 202 toujours, même état, doublon ou non ─────────────

  it('shows the persistent "sent" state on a plain 202 (address available)', () => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/account/email`).flush(null, { status: 202, statusText: 'Accepted' });
    fixture.detectChanges();
    expect(component.sent()).toBe(true);
    expect(component.loading()).toBe(false);
    expect(fixture.nativeElement.querySelector('.account__sent')).not.toBeNull();
  });

  it('shows the EXACT SAME persistent "sent" state on a 202 that is actually a duplicate-target case (anti-énumération)', () => {
    // Le backend ne renvoie AUCUN signal distinguant ce cas d'un succès réel — le
    // frontend ne doit contenir aucune branche capable de le faire non plus. On simule
    // ici le cas doublon exactement comme le cas "adresse libre" : même 202, même corps
    // vide — et on vérifie que le composant se comporte de façon strictement identique.
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/account/email`).flush(null, { status: 202, statusText: 'Accepted' });
    fixture.detectChanges();
    expect(component.sent()).toBe(true);
    expect(component.error()).toBeNull();
    expect(component.currentPasswordError()).toBeNull();
    expect(component.rateLimitError()).toBeNull();
  });

  it('does not show a toast — the confirmation is the persistent block only', () => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/account/email`).flush(null, { status: 202, statusText: 'Accepted' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('piv-toast')).toBeNull();
  });

  // ─── 401 / 429 / generic ─────────────────────────────────────────────────

  it('shows an inline error on the current-password field with role="alert" on 401 (wrong current password)', () => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/account/email`).flush('', { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(component.currentPasswordError()).toBe('account.security.email.error_current_incorrect');
    expect(component.sent()).toBe(false);
    const alert = fixture.nativeElement.querySelector('#current-password-error[role="alert"]');
    expect(alert).not.toBeNull();
  });

  it('shows a dedicated rate-limit banner on 429 (not the current-password field)', () => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/account/email`).flush('', { status: 429, statusText: 'Too Many Requests' });
    fixture.detectChanges();
    expect(component.rateLimitError()).toBe('account.security.email.error_rate_limit');
    expect(component.currentPasswordError()).toBeNull();
    expect(component.sent()).toBe(false);
  });

  it('shows a generic banner error on 400/500 (not the inline current-password error)', () => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/account/email`).flush('', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(component.error()).toBe('account.security.email.error_generic');
    expect(component.currentPasswordError()).toBeNull();
  });

  it('clears the previous inline current-password error as soon as the user retypes it', () => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/account/email`).flush('', { status: 401, statusText: 'Unauthorized' });
    expect(component.currentPasswordError()).not.toBeNull();
    component.form.controls.currentPassword.setValue('AnotherTry1!');
    expect(component.currentPasswordError()).toBeNull();
  });
});
