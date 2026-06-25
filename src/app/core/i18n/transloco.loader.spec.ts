import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TranslocoHttpLoader } from './transloco.loader';

describe('TranslocoHttpLoader', () => {
  let loader: TranslocoHttpLoader;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    loader = TestBed.inject(TranslocoHttpLoader);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('fetches translation file for the given lang', () => {
    let result: unknown;
    loader.getTranslation('fr').subscribe(t => (result = t));

    const req = httpMock.match(r => r.url.startsWith('/assets/i18n/fr.json'))[0];
    expect(req.request.method).toBe('GET');
    req.flush({ common: { logo: 'PIVOT' } });

    expect(result).toEqual({ common: { logo: 'PIVOT' } });
  });

  it('appends cache-busting query param', () => {
    loader.getTranslation('en').subscribe();
    const req = httpMock.match(r => r.url.startsWith('/assets/i18n/en.json'))[0];
    expect(req.request.url).toContain('?v=');
    req.flush({});
  });
});
