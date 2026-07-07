import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from './auth.service';
import { PIVOT_API_URL } from '../config/tokens';
import type { AuthResponse } from './auth.model';

@Component({ template: '', standalone: true }) class FakePageComponent {}

const API = 'http://api.test';
const MOCK_AUTH: AuthResponse = {
  accessToken: 'tok123',
  expiresAt: Date.now() + 3_600_000,
  user: {
    id: 1,
    email: 'user@test.com',
    firstName: 'Alice',
    lastName: 'Martin',
    role: 'ROLE_USER',
    emailVerified: true,
    tenantId: 42,
    tenantSlug: 'acme',
  },
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: FakePageComponent }]),
        { provide: PIVOT_API_URL, useValue: API },
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('is not authenticated initially', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(service.accessToken()).toBeNull();
    expect(service.rememberMe()).toBe(false);
    expect(service.millisUntilExpiry()).toBe(0);
  });

  it('stores auth data after refresh()', () => {
    service.refresh().subscribe();
    const req = httpMock.expectOne(`${API}/auth/refresh`);
    req.flush(MOCK_AUTH);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()?.email).toBe('user@test.com');
    expect(service.accessToken()).toBe('tok123');
  });

  it('clears auth data after refresh() error', () => {
    service.updateToken('existing', Date.now() + 3_600_000);
    service.refresh().subscribe({ error: () => undefined });
    const req = httpMock.expectOne(`${API}/auth/refresh`);
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    expect(service.isAuthenticated()).toBe(false);
    expect(service.accessToken()).toBeNull();
  });

  it('updateToken replaces in-memory token', () => {
    const future = Date.now() + 7_200_000;
    service.updateToken('newToken', future);
    expect(service.accessToken()).toBe('newToken');
    expect(service.tokenExpiresAt()).toBe(future);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('isAuthenticated returns false for expired token', () => {
    service.updateToken('tok', Date.now() - 1000);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('millisUntilExpiry returns positive when authenticated', () => {
    service.updateToken('tok', Date.now() + 3_600_000);
    expect(service.millisUntilExpiry()).toBeGreaterThan(0);
  });

  it('clearSession purges all state', () => {
    service.updateToken('tok', Date.now() + 3_600_000);
    service.clearSession();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(service.accessToken()).toBeNull();
    expect(service.rememberMe()).toBe(false);
  });

  it('register posts to /auth/register', () => {
    service.register({ email: 'a@b.com', password: 'pass' }).subscribe();
    const req = httpMock.expectOne(`${API}/auth/register`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'ok' });
  });

  it('verifyEmail posts to /auth/verify-email with token param', () => {
    service.verifyEmail('abc123').subscribe();
    const req = httpMock.expectOne(r => r.url === `${API}/auth/verify-email`);
    expect(req.request.params.get('token')).toBe('abc123');
    req.flush({ message: 'ok' });
  });

  it('resendVerification posts to /auth/resend-verification', () => {
    service.resendVerification('a@b.com').subscribe();
    const req = httpMock.expectOne(r => r.url === `${API}/auth/resend-verification`);
    expect(req.request.params.get('email')).toBe('a@b.com');
    req.flush({ message: 'ok' });
  });

  it('checkResetToken GETs /auth/check-reset-token', () => {
    service.checkResetToken('reset-tok').subscribe();
    const req = httpMock.expectOne(r => r.url === `${API}/auth/check-reset-token`);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok' });
  });

  it('login stores auth on 200', () => {
    service.login({ email: 'u@t.com', password: 'pass', rememberMe: true }).subscribe();
    const req = httpMock.expectOne(`${API}/auth/login`);
    req.flush(MOCK_AUTH, { status: 200, statusText: 'OK' });
    expect(service.isAuthenticated()).toBe(true);
    expect(service.rememberMe()).toBe(true);
  });

  it('login does not store auth on 202', () => {
    service.login({ email: 'u@t.com', password: 'pass' }).subscribe();
    const req = httpMock.expectOne(`${API}/auth/login`);
    req.flush(null, { status: 202, statusText: 'Accepted' });
    expect(service.isAuthenticated()).toBe(false);
  });

  it('loginWithGoogle stores auth', () => {
    service.loginWithGoogle('google-id-token').subscribe();
    const req = httpMock.expectOne(`${API}/auth/google`);
    expect(req.request.body).toMatchObject({ idToken: 'google-id-token' });
    req.flush(MOCK_AUTH);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('exchangeOidc stores auth', () => {
    service.exchangeOidc('acme', 'oidc-token').subscribe();
    const req = httpMock.expectOne(`${API}/auth/oidc/exchange`);
    expect(req.request.body).toMatchObject({ tenantSlug: 'acme', accessToken: 'oidc-token' });
    req.flush(MOCK_AUTH);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('getOidcConfig GETs /auth/oidc/config', () => {
    service.getOidcConfig('acme').subscribe();
    const req = httpMock.expectOne(r => r.url === `${API}/auth/oidc/config`);
    expect(req.request.params.get('tenantSlug')).toBe('acme');
    req.flush({ issuerUri: 'https://id.acme.com', clientId: 'pivot', scopes: 'openid' });
  });

  it('verifyDeviceOtp stores auth and sets rememberMe', () => {
    service.verifyDeviceOtp('fp123', 'otp456', 'My Device', true).subscribe();
    const req = httpMock.expectOne(`${API}/auth/device/verify`);
    expect(req.request.body).toMatchObject({ deviceFingerprint: 'fp123', otp: 'otp456' });
    req.flush(MOCK_AUTH);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.rememberMe()).toBe(true);
  });

  it('logout clears session and posts to /auth/logout', () => {
    service.updateToken('tok', Date.now() + 3_600_000);
    service.logout().subscribe();
    const req = httpMock.expectOne(`${API}/auth/logout`);
    expect(req.request.method).toBe('POST');
    req.flush(null);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('forgotPassword posts to /auth/forgot-password', () => {
    service.forgotPassword('a@b.com').subscribe();
    const req = httpMock.expectOne(`${API}/auth/forgot-password`);
    expect(req.request.body).toMatchObject({ email: 'a@b.com' });
    req.flush({ message: 'ok' });
  });

  it('resetPassword posts to /auth/reset-password', () => {
    service.resetPassword('tok', 'newPass').subscribe();
    const req = httpMock.expectOne(`${API}/auth/reset-password`);
    expect(req.request.body).toMatchObject({ token: 'tok', newPassword: 'newPass' });
    req.flush({ message: 'ok' });
  });

  it('changePassword posts to /account/password and updates token', () => {
    service.changePassword('old', 'new').subscribe();
    const req = httpMock.expectOne(`${API}/account/password`);
    req.flush(MOCK_AUTH);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.accessToken()).toBe('tok123');
  });

  it('initSession delegates to refresh()', () => {
    service.initSession().subscribe();
    const req = httpMock.expectOne(`${API}/auth/refresh`);
    req.flush(MOCK_AUTH);
    expect(service.isAuthenticated()).toBe(true);
  });
});
