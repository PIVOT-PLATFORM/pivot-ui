import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SessionsService } from './session.service';
import type { SessionDto } from './session.model';
import { environment } from '../../../../../environments/environment';

const makeDto = (id: number, overrides: Partial<SessionDto> = {}): SessionDto => ({
  id,
  device: `Device ${id}`,
  ip: '203.0.113.5',
  createdAt: '2026-07-01T10:00:00Z',
  expiresAt: '2026-08-01T10:00:00Z',
  isCurrent: false,
  ...overrides,
});

describe('SessionsService', () => {
  let service: SessionsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SessionsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates the service', () => {
    expect(service).toBeTruthy();
  });

  describe('loadSessions()', () => {
    it('calls GET /api/account/sessions and populates the sessions signal on success', () => {
      service.loadSessions().subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/account/sessions`);
      expect(req.request.method).toBe('GET');
      req.flush([makeDto(1, { isCurrent: true }), makeDto(2)]);

      expect(service.sessions()).toHaveLength(2);
      expect(service.loading()).toBe(false);
      expect(service.loadError()).toBe(false);
    });

    it('sets loading true while the request is in flight', () => {
      service.loadSessions().subscribe();
      expect(service.loading()).toBe(true);
      httpMock.expectOne(`${environment.apiUrl}/account/sessions`).flush([]);
      expect(service.loading()).toBe(false);
    });

    it('sets loadError true and empties sessions on a GET failure', () => {
      service.loadSessions().subscribe();
      httpMock
        .expectOne(`${environment.apiUrl}/account/sessions`)
        .flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(service.loadError()).toBe(true);
      expect(service.loading()).toBe(false);
      expect(service.sessions()).toEqual([]);
    });
  });

  describe('revoke()', () => {
    it('removes the session from the list optimistically and calls DELETE /{id}', () => {
      service.loadSessions().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/account/sessions`).flush([makeDto(1, { isCurrent: true }), makeDto(2)]);

      const target = service.sessions().find(s => s.id === 2)!;
      service.revoke(target).subscribe();

      expect(service.sessions().some(s => s.id === 2)).toBe(false);
      expect(service.isRevoking(2)).toBe(true);

      const req = httpMock.expectOne(`${environment.apiUrl}/account/sessions/2`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });

      expect(service.isRevoking(2)).toBe(false);
    });

    it('restores the session and rethrows on failure (404 not owned / already revoked)', () => {
      service.loadSessions().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/account/sessions`).flush([makeDto(1, { isCurrent: true }), makeDto(2)]);

      const target = service.sessions().find(s => s.id === 2)!;
      let error: unknown;
      service.revoke(target).subscribe({ error: e => (error = e) });

      httpMock
        .expectOne(`${environment.apiUrl}/account/sessions/2`)
        .flush('Not Found', { status: 404, statusText: 'Not Found' });

      expect(error).toBeTruthy();
      expect(service.isRevoking(2)).toBe(false);
      expect(service.sessions().some(s => s.id === 2)).toBe(true);
    });

    it('does not duplicate the session on restore if it was already re-added', () => {
      service.loadSessions().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/account/sessions`).flush([makeDto(1, { isCurrent: true }), makeDto(2)]);

      const target = service.sessions().find(s => s.id === 2)!;
      service.revoke(target).subscribe({ error: () => undefined });
      const req = httpMock.expectOne(`${environment.apiUrl}/account/sessions/2`);
      // Simulate the session having already reappeared (e.g. a concurrent reload) before the error resolves.
      service.loadSessions().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/account/sessions`).flush([makeDto(1, { isCurrent: true }), makeDto(2)]);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });

      expect(service.sessions().filter(s => s.id === 2)).toHaveLength(1);
    });
  });

  describe('revokeAllOthers()', () => {
    it('is a no-op (no HTTP call) when there is nothing but the current session', () => {
      service.loadSessions().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/account/sessions`).flush([makeDto(1, { isCurrent: true })]);

      service.revokeAllOthers().subscribe();
      httpMock.expectNone(`${environment.apiUrl}/account/sessions`);
      expect(service.sessions()).toHaveLength(1);
    });

    it('clears every non-current session optimistically and calls DELETE (bulk)', () => {
      service.loadSessions().subscribe();
      httpMock
        .expectOne(`${environment.apiUrl}/account/sessions`)
        .flush([makeDto(1, { isCurrent: true }), makeDto(2), makeDto(3)]);

      service.revokeAllOthers().subscribe();

      expect(service.sessions()).toEqual([expect.objectContaining({ id: 1 })]);
      expect(service.revokingAll()).toBe(true);

      const req = httpMock.expectOne(`${environment.apiUrl}/account/sessions`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });

      expect(service.revokingAll()).toBe(false);
    });

    it('restores the full previous list and rethrows on failure', () => {
      service.loadSessions().subscribe();
      httpMock
        .expectOne(`${environment.apiUrl}/account/sessions`)
        .flush([makeDto(1, { isCurrent: true }), makeDto(2), makeDto(3)]);

      let error: unknown;
      service.revokeAllOthers().subscribe({ error: e => (error = e) });
      httpMock
        .expectOne(`${environment.apiUrl}/account/sessions`)
        .flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(error).toBeTruthy();
      expect(service.revokingAll()).toBe(false);
      expect(service.sessions()).toHaveLength(3);
    });
  });
});
