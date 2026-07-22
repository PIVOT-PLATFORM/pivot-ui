import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { StandupSessionResponse } from '../models/standup.model';
import { StandupApiService } from './standup-api.service';

describe('StandupApiService', () => {
  let service: StandupApiService;
  let httpMock: HttpTestingController;

  const session: StandupSessionResponse = {
    id: 's-1',
    teamId: 1,
    tenantId: 1,
    name: 'Daily du 22/07',
    status: 'PENDING',
    currentIndex: 0,
    timePerPersonSeconds: 120,
    participants: [],
    startedAt: null,
    endedAt: null,
    createdAt: '2026-07-22T08:00:00Z',
    updatedAt: '2026-07-22T08:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StandupApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listTeams() calls GET /teams', () => {
    service.listTeams().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/teams`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, name: 'Team A' }]);
  });

  it('listTeamMembers() calls GET /teams/{teamId}/members', () => {
    service.listTeamMembers(1).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/teams/1/members`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 10, userId: 100, displayName: 'Ada Lovelace' }]);
  });

  it('createSession() POSTs /standup/sessions with the given request body', () => {
    service
      .createSession({ teamId: 1, name: 'Daily', timePerPersonSeconds: 90, participantTeamMemberIds: [10, 11] })
      .subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/standup/sessions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ teamId: 1, name: 'Daily', timePerPersonSeconds: 90, participantTeamMemberIds: [10, 11] });
    req.flush(session);
  });

  it('listSessions() calls GET /standup/sessions with no params when none are given', () => {
    service.listSessions().subscribe();
    const req = httpMock.expectOne(r => r.url === `${environment.apiUrl}/standup/sessions`);
    expect(req.request.params.keys()).toEqual([]);
    req.flush([session]);
  });

  it('listSessions() forwards teamId and status as query params', () => {
    service.listSessions(1, 'RUNNING').subscribe();
    const req = httpMock.expectOne(
      r => r.url === `${environment.apiUrl}/standup/sessions` && r.params.get('teamId') === '1' && r.params.get('status') === 'RUNNING',
    );
    req.flush([]);
  });

  it('getSession() calls GET /standup/sessions/{id}', () => {
    service.getSession('s-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/standup/sessions/s-1`);
    expect(req.request.method).toBe('GET');
    req.flush(session);
  });

  it('deleteSession() calls DELETE /standup/sessions/{id}', () => {
    service.deleteSession('s-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/standup/sessions/s-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('start() POSTs /standup/sessions/{id}/start', () => {
    service.start('s-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/standup/sessions/s-1/start`);
    expect(req.request.method).toBe('POST');
    req.flush(session);
  });

  it('next() POSTs /standup/sessions/{id}/next', () => {
    service.next('s-1').subscribe();
    httpMock.expectOne(`${environment.apiUrl}/standup/sessions/s-1/next`).flush(session);
  });

  it('skip() POSTs /standup/sessions/{id}/skip', () => {
    service.skip('s-1').subscribe();
    httpMock.expectOne(`${environment.apiUrl}/standup/sessions/s-1/skip`).flush(session);
  });

  it('end() POSTs /standup/sessions/{id}/end', () => {
    service.end('s-1').subscribe();
    httpMock.expectOne(`${environment.apiUrl}/standup/sessions/s-1/end`).flush(session);
  });

  it('extend() POSTs /standup/sessions/{id}/extend with the seconds payload', () => {
    service.extend('s-1', 30).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/standup/sessions/s-1/extend`);
    expect(req.request.body).toEqual({ seconds: 30 });
    req.flush(session);
  });

  it('reorder() PUTs /standup/sessions/{id}/participants/reorder with the ordered ids', () => {
    service.reorder('s-1', ['p-2', 'p-1']).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/standup/sessions/s-1/participants/reorder`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ participantIds: ['p-2', 'p-1'] });
    req.flush(session);
  });

  it('getStats() calls GET /standup/stats with teamId and optional from/to params', () => {
    service.getStats(1, '2026-06-22', '2026-07-22').subscribe();
    const req = httpMock.expectOne(
      r =>
        r.url === `${environment.apiUrl}/standup/stats` &&
        r.params.get('teamId') === '1' &&
        r.params.get('from') === '2026-06-22' &&
        r.params.get('to') === '2026-07-22',
    );
    req.flush({ sessions: [], participants: [] });
  });

  it('getStats() omits from/to when not provided', () => {
    service.getStats(1).subscribe();
    const req = httpMock.expectOne(r => r.url === `${environment.apiUrl}/standup/stats`);
    expect(req.request.params.has('from')).toBe(false);
    expect(req.request.params.has('to')).toBe(false);
    req.flush({ sessions: [], participants: [] });
  });
});
