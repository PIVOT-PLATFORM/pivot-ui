import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { adminGuard } from './admin.guard';
import { AuthService, AuthResponse } from '../service/auth.service';
import { environment } from '../../../../environments/environment';

@Component({ template: '', standalone: true })
class StubComponent {}

const authResponse = (role: string): AuthResponse => ({
  accessToken: 'opaque-token',
  expiresAt: Date.now() + 3600_000,
  user: {
    id: 1,
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role,
    emailVerified: true,
    tenantId: 1,
    tenantSlug: 'acme',
  },
});

describe('adminGuard', () => {
  let authService: AuthService;
  let router: Router;
  let httpMock: HttpTestingController;

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
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function loginAs(role: string): void {
    authService.login({ email: 'admin@example.com', password: 'pass' }).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(authResponse(role));
  }

  it('returns true for ROLE_ADMIN', () => {
    loginAs('ROLE_ADMIN');
    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));
    expect(result).toBe(true);
  });

  it('redirects to /home for ROLE_USER', () => {
    loginAs('ROLE_USER');
    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/home');
  });

  it('redirects to /home when no user is present', () => {
    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/home');
  });
});
