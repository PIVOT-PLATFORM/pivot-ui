import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TranslocoTestingModule, TranslocoService } from '@jsverse/transloco';
import { LanguagePreferenceService } from './language-preference.service';
import { ToastService } from '../../shared/toast/toast.service';
import { environment } from '../../../environments/environment';
import { ensureLocalStorageStub } from './testing/local-storage-stub';

ensureLocalStorageStub();

const TRANSLATIONS = { any: { key: 'value' } };

describe('LanguagePreferenceService', () => {
  let service: LanguagePreferenceService;
  let httpMock: HttpTestingController;
  let transloco: TranslocoService;
  let toast: ToastService;

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
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(LanguagePreferenceService);
    httpMock = TestBed.inject(HttpTestingController);
    transloco = TestBed.inject(TranslocoService);
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('creates the service', () => {
    expect(service).toBeTruthy();
  });

  describe('getActiveLanguage()', () => {
    it('returns the current Transloco active lang', () => {
      transloco.setActiveLang('en');
      expect(service.getActiveLanguage()).toBe('en');
    });

    it('defaults to fr for an unsupported active lang', () => {
      transloco.setActiveLang('de');
      expect(service.getActiveLanguage()).toBe('fr');
    });
  });

  describe('apply()', () => {
    it('switches the Transloco active lang', () => {
      service.apply('en');
      expect(transloco.getActiveLang()).toBe('en');
    });

    it('persists the lang to localStorage under pivot_lang', () => {
      service.apply('en');
      expect(localStorage.getItem('pivot_lang')).toBe('en');
    });
  });

  describe('applyFromServer()', () => {
    it('applies a valid server value, overwriting a different localStorage value (source-of-truth conflict rule)', () => {
      localStorage.setItem('pivot_lang', 'fr');
      transloco.setActiveLang('fr');

      service.applyFromServer('en');

      expect(transloco.getActiveLang()).toBe('en');
      expect(localStorage.getItem('pivot_lang')).toBe('en');
    });

    it('is a no-op for an unsupported value (defensive — backend contract guarantees fr/en)', () => {
      transloco.setActiveLang('fr');
      service.applyFromServer('de');
      expect(transloco.getActiveLang()).toBe('fr');
    });

    it('is a no-op for null/undefined', () => {
      transloco.setActiveLang('fr');
      service.applyFromServer(null);
      service.applyFromServer(undefined);
      expect(transloco.getActiveLang()).toBe('fr');
    });
  });

  describe('saveAndApply()', () => {
    it('switches the language instantly, before the PATCH resolves (optimistic)', () => {
      service.saveAndApply('en');
      expect(transloco.getActiveLang()).toBe('en');
      expect(localStorage.getItem('pivot_lang')).toBe('en');

      httpMock.expectOne(`${environment.apiUrl}/account/profile`).flush({ preferredLanguage: 'en' });
    });

    it('PATCHes /account/profile with exactly { preferredLanguage }', () => {
      service.saveAndApply('en');

      const req = httpMock.expectOne(`${environment.apiUrl}/account/profile`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ preferredLanguage: 'en' });

      req.flush({ preferredLanguage: 'en' });
    });

    it('sets saving() true while the request is in flight, then false on success', () => {
      service.saveAndApply('en');
      expect(service.saving()).toBe(true);

      httpMock.expectOne(`${environment.apiUrl}/account/profile`).flush({ preferredLanguage: 'en' });
      expect(service.saving()).toBe(false);
    });

    it('shows a confirmation toast (rendered in the new language, since the switch already happened) on success', () => {
      service.saveAndApply('en');
      httpMock.expectOne(`${environment.apiUrl}/account/profile`).flush({ preferredLanguage: 'en' });

      expect(toast.toasts().some(t => t.messageKey === 'account.preferences.success' && t.type === 'info')).toBe(true);
    });

    it('reverts to the previous language and shows an error toast on a network failure', () => {
      transloco.setActiveLang('fr');
      localStorage.setItem('pivot_lang', 'fr');

      service.saveAndApply('en');
      expect(transloco.getActiveLang()).toBe('en'); // optimistic switch happened

      httpMock.expectOne(`${environment.apiUrl}/account/profile`).flush('Network error', { status: 0, statusText: 'Unknown Error' });

      expect(transloco.getActiveLang()).toBe('fr');
      expect(localStorage.getItem('pivot_lang')).toBe('fr');
      expect(service.saving()).toBe(false);
      expect(toast.toasts().some(t => t.messageKey === 'account.preferences.error_save_generic' && t.type === 'error')).toBe(true);
    });

    it('reverts on a 400 INVALID_PREFERRED_LANGUAGE (should never happen from a 2-option select, but the contract allows it)', () => {
      transloco.setActiveLang('fr');
      service.saveAndApply('en');

      httpMock
        .expectOne(`${environment.apiUrl}/account/profile`)
        .flush({ error: 'INVALID_PREFERRED_LANGUAGE' }, { status: 400, statusText: 'Bad Request' });

      expect(transloco.getActiveLang()).toBe('fr');
    });

    it('is a no-op when the requested lang is already active (no PATCH fired)', () => {
      transloco.setActiveLang('fr');
      service.saveAndApply('fr');
      httpMock.expectNone(`${environment.apiUrl}/account/profile`);
    });

    it('is a no-op when a save is already in flight', () => {
      service.saveAndApply('en');
      service.saveAndApply('fr');

      const reqs = httpMock.match(`${environment.apiUrl}/account/profile`);
      expect(reqs).toHaveLength(1);
      reqs[0].flush({ preferredLanguage: 'en' });
    });
  });
});
