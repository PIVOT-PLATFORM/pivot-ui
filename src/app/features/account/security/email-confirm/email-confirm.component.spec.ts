import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { Component } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { EmailConfirmComponent } from './email-confirm.component';
import { environment } from '../../../../../environments/environment';

@Component({ template: '', standalone: true })
class StubComponent {}

/** Construit le composant avec un token de query string donné (ou aucun). */
function setup(token: string | null): {
  fixture: ComponentFixture<EmailConfirmComponent>;
  component: EmailConfirmComponent;
  httpMock: HttpTestingController;
} {
  TestBed.configureTestingModule({
    imports: [
      EmailConfirmComponent,
      TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } }),
    ],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: '**', component: StubComponent }]),
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => token } } } },
    ],
  });
  const fixture = TestBed.createComponent(EmailConfirmComponent);
  const component = fixture.componentInstance;
  const httpMock = TestBed.inject(HttpTestingController);
  fixture.detectChanges(); // déclenche ngOnInit
  return { fixture, component, httpMock };
}

describe('EmailConfirmComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('passe en "invalid" sans appel réseau quand aucun token n\'est présent', () => {
    const { component, httpMock } = setup(null);
    httpMock.expectNone(r => r.url === `${environment.apiUrl}/account/email/confirm`);
    expect(component.state()).toBe('invalid');
    httpMock.verify();
  });

  it('état initial est "loading" quand un token est fourni', () => {
    const { component, httpMock } = setup('some-token');
    expect(component.state()).toBe('loading');
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/account/email/confirm`).flush(null);
    httpMock.verify();
  });

  it('passe en "success" quand le backend confirme (200)', () => {
    const { fixture, component, httpMock } = setup('valid-token');
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/account/email/confirm`).flush(null);
    fixture.detectChanges();
    expect(component.state()).toBe('success');
    httpMock.verify();
  });

  it('passe en "invalid" sur 400 EMAIL_CHANGE_TOKEN_INVALID, avec la clé i18n statique correspondante', () => {
    const { fixture, component, httpMock } = setup('bad-token');
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/account/email/confirm`)
      .flush({ code: 'EMAIL_CHANGE_TOKEN_INVALID' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(component.state()).toBe('invalid');
    const title: HTMLElement = fixture.nativeElement.querySelector('.confirm-title');
    expect(title?.textContent).toContain('account.security.email.confirm.invalid_title');
    httpMock.verify();
  });

  it('passe en "expired" sur 400 EMAIL_CHANGE_TOKEN_EXPIRED, avec le CTA "Refaire la demande" et la clé i18n statique correspondante', () => {
    const { fixture, component, httpMock } = setup('expired-token');
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/account/email/confirm`)
      .flush({ code: 'EMAIL_CHANGE_TOKEN_EXPIRED' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(component.state()).toBe('expired');
    expect(component.showRetryCta()).toBe(true);
    const cta: HTMLAnchorElement = fixture.nativeElement.querySelector('.confirm-cta');
    expect(cta?.getAttribute('href')).toBe('/account/security/email');
    const title: HTMLElement = fixture.nativeElement.querySelector('.confirm-title');
    expect(title?.textContent).toContain('account.security.email.confirm.expired_title');
    httpMock.verify();
  });

  it('passe en "already_used" sur 410 Gone, avec la clé i18n statique correspondante', () => {
    const { fixture, component, httpMock } = setup('used-token');
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/account/email/confirm`)
      .flush({ code: 'EMAIL_CHANGE_TOKEN_ALREADY_USED' }, { status: 410, statusText: 'Gone' });
    fixture.detectChanges();
    expect(component.state()).toBe('already_used');
    expect(component.showRetryCta()).toBe(true);
    const title: HTMLElement = fixture.nativeElement.querySelector('.confirm-title');
    expect(title?.textContent).toContain('account.security.email.confirm.already_used_title');
    httpMock.verify();
  });

  it('passe en "target_taken" sur 409 Conflict, avec la clé i18n statique correspondante', () => {
    const { fixture, component, httpMock } = setup('token-race');
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/account/email/confirm`)
      .flush({ code: 'EMAIL_CHANGE_TARGET_TAKEN' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(component.state()).toBe('target_taken');
    expect(component.showRetryCta()).toBe(true);
    const title: HTMLElement = fixture.nativeElement.querySelector('.confirm-title');
    expect(title?.textContent).toContain('account.security.email.confirm.target_taken_title');
    httpMock.verify();
  });

  it('passe en "rate_limited" sur 429 et ne propose PAS le CTA "Refaire la demande" (relance immédiate inutile), avec la clé i18n statique correspondante', () => {
    const { fixture, component, httpMock } = setup('any-token');
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/account/email/confirm`)
      .flush({ code: 'RATE_LIMITED', retryAfterSeconds: 60 }, { status: 429, statusText: 'Too Many Requests' });
    fixture.detectChanges();
    expect(component.state()).toBe('rate_limited');
    expect(component.showRetryCta()).toBe(false);
    const cta: HTMLAnchorElement = fixture.nativeElement.querySelector('.confirm-cta');
    expect(cta?.getAttribute('href')).toBe('/home');
    const title: HTMLElement = fixture.nativeElement.querySelector('.confirm-title');
    expect(title?.textContent).toContain('account.security.email.confirm.rate_limited_title');
    httpMock.verify();
  });

  it('passe en "error" générique sur une panne réseau/5xx sans corps exploitable, avec la clé i18n statique correspondante', () => {
    const { fixture, component, httpMock } = setup('any-token');
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/account/email/confirm`)
      .flush('', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(component.state()).toBe('error');
    const title: HTMLElement = fixture.nativeElement.querySelector('.confirm-title');
    expect(title?.textContent).toContain('account.security.email.confirm.error_title');
    httpMock.verify();
  });

  it('le spinner de chargement est purement décoratif (aria-hidden) — le texte est porté par le <output> compagnon', () => {
    const { fixture, httpMock } = setup('some-token');
    const spinner: HTMLElement = fixture.nativeElement.querySelector('.confirm-spinner');
    expect(spinner?.getAttribute('aria-hidden')).toBe('true');
    expect(spinner?.hasAttribute('aria-label')).toBe(false);
    const hint: HTMLElement = fixture.nativeElement.querySelector('.confirm-hint');
    expect(hint?.tagName.toLowerCase()).toBe('output');
    expect(hint?.textContent).toContain('account.security.email.confirm.loading');
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/account/email/confirm`).flush(null);
    httpMock.verify();
  });

  it('affiche la carte marque PIVOT quel que soit l\'état (page publique, cohérente avec /auth/verify-email)', () => {
    const { fixture, httpMock } = setup('valid-token');
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/account/email/confirm`).flush(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.confirm-brand-icon')).not.toBeNull();
    httpMock.verify();
  });
});
