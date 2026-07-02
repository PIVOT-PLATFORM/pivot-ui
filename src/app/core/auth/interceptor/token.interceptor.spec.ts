import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { tokenInterceptor } from './token.interceptor';
import { AuthService } from '../service/auth.service';
import { SessionExpiryService } from '../service/session-expiry.service';

@Component({ template: '', standalone: true })
class StubComponent {}

const stubRoutes = [{ path: '**', component: StubComponent }];

const TEST_URL = 'http://localhost:8080/api/some-resource';
const AUTH_URL = 'http://localhost:8080/api/auth/refresh';

describe('tokenInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tokenInterceptor])),
        provideHttpClientTesting(),
        provideRouter(stubRoutes),
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Authorization header injection', () => {
    it('should NOT add Authorization header when no token in memory', () => {
      // No login, token is null
      expect(authService.accessToken()).toBeNull();

      httpClient.get(TEST_URL).subscribe();

      const req = httpMock.expectOne(TEST_URL);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });

    it('should add "Authorization: Bearer <token>" when token is in memory', () => {
      const token = 'my-opaque-session-token';
      authService.updateToken(token, Date.now() + 3600_000);

      httpClient.get(TEST_URL).subscribe();

      const req = httpMock.expectOne(TEST_URL);
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      req.flush({});
    });
  });

  describe('X-New-Token header handling', () => {
    it('should call auth.updateToken() when X-New-Token and X-Token-Expires-At are present in the response', () => {
      const newToken = 'rotated-token-xyz';
      const newExpiresAt = Date.now() + 7200_000;

      const updateTokenSpy = vi.spyOn(authService, 'updateToken');

      httpClient.get(TEST_URL).subscribe();

      const req = httpMock.expectOne(TEST_URL);
      req.flush({}, {
        headers: {
          'X-New-Token': newToken,
          'X-Token-Expires-At': String(newExpiresAt),
        },
      });

      expect(updateTokenSpy).toHaveBeenCalledWith(newToken, newExpiresAt);
    });

    it('should NOT call auth.updateToken() when X-New-Token is absent', () => {
      const updateTokenSpy = vi.spyOn(authService, 'updateToken');

      httpClient.get(TEST_URL).subscribe();

      const req = httpMock.expectOne(TEST_URL);
      req.flush({ data: 'ok' });

      expect(updateTokenSpy).not.toHaveBeenCalled();
    });

    it('should NOT call auth.updateToken() when only X-New-Token is present but X-Token-Expires-At is missing', () => {
      const updateTokenSpy = vi.spyOn(authService, 'updateToken');

      httpClient.get(TEST_URL).subscribe();

      const req = httpMock.expectOne(TEST_URL);
      req.flush({}, {
        headers: {
          'X-New-Token': 'some-token',
        },
      });

      expect(updateTokenSpy).not.toHaveBeenCalled();
    });
  });

  describe('401 handling — session expiry (US01.1.5)', () => {
    it('AC-01 — delegates to SessionExpiryService.onSessionExpired() on 401 from a non-auth endpoint', () => {
      const sessionExpiry = TestBed.inject(SessionExpiryService);
      const expirySpy = vi.spyOn(sessionExpiry, 'onSessionExpired').mockImplementation(() => {});

      let receivedStatus = 0;
      httpClient.get(TEST_URL).subscribe({
        error: (err: HttpErrorResponse) => { receivedStatus = err.status; },
      });

      httpMock.expectOne(TEST_URL).flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(expirySpy).toHaveBeenCalledTimes(1);
      // L'erreur 401 est propagée à l'appelant (pas avalée par l'intercepteur)
      expect(receivedStatus).toBe(401);
    });

    it('AC-05 — does NOT attempt any silent refresh on 401 (opaque token model, 401 is the only expiry signal)', () => {
      const sessionExpiry = TestBed.inject(SessionExpiryService);
      vi.spyOn(sessionExpiry, 'onSessionExpired').mockImplementation(() => {});

      httpClient.get(TEST_URL).subscribe({ error: () => {} });
      httpMock.expectOne(TEST_URL).flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      // Aucun appel /auth/refresh, aucun retry de la requête d'origine
      httpMock.expectNone(AUTH_URL);
      httpMock.expectNone(TEST_URL);
    });

    it('does NOT trigger session expiry on 401 from an auth endpoint (login error, boot refresh…)', () => {
      const sessionExpiry = TestBed.inject(SessionExpiryService);
      const expirySpy = vi.spyOn(sessionExpiry, 'onSessionExpired').mockImplementation(() => {});
      const authOnlyUrl = 'http://localhost:8080/api/auth/login';

      httpClient.post(authOnlyUrl, {}).subscribe({ error: () => {} });
      httpMock.expectOne(authOnlyUrl).flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(expirySpy).not.toHaveBeenCalled();
      httpMock.expectNone(AUTH_URL);
    });

    it('does NOT trigger session expiry on non-401 errors', () => {
      const sessionExpiry = TestBed.inject(SessionExpiryService);
      const expirySpy = vi.spyOn(sessionExpiry, 'onSessionExpired').mockImplementation(() => {});

      httpClient.get(TEST_URL).subscribe({ error: () => {} });
      httpMock.expectOne(TEST_URL).flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(expirySpy).not.toHaveBeenCalled();
    });
  });
});
