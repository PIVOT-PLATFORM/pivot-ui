import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../../environments/environment';
import { StandupSessionResponse } from '../models/standup.model';
import { StandupWsService } from '../services/standup-ws.service';
import { StandupRunnerComponent } from './standup-runner.component';

const pendingSession: StandupSessionResponse = {
  id: 's-1',
  teamId: 1,
  tenantId: 1,
  name: 'Daily du 22/07',
  status: 'PENDING',
  currentIndex: 0,
  timePerPersonSeconds: 120,
  participants: [
    { id: 'p-1', teamMemberId: 10, name: 'Ada', order: 0, status: 'WAITING', speakingAt: null, doneSpeaking: null, extraSeconds: 0 },
    { id: 'p-2', teamMemberId: 11, name: 'Grace', order: 1, status: 'WAITING', speakingAt: null, doneSpeaking: null, extraSeconds: 0 },
  ],
  startedAt: null,
  endedAt: null,
  createdAt: '2026-07-22T08:00:00Z',
  updatedAt: '2026-07-22T08:00:00Z',
};

const runningSession: StandupSessionResponse = {
  ...pendingSession,
  status: 'RUNNING',
  startedAt: '2026-07-22T08:05:00Z',
  participants: [
    { id: 'p-1', teamMemberId: 10, name: 'Ada', order: 0, status: 'SPEAKING', speakingAt: '2026-07-22T08:05:00Z', doneSpeaking: null, extraSeconds: 0 },
    { id: 'p-2', teamMemberId: 11, name: 'Grace', order: 1, status: 'WAITING', speakingAt: null, doneSpeaking: null, extraSeconds: 0 },
  ],
};

describe('StandupRunnerComponent', () => {
  let httpMock: HttpTestingController;
  let wsConnectSpy: ReturnType<typeof vi.fn>;
  let wsDisconnectSpy: ReturnType<typeof vi.fn>;
  let wsMessages$: Subject<string>;

  beforeEach(async () => {
    wsConnectSpy = vi.fn();
    wsDisconnectSpy = vi.fn();
    wsMessages$ = new Subject<string>();

    await TestBed.configureTestingModule({
      imports: [StandupRunnerComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ sessionId: 's-1' }) } },
        },
        {
          provide: StandupWsService,
          useValue: { connect: wsConnectSpy, disconnect: wsDisconnectSpy, messages$: wsMessages$, status: signal('connected') },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function createFixture(session: StandupSessionResponse = pendingSession) {
    const fixture = TestBed.createComponent(StandupRunnerComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/standup/sessions/s-1`).flush(session);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the session and connects the WS topic on init', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.session()).toEqual(pendingSession);
    expect(wsConnectSpy).toHaveBeenCalledWith('s-1', null);
  });

  it('shows the load error banner when the session fails to load', () => {
    const fixture = TestBed.createComponent(StandupRunnerComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/standup/sessions/s-1`).flush(null, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(fixture.componentInstance.loadError()).toBe(true);
  });

  it('disconnects the WS on destroy', () => {
    const fixture = createFixture();
    fixture.destroy();
    expect(wsDisconnectSpy).toHaveBeenCalled();
  });

  it('derives currentParticipant and nextParticipant from a RUNNING session', () => {
    const fixture = createFixture(runningSession);
    expect(fixture.componentInstance.currentParticipant()?.id).toBe('p-1');
    expect(fixture.componentInstance.nextParticipant()?.id).toBe('p-2');
    expect(fixture.componentInstance.isLastSpeaker()).toBe(false);
  });

  it('calls POST start and applies the returned session', () => {
    const fixture = createFixture();
    fixture.componentInstance.start();
    httpMock.expectOne(`${environment.apiUrl}/standup/sessions/s-1/start`).flush(runningSession);
    expect(fixture.componentInstance.session()).toEqual(runningSession);
  });

  it('calls POST next', () => {
    const fixture = createFixture(runningSession);
    fixture.componentInstance.next();
    httpMock.expectOne(`${environment.apiUrl}/standup/sessions/s-1/next`).flush(runningSession);
    expect(fixture.componentInstance.session()).toEqual(runningSession);
  });

  it('calls POST skip', () => {
    const fixture = createFixture(runningSession);
    fixture.componentInstance.skip();
    httpMock.expectOne(`${environment.apiUrl}/standup/sessions/s-1/skip`).flush(runningSession);
  });

  it('calls POST end', () => {
    const fixture = createFixture(runningSession);
    fixture.componentInstance.end();
    httpMock.expectOne(`${environment.apiUrl}/standup/sessions/s-1/end`).flush({ ...runningSession, status: 'DONE' });
  });

  it('calls POST extend with the chosen seconds', () => {
    const fixture = createFixture(runningSession);
    fixture.componentInstance.extend(30);
    const req = httpMock.expectOne(`${environment.apiUrl}/standup/sessions/s-1/extend`);
    expect(req.request.body).toEqual({ seconds: 30 });
    req.flush(runningSession);
  });

  it('surfaces an INVALID_SESSION_STATUS action error inline', () => {
    const fixture = createFixture(runningSession);
    fixture.componentInstance.next();
    httpMock
      .expectOne(`${environment.apiUrl}/standup/sessions/s-1/next`)
      .flush({ code: 'INVALID_SESSION_STATUS' }, { status: 409, statusText: 'Conflict' });
    expect(fixture.componentInstance.actionError()).toBe('INVALID_SESSION_STATUS');
  });

  it('does not fire a second action while one is already in flight', () => {
    const fixture = createFixture(runningSession);
    fixture.componentInstance.next();
    fixture.componentInstance.next();
    httpMock.expectOne(`${environment.apiUrl}/standup/sessions/s-1/next`).flush(runningSession);
  });

  it('applies SESSION_STARTED events directly from the WS payload', () => {
    const fixture = createFixture();
    wsMessages$.next(JSON.stringify({ type: 'SESSION_STARTED', session: runningSession }));
    expect(fixture.componentInstance.session()).toEqual(runningSession);
  });

  it('applies PARTICIPANTS_REORDERED events directly from the WS payload', () => {
    const fixture = createFixture(runningSession);
    const reordered = [...runningSession.participants].reverse();
    wsMessages$.next(JSON.stringify({ type: 'PARTICIPANTS_REORDERED', sessionId: 's-1', participants: reordered }));
    expect(fixture.componentInstance.session()?.participants).toEqual(reordered);
  });

  it('re-fetches the session on PARTICIPANT_CHANGED (partial WS payload)', () => {
    const fixture = createFixture(runningSession);
    wsMessages$.next(JSON.stringify({ type: 'PARTICIPANT_CHANGED', sessionId: 's-1', currentParticipant: null }));
    httpMock.expectOne(`${environment.apiUrl}/standup/sessions/s-1`).flush({ ...runningSession, status: 'DONE' });
    expect(fixture.componentInstance.session()?.status).toBe('DONE');
  });

  it('ignores an unparseable WS message body without throwing', () => {
    createFixture();
    expect(() => wsMessages$.next('not json')).not.toThrow();
  });

  it('sends a reorder request built from the drag-drop move', () => {
    const fixture = createFixture(runningSession);
    fixture.componentInstance.onReorder({ previousIndex: 0, currentIndex: 0 } as never);
    const req = httpMock.expectOne(`${environment.apiUrl}/standup/sessions/s-1/participants/reorder`);
    expect(req.request.body).toEqual({ participantIds: ['p-2'] });
    req.flush(runningSession);
  });
});
