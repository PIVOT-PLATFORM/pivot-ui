import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { SessionResponse, SessionStatus } from '../models/session.model';
import { SessionWsService } from '../services/session-ws.service';
import { SessionParticipantShellComponent } from './session-participant-shell.component';
import { SessionActivityPollComponent } from '../session-activity-poll/session-activity-poll.component';
import { SessionActivityPlaceholderComponent } from '../session-activity-placeholder/session-activity-placeholder.component';

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';

function session(status: SessionStatus, type: SessionResponse['type'] = 'POLL'): SessionResponse {
  return {
    id: 's-1',
    title: 'Sprint retro',
    type,
    status,
    joinCode: 'ABCDEF',
    config: { question: 'Q?', options: [], allowMultiple: false },
    teamId: null,
    participantCount: 1,
    createdBy: 1,
    createdAt: '2026-07-22T08:00:00Z',
    startedAt: '2026-07-22T08:01:00Z',
    endedAt: null,
  };
}

describe('SessionParticipantShellComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionParticipantShellComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ sessionId: 's-1' }) } },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  async function createFixture(initial = session('LIVE')) {
    const fixture = TestBed.createComponent(SessionParticipantShellComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${TEST_API_URL}/sessions/s-1`).flush(initial);
    // syncActivityComponent() resolves the activity component via a dynamic import() — a real
    // module load, not merely a microtask — so whenStable() alone is not a reliable enough
    // signal here; wait for a macrotask tick too before asserting on activityComponent()/inputs.
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 50));
    fixture.detectChanges();
    return fixture;
  }

  it('loads the session and lazy-loads the matching activity component (POLL)', async () => {
    const fixture = await createFixture(session('LIVE', 'POLL'));
    expect(fixture.componentInstance.session()?.type).toBe('POLL');
    expect(fixture.componentInstance.activityComponent()).toBe(SessionActivityPollComponent);
  });

  it('falls back to the placeholder component for a not-yet-built activity type', async () => {
    const fixture = await createFixture(session('LIVE', 'QUIZ'));
    expect(fixture.componentInstance.activityComponent()).toBe(SessionActivityPlaceholderComponent);
  });

  it('flags loadError when the initial load fails', () => {
    const fixture = TestBed.createComponent(SessionParticipantShellComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${TEST_API_URL}/sessions/s-1`).flush(null, { status: 500, statusText: 'Server Error' });
    expect(fixture.componentInstance.loadError()).toBe(true);
  });

  it('redirects to the results route when the loaded session is already COMPLETED', async () => {
    const fixture = TestBed.createComponent(SessionParticipantShellComponent);
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    httpMock.expectOne(`${TEST_API_URL}/sessions/s-1`).flush(session('COMPLETED'));
    await fixture.whenStable();
    expect(navigateSpy).toHaveBeenCalledWith(['/session', 's-1', 'results']);
  });

  it('marks the activity disabled on SESSION_PAUSED and re-enables it on SESSION_RESUMED', async () => {
    const fixture = await createFixture();
    const ws = TestBed.inject(SessionWsService);

    ws.messages$.next(JSON.stringify({ type: 'SESSION_PAUSED', session: session('PAUSED') }));
    expect(fixture.componentInstance.session()?.status).toBe('PAUSED');
    expect(fixture.componentInstance['activityInputs']()?.['disabled']).toBe(true);

    ws.messages$.next(JSON.stringify({ type: 'SESSION_RESUMED', session: session('LIVE') }));
    expect(fixture.componentInstance.session()?.status).toBe('LIVE');
    expect(fixture.componentInstance['activityInputs']()?.['disabled']).toBe(false);
  });

  it('navigates to the results route on SESSION_ENDED', async () => {
    const fixture = await createFixture();
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const ws = TestBed.inject(SessionWsService);

    ws.messages$.next(JSON.stringify({ type: 'SESSION_ENDED', session: session('COMPLETED') }));

    expect(fixture.componentInstance.session()?.status).toBe('COMPLETED');
    expect(navigateSpy).toHaveBeenCalledWith(['/session', 's-1', 'results']);
  });

  it('ignores malformed or unrelated WS payloads', async () => {
    const fixture = await createFixture();
    const ws = TestBed.inject(SessionWsService);
    const before = fixture.componentInstance.session();

    ws.messages$.next('not json');
    ws.messages$.next(JSON.stringify({ type: 'PARTICIPANT_JOINED', participantId: 'p-1', displayName: 'Ada' }));

    expect(fixture.componentInstance.session()).toEqual(before);
  });

  it('WS message is a no-op before the session has loaded', () => {
    const fixture = TestBed.createComponent(SessionParticipantShellComponent);
    fixture.detectChanges();
    const ws = TestBed.inject(SessionWsService);
    ws.messages$.next(JSON.stringify({ type: 'SESSION_PAUSED', session: session('PAUSED') }));
    expect(fixture.componentInstance.session()).toBeNull();
    httpMock.expectOne(`${TEST_API_URL}/sessions/s-1`).flush(session('LIVE'));
  });

  it('re-fetches session state from REST when the WS link reconnects after an error', async () => {
    const fixture = await createFixture();
    const ws = TestBed.inject(SessionWsService);

    // Each transition is flushed separately (detectChanges between each set()) — mirroring real
    // STOMP events, which always arrive as distinct async ticks, never coalesced into one flush.
    ws.status.set('error');
    fixture.detectChanges();
    ws.status.set('connecting');
    fixture.detectChanges();
    ws.status.set('connected');
    fixture.detectChanges();
    await fixture.whenStable();

    const req = httpMock.expectOne(`${TEST_API_URL}/sessions/s-1`);
    req.flush(session('LIVE'));
  });

  it('does not re-fetch on a "connected" status that was never preceded by "error"', async () => {
    const fixture = await createFixture();
    const ws = TestBed.inject(SessionWsService);

    ws.status.set('connecting');
    ws.status.set('connected');
    fixture.detectChanges();
    await fixture.whenStable();

    httpMock.expectNone(`${TEST_API_URL}/sessions/s-1`);
  });

  it('unsubscribes from WS messages on destroy', async () => {
    const fixture = await createFixture();
    const ws = TestBed.inject(SessionWsService);
    const before = fixture.componentInstance.session();
    fixture.destroy();
    ws.messages$.next(JSON.stringify({ type: 'SESSION_PAUSED', session: session('PAUSED') }));
    expect(fixture.componentInstance.session()).toEqual(before);
  });
});
