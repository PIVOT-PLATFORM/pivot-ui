import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { tokenInterceptor } from './token.interceptor';
import { AuthService } from './auth.service';
import { PIVOT_API_URL } from '../config/tokens';

describe('tokenInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tokenInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: PIVOT_API_URL, useValue: 'http://api.test' },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => httpMock.verify());

  it('attaches Bearer token when authenticated', () => {
    auth.updateToken('my-token', Date.now() + 3_600_000);
    http.get('/api/data').subscribe();
    const req = httpMock.expectOne('/api/data');
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
    req.flush({});
  });

  it('does not attach header when no token', () => {
    http.get('/api/data').subscribe();
    const req = httpMock.expectOne('/api/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('updates token on X-New-Token header', () => {
    auth.updateToken('old', Date.now() + 3_600_000);
    const newExpiry = Date.now() + 7_200_000;
    http.get('/api/data').subscribe();
    const req = httpMock.expectOne('/api/data');
    req.flush({}, {
      headers: {
        'X-New-Token': 'rotated',
        'X-Token-Expires-At': String(newExpiry),
      }
    });
    expect(auth.accessToken()).toBe('rotated');
    expect(auth.tokenExpiresAt()).toBe(newExpiry);
  });

  it('clears session on 401 from non-auth endpoint', () => {
    auth.updateToken('tok', Date.now() + 3_600_000);
    http.get('/api/protected').subscribe({ error: () => undefined });
    const req = httpMock.expectOne('/api/protected');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('does not clear session on 401 from /auth/ endpoint', () => {
    auth.updateToken('tok', Date.now() + 3_600_000);
    http.post('/auth/login', {}).subscribe({ error: () => undefined });
    const req = httpMock.expectOne('/auth/login');
    req.flush('Bad credentials', { status: 401, statusText: 'Unauthorized' });
    expect(auth.isAuthenticated()).toBe(true);
  });
});
