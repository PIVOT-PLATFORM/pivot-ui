import { TestBed } from '@angular/core/testing';
import { RxStompState } from '@stomp/rx-stomp';
import { Subject } from 'rxjs';
import { COLLABORATIF_API_URL, COLLABORATIF_BEARER_TOKEN } from '../../core/whiteboard/config/tokens';
import { SESSION_STOMP_CLIENT_FACTORY, SessionWsService, StompClient } from './session-ws.service';

/**
 * Minimal fake standing in for `@stomp/rx-stomp`'s `RxStomp`, substituted via
 * `SESSION_STOMP_CLIENT_FACTORY` (Angular DI) — see `session-ws.service.ts`'s `StompClient` TSDoc:
 * mocking the `@stomp/rx-stomp` module itself proved unreliable under this repo's CI runner.
 */
class FakeRxStomp implements StompClient {
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

const TOPIC = '/topic/collaboratif/session/s-1';
const GUEST_TOKEN = 'opaque-guest-token';
const TEST_API_URL = 'http://localhost:8083/api/collaboratif';

describe('SessionWsService', () => {
  let service: SessionWsService;
  let fake: FakeRxStomp;
  let activeFake: { current: FakeRxStomp };

  beforeEach(() => {
    fake = new FakeRxStomp();
    activeFake = { current: fake };

    TestBed.configureTestingModule({
      providers: [
        { provide: SESSION_STOMP_CLIENT_FACTORY, useValue: () => activeFake.current },
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
      ],
    });
    service = TestBed.inject(SessionWsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('configures the STOMP client with a ws:// URL targeting the shared /ws/whiteboard endpoint', () => {
    service.connect(TOPIC, GUEST_TOKEN);

    const cfg = fake.configureCalls[0];
    expect(cfg.brokerURL).toBe('ws://localhost:8083/api/collaboratif/ws/whiteboard');
    expect(fake.activateCalls).toBe(1);
  });

  it('presents the guest token on the CONNECT frame via the native X-Guest-Token header', () => {
    service.connect(TOPIC, GUEST_TOKEN);
    expect(fake.configureCalls[0].connectHeaders).toEqual({ 'X-Guest-Token': GUEST_TOKEN });
  });

  it('presents the bearer token on CONNECT (Authorization header) for an authenticated caller (no guest token)', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: SESSION_STOMP_CLIENT_FACTORY, useValue: () => activeFake.current },
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
        { provide: COLLABORATIF_BEARER_TOKEN, useValue: () => 'bearer-abc' },
      ],
    });
    const authService = TestBed.inject(SessionWsService);
    authService.connect(TOPIC, null);
    expect(fake.configureCalls[0].connectHeaders).toEqual({ Authorization: 'Bearer bearer-abc' });
  });

  it('sends no CONNECT headers when neither a guest token nor a bearer token is available', () => {
    service.connect(TOPIC, null);
    expect(fake.configureCalls[0].connectHeaders).toEqual({});
  });

  it('subscribes to the given topic with no per-SUBSCRIBE headers', () => {
    service.connect(TOPIC, GUEST_TOKEN);
    expect(fake.watchCalls).toEqual([TOPIC]);
  });

  it('starts in the "connecting" status', () => {
    service.connect(TOPIC, GUEST_TOKEN);
    expect(service.status()).toBe('connecting');
  });

  it('transitions to "connected" once the STOMP connection opens', () => {
    service.connect(TOPIC, GUEST_TOKEN);
    fake.connectionState$.next(RxStompState.CONNECTING);
    fake.connectionState$.next(RxStompState.OPEN);
    expect(service.status()).toBe('connected');
  });

  it('ignores a CLOSED emission before any CONNECTING (initial BehaviorSubject replay)', () => {
    service.connect(TOPIC, GUEST_TOKEN);
    fake.connectionState$.next(RxStompState.CLOSED);
    expect(service.status()).toBe('connecting');
  });

  it('transitions to "error" when the connection drops after having connected', () => {
    service.connect(TOPIC, GUEST_TOKEN);
    fake.connectionState$.next(RxStompState.CONNECTING);
    fake.connectionState$.next(RxStompState.OPEN);
    fake.connectionState$.next(RxStompState.CLOSED);
    expect(service.status()).toBe('error');
  });

  it('transitions to "error" on a STOMP ERROR frame (e.g. rejected credential)', () => {
    service.connect(TOPIC, GUEST_TOKEN);
    fake.stompErrors$.next({});
    expect(service.status()).toBe('error');
  });

  it('a transient CLOSING state does not change the status', () => {
    service.connect(TOPIC, GUEST_TOKEN);
    fake.connectionState$.next(RxStompState.CONNECTING);
    fake.connectionState$.next(RxStompState.OPEN);
    fake.connectionState$.next(RxStompState.CLOSING);
    expect(service.status()).toBe('connected');
  });

  it('resolves a relative apiUrl (nginx-proxied prod build) against the page origin', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: SESSION_STOMP_CLIENT_FACTORY, useValue: () => activeFake.current },
        { provide: COLLABORATIF_API_URL, useValue: '/api/collaboratif' },
      ],
    });
    const relService = TestBed.inject(SessionWsService);
    relService.connect(TOPIC, GUEST_TOKEN);
    const cfg = fake.configureCalls[0];
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    expect(cfg.brokerURL).toBe(`${scheme}://${window.location.host}/api/collaboratif/ws/whiteboard`);
  });

  it('resets to "connecting" on a fresh connect() call after a prior error', () => {
    service.connect(TOPIC, GUEST_TOKEN);
    fake.connectionState$.next(RxStompState.CONNECTING);
    fake.connectionState$.next(RxStompState.CLOSED);
    expect(service.status()).toBe('error');

    activeFake.current = new FakeRxStomp();
    service.connect(TOPIC, GUEST_TOKEN);
    expect(service.status()).toBe('connecting');
  });

  it('forwards raw message bodies received on the subscribed topic', () => {
    service.connect(TOPIC, GUEST_TOKEN);
    const received: string[] = [];
    service.messages$.subscribe(body => received.push(body));

    fake.emit(TOPIC, '{"type":"POLL_UPDATED"}');

    expect(received).toEqual(['{"type":"POLL_UPDATED"}']);
  });

  it('disconnect() deactivates the client', () => {
    service.connect(TOPIC, GUEST_TOKEN);
    service.disconnect();
    expect(fake.deactivateCalls).toBeGreaterThanOrEqual(1);
  });

  it('disconnect() stops applying subsequent incoming messages', () => {
    service.connect(TOPIC, GUEST_TOKEN);
    const received: string[] = [];
    service.messages$.subscribe(body => received.push(body));
    service.disconnect();

    fake.emit(TOPIC, '{"type":"POLL_UPDATED"}');
    expect(received).toHaveLength(0);
  });

  it('disconnect() is safe to call without a prior connect()', () => {
    expect(() => service.disconnect()).not.toThrow();
  });

  it('connect() calls disconnect() first, tearing down any prior connection', () => {
    service.connect(TOPIC, GUEST_TOKEN);
    const firstFake = fake;

    activeFake.current = new FakeRxStomp();
    service.connect(TOPIC, GUEST_TOKEN);

    expect(firstFake.deactivateCalls).toBeGreaterThanOrEqual(1);
  });
});
