import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { SessionApiService } from './session-api.service';
import { SessionResponse } from '../models/session.model';

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';
const BASE = `${TEST_API_URL}/sessions`;

const SESSION: SessionResponse = {
  id: 's-1',
  title: 'Sprint retro',
  type: 'POLL',
  status: 'DRAFT',
  joinCode: 'ABCDEF',
  config: {},
  teamId: null,
  participantCount: 0,
  createdAt: '2026-07-23T08:00:00Z',
  startedAt: null,
  endedAt: null,
};

describe('SessionApiService', () => {
  let service: SessionApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
      ],
    });
    service = TestBed.inject(SessionApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('createSession() POSTs to /sessions with the given body', () => {
    service.createSession({ title: 'Sprint retro', type: 'POLL', config: {} }).subscribe();
    const req = httpMock.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'Sprint retro', type: 'POLL', config: {} });
    req.flush(SESSION);
  });

  it('listSessions() GETs /sessions with teamId/status query params when provided', () => {
    service.listSessions({ teamId: 42, status: 'LIVE' }).subscribe();
    const req = httpMock.expectOne(r => r.url === BASE);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('teamId')).toBe('42');
    expect(req.request.params.get('status')).toBe('LIVE');
    req.flush([SESSION]);
  });

  it('listSessions() omits query params when not provided', () => {
    service.listSessions().subscribe();
    const req = httpMock.expectOne(r => r.url === BASE);
    expect(req.request.params.keys().length).toBe(0);
    req.flush([SESSION]);
  });

  it('getSession() GETs /sessions/{id}', () => {
    service.getSession('s-1').subscribe();
    const req = httpMock.expectOne(`${BASE}/s-1`);
    expect(req.request.method).toBe('GET');
    req.flush(SESSION);
  });

  it.each([
    ['startSession', 'start'],
    ['pauseSession', 'pause'],
    ['resumeSession', 'resume'],
    ['endSession', 'end'],
  ] as const)('%s() POSTs to /sessions/{id}/%s', (method, path) => {
    (service[method] as (id: string) => ReturnType<SessionApiService['startSession']>)('s-1').subscribe();
    const req = httpMock.expectOne(`${BASE}/s-1/${path}`);
    expect(req.request.method).toBe('POST');
    req.flush(SESSION);
  });

  it('joinSession() POSTs to /sessions/join', () => {
    service.joinSession({ code: 'ABCDEF', displayName: 'Ada' }).subscribe();
    const req = httpMock.expectOne(`${BASE}/join`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ code: 'ABCDEF', displayName: 'Ada' });
    req.flush({ participantId: 'p-1', token: 't-1', wsTopic: '/topic/collaboratif/session/s-1', sessionId: 's-1' });
  });

  it('guestHeartbeat() POSTs to the participant heartbeat endpoint', () => {
    service.guestHeartbeat('s-1', 'p-1', { token: 't-1' }).subscribe();
    const req = httpMock.expectOne(`${BASE}/s-1/participants/p-1/heartbeat`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 't-1' });
    req.flush(null);
  });

  it('submitPollVote() POSTs the option ids', () => {
    service.submitPollVote('s-1', { optionIds: ['o-1'] }).subscribe();
    const req = httpMock.expectOne(`${BASE}/s-1/poll/vote`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ optionIds: ['o-1'] });
    req.flush(null);
  });

  it('hidePollResults() / showPollResults() POST to their respective endpoints', () => {
    service.hidePollResults('s-1').subscribe();
    httpMock.expectOne(`${BASE}/s-1/poll/hide-results`).flush(null);
    service.showPollResults('s-1').subscribe();
    httpMock.expectOne(`${BASE}/s-1/poll/show-results`).flush(null);
  });

  it('submitWord() POSTs the word', () => {
    service.submitWord('s-1', { word: 'agile' }).subscribe();
    const req = httpMock.expectOne(`${BASE}/s-1/wordcloud/words`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ word: 'agile' });
    req.flush({ word: 'agile', frequency: 1 });
  });

  it('removeWord() DELETEs the encoded word', () => {
    service.removeWord('s-1', 'mot rare').subscribe();
    const req = httpMock.expectOne(`${BASE}/s-1/wordcloud/words/${encodeURIComponent('mot rare')}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
