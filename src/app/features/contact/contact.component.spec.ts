import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { ContactComponent } from './contact.component';

// ─── Stub ────────────────────────────────────────────────────────────────────

@Component({ template: '', standalone: true })
class StubComponent {}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ContactComponent', () => {
  let fixture: ComponentFixture<ContactComponent>;
  let component: ContactComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactComponent],
      providers: [
        provideRouter([{ path: '**', component: StubComponent }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─── Mount ───────────────────────────────────────────────────────────────

  it('mounts without error', () => {
    expect(component).toBeTruthy();
  });

  // ─── Email link ──────────────────────────────────────────────────────────

  it('email link has correct mailto href', () => {
    const emailLink = fixture.nativeElement.querySelector('[data-testid="contact-email"]');
    expect(emailLink).not.toBeNull();
    expect(emailLink?.getAttribute('href')).toBe('mailto:contact@pivot.app');
  });

  it('GitHub link points to PIVOT-PLATFORM organization', () => {
    const links: NodeListOf<HTMLAnchorElement> = fixture.nativeElement.querySelectorAll('a[href]');
    const githubLink = Array.from(links).find(a => a.href.includes('github.com/PIVOT-PLATFORM'));
    expect(githubLink).not.toBeNull();
  });

  // ─── Form validation ─────────────────────────────────────────────────────

  it('shows error when submitting empty form', () => {
    component.onSubmit();
    fixture.detectChanges();
    expect(component.nameError()).toBe('Le nom est requis.');
    expect(component.emailError()).toBe("L'email est requis.");
    expect(component.messageError()).toBe('Le message est requis.');
  });

  it('shows email format error for invalid email', () => {
    component.form.name = 'Alice';
    component.form.email = 'not-an-email';
    component.form.message = 'Hello';
    component.onSubmit();
    fixture.detectChanges();
    expect(component.emailError()).toBe('Adresse email invalide.');
  });

  it('shows success state on valid submission', () => {
    component.form.name = 'Alice';
    component.form.email = 'alice@example.com';
    component.form.message = 'Bonjour, ceci est un test.';
    component.onSubmit();
    fixture.detectChanges();
    expect(component.submitted()).toBe(true);
    const success = fixture.nativeElement.querySelector('.contact__success');
    expect(success).not.toBeNull();
  });

  it('resets form fields after successful submission', () => {
    component.form.name = 'Alice';
    component.form.email = 'alice@example.com';
    component.form.message = 'Test message.';
    component.onSubmit();
    expect(component.form.name).toBe('');
    expect(component.form.email).toBe('');
    expect(component.form.message).toBe('');
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

  it('all external links have rel="noopener noreferrer"', () => {
    const externalLinks: NodeListOf<HTMLAnchorElement> = fixture.nativeElement.querySelectorAll('a[target="_blank"]');
    externalLinks.forEach(link => {
      expect(link.rel).toContain('noopener');
      expect(link.rel).toContain('noreferrer');
    });
  });
});
