import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { Observable } from 'rxjs';
import { moduleGuard } from './module.guard';
import { PIVOT_API_URL } from '../config/tokens';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';

describe('moduleGuard', () => {
  let httpMock: HttpTestingController;
  const API = 'http://api.test';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: PIVOT_API_URL, useValue: API },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('returns true when module is enabled', () => {
    let result: boolean | UrlTree | undefined;
    const guard = moduleGuard('whiteboard');
    TestBed.runInInjectionContext(() => {
      (guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as Observable<boolean | UrlTree>)
        .subscribe((v: boolean | UrlTree) => (result = v));
    });
    httpMock.expectOne(`${API}/modules/whiteboard/status`).flush({ enabled: true });
    expect(result).toBe(true);
  });

  it('redirects to /home when module is disabled', () => {
    let result: boolean | UrlTree | undefined;
    const guard = moduleGuard('whiteboard');
    TestBed.runInInjectionContext(() => {
      (guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as Observable<boolean | UrlTree>)
        .subscribe((v: boolean | UrlTree) => (result = v));
    });
    httpMock.expectOne(`${API}/modules/whiteboard/status`).flush({ enabled: false });
    expect((result as UrlTree).toString()).toBe('/home');
  });

  it('redirects to /home on HTTP error', () => {
    let result: boolean | UrlTree | undefined;
    const guard = moduleGuard('unknown');
    TestBed.runInInjectionContext(() => {
      (guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as Observable<boolean | UrlTree>)
        .subscribe((v: boolean | UrlTree) => (result = v));
    });
    httpMock.expectOne(`${API}/modules/unknown/status`).flush(
      'Not Found', { status: 404, statusText: 'Not Found' }
    );
    expect((result as UrlTree).toString()).toBe('/home');
  });
});
