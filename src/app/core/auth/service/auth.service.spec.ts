import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { AuthService, AuthResponse, LoginRequest } from './auth.service';
import { DeviceService } from './device.service';
import { environment } from '../../../../environments/environment';

@Component({ template: '', standalone: true })
class StubComponent {}

const stubRoutes = [{ path: '**', component: StubComponent }];

const mockUser = {
  id: 1,
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'USER',
  emailVerified: true,
  tenantId: 1,
  tenantSlug: 'test-tenant',
};

const mockAuthResponse: AuthResponse = {
  accessToken: 'opaque-token-abc123',
  expiresAt: Date.now() + 3600_000,
  user: mockUser,
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(stubRoutes),
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('isAuthenticated()', () => {
    it('should return false before any login', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should return true after a successful login', () => {
      const loginReq: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      };

      service.login(loginReq).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush(mockAuthResponse);

      expect(service.isAuthenticated()).toBe(true);
    });

    it('should return false when the in-memory token is expired', () => {
      service.updateToken('opaque-expired', Date.now() - 1_000);
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should return true while the token has not expired', () => {
      service.updateToken('opaque-fresh', Date.now() + 3600_000);
      expect(service.isAuthenticated()).toBe(true);
    });
  });

  describe('millisUntilExpiry()', () => {
    it('returns 0 when no token is held', () => {
      expect(service.millisUntilExpiry()).toBe(0);
    });

    it('returns a positive delay for a fresh token', () => {
      service.updateToken('t', Date.now() + 60_000);
      expect(service.millisUntilExpiry()).toBeGreaterThan(50_000);
    });

    it('returns 0 for an expired token', () => {
      service.updateToken('t', Date.now() - 1_000);
      expect(service.millisUntilExpiry()).toBe(0);
    });
  });

  describe('login()', () => {
    it('should POST to /auth/login with email, password, rememberMe and deviceFingerprint', () => {
      const deviceService = TestBed.inject(DeviceService);
      const fingerprint = deviceService.getDeviceFingerprint();
      const deviceName = deviceService.getDeviceName();

      const loginReq: LoginRequest = {
        email: 'user@example.com',
        password: 'secret',
        rememberMe: true,
        deviceFingerprint: fingerprint,
        deviceName: deviceName,
      };

      service.login(loginReq).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(loginReq);
      req.flush(mockAuthResponse);
    });

    it('should store the token in memory after successful login', () => {
      service.login({ email: 'a@b.com', password: 'pass' }).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush(mockAuthResponse);

      expect(service.accessToken()).toBe(mockAuthResponse.accessToken);
      expect(service.currentUser()).toEqual(mockUser);
    });

    it('should set tokenExpiresAt after successful login', () => {
      service.login({ email: 'a@b.com', password: 'pass' }).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush(mockAuthResponse);

      expect(service.tokenExpiresAt()).toBe(mockAuthResponse.expiresAt);
    });

    it('should send rememberMe flag in request body', () => {
      service.login({ email: 'a@b.com', password: 'pass', rememberMe: true }).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.body.rememberMe).toBe(true);
      req.flush(mockAuthResponse);
    });

    it('should use withCredentials', () => {
      service.login({ email: 'a@b.com', password: 'pass' }).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockAuthResponse);
    });
  });

  describe('updateToken()', () => {
    it('should update the in-memory token and expiresAt', () => {
      const newToken = 'new-rotated-token';
      const newExpiresAt = Date.now() + 7200_000;

      service.updateToken(newToken, newExpiresAt);

      expect(service.accessToken()).toBe(newToken);
      expect(service.tokenExpiresAt()).toBe(newExpiresAt);
    });

    it('should make isAuthenticated() return true after updateToken', () => {
      expect(service.isAuthenticated()).toBe(false);
      service.updateToken('some-token', Date.now() + 3600_000);
      expect(service.isAuthenticated()).toBe(true);
    });
  });

  describe('logout()', () => {
    it('should POST to /auth/logout', () => {
      // Login first so we have a token
      service.login({ email: 'a@b.com', password: 'pass' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockAuthResponse);

      service.logout().subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
      expect(req.request.method).toBe('POST');
      req.flush(null);
    });

    it('should clear the in-memory token after logout', () => {
      // Login first
      service.login({ email: 'a@b.com', password: 'pass' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockAuthResponse);
      expect(service.isAuthenticated()).toBe(true);

      service.logout().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/logout`).flush(null);

      expect(service.accessToken()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should clear currentUser after logout', () => {
      service.login({ email: 'a@b.com', password: 'pass' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockAuthResponse);
      expect(service.currentUser()).toEqual(mockUser);

      service.logout().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/logout`).flush(null);

      expect(service.currentUser()).toBeNull();
    });
  });

  describe('refresh() / restoreSession()', () => {
    it('should POST to /auth/refresh and update the token on success', () => {
      service.refresh().subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
      expect(req.request.method).toBe('POST');
      req.flush(mockAuthResponse);

      expect(service.accessToken()).toBe(mockAuthResponse.accessToken);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should clear auth state when /auth/refresh returns an error', () => {
      // Manually set a token to simulate an existing session
      service.updateToken('old-token', Date.now() + 3600_000);
      expect(service.isAuthenticated()).toBe(true);

      service.refresh().subscribe({ error: () => {} });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(service.isAuthenticated()).toBe(false);
      expect(service.accessToken()).toBeNull();
    });

    it('should use withCredentials for /auth/refresh', () => {
      service.refresh().subscribe({ error: () => {} });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockAuthResponse);
    });
  });
});
