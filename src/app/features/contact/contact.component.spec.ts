import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { ContactComponent } from './contact.component';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { environment } from '../../../environments/environment';

// ─── Stub ────────────────────────────────────────────────────────────────────

@Component({ template: '', standalone: true })
class StubComponent {}

const frTranslations = {
  contact: {
    title: 'Nous contacter',
    subtitle: "Une question ? Un problème ? L'équipe PIVOT vous répond.",
    main_aria: 'Page de contact',
    form_aria: 'Formulaire de contact',
    form: {
      title: 'Envoyer un message',
      email: 'Email',
      email_placeholder: 'jean.dupont@example.com',
      email_required: "L'email est requis.",
      email_invalid: 'Adresse email invalide.',
      message: 'Message',
      message_placeholder: 'Décrivez votre demande…',
      message_required: 'Le message est requis.',
      submit: 'Envoyer le message',
      submit_loading: 'Envoi en cours…',
    },
    success: 'Message envoyé ! Un email de confirmation vous a été adressé.',
    error: "Une erreur s'est produite. Veuillez réessayer ou nous écrire directement à contact@pivot.app.",
  },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ContactComponent', () => {
  let fixture: ComponentFixture<ContactComponent>;
  let component: ContactComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ContactComponent,
        TranslocoTestingModule.forRoot({
          langs: { fr: frTranslations, en: {} },
          translocoConfig: { defaultLang: 'fr', availableLangs: ['fr', 'en'] },
        }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: StubComponent }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => { httpMock.verify(); });

  // ─── Mount ───────────────────────────────────────────────────────────────

  it('mounts without error', () => {
    expect(component).toBeTruthy();
  });

  // ─── Form validation ─────────────────────────────────────────────────────

  it('shows error when submitting empty form', () => {
    component.onSubmit();
    fixture.detectChanges();
    expect(component.emailError()).toBe("L'email est requis.");
    expect(component.messageError()).toBe('Le message est requis.');
    httpMock.expectNone(`${environment.apiUrl}/contact`);
  });

  it('shows email format error for invalid email', () => {
    component.form.email = 'not-an-email';
    component.form.message = 'Hello';
    component.onSubmit();
    fixture.detectChanges();
    expect(component.emailError()).toBe('Adresse email invalide.');
    httpMock.expectNone(`${environment.apiUrl}/contact`);
  });

  it('accepts email with subdomain (alice@sub.domain.com)', () => {
    component.form.email = 'alice@sub.domain.com';
    component.form.message = 'Test';
    component.onSubmit();
    expect(component.emailError()).toBe('');
    httpMock.expectOne(`${environment.apiUrl}/contact`).flush(null, { status: 202, statusText: 'Accepted' });
  });

  it('accepts email with multi-part TLD (alice@domain.co.uk)', () => {
    component.form.email = 'alice@domain.co.uk';
    component.form.message = 'Test';
    component.onSubmit();
    expect(component.emailError()).toBe('');
    httpMock.expectOne(`${environment.apiUrl}/contact`).flush(null, { status: 202, statusText: 'Accepted' });
  });

  // ─── API call ─────────────────────────────────────────────────────────────

  it('calls POST /api/contact with email, message and lang on valid submission', () => {
    component.form.email = 'alice@example.com';
    component.form.message = 'Bonjour, ceci est un test.';
    component.onSubmit();
    const req = httpMock.expectOne(`${environment.apiUrl}/contact`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'alice@example.com',
      message: 'Bonjour, ceci est un test.',
      lang: 'fr',
    });
    req.flush(null, { status: 202, statusText: 'Accepted' });
  });

  it('shows success state on 202 response', () => {
    component.form.email = 'alice@example.com';
    component.form.message = 'Test.';
    component.onSubmit();
    httpMock.expectOne(`${environment.apiUrl}/contact`).flush(null, { status: 202, statusText: 'Accepted' });
    fixture.detectChanges();
    expect(component.submitted()).toBe(true);
    const success = fixture.nativeElement.querySelector('[data-testid="contact-success"]');
    expect(success).not.toBeNull();
  });

  it('resets form fields after successful submission', () => {
    component.form.email = 'alice@example.com';
    component.form.message = 'Test message.';
    component.onSubmit();
    httpMock.expectOne(`${environment.apiUrl}/contact`).flush(null, { status: 202, statusText: 'Accepted' });
    expect(component.form.email).toBe('');
    expect(component.form.message).toBe('');
  });

  it('shows submit error when API fails', () => {
    component.form.email = 'alice@example.com';
    component.form.message = 'Test';
    component.onSubmit();
    httpMock.expectOne(`${environment.apiUrl}/contact`).flush(
      { message: 'Server error' }, { status: 500, statusText: 'Internal Server Error' },
    );
    fixture.detectChanges();
    expect(component.submitError()).toContain('erreur');
    expect(component.submitted()).toBe(false);
  });

  it('disables submit button while request is in-flight, re-enables after response', () => {
    component.form.email = 'alice@example.com';
    component.form.message = 'Test';
    component.onSubmit();
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(btn?.disabled).toBe(true);
    httpMock.expectOne(`${environment.apiUrl}/contact`).flush(null, { status: 202, statusText: 'Accepted' });
    expect(component.loading()).toBe(false);
  });

  it('hides form after successful submission', () => {
    component.submitted.set(true);
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form');
    expect(form).toBeNull();
  });

  // ─── Accessibility ───────────────────────────────────────────────────────

  it('sets aria-invalid on email field when validation fails', () => {
    component.form.email = 'not-an-email';
    component.form.message = 'Hello';
    component.onSubmit();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#contact-email');
    expect(input?.getAttribute('aria-invalid')).toBe('true');
  });

  it('sets aria-invalid on message field when validation fails', () => {
    component.form.email = 'alice@example.com';
    component.form.message = '';
    component.onSubmit();
    fixture.detectChanges();
    const textarea = fixture.nativeElement.querySelector('#contact-message');
    expect(textarea?.getAttribute('aria-invalid')).toBe('true');
  });

  it('has a main landmark with aria-label', () => {
    const main = fixture.nativeElement.querySelector('main');
    expect(main?.getAttribute('aria-label')).toBe('Page de contact');
  });

  it('heading hierarchy: h1 then h2', () => {
    const h1 = fixture.nativeElement.querySelector('h1');
    const h2 = fixture.nativeElement.querySelector('h2');
    expect(h1?.textContent?.trim()).toBe('Nous contacter');
    expect(h2?.textContent?.trim()).toBe('Envoyer un message');
  });
});
