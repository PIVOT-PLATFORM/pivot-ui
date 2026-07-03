import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree, type Navigation, type RouterStateSnapshot } from '@angular/router';
import { Component } from '@angular/core';
import { authGuard, authMatchGuard, guestGuard } from './auth.guard';
import { AuthService } from '../service/auth.service';
import { PostLoginRedirectService } from '../service/post-login-redirect.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

@Component({ template: '', standalone: true })
class StubComponent {}

/** Fabrique un RouterStateSnapshot minimal portant l'URL tentée. */
function stateWithUrl(url: string): RouterStateSnapshot {
  return { url } as RouterStateSnapshot;
}

describe('authGuard', () => {
  let authService: AuthService;
  let redirect: PostLoginRedirectService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: StubComponent }]),
      ],
    });
    authService = TestBed.inject(AuthService);
    redirect = TestBed.inject(PostLoginRedirectService);
  });

  it('returns true when authenticated', () => {
    authService.updateToken('tok', Date.now() + 3600_000);
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, stateWithUrl('/dashboard')),
    );
    expect(result).toBe(true);
  });

  it('redirects to /auth/login when not authenticated', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, stateWithUrl('/dashboard')),
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).root.children['primary'].segments.map(s => s.path)).toEqual([
      'auth',
      'login',
    ]);
  });

  // US01.1.4 — AC : l'URL d'origine est conservée dans un query param returnUrl
  it('conserve l URL tentée dans le query param returnUrl (US01.1.4)', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, stateWithUrl('/dashboard?tab=2')),
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).queryParams['returnUrl']).toBe('/dashboard?tab=2');
  });

  // US01.1.4 — AC : canal session Angular alimenté en secours
  it('mémorise aussi l URL tentée en session Angular (US01.1.4)', () => {
    TestBed.runInInjectionContext(() => authGuard({} as never, stateWithUrl('/teams')));
    expect(redirect.resolveTarget(null)).toBe('/teams');
  });

  it('ne mémorise rien quand l utilisateur est authentifié', () => {
    authService.updateToken('tok', Date.now() + 3600_000);
    TestBed.runInInjectionContext(() => authGuard({} as never, stateWithUrl('/teams')));
    expect(redirect.resolveTarget(null)).toBe('/home');
  });
});

describe('authMatchGuard', () => {
  let authService: AuthService;
  let router: Router;
  let redirect: PostLoginRedirectService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: StubComponent }]),
      ],
    });
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    redirect = TestBed.inject(PostLoginRedirectService);
  });

  function mockCurrentNavigation(url: string): void {
    vi.spyOn(router, 'getCurrentNavigation').mockReturnValue({
      extractedUrl: router.parseUrl(url),
    } as unknown as Navigation);
  }

  it('returns true when authenticated', () => {
    authService.updateToken('tok', Date.now() + 3600_000);
    const result = TestBed.runInInjectionContext(() => authMatchGuard({} as never, [], {} as never));
    expect(result).toBe(true);
  });

  it('returns false (no redirect) when not authenticated', () => {
    const result = TestBed.runInInjectionContext(() => authMatchGuard({} as never, [], {} as never));
    expect(result).toBe(false);
  });

  // US01.1.4 — AC : l'URL d'origine est conservée en session Angular (canMatch
  // ne transporte pas de query param)
  it('mémorise l URL tentée en session Angular quand non authentifié (US01.1.4)', () => {
    mockCurrentNavigation('/dashboard?tab=2');
    const result = TestBed.runInInjectionContext(() => authMatchGuard({} as never, [], {} as never));
    expect(result).toBe(false);
    expect(redirect.resolveTarget(null)).toBe('/dashboard?tab=2');
  });

  it('ne mémorise pas la racine / (aucun contexte à restaurer)', () => {
    mockCurrentNavigation('/');
    TestBed.runInInjectionContext(() => authMatchGuard({} as never, [], {} as never));
    expect(redirect.resolveTarget(null)).toBe('/home');
  });

  it('ne mémorise rien quand authentifié', () => {
    authService.updateToken('tok', Date.now() + 3600_000);
    mockCurrentNavigation('/dashboard');
    TestBed.runInInjectionContext(() => authMatchGuard({} as never, [], {} as never));
    expect(redirect.resolveTarget(null)).toBe('/home');
  });
});

describe('guestGuard', () => {
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: StubComponent }]),
      ],
    });
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  it('returns true when not authenticated', () => {
    const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));
    expect(result).toBe(true);
  });

  it('redirects to /dashboard when already authenticated', () => {
    authService.updateToken('tok', Date.now() + 3600_000);
    const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/dashboard');
  });
});
