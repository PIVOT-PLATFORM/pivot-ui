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
