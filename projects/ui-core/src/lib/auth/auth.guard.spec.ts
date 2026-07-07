import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { authGuard, guestGuard, authMatchGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { PIVOT_API_URL } from '../config/tokens';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlSegment, PartialMatchRouteSnapshot, Route } from '@angular/router';

@Component({ template: '', standalone: true }) class FakePageComponent {}

function makeState(url: string): RouterStateSnapshot {
  return { url } as RouterStateSnapshot;
}

describe('authGuard', () => {
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: FakePageComponent }]),
        { provide: PIVOT_API_URL, useValue: 'http://api.test' },
      ],
    });
    auth = TestBed.inject(AuthService);
  });

  it('returns true when authenticated', () => {
    auth.updateToken('tok', Date.now() + 3_600_000);
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, makeState('/dashboard'))
    );
    expect(result).toBe(true);
  });

  it('redirects to /auth/login when not authenticated', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, makeState('/dashboard'))
    ) as import('@angular/router').UrlTree;
    expect(result.toString()).toContain('/auth/login');
  });
});

describe('guestGuard', () => {
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: FakePageComponent }]),
        { provide: PIVOT_API_URL, useValue: 'http://api.test' },
      ],
    });
    auth = TestBed.inject(AuthService);
  });

  it('returns true when not authenticated', () => {
    const result = TestBed.runInInjectionContext(() =>
      guestGuard({} as ActivatedRouteSnapshot, makeState('/auth/login'))
    );
    expect(result).toBe(true);
  });

  it('redirects to /dashboard when authenticated', () => {
    auth.updateToken('tok', Date.now() + 3_600_000);
    const result = TestBed.runInInjectionContext(() =>
      guestGuard({} as ActivatedRouteSnapshot, makeState('/auth/login'))
    ) as import('@angular/router').UrlTree;
    expect(result.toString()).toBe('/dashboard');
  });
});

describe('authMatchGuard', () => {
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: FakePageComponent }]),
        { provide: PIVOT_API_URL, useValue: 'http://api.test' },
      ],
    });
    auth = TestBed.inject(AuthService);
  });

  it('returns true when authenticated', () => {
    auth.updateToken('tok', Date.now() + 3_600_000);
    const result = TestBed.runInInjectionContext(() =>
      authMatchGuard({} as Route, [] as UrlSegment[], {} as PartialMatchRouteSnapshot)
    );
    expect(result).toBe(true);
  });

  it('returns false when not authenticated', () => {
    const result = TestBed.runInInjectionContext(() =>
      authMatchGuard({} as Route, [] as UrlSegment[], {} as PartialMatchRouteSnapshot)
    );
    expect(result).toBe(false);
  });
});
