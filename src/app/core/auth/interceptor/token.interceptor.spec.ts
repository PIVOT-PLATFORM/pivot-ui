import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { tokenInterceptor } from './token.interceptor';
import { AuthService } from '../service/auth.service';

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

  describe('401 handling — session restore', () => {
    it('should attempt auth.refresh() on 401 from a non-auth endpoint', () => {
      const refreshToken = 'refreshed-token';
      const refreshExpiresAt = Date.now() + 3600_000;

      httpClient.get(TEST_URL).subscribe({ error: () => {} });

      // Trigger 401 on initial request
      const req = httpMock.expectOne(TEST_URL);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      // Interceptor should now call /auth/refresh
      const refreshReq = httpMock.expectOne(AUTH_URL);
      expect(refreshReq.request.method).toBe('POST');
      refreshReq.flush({
        accessToken: refreshToken,
        expiresAt: refreshExpiresAt,
        user: {
          id: 1, email: 'a@b.com', firstName: null, lastName: null,
          role: 'USER', emailVerified: true, tenantId: 1, tenantSlug: 'slug',
        },
      });

      // After refresh, interceptor retries the original request
      const retried = httpMock.expectOne(TEST_URL);
      expect(retried.request.headers.get('Authorization')).toBe(`Bearer ${refreshToken}`);
      retried.flush({});
    });

    it('should navigate to /auth/login if refresh fails after a 401', () => {
      const routerInstance: Router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(routerInstance, 'navigate');

      httpClient.get(TEST_URL).subscribe({ error: () => {} });

      // 401 on original request
      httpMock.expectOne(TEST_URL).flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      // Refresh also fails
      httpMock.expectOne(AUTH_URL).flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(navigateSpy).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should NOT attempt refresh on 401 from an auth endpoint', () => {
      const authOnlyUrl = 'http://localhost:8080/api/auth/login';

      httpClient.post(authOnlyUrl, {}).subscribe({ error: () => {} });

      const req = httpMock.expectOne(authOnlyUrl);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      // No refresh call expected
      httpMock.expectNone(AUTH_URL);
    });
  });
});
