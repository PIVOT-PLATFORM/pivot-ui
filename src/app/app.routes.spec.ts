import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { notFoundRedirect, routes } from './app.routes';
import { AuthService } from './core/auth/service/auth.service';

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
