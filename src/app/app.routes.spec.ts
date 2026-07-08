import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { notFoundRedirect, routes } from './app.routes';
import { AuthService } from './core/auth/service/auth.service';
import { AccountDeletionCancelComponent } from './features/account/deletion/account-deletion-cancel.component';
import { installMemoryLocalStorage } from './features/account/deletion/testing/memory-local-storage';
import { environment } from '../environments/environment';

const TRANSLOCO_LANGS = {
  fr: {
    modules: { guard: { names: { whiteboard: 'Tableau blanc' } } },
    module_load_error: {
      title: 'Module indisponible',
      subtitle: 'Une erreur est survenue lors du chargement de ce module.',
      retry: 'Réessayer',
      back: "Retour à l'accueil",
    },
  },
  en: {},
};

/**
 * US01.1.4 — AC : « Si returnUrl pointe vers une route inexistante → redirection /home ».
 * La route wildcard délègue à notFoundRedirect : /home pour un utilisateur
 * authentifié, /auth/login (comportement historique) pour un anonyme.
 */
describe('notFoundRedirect', () => {
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    authService = TestBed.inject(AuthService);
  });

  it('redirige vers /home quand l utilisateur est authentifié (US01.1.4)', () => {
    authService.updateToken('tok', Date.now() + 3600_000);
    const target = TestBed.runInInjectionContext(() => notFoundRedirect());
    expect(target).toBe('/home');
  });

  it('redirige vers /auth/login quand le visiteur est anonyme', () => {
    const target = TestBed.runInInjectionContext(() => notFoundRedirect());
    expect(target).toBe('/auth/login');
  });

  it('la route wildcard utilise notFoundRedirect', () => {
    const wildcard = routes.find((r) => r.path === '**');
    expect(wildcard?.redirectTo).toBe(notFoundRedirect);
  });
});

/**
 * US02.2.2 — la page de confirmation de changement d'email doit fonctionner que le
 * visiteur ait ou non une session active sur cet appareil (lien ouvert depuis un
 * email, souvent hors session). Elle doit donc être déclarée AVANT la route shell
 * `canMatch: [authMatchGuard]` dans le tableau — sinon un visiteur anonyme se
 * retrouverait sans route correspondante tant qu'il n'existe pas de doublon en
 * fallback public (voir le commentaire sur les routes `contact`/`legal`).
 */
describe('account/email/confirm route', () => {
  it('est déclarée avant la route shell authentifiée (canMatch)', () => {
    const confirmIndex = routes.findIndex((r) => r.path === 'account/email/confirm');
    const shellIndex = routes.findIndex((r) => r.path === '' && r.canMatch);
    expect(confirmIndex).toBeGreaterThan(-1);
    expect(shellIndex).toBeGreaterThan(-1);
    expect(confirmIndex).toBeLessThan(shellIndex);
  });
});

/**
 * US02.2.4 — la page d'annulation (`/account/deletion/cancel`, lien emaillé)
 * doit toujours résoudre en composant standalone, que le visiteur soit
 * authentifié ou non : à ce stade toutes les sessions ont été révoquées.
 *
 * Ce test verrouille un point de routing Angular non trivial : `/account`
 * (route enfant du shell, guardée par `canMatch`) et `/account/deletion/cancel`
 * (route publique top-level) partagent le premier segment `account`. Le
 * Router doit backtracker hors du shell (segments restants `deletion/cancel`
 * non consommés par la feuille `account`) plutôt que de rendre un 404 —
 * exactement le mécanisme déjà utilisé par `contact`/`legal` pour leurs
 * doublons publics en bas de `routes`.
 */
describe('routing — /account/deletion/cancel (US02.2.4)', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    // AccountDeletionCancelComponent injects AccountDeletionStateService, which
    // reads localStorage at construction (US02.2.4) — see memory-local-storage.ts.
    installMemoryLocalStorage();
    TestBed.configureTestingModule({
      // AccountDeletionCancelComponent's template uses TranslocoPipe.
      imports: [TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('resolves to AccountDeletionCancelComponent for an anonymous visitor', async () => {
    const harness = await RouterTestingHarness.create();
    const instance = await harness.navigateByUrl('/account/deletion/cancel', AccountDeletionCancelComponent);
    expect(instance).toBeInstanceOf(AccountDeletionCancelComponent);
  });

  it('resolves to AccountDeletionCancelComponent even for an authenticated user (backtracks out of the shell)', async () => {
    const authService = TestBed.inject(AuthService);
    authService.updateToken('tok', Date.now() + 3600_000);

    const harness = await RouterTestingHarness.create();
    const instance = await harness.navigateByUrl('/account/deletion/cancel', AccountDeletionCancelComponent);
    expect(instance).toBeInstanceOf(AccountDeletionCancelComponent);
  });
});

/**
 * EN17.10 — Error case AC: "given @pivot-platform/collaboratif-ui indisponible ou erreur de
 * chargement dynamique... then un fallback est géré côté shell — pas de page blanche silencieuse".
 *
 * Exercised here as a real Router integration test (real `routes` from app.routes.ts, real
 * `moduleGuard`, real `loadWhiteboardModule`, real `ModuleLoadErrorComponent` activation)
 * rather than at the Playwright E2E layer: simulating a failed dynamic `import()` by aborting
 * network requests turned out to be unreliable in this Chromium/Playwright combination — ES
 * module dynamic imports did not consistently surface through `page.route()` interception, so
 * the target chunk kept loading successfully despite the abort() rule (verified empirically in
 * CI, not a local flake). TestBed + RouterTestingHarness exercises the exact same
 * loadChildren -> reject -> .catch() -> real component activation path without depending on
 * real browser network interception at all — `vi.doMock` intercepts the dynamic `import()`
 * itself, same technique already used in whiteboard-module-loader.spec.ts, but here run all the
 * way through the real Router instead of unit-testing loadWhiteboardModule() in isolation.
 */
describe('whiteboard route fallback — EN17.10 error case', () => {
  let httpMock: HttpTestingController;

  // Navigating into /whiteboard constructs the authenticated shell (ShellComponent), whose
  // ThemeService reads `globalThis.matchMedia` — never previously exercised by a spec in this
  // file (the other describes here target public/top-level routes that never mount the
  // shell). Not touched via src/test-setup.ts, which only bootstraps the separate Stryker-only
  // standalone config, not the regular `test:ci` run this file executes under. Saved/restored
  // manually (not `vi.stubGlobal`/`vi.unstubAllGlobals`, which — this suite's workers are not
  // isolated per file — was observed to wipe out unrelated globals other spec files in the same
  // worker depend on, cascading into ~40 unrelated failures elsewhere).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalMatchMedia = (globalThis as any).matchMedia;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });

    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: TRANSLOCO_LANGS,
          translocoConfig: { defaultLang: 'fr', availableLangs: ['fr', 'en'] },
          preloadLangs: true,
        }),
      ],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).matchMedia = originalMatchMedia;
    vi.doUnmock('@pivot-platform/collaboratif-ui');
  });

  it('activates ModuleLoadErrorComponent, not a blank page, when the module fails to load', async () => {
    vi.doMock('@pivot-platform/collaboratif-ui', () => {
      throw new Error('chunk failed to load');
    });

    const authService = TestBed.inject(AuthService);
    authService.updateToken('tok', Date.now() + 3600_000);

    const harness = await RouterTestingHarness.create();
    // No required-component-type second argument: /whiteboard is nested three levels deep
    // (shell > whiteboard route > fallback route), and the harness's type check validates
    // against the outermost activated component (ShellComponent) — not the deepest leaf.
    // Asserting on the rendered DOM below covers the same ground without fighting that API.
    const navigation = harness.navigateByUrl('/whiteboard');

    // moduleGuard's HTTP call is subscribed to only a few macrotasks into the Router's own
    // navigation pipeline (guard resolution) — not synchronously, and not within a couple of
    // microtask ticks either. Poll instead of guessing an exact tick count.
    const statusUrl = `${environment.apiUrl}/modules/whiteboard/status`;
    let statusReq;
    for (let i = 0; i < 20 && !statusReq; i++) {
      await new Promise(resolve => setTimeout(resolve, 0));
      statusReq = httpMock.match(() => true).find(r => r.request.url === statusUrl);
    }
    statusReq?.flush({ enabled: true });

    await navigation;
    harness.detectChanges();

    const rendered = harness.routeNativeElement;
    expect(rendered?.querySelector('.module-load-error')).toBeTruthy();
    expect(rendered?.querySelector('.board-list')).toBeFalsy();

    // Activating the authenticated shell (ShellComponent, parent of every guarded route)
    // fires its own unrelated HTTP calls (e.g. unread notifications count) — not this test's
    // concern, drain them so httpMock.verify() in afterEach doesn't fail on an unrelated call.
    httpMock.match(() => true).forEach(req => req.flush(null));
  });
});
