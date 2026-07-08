import { vi, type MockInstance } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { SessionExpiryService, SESSION_CHANNEL_NAME } from './session-expiry.service';
import { AuthService } from './auth.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { environment } from '../../../../environments/environment';

@Component({ template: '', standalone: true })
class StubComponent {}

const stubRoutes = [{ path: '**', component: StubComponent }];

/**
 * Fake BroadcastChannel — jsdom n'implémente pas l'API. Chaque instance enregistre
 * les messages postés et permet de simuler un message entrant d'un autre onglet.
 */
class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = [];

  readonly posted: unknown[] = [];
  closed = false;
  private readonly listeners: Array<(ev: MessageEvent) => void> = [];

  constructor(readonly name: string) {
    FakeBroadcastChannel.instances.push(this);
  }

  addEventListener(_type: string, listener: (ev: MessageEvent) => void): void {
    this.listeners.push(listener);
  }

  postMessage(message: unknown): void {
    this.posted.push(message);
  }

  close(): void {
    this.closed = true;
  }

  /** Test helper — simule un message reçu depuis un AUTRE onglet. */
  emitFromOtherTab(data: unknown): void {
    for (const listener of this.listeners) {
      listener({ data } as MessageEvent);
    }
  }
}

const mockAuthResponse = {
  accessToken: 'opaque-token-abc123',
  expiresAt: Date.now() + 3600_000,
  user: {
    id: 1, email: 'test@example.com', firstName: 'Test', lastName: 'User',
    role: 'USER', emailVerified: true, tenantId: 1, tenantSlug: 'test-tenant',
  },
};

describe('SessionExpiryService (US01.1.5)', () => {
  let service: SessionExpiryService;
  let auth: AuthService;
  let toast: ToastService;
  let router: Router;
  let httpMock: HttpTestingController;
  let channel: FakeBroadcastChannel;
  let navigateSpy: MockInstance<Router['navigate']>;

  beforeEach(() => {
    FakeBroadcastChannel.instances = [];
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(stubRoutes),
      ],
    });

    auth = TestBed.inject(AuthService);
    toast = TestBed.inject(ToastService);
    router = TestBed.inject(Router);
    httpMock = TestBed.inject(HttpTestingController);
    navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    service = TestBed.inject(SessionExpiryService);
    channel = FakeBroadcastChannel.instances[0];
  });

  afterEach(() => {
    httpMock.verify();
    vi.unstubAllGlobals();
  });

  /** Ouvre une session en mémoire via un login HTTP simulé. */
  function loginWith(rememberMe: boolean): void {
    auth.login({ email: 'test@example.com', password: 'pw', rememberMe }).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockAuthResponse);
  }

  /** Force la valeur de router.url (URL courante au moment de l'expiration). */
  function setRouterUrl(url: string): void {
    Object.defineProperty(router, 'url', { configurable: true, get: () => url });
  }

  it('opens a BroadcastChannel on the pivot session channel name', () => {
    expect(channel).toBeDefined();
    expect(channel.name).toBe(SESSION_CHANNEL_NAME);
  });

  describe('AC-01 — 401 → logout + redirection /login', () => {
    it('clears the in-memory session and navigates to /auth/login', () => {
      loginWith(false);
      expect(auth.accessToken()).not.toBeNull();

      service.onSessionExpired();

      expect(auth.accessToken()).toBeNull();
      expect(auth.currentUser()).toBeNull();
      expect(navigateSpy).toHaveBeenCalledWith(['/auth/login'], undefined);
    });

    it('is a no-op when no local session is active (anonymous 401)', () => {
      service.onSessionExpired();

      expect(toast.toasts()).toEqual([]);
      expect(navigateSpy).not.toHaveBeenCalled();
      expect(channel.posted).toEqual([]);
    });

    it('is idempotent — a burst of parallel 401s triggers a single logout flow', () => {
      loginWith(false);

      service.onSessionExpired();
      service.onSessionExpired();

      expect(navigateSpy).toHaveBeenCalledTimes(1);
      expect(channel.posted).toHaveLength(1);
    });
  });

  describe('AC-02 — toast « Session expirée »', () => {
    it('shows the generic expiry toast when remember-me is not active', () => {
      loginWith(false);

      service.onSessionExpired();

      expect(toast.toasts()).toHaveLength(1);
      expect(toast.toasts()[0].messageKey).toBe('auth.session.expired');
      expect(toast.toasts()[0].type).toBe('warning');
    });
  });

  describe('AC-06 — variante remember-me', () => {
    it('shows the long-session expiry toast when remember-me was active', () => {
      loginWith(true);

      service.onSessionExpired();

      expect(toast.toasts()).toHaveLength(1);
      expect(toast.toasts()[0].messageKey).toBe('auth.session.expired_remember_me');
    });
  });

  describe('AC-07 — multi-onglets via BroadcastChannel', () => {
    it('broadcasts the session-expired message to other tabs', () => {
      loginWith(true);

      service.onSessionExpired();

      expect(channel.posted).toEqual([{ type: 'session-expired', rememberMe: true }]);
    });

    it('logs out locally when another tab broadcasts session-expired (no re-broadcast)', () => {
      loginWith(false);

      channel.emitFromOtherTab({ type: 'session-expired', rememberMe: false });

      expect(auth.accessToken()).toBeNull();
      expect(toast.toasts()[0]?.messageKey).toBe('auth.session.expired');
      expect(navigateSpy).toHaveBeenCalledWith(['/auth/login'], undefined);
      // Pas de boucle : l'onglet récepteur ne rediffuse pas le message
      expect(channel.posted).toEqual([]);
    });

    it('uses the remember-me variant carried by the broadcast message', () => {
      loginWith(false);

      channel.emitFromOtherTab({ type: 'session-expired', rememberMe: true });

      expect(toast.toasts()[0]?.messageKey).toBe('auth.session.expired_remember_me');
    });

    it('ignores unrelated broadcast messages', () => {
      loginWith(false);

      channel.emitFromOtherTab({ type: 'something-else' });

      expect(auth.accessToken()).not.toBeNull();
      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('closes the channel on destroy', () => {
      service.ngOnDestroy();
      expect(channel.closed).toBe(true);
    });
  });

  describe('AC-08 — returnUrl relative interne uniquement (open redirect)', () => {
    it('passes the current internal URL as returnUrl', () => {
      loginWith(false);
      setRouterUrl('/dashboard?tab=2');

      service.onSessionExpired();

      expect(navigateSpy).toHaveBeenCalledWith(
        ['/auth/login'],
        { queryParams: { returnUrl: '/dashboard?tab=2' } },
      );
    });

    it('drops a protocol-relative URL (//evil.com) — no returnUrl param', () => {
      loginWith(false);
      setRouterUrl('//evil.com/phishing');

      service.onSessionExpired();

      expect(navigateSpy).toHaveBeenCalledWith(['/auth/login'], undefined);
    });

    it('drops an auth URL as returnUrl (no login loop)', () => {
      loginWith(false);
      setRouterUrl('/auth/login');

      service.onSessionExpired();

      expect(navigateSpy).toHaveBeenCalledWith(['/auth/login'], undefined);
    });

    it('drops the /auth root as returnUrl', () => {
      loginWith(false);
      setRouterUrl('/auth');

      service.onSessionExpired();

      expect(navigateSpy).toHaveBeenCalledWith(['/auth/login'], undefined);
    });

    it('drops an /auth URL with query params as returnUrl', () => {
      loginWith(false);
      setRouterUrl('/auth?tab=register');

      service.onSessionExpired();

      expect(navigateSpy).toHaveBeenCalledWith(['/auth/login'], undefined);
    });

    it('drops the root path as returnUrl (nothing to return to)', () => {
      loginWith(false);
      setRouterUrl('/');

      service.onSessionExpired();

      expect(navigateSpy).toHaveBeenCalledWith(['/auth/login'], undefined);
    });

    it('keeps a path merely starting with the "auth" word segment', () => {
      loginWith(false);
      setRouterUrl('/authors');

      service.onSessionExpired();

      expect(navigateSpy).toHaveBeenCalledWith(
        ['/auth/login'],
        { queryParams: { returnUrl: '/authors' } },
      );
    });
  });
});
