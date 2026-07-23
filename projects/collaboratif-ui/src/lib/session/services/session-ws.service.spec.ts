import { TestBed } from '@angular/core/testing';
import { RxStompState } from '@stomp/rx-stomp';
import { Subject } from 'rxjs';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { SESSION_STOMP_CLIENT_FACTORY, SessionWsService, StompClient } from './session-ws.service';

/**
 * Minimal fake standing in for `@stomp/rx-stomp`'s `RxStomp`, substituted via
 * `SESSION_STOMP_CLIENT_FACTORY` (Angular DI) — see `session-ws.service.ts`'s `StompClient` TSDoc:
 * mocking the `@stomp/rx-stomp` module itself proved unreliable under this repo's CI runner.
 */
class FakeRxStomp implements StompClient {
  readonly connectionState$ = new Subject<RxStompState>();
  readonly stompErrors$ = new Subject<unknown>();
  readonly configureCalls: unknown[] = [];
  activateCalls = 0;
  deactivateCalls = 0;
  readonly watchCalls: { destination: string; headers?: Record<string, string> }[] = [];
  private readonly watchers = new Map<string, Subject<{ body: string }>>();

  configure(cfg: unknown): void {
    this.configureCalls.push(cfg);
  }

  activate(): void {
    this.activateCalls++;
  }

  deactivate(): Promise<void> {
    this.deactivateCalls++;
    return Promise.resolve();
  }

  watch(destination: string, headers?: Record<string, string>) {
    this.watchCalls.push({ destination, headers });
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
const ACCESS_TOKEN = 'opaque-participant-token';
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

  it('configures the STOMP client with a ws:// URL derived from COLLABORATIF_API_URL and activates it', () => {
    service.connect(TOPIC, ACCESS_TOKEN);

    const cfg = fake.configureCalls[0] as { brokerURL: string };
    expect(cfg.brokerURL).toBe('ws://localhost:8083/api/collaboratif/ws/session');
    expect(fake.activateCalls).toBe(1);
  });

  it('subscribes to the given topic, presenting the access token on the native "access-token" header', () => {
    service.connect(TOPIC, ACCESS_TOKEN);

    expect(fake.watchCalls).toHaveLength(1);
    expect(fake.watchCalls[0].destination).toBe(TOPIC);
    expect(fake.watchCalls[0].headers).toEqual({ 'access-token': ACCESS_TOKEN });
  });

  it('starts in the "connecting" status', () => {
    service.connect(TOPIC, ACCESS_TOKEN);
    expect(service.status()).toBe('connecting');
  });

  it('transitions to "connected" once the STOMP connection opens', () => {
    service.connect(TOPIC, ACCESS_TOKEN);
    fake.connectionState$.next(RxStompState.CONNECTING);
    fake.connectionState$.next(RxStompState.OPEN);
    expect(service.status()).toBe('connected');
  });

  it('ignores a CLOSED emission before any CONNECTING (initial BehaviorSubject replay)', () => {
    service.connect(TOPIC, ACCESS_TOKEN);
    fake.connectionState$.next(RxStompState.CLOSED);
    expect(service.status()).toBe('connecting');
  });

  it('transitions to "error" when the connection drops after having connected', () => {
    service.connect(TOPIC, ACCESS_TOKEN);
    fake.connectionState$.next(RxStompState.CONNECTING);
    fake.connectionState$.next(RxStompState.OPEN);
    fake.connectionState$.next(RxStompState.CLOSED);
    expect(service.status()).toBe('error');
  });

  it('transitions to "error" on a STOMP ERROR frame (e.g. rejected access token)', () => {
    service.connect(TOPIC, ACCESS_TOKEN);
    fake.stompErrors$.next({});
    expect(service.status()).toBe('error');
  });

  it('a transient CLOSING state does not change the status', () => {
    service.connect(TOPIC, ACCESS_TOKEN);
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
    relService.connect(TOPIC, ACCESS_TOKEN);
    const cfg = fake.configureCalls[0] as { brokerURL: string };
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    expect(cfg.brokerURL).toBe(`${scheme}://${window.location.host}/api/collaboratif/ws/session`);
  });

  it('resets to "connecting" on a fresh connect() call after a prior error', () => {
    service.connect(TOPIC, ACCESS_TOKEN);
    fake.connectionState$.next(RxStompState.CONNECTING);
    fake.connectionState$.next(RxStompState.CLOSED);
    expect(service.status()).toBe('error');

    activeFake.current = new FakeRxStomp();
    service.connect(TOPIC, ACCESS_TOKEN);
    expect(service.status()).toBe('connecting');
  });

  it('forwards raw message bodies received on the subscribed topic', () => {
    service.connect(TOPIC, ACCESS_TOKEN);
    const received: string[] = [];
    service.messages$.subscribe(body => received.push(body));

    fake.emit(TOPIC, '{"type":"POLL_UPDATED"}');

    expect(received).toEqual(['{"type":"POLL_UPDATED"}']);
  });

  it('disconnect() deactivates the client', () => {
    service.connect(TOPIC, ACCESS_TOKEN);
    service.disconnect();
    expect(fake.deactivateCalls).toBeGreaterThanOrEqual(1);
  });

  it('disconnect() stops applying subsequent incoming messages', () => {
    service.connect(TOPIC, ACCESS_TOKEN);
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
    service.connect(TOPIC, ACCESS_TOKEN);
    const firstFake = fake;

    activeFake.current = new FakeRxStomp();
    service.connect(TOPIC, ACCESS_TOKEN);

    expect(firstFake.deactivateCalls).toBeGreaterThanOrEqual(1);
  });
});
