import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute, Router } from '@angular/router';
import { Component } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { LoginComponent } from './login.component';
import { GOOGLE_CLIENT_ID } from '../../../../app.config';
import { PostLoginRedirectService } from '../../../../core/auth/service/post-login-redirect.service';
import { environment } from '../../../../../environments/environment';
import { ensureLocalStorageStub } from '../../../../core/i18n/testing/local-storage-stub';

ensureLocalStorageStub();

@Component({ template: '', standalone: true })
class StubComponent {}

const mockAuthResponse = {
  accessToken: 'tok',
  expiresAt: Date.now() + 3600_000,
  user: { id: 1, email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'USER', emailVerified: true, tenantId: 1, tenantSlug: 'test' },
};

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: StubComponent }]),
        { provide: GOOGLE_CLIENT_ID, useValue: '' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
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
    httpMock.expectNone(`${environment.apiUrl}/auth/login`);
    expect(component.loading()).toBe(false);
  });

  it('sets loading during submit', () => {
    component.form.setValue({ email: 'a@b.com', password: 'secret', rememberMe: false });
    component.submit();
    expect(component.loading()).toBe(true);
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockAuthResponse);
  });

  it('loading stays true after success (navigation, pas de reset)', () => {
    component.form.setValue({ email: 'a@b.com', password: 'secret', rememberMe: false });
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockAuthResponse);
    // Le composant navigue (redirection post-login) sans reset loading — comportement intentionnel.
    expect(component.loading()).toBe(true);
  });

  it('sets error on 401', () => {
    component.form.setValue({ email: 'a@b.com', password: 'wrong', rememberMe: false });
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush('', { status: 401, statusText: 'Unauthorized' });
    expect(component.error()).toBe('auth.login.error_generic_credentials');
  });

  it('sets error on 403', () => {
    component.form.setValue({ email: 'a@b.com', password: 'wrong', rememberMe: false });
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush('', { status: 403, statusText: 'Forbidden' });
    expect(component.error()).toBe('auth.login.error_generic_credentials');
  });

  it('sets error on 429', () => {
    component.form.setValue({ email: 'a@b.com', password: 'pw', rememberMe: false });
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush('', { status: 429, statusText: 'Too Many Requests' });
    expect(component.error()).toBe('auth.login.error_rate_limit');
  });

  it('sets generic error on 500', () => {
    component.form.setValue({ email: 'a@b.com', password: 'pw', rememberMe: false });
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush('', { status: 500, statusText: 'Server Error' });
    expect(component.error()).toBe('auth.login.error_generic');
  });

  it('does not submit while already loading', () => {
    component.form.setValue({ email: 'a@b.com', password: 'pw', rememberMe: false });
    component.submit();
    component.submit();
    const reqs = httpMock.match(`${environment.apiUrl}/auth/login`);
    expect(reqs).toHaveLength(1);
    reqs[0].flush(mockAuthResponse);
  });

  it('googleEnabled is false when no Google client ID', () => {
    expect(component.googleEnabled()).toBe(false);
  });

  it('onGoogleLogin sets error when Google not configured', () => {
    component.onGoogleLogin();
    expect(component.error()).toBe('auth.login.error_google_not_configured');
  });
});

/**
 * US01.1.4 — Redirection post-login :
 * - returnUrl valide → navigation vers la cible ;
 * - pas de returnUrl → /home ;
 * - open redirect (URL absolue / externe / protocol-relative) → /home ;
 * - priorité : query param > session Angular ;
 * - flux MFA (202) : returnUrl basculé en session Angular.
 */
describe('LoginComponent — redirection post-login (US01.1.4)', () => {
  function setup(returnUrl: string | null): {
    component: LoginComponent;
    httpMock: HttpTestingController;
    navSpy: ReturnType<typeof vi.spyOn>;
  } {
    TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: StubComponent }]),
        { provide: GOOGLE_CLIENT_ID, useValue: '' },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: { get: (key: string) => (key === 'returnUrl' ? returnUrl : null) },
            },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const httpMock = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    return { component: fixture.componentInstance, httpMock, navSpy };
  }

  function submitAndFlush(component: LoginComponent, httpMock: HttpTestingController): void {
    component.form.setValue({ email: 'a@b.com', password: 'secret', rememberMe: false });
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockAuthResponse);
  }

  afterEach(() => TestBed.resetTestingModule());

  it('succès avec returnUrl interne valide → navigation vers la cible', () => {
    const { component, httpMock, navSpy } = setup('/dashboard?tab=2');
    submitAndFlush(component, httpMock);
    expect(navSpy).toHaveBeenCalledWith('/dashboard?tab=2');
    httpMock.verify();
  });

  it('succès sans returnUrl → navigation vers /home (AC défaut)', () => {
    const { component, httpMock, navSpy } = setup(null);
    submitAndFlush(component, httpMock);
    expect(navSpy).toHaveBeenCalledWith('/home');
    httpMock.verify();
  });

  it('open redirect — returnUrl externe https://evil.com ignoré → /home', () => {
    const { component, httpMock, navSpy } = setup('https://evil.com');
    submitAndFlush(component, httpMock);
    expect(navSpy).toHaveBeenCalledWith('/home');
    expect(navSpy).not.toHaveBeenCalledWith('https://evil.com');
    httpMock.verify();
  });

  it('open redirect — returnUrl protocol-relative //evil.com ignoré → /home', () => {
    const { component, httpMock, navSpy } = setup('//evil.com');
    submitAndFlush(component, httpMock);
    expect(navSpy).toHaveBeenCalledWith('/home');
    httpMock.verify();
  });

  it('open redirect — returnUrl javascript: ignoré → /home', () => {
    const { component, httpMock, navSpy } = setup('javascript:alert(1)');
    submitAndFlush(component, httpMock);
    expect(navSpy).toHaveBeenCalledWith('/home');
    httpMock.verify();
  });

  it('priorité : le query param gagne sur la session Angular (AC priorité)', () => {
    const { component, httpMock, navSpy } = setup('/dashboard');
    TestBed.inject(PostLoginRedirectService).remember('/teams');
    submitAndFlush(component, httpMock);
    expect(navSpy).toHaveBeenCalledWith('/dashboard');
    httpMock.verify();
  });

  it('session Angular utilisée quand le query param est absent', () => {
    const { component, httpMock, navSpy } = setup(null);
    TestBed.inject(PostLoginRedirectService).remember('/teams');
    submitAndFlush(component, httpMock);
    expect(navSpy).toHaveBeenCalledWith('/teams');
    httpMock.verify();
  });

  it('flux MFA (202) : returnUrl basculé en session Angular pour device-confirm', () => {
    const { component, httpMock, navSpy } = setup('/dashboard?tab=2');
    component.form.setValue({ email: 'a@b.com', password: 'secret', rememberMe: false });
    component.submit();
    httpMock
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush(null, { status: 202, statusText: 'Accepted' });

    expect(component.requiresDeviceVerification()).toBe(true);
    expect(navSpy).not.toHaveBeenCalled();
    // La valeur est disponible pour la fin du flux MFA (device-confirm)
    expect(TestBed.inject(PostLoginRedirectService).resolveTarget(null)).toBe('/dashboard?tab=2');
    httpMock.verify();
  });
});
