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
