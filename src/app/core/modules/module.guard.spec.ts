import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { firstValueFrom, type Observable } from 'rxjs';
import { moduleGuard } from './module.guard';
import { ModuleGuardLoadingService } from './module-guard-loading.service';
import { ToastService } from '../../shared/toast/toast.service';
import { AuthService } from '../auth/service/auth.service';
import { environment } from '../../../environments/environment';

@Component({ template: '', standalone: true })
class StubComponent {}

const TRANSLATIONS = {
  fr: {
    modules: {
      guard: {
        checking: 'Vérification de l’accès au module…',
        disabled: 'Module {{ module }} non disponible',
        adminLink: 'Gérer les modules',
        names: { whiteboard: 'Tableau blanc' },
      },
    },
  },
  en: {},
};

/** Runs the guard and resolves its Observable<boolean | UrlTree> result to a Promise. */
async function runGuard(moduleId: string): Promise<boolean | UrlTree> {
  const result = TestBed.runInInjectionContext(() =>
    moduleGuard(moduleId)({} as never, {} as never)
  ) as Observable<boolean | UrlTree>;
  return firstValueFrom(result);
}

describe('moduleGuard', () => {
  let httpMock: HttpTestingController;
  let router: Router;
  let loading: ModuleGuardLoadingService;
  let toast: ToastService;
  let auth: AuthService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: TRANSLATIONS,
          translocoConfig: { defaultLang: 'fr', availableLangs: ['fr', 'en'] },
        }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: StubComponent }]),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    loading = TestBed.inject(ModuleGuardLoadingService);
    toast = TestBed.inject(ToastService);
    auth = TestBed.inject(AuthService);

    // TranslocoTestingModule loads translations asynchronously (even with the
    // synchronous TestingLoader) — wait for the default lang before running any
    // guard test, otherwise transloco.translate() falls back to returning the raw key.
    await firstValueFrom(TestBed.inject(TranslocoService).load('fr'));
  });

  afterEach(() => httpMock.verify());

  it('allows navigation when the module is enabled for the tenant', async () => {
    const promise = runGuard('whiteboard');
    httpMock.expectOne(`${environment.apiUrl}/modules/whiteboard/status`).flush({ enabled: true });

    expect(await promise).toBe(true);
    expect(toast.toasts()).toHaveLength(0);
  });

  it('denies navigation and redirects to /home when the module is disabled', async () => {
    const promise = runGuard('whiteboard');
    httpMock.expectOne(`${environment.apiUrl}/modules/whiteboard/status`).flush({ enabled: false });

    const result = await promise;
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/home');
  });

  it('shows a toast with the module display name when disabled', async () => {
    const promise = runGuard('whiteboard');
    httpMock.expectOne(`${environment.apiUrl}/modules/whiteboard/status`).flush({ enabled: false });
    await promise;

    expect(toast.toasts()).toHaveLength(1);
    expect(toast.toasts()[0].messageKey).toBe('modules.guard.disabled');
    expect(toast.toasts()[0].type).toBe('warning');
    expect(toast.toasts()[0].params).toEqual({ module: 'Tableau blanc' });
  });

  it('does not include an admin link in the toast for a non-admin user', async () => {
    const promise = runGuard('whiteboard');
    httpMock.expectOne(`${environment.apiUrl}/modules/whiteboard/status`).flush({ enabled: false });
    await promise;

    expect(toast.toasts()[0].action).toBeUndefined();
  });

  it('shows the toast without an admin link, then with one, based on currentUser().role', async () => {
    // First call: no authenticated user at all → no admin link.
    let promise = runGuard('whiteboard');
    httpMock.expectOne(`${environment.apiUrl}/modules/whiteboard/status`).flush({ enabled: false });
    await promise;
    expect(toast.toasts()[0].action).toBeUndefined();
    toast.dismiss(toast.toasts()[0].id);

    // Second call: authenticate as ROLE_ADMIN via the real login flow against the mocked API.
    const loginPromise = firstValueFrom(
      auth.login({ email: 'admin@pivot.io', password: 'irrelevant' })
    );
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(
      {
        accessToken: 'admin-token',
        expiresAt: Date.now() + 3_600_000,
        user: {
          id: 1,
          email: 'admin@pivot.io',
          firstName: 'Ada',
          lastName: 'Min',
          role: 'ROLE_ADMIN',
          emailVerified: true,
          tenantId: 1,
          tenantSlug: 'acme',
        },
      },
      { status: 200, statusText: 'OK' }
    );
    await loginPromise;

    promise = runGuard('whiteboard');
    httpMock.expectOne(`${environment.apiUrl}/modules/whiteboard/status`).flush({ enabled: false });
    await promise;

    expect(toast.toasts()[0].action).toEqual({ labelKey: 'modules.guard.adminLink', route: '/admin/modules' });
  });

  it('denies navigation on a 404 (unknown module id) — treated as deny, not a crash', async () => {
    const promise = runGuard('ghost-module');
    httpMock
      .expectOne(`${environment.apiUrl}/modules/ghost-module/status`)
      .flush({ code: 'MODULE_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });

    const result = await promise;
    expect(result).toBeInstanceOf(UrlTree);
  });

  it('denies navigation on a 401 (unauthenticated) — treated as deny, not a crash', async () => {
    const promise = runGuard('whiteboard');
    httpMock
      .expectOne(`${environment.apiUrl}/modules/whiteboard/status`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    const result = await promise;
    expect(result).toBeInstanceOf(UrlTree);
  });

  it('toggles the interstitial loading signal on while the status call is pending', async () => {
    expect(loading.checking()).toBe(false);

    const promise = runGuard('whiteboard');
    expect(loading.checking()).toBe(true);

    httpMock.expectOne(`${environment.apiUrl}/modules/whiteboard/status`).flush({ enabled: true });
    await promise;

    expect(loading.checking()).toBe(false);
  });

  it('turns the loading signal back off even when the request errors', async () => {
    const promise = runGuard('whiteboard');
    expect(loading.checking()).toBe(true);

    httpMock.expectOne(`${environment.apiUrl}/modules/whiteboard/status`).flush({}, { status: 401, statusText: 'Unauthorized' });
    await promise;

    expect(loading.checking()).toBe(false);
  });
});
