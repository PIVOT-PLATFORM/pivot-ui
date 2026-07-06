import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { TranslocoTestingModule, TranslocoService } from '@jsverse/transloco';
import { LanguageSyncService } from './language-sync.service';
import { AuthService, AuthResponse } from '../auth/service/auth.service';
import { environment } from '../../../environments/environment';
import { ensureLocalStorageStub } from './testing/local-storage-stub';

ensureLocalStorageStub();

const TRANSLATIONS = { any: { key: 'value' } };

@Component({ template: '', standalone: true })
class StubComponent {}

const mockUser = {
  id: 1,
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'USER',
  emailVerified: true,
  tenantId: 1,
  tenantSlug: 'test-tenant',
};

const authResponse = (preferredLanguage: 'fr' | 'en'): AuthResponse => ({
  accessToken: 'tok',
  expiresAt: Date.now() + 3_600_000,
  user: { ...mockUser, preferredLanguage },
});

describe('LanguageSyncService', () => {
  let httpMock: HttpTestingController;
  let auth: AuthService;
  let transloco: TranslocoService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { fr: TRANSLATIONS, en: TRANSLATIONS },
          translocoConfig: { defaultLang: 'fr', availableLangs: ['fr', 'en'] },
          preloadLangs: true,
        }),
      ],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: '**', component: StubComponent }])],
    });

    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    transloco = TestBed.inject(TranslocoService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('does nothing before any login (no user yet)', () => {
    transloco.setActiveLang('fr');
    TestBed.inject(LanguageSyncService);
    TestBed.flushEffects();

    expect(transloco.getActiveLang()).toBe('fr');
  });

  it('applies preferredLanguage from the login response, overriding a stale localStorage value', () => {
    localStorage.setItem('pivot_lang', 'fr');
    transloco.setActiveLang('fr');
    TestBed.inject(LanguageSyncService);

    auth.login({ email: 'a@b.com', password: 'pw' }).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(authResponse('en'));
    TestBed.flushEffects();

    expect(transloco.getActiveLang()).toBe('en');
    expect(localStorage.getItem('pivot_lang')).toBe('en');
  });

  it('applies preferredLanguage again on session restore (refresh)', () => {
    TestBed.inject(LanguageSyncService);

    auth.refresh().subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/refresh`).flush(authResponse('en'));
    TestBed.flushEffects();

    expect(transloco.getActiveLang()).toBe('en');
  });

  it('is a no-op when preferredLanguage is missing from the response (defensive)', () => {
    transloco.setActiveLang('fr');
    TestBed.inject(LanguageSyncService);

    auth.login({ email: 'a@b.com', password: 'pw' }).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush({
      accessToken: 'tok',
      expiresAt: Date.now() + 3_600_000,
      user: mockUser, // no preferredLanguage field at all
    });
    TestBed.flushEffects();

    expect(transloco.getActiveLang()).toBe('fr');
  });
});
