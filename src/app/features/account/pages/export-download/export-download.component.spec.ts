import { vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Component, importProvidersFrom } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { environment } from '../../../../../environments/environment';
import { ExportDownloadComponent } from './export-download.component';

@Component({ template: '', standalone: true })
class StubComponent {}

const TRANSLOCO_FR = {
  account: {
    rgpd: {
      export: {
        download: {
          title: 'Téléchargement de votre export',
          in_progress: 'Préparation de votre téléchargement…',
          success: 'Votre archive a été téléchargée.',
          success_back: "Retour à la page d'export",
          error_missing_token: 'Lien de téléchargement invalide.',
          error_forbidden: "Ce lien n'est pas associé à votre compte.",
          error_not_found: 'Lien introuvable ou déjà utilisé.',
          error_expired: 'Ce lien a expiré.',
          error_generic: 'Impossible de télécharger votre export. Réessayez plus tard.',
        },
      },
    },
  },
};

async function setup(initialToken: string | null): Promise<{
  fixture: ComponentFixture<ExportDownloadComponent>;
  component: ExportDownloadComponent;
  httpMock: HttpTestingController;
  queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
}> {
  const queryParamMap$ = new BehaviorSubject(
    convertToParamMap(initialToken !== null ? { token: initialToken } : {}),
  );

  await TestBed.configureTestingModule({
    imports: [ExportDownloadComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: '**', component: StubComponent }]),
      { provide: ActivatedRoute, useValue: { queryParamMap: queryParamMap$.asObservable() } },
      importProvidersFrom(
        TranslocoTestingModule.forRoot({
          langs: { fr: TRANSLOCO_FR, en: TRANSLOCO_FR },
          translocoConfig: { defaultLang: 'fr', availableLangs: ['fr', 'en'] },
          preloadLangs: true,
        }),
      ),
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(ExportDownloadComponent);
  const component = fixture.componentInstance;
  const httpMock = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, component, httpMock, queryParamMap$ };
}

const downloadUrl = (token: string): string => `${environment.apiUrl}/account/export/download/${token}`;

describe('ExportDownloadComponent', () => {
  let fixture: ComponentFixture<ExportDownloadComponent>;
  let httpMock: HttpTestingController;

  afterEach(() => {
    fixture?.destroy();
    httpMock?.verify();
  });

  it('shows the missing-token error and never calls the API when the query param is absent', async () => {
    ({ fixture, httpMock } = await setup(null));
    const component = fixture.componentInstance;

    expect(component.state()).toBe('error');
    expect(component.errorKey()).toBe('account.rgpd.export.download.error_missing_token');
    httpMock.expectNone(() => true);
  });

  it('AC-09 — downloads the blob and shows the success state', async () => {
    ({ fixture, httpMock } = await setup('tok-abc'));
    const component = fixture.componentInstance;

    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.useFakeTimers();

    const blob = new Blob(['zip'], { type: 'application/octet-stream' });
    httpMock.expectOne(downloadUrl('tok-abc')).flush(blob, {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Disposition': 'attachment; filename="pivot-export-1.zip"' },
    });
    fixture.detectChanges();

    expect(component.state()).toBe('success');
    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);

    vi.advanceTimersByTime(1000);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');

    vi.useRealTimers();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it('falls back to the default filename when Content-Disposition is missing', async () => {
    ({ fixture, httpMock } = await setup('tok-noheader'));
    const component = fixture.componentInstance;
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const anchor = document.createElement('a');
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string) => (tag === 'a' ? anchor : originalCreateElement(tag)));

    httpMock.expectOne(downloadUrl('tok-noheader')).flush(new Blob(['zip']), { status: 200, statusText: 'OK' });
    fixture.detectChanges();

    expect(component.state()).toBe('success');
    expect(anchor.download).toBe('pivot-export.zip');
    createElementSpy.mockRestore();
  });

  // 403 case is AC-08 (download link enforces requester === export owner, cross-user → 403);
  // 404/410/500 are defensive mappings beyond the literal AC text.
  it.each([
    [403, 'account.rgpd.export.download.error_forbidden'],
    [404, 'account.rgpd.export.download.error_not_found'],
    [410, 'account.rgpd.export.download.error_expired'],
    [500, 'account.rgpd.export.download.error_generic'],
  ])('maps a %d response to %s', async (status, expectedKey) => {
    ({ fixture, httpMock } = await setup('tok-err'));
    const component = fixture.componentInstance;

    // responseType is 'blob' — the testing backend requires an actual Blob body
    // to flush an error on such a request (no automatic string→Blob conversion).
    httpMock.expectOne(downloadUrl('tok-err')).flush(new Blob(['boom']), { status, statusText: 'Error' });
    fixture.detectChanges();

    expect(component.state()).toBe('error');
    expect(component.errorKey()).toBe(expectedKey);
  });

  it('re-triggers a download when the query param changes on a reused route instance', async () => {
    let queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
    ({ fixture, httpMock, queryParamMap$ } = await setup('tok-first'));
    const component = fixture.componentInstance;
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    httpMock.expectOne(downloadUrl('tok-first')).flush(new Blob(['zip']), { status: 200, statusText: 'OK' });
    fixture.detectChanges();
    expect(component.state()).toBe('success');

    // Angular's route-reuse strategy can keep this component alive across a
    // second email link opened in the same tab — only the query param changes.
    queryParamMap$.next(convertToParamMap({ token: 'tok-second' }));
    expect(component.state()).toBe('downloading');
    httpMock.expectOne(downloadUrl('tok-second')).flush(new Blob(['zip']), { status: 200, statusText: 'OK' });
    fixture.detectChanges();
    expect(component.state()).toBe('success');
  });

  it('has an aria-label on the main landmark', async () => {
    ({ fixture, httpMock } = await setup(null));
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('main')?.getAttribute('aria-label')).toBe('Téléchargement de votre export');
  });
});
