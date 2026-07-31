import { TestBed } from '@angular/core/testing';
import { RxStompState } from '@stomp/rx-stomp';
import { Subject } from 'rxjs';
import { COLLABORATIF_API_URL, COLLABORATIF_BEARER_TOKEN } from '../../core/whiteboard/config/tokens';
import { BINGO_STOMP_CLIENT_FACTORY, BingoWsService, StompClient } from './bingo-ws.service';

/**
 * Minimal fake standing in for `@stomp/rx-stomp`'s `RxStomp`, substituted via
 * `BINGO_STOMP_CLIENT_FACTORY` (Angular DI) — see `bingo-ws.service.ts`'s `StompClient` TSDoc.
 */
class FakeRxStomp implements StompClient {
  readonly connectionState$ = new Subject<RxStompState>();
  readonly stompErrors$ = new Subject<unknown>();
  readonly configureCalls: { brokerURL: string; connectHeaders?: Record<string, string> }[] = [];
  activateCalls = 0;
  deactivateCalls = 0;
  readonly watchCalls: { destination: string; headers?: Record<string, string> }[] = [];
  readonly publishCalls: { destination: string; body: string; headers?: Record<string, string> }[] = [];
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

  watch(destination: string, headers?: Record<string, string>) {
    this.watchCalls.push({ destination, headers });
    return this.watcher(destination).asObservable();
  }

  publish(params: { destination: string; body: string; headers?: Record<string, string> }): void {
    this.publishCalls.push(params);
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

const TOPIC = '/topic/collaboratif/bingo/room-1';
const ROOM_ID = 'room-1';
const ACCESS_TOKEN = 'opaque-access-token';
const TEST_API_URL = 'http://localhost:8083/api/collaboratif';

describe('BingoWsService', () => {
  let service: BingoWsService;
  let fake: FakeRxStomp;
  let activeFake: { current: FakeRxStomp };

  beforeEach(() => {
    fake = new FakeRxStomp();
    activeFake = { current: fake };

    TestBed.configureTestingModule({
      providers: [
        { provide: BINGO_STOMP_CLIENT_FACTORY, useValue: () => activeFake.current },
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
      ],
    });
    service = TestBed.inject(BingoWsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('configures the STOMP client with a ws:// URL targeting the dedicated /ws/collaboratif endpoint', () => {
    service.connect(TOPIC, ROOM_ID, ACCESS_TOKEN, false);

    expect(fake.configureCalls[0].brokerURL).toBe('ws://localhost:8083/api/collaboratif/ws/collaboratif');
    expect(fake.activateCalls).toBe(1);
  });

  it('presents the composite roomId:accessToken guest credential on CONNECT for an anonymous join', () => {
    service.connect(TOPIC, ROOM_ID, ACCESS_TOKEN, true);
    expect(fake.configureCalls[0].connectHeaders).toEqual({ 'X-Guest-Token': `${ROOM_ID}:${ACCESS_TOKEN}` });
  });

  it('presents the bearer token on CONNECT for an authenticated join', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: BINGO_STOMP_CLIENT_FACTORY, useValue: () => activeFake.current },
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
        { provide: COLLABORATIF_BEARER_TOKEN, useValue: () => 'bearer-abc' },
      ],
    });
    const authService = TestBed.inject(BingoWsService);
    authService.connect(TOPIC, ROOM_ID, ACCESS_TOKEN, false);
    expect(fake.configureCalls[0].connectHeaders).toEqual({ Authorization: 'Bearer bearer-abc' });
  });

  it('subscribes to the room topic presenting the access-token native SUBSCRIBE header (SEC-01)', () => {
    service.connect(TOPIC, ROOM_ID, ACCESS_TOKEN, false);
    expect(fake.watchCalls).toContainEqual({ destination: TOPIC, headers: { 'access-token': ACCESS_TOKEN } });
  });

  it('also subscribes to /user/queue/errors', () => {
    service.connect(TOPIC, ROOM_ID, ACCESS_TOKEN, false);
    expect(fake.watchCalls.some(call => call.destination === '/user/queue/errors')).toBe(true);
  });

  it('mark() publishes to the room application destination with the access-token header', () => {
    service.connect(TOPIC, ROOM_ID, ACCESS_TOKEN, false);
    service.mark(3, true);

    expect(fake.publishCalls).toEqual([
      {
        destination: `/app/collaboratif/bingo/${ROOM_ID}/mark`,
        body: JSON.stringify({ cellIndex: 3, marked: true }),
        headers: { 'access-token': ACCESS_TOKEN },
      },
    ]);
  });

  it('mark() is a no-op when connect() was never called', () => {
    expect(() => service.mark(0, true)).not.toThrow();
    expect(fake.publishCalls).toHaveLength(0);
  });

  it('starts in the "connecting" status and transitions to "connected" once the STOMP connection opens', () => {
    service.connect(TOPIC, ROOM_ID, ACCESS_TOKEN, false);
    expect(service.status()).toBe('connecting');

    fake.connectionState$.next(RxStompState.CONNECTING);
    fake.connectionState$.next(RxStompState.OPEN);
    expect(service.status()).toBe('connected');
  });

  it('transitions to "error" when the connection drops after having connected', () => {
    service.connect(TOPIC, ROOM_ID, ACCESS_TOKEN, false);
    fake.connectionState$.next(RxStompState.CONNECTING);
    fake.connectionState$.next(RxStompState.OPEN);
    fake.connectionState$.next(RxStompState.CLOSED);
    expect(service.status()).toBe('error');
  });

  it('forwards raw message bodies received on the subscribed room topic', () => {
    service.connect(TOPIC, ROOM_ID, ACCESS_TOKEN, false);
    const received: string[] = [];
    service.messages$.subscribe(body => received.push(body));

    fake.emit(TOPIC, '{"type":"CELL_MARKED","markedCount":1}');

    expect(received).toEqual(['{"type":"CELL_MARKED","markedCount":1}']);
  });

  it('forwards raw message bodies received on /user/queue/errors separately from room broadcasts', () => {
    service.connect(TOPIC, ROOM_ID, ACCESS_TOKEN, false);
    const errors: string[] = [];
    const messages: string[] = [];
    service.errors$.subscribe(body => errors.push(body));
    service.messages$.subscribe(body => messages.push(body));

    fake.emit('/user/queue/errors', '{"code":"INVALID_CELL"}');

    expect(errors).toEqual(['{"code":"INVALID_CELL"}']);
    expect(messages).toHaveLength(0);
  });

  it('disconnect() deactivates the client and clears roomId/accessToken so mark() no-ops afterward', () => {
    service.connect(TOPIC, ROOM_ID, ACCESS_TOKEN, false);
    service.disconnect();

    expect(fake.deactivateCalls).toBeGreaterThanOrEqual(1);
    service.mark(0, true);
    expect(fake.publishCalls).toHaveLength(0);
  });

  it('disconnect() is safe to call without a prior connect()', () => {
    expect(() => service.disconnect()).not.toThrow();
  });
});
