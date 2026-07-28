import { TestBed } from '@angular/core/testing';
import { RxStompState } from '@stomp/rx-stomp';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { COLLABORATIF_API_URL, COLLABORATIF_BEARER_TOKEN } from '../../core/whiteboard/config/tokens';
import { MEETING_STOMP_CLIENT_FACTORY, MeetingStompClient, MeetingWsService } from './meeting-ws.service';

/**
 * Minimal fake standing in for `@stomp/rx-stomp`'s `RxStomp`, substituted via
 * `MEETING_STOMP_CLIENT_FACTORY` (Angular DI) — see `meeting-ws.service.ts`'s `MeetingStompClient`
 * TSDoc: mocking the `@stomp/rx-stomp` module itself proved unreliable under this repo's CI runner
 * (same rationale as `SessionWsService`'s own `FakeRxStomp`, which this mirrors).
 */
class FakeRxStomp implements MeetingStompClient {
  readonly connectionState$ = new Subject<RxStompState>();
  readonly stompErrors$ = new Subject<unknown>();
  readonly configureCalls: { brokerURL: string; connectHeaders?: Record<string, string> }[] = [];
  activateCalls = 0;
  deactivateCalls = 0;
  readonly watchCalls: string[] = [];
  private readonly watchers = new Map<string, Subject<{ body: string }>>();

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

  watch(destination: string) {
    this.watchCalls.push(destination);
    return this.watcher(destination).asObservable();
  }

  emit(destination: string, body: string): void {
    this.watcher(destination).next({ body });
  }

  private watcher(destination: string): Subject<{ body: string }> {
    let subject = this.watchers.get(destination);
    if (!subject) {
      subject = new Subject<{ body: string }>();
      this.watchers.set(destination, subject);
    }
    return subject;
  }
}

const MEETING_ID = 'm-1';
const TOPIC = '/topic/collaboratif/meeting/m-1';
const TEST_API_URL = 'http://localhost:8083/api/collaboratif';

describe('MeetingWsService', () => {
  let service: MeetingWsService;
  let fake: FakeRxStomp;
  let activeFake: { current: FakeRxStomp };

  beforeEach(() => {
    fake = new FakeRxStomp();
    activeFake = { current: fake };

    TestBed.configureTestingModule({
      providers: [
        { provide: MEETING_STOMP_CLIENT_FACTORY, useValue: () => activeFake.current },
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
      ],
    });
    service = TestBed.inject(MeetingWsService);
  });

  afterEach(() => service.disconnect());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('configures the STOMP client with a ws:// URL targeting the shared /ws/whiteboard endpoint', () => {
    service.connect(MEETING_ID);

    const cfg = fake.configureCalls[0];
    expect(cfg.brokerURL).toBe('ws://localhost:8083/api/collaboratif/ws/whiteboard');
    expect(fake.activateCalls).toBe(1);
  });

  it('presents the bearer token on CONNECT (Authorization header) when available', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: MEETING_STOMP_CLIENT_FACTORY, useValue: () => activeFake.current },
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
        { provide: COLLABORATIF_BEARER_TOKEN, useValue: () => 'bearer-abc' },
      ],
    });
    const authService = TestBed.inject(MeetingWsService);
    authService.connect(MEETING_ID);
    expect(fake.configureCalls[0].connectHeaders).toEqual({ Authorization: 'Bearer bearer-abc' });
  });

  it('sends no CONNECT headers when no bearer token is available', () => {
    service.connect(MEETING_ID);
    expect(fake.configureCalls[0].connectHeaders).toEqual({});
  });

  it('subscribes to the meeting-specific topic with no per-SUBSCRIBE headers', () => {
    service.connect(MEETING_ID);
    expect(fake.watchCalls).toEqual([TOPIC]);
  });

  it('starts in the "connecting" status', () => {
    service.connect(MEETING_ID);
    expect(service.status()).toBe('connecting');
  });

  it('transitions to "connected" once the STOMP connection opens', () => {
    service.connect(MEETING_ID);
    fake.connectionState$.next(RxStompState.CONNECTING);
    fake.connectionState$.next(RxStompState.OPEN);
    expect(service.status()).toBe('connected');
  });

  it('ignores a CLOSED emission before any CONNECTING (initial BehaviorSubject replay)', () => {
    service.connect(MEETING_ID);
    fake.connectionState$.next(RxStompState.CLOSED);
    expect(service.status()).toBe('connecting');
  });

  it('transitions to "error" when the connection drops after having connected', () => {
    service.connect(MEETING_ID);
    fake.connectionState$.next(RxStompState.CONNECTING);
    fake.connectionState$.next(RxStompState.OPEN);
    fake.connectionState$.next(RxStompState.CLOSED);
    expect(service.status()).toBe('error');
  });

  it('transitions to "error" on a STOMP ERROR frame (e.g. denied SUBSCRIBE)', () => {
    service.connect(MEETING_ID);
    fake.stompErrors$.next({});
    expect(service.status()).toBe('error');
  });

  it('forwards raw message bodies received on the subscribed topic', () => {
    service.connect(MEETING_ID);
    const received: string[] = [];
    service.messages$.subscribe(body => received.push(body));

    fake.emit(TOPIC, '{"status":"CONFIRMED"}');

    expect(received).toEqual(['{"status":"CONFIRMED"}']);
  });

  it('disconnect() deactivates the client', () => {
    service.connect(MEETING_ID);
    service.disconnect();
    expect(fake.deactivateCalls).toBeGreaterThanOrEqual(1);
  });

  it('disconnect() stops applying subsequent incoming messages', () => {
    service.connect(MEETING_ID);
    const received: string[] = [];
    service.messages$.subscribe(body => received.push(body));
    service.disconnect();

    fake.emit(TOPIC, '{"status":"CONFIRMED"}');
    expect(received).toHaveLength(0);
  });

  it('disconnect() is safe to call without a prior connect()', () => {
    expect(() => service.disconnect()).not.toThrow();
  });

  it('connect() calls disconnect() first, tearing down any prior connection', () => {
    service.connect(MEETING_ID);
    const firstFake = fake;

    activeFake.current = new FakeRxStomp();
    service.connect(MEETING_ID);

    expect(firstFake.deactivateCalls).toBeGreaterThanOrEqual(1);
  });

  it('resolves a relative apiUrl (nginx-proxied prod build) against the page origin', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: MEETING_STOMP_CLIENT_FACTORY, useValue: () => activeFake.current },
        { provide: COLLABORATIF_API_URL, useValue: '/api/collaboratif' },
      ],
    });
    const relService = TestBed.inject(MeetingWsService);
    relService.connect(MEETING_ID);
    const cfg = fake.configureCalls[0];
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    expect(cfg.brokerURL).toBe(`${scheme}://${window.location.host}/api/collaboratif/ws/whiteboard`);
  });
});
