import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { ContactComponent } from './contact.component';
import { TranslocoService } from '@jsverse/transloco';
import { environment } from '../../../environments/environment';

// ─── Stub ────────────────────────────────────────────────────────────────────

@Component({ template: '', standalone: true })
class StubComponent {}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ContactComponent', () => {
  let fixture: ComponentFixture<ContactComponent>;
  let component: ContactComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    const translocoStub = { getActiveLang: () => 'fr' } as unknown as TranslocoService;

    await TestBed.configureTestingModule({
      imports: [ContactComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: StubComponent }]),
        { provide: TranslocoService, useValue: translocoStub },
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

  it('hides form after successful submission', () => {
    component.submitted.set(true);
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form');
    expect(form).toBeNull();
  });

  // ─── Accessibility ───────────────────────────────────────────────────────

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
