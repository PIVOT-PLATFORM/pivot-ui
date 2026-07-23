import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { RxStompState } from '@stomp/rx-stomp';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { ParticipantSessionResponse, SessionStatus } from '../models/session.model';
import { SESSION_STOMP_CLIENT_FACTORY, SessionWsService, StompClient } from '../services/session-ws.service';
import { SessionParticipantShellComponent } from './session-participant-shell.component';
import { SessionActivityPollComponent } from '../session-activity-poll/session-activity-poll.component';

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';
const TOPIC = '/topic/collaboratif/session/s-1';

/** Same minimal fake as `session-ws.service.spec.ts` — avoids a real WebSocket in tests. */
class FakeRxStomp implements StompClient {
  readonly connectionState$ = new Subject<RxStompState>();
  readonly stompErrors$ = new Subject<unknown>();
  readonly configureCalls: { brokerURL: string; connectHeaders?: Record<string, string> }[] = [];
  readonly watchCalls: string[] = [];
  activateCalls = 0;
  deactivateCalls = 0;
  watch(destination: string) {
    this.watchCalls.push(destination);
    return new Subject<{ body: string }>().asObservable();
  }
  configure(cfg: { brokerURL: string; connectHeaders?: Record<string, string> }): void {
    this.configureCalls.push(cfg);
  }
  activate(): void {
    this.activateCalls++;
  }
  deactivate(): Promise<void> {
    this.deactivateCalls++;
    return Promise.resolve();
  }
}

function session(status: SessionStatus, type: ParticipantSessionResponse['type'] = 'POLL'): ParticipantSessionResponse {
  return {
    id: 's-1',
    title: 'Sprint retro',
    type,
    status,
    config: { question: 'Q?', options: [], allowMultiple: false },
    participantCount: 1,
    startedAt: '2026-07-22T08:01:00Z',
    endedAt: null,
  };
}

describe('SessionParticipantShellComponent', () => {
  let httpMock: HttpTestingController;
  let fake: FakeRxStomp;

  beforeEach(async () => {
    fake = new FakeRxStomp();
    await TestBed.configureTestingModule({
      imports: [SessionParticipantShellComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
        { provide: SESSION_STOMP_CLIENT_FACTORY, useValue: () => fake },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ sessionId: 's-1' }) } },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    history.replaceState(null, '');
  });

  async function createFixture(initial = session('LIVE')) {
    const fixture = TestBed.createComponent(SessionParticipantShellComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${TEST_API_URL}/sessions/s-1/state`).flush(initial);
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


  it('flags loadError when the initial load fails', () => {
    const fixture = TestBed.createComponent(SessionParticipantShellComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${TEST_API_URL}/sessions/s-1/state`).flush(null, { status: 500, statusText: 'Server Error' });
    expect(fixture.componentInstance.loadError()).toBe(true);
  });

  it('redirects to the results route when the loaded session is already COMPLETED', async () => {
    const fixture = TestBed.createComponent(SessionParticipantShellComponent);
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    httpMock.expectOne(`${TEST_API_URL}/sessions/s-1/state`).flush(session('COMPLETED'));
    await fixture.whenStable();
    expect(navigateSpy).toHaveBeenCalledWith(['/session', 's-1', 'results']);
  });

  it('marks the activity disabled on SESSION_PAUSED and re-enables it on SESSION_RESUMED', async () => {
    const fixture = await createFixture();
    const ws = TestBed.inject(SessionWsService);

    ws.messages$.next(JSON.stringify({ type: 'SESSION_PAUSED', sessionId: 's-1' }));
    expect(fixture.componentInstance.session()?.status).toBe('PAUSED');
    expect(fixture.componentInstance['activityInputs']()?.['disabled']).toBe(true);

    ws.messages$.next(JSON.stringify({ type: 'SESSION_RESUMED', sessionId: 's-1' }));
    expect(fixture.componentInstance.session()?.status).toBe('LIVE');
    expect(fixture.componentInstance['activityInputs']()?.['disabled']).toBe(false);
  });

  it('navigates to the results route on SESSION_ENDED', async () => {
    const fixture = await createFixture();
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const ws = TestBed.inject(SessionWsService);

    ws.messages$.next(JSON.stringify({ type: 'SESSION_ENDED', sessionId: 's-1' }));

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
    ws.messages$.next(JSON.stringify({ type: 'SESSION_PAUSED', sessionId: 's-1' }));
    expect(fixture.componentInstance.session()).toBeNull();
    httpMock.expectOne(`${TEST_API_URL}/sessions/s-1/state`).flush(session('LIVE'));
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

    const req = httpMock.expectOne(`${TEST_API_URL}/sessions/s-1/state`);
    req.flush(session('LIVE'));
  });

  it('does not re-fetch on a "connected" status that was never preceded by "error"', async () => {
    const fixture = await createFixture();
    const ws = TestBed.inject(SessionWsService);

    ws.status.set('connecting');
    ws.status.set('connected');
    fixture.detectChanges();
    await fixture.whenStable();

    httpMock.expectNone(`${TEST_API_URL}/sessions/s-1/state`);
  });

  it('unsubscribes from WS messages on destroy', async () => {
    const fixture = await createFixture();
    const ws = TestBed.inject(SessionWsService);
    const before = fixture.componentInstance.session();
    fixture.destroy();
    ws.messages$.next(JSON.stringify({ type: 'SESSION_PAUSED', sessionId: 's-1' }));
    expect(fixture.componentInstance.session()).toEqual(before);
  });

  // ── WS connection + heartbeat ownership (moved here from SessionJoinComponent) ──

  it('connects to the session topic with the guest token handed off via router navigation state', async () => {
    history.pushState({ participantId: 'p-1', guestToken: 'guest-tok' }, '');
    await createFixture();

    expect(fake.configureCalls[0].connectHeaders).toEqual({ 'X-Guest-Token': 'guest-tok' });
    expect(fake.watchCalls).toEqual([TOPIC]);
    expect(fake.activateCalls).toBe(1);
  });

  it('forwards the guest token as X-Guest-Token on the REST session-state call (US19.2.2)', async () => {
    history.pushState({ participantId: 'p-1', guestToken: 'guest-tok' }, '');
    const fixture = TestBed.createComponent(SessionParticipantShellComponent);
    fixture.detectChanges();

    const req = httpMock.expectOne(`${TEST_API_URL}/sessions/s-1/state`);
    expect(req.request.headers.get('X-Guest-Token')).toBe('guest-tok');
    req.flush(session('LIVE'));
  });

  it('sends no X-Guest-Token on the REST session-state call for an authenticated caller', async () => {
    const fixture = TestBed.createComponent(SessionParticipantShellComponent);
    fixture.detectChanges();

    const req = httpMock.expectOne(`${TEST_API_URL}/sessions/s-1/state`);
    expect(req.request.headers.has('X-Guest-Token')).toBe(false);
    req.flush(session('LIVE'));
  });

  it('connects with no guest token (authenticated caller / no navigation state) when history.state is empty', async () => {
    await createFixture();
    expect(fake.configureCalls[0].connectHeaders).toEqual({});
    expect(fake.activateCalls).toBe(1);
  });

  it('starts a heartbeat only when a guest token was handed off, sending it in the request body', async () => {
    history.pushState({ participantId: 'p-1', guestToken: 'guest-tok' }, '');
    // Fake timers enabled BEFORE the fixture is created — RxJS's interval() schedules its very
    // first timer at subscribe time (inside ngOnInit()); enabling fake timers only afterward
    // would leave that already-scheduled timer real, immune to a later advanceTimersByTime().
    // Not using the shared createFixture() helper here — its internal real-setTimeout-based
    // settle delay (for the unrelated dynamic-import activity component) would hang forever
    // under fake timers, and this test only cares about the heartbeat, not the activity outlet.
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(SessionParticipantShellComponent);
      fixture.detectChanges();
      httpMock.expectOne(`${TEST_API_URL}/sessions/s-1/state`).flush(session('LIVE'));

      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      httpMock.expectOne(`${TEST_API_URL}/sessions/s-1/participants/p-1/heartbeat`).flush(null);
      fixture.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not start a heartbeat when no guest token was handed off', async () => {
    const fixture = await createFixture();
    vi.useFakeTimers();
    try {
      vi.advanceTimersByTime(5 * 60 * 1000);
      httpMock.expectNone(`${TEST_API_URL}/sessions/s-1/participants/p-1/heartbeat`);
    } finally {
      vi.useRealTimers();
    }
    fixture.destroy();
  });

  it('disconnects the WS link on destroy', async () => {
    const fixture = await createFixture();
    fixture.destroy();
    expect(fake.deactivateCalls).toBeGreaterThanOrEqual(1);
  });
});
