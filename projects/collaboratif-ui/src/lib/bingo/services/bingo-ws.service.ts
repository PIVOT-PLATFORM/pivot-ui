import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { RxStomp, RxStompState } from '@stomp/rx-stomp';
import { Observable, Subject, Subscription } from 'rxjs';
import { COLLABORATIF_API_URL, COLLABORATIF_BEARER_TOKEN } from '../../core/whiteboard/config/tokens';

/**
 * Native STOMP header carrying the room-scoped access token on every SUBSCRIBE/SEND frame
 * (SEC-01) — fixed by the backend contract, `BingoChannelInterceptor.ACCESS_TOKEN_HEADER`.
 */
const ACCESS_TOKEN_HEADER = 'access-token';

/**
 * Native STOMP header carrying an anonymous participant's CONNECT-time fallback credential — the
 * shared `collaboratif` client inbound channel authenticates every `CONNECT` frame regardless of
 * destination (`StompAuthenticationChannelInterceptor`), so an anonymous Bingo participant (no
 * bearer token at all) must present *something* here. Backend's `BingoGuestPrincipalResolver`
 * parses the composite `"{roomId}:{accessToken}"` shape built by {@link BingoWsService.connect}
 * — this CONNECT-time credential carries no authorization weight of its own; every subsequent
 * SUBSCRIBE/SEND is still independently checked against {@link ACCESS_TOKEN_HEADER} regardless.
 */
const GUEST_TOKEN_HEADER = 'X-Guest-Token';

/** UI connection status for the STOMP link opened after joining a room (AC-47.1.1-06). */
export type BingoConnectionStatus = 'connecting' | 'connected' | 'error';

/**
 * The minimal slice of `@stomp/rx-stomp`'s `RxStomp` surface this service depends on — same DI
 * substitution seam as `agilite-ui`'s `RoomWsService.StompClient` (module-level mocking of
 * `@stomp/rx-stomp` proved unreliable under this repo's CI runner).
 */
export interface StompClient {
  readonly connectionState$: Observable<RxStompState>;
  readonly stompErrors$: Observable<unknown>;
  configure(config: { brokerURL: string; connectHeaders?: Record<string, string> }): void;
  activate(): void;
  deactivate(): Promise<unknown>;
  watch(destination: string, headers?: Record<string, string>): Observable<{ body: string }>;
  publish(params: { destination: string; body: string; headers?: Record<string, string> }): void;
}

/** Factory producing the {@link StompClient} used by {@link BingoWsService.connect}. */
export const BINGO_STOMP_CLIENT_FACTORY = new InjectionToken<() => StompClient>('BINGO_STOMP_CLIENT_FACTORY', {
  providedIn: 'root',
  factory: () => () => new RxStomp(),
});

/**
 * Minimal STOMP client wrapper for a single Bingo room (US47.1.1, AC-47.1.1-06).
 *
 * Connects to the **native** (no SockJS) `/ws/collaboratif` endpoint and subscribes to the room's
 * `wsTopic`, presenting the room-scoped `accessToken` on the native `access-token` SUBSCRIBE
 * header (SEC-01/02) — the sole authorization mechanism, independent of whatever CONNECT-time
 * identity (bearer or guest) was established. `mark` publishes to the room's `/app/.../mark`
 * application destination the same way, also carrying `access-token`.
 */
@Injectable({ providedIn: 'root' })
export class BingoWsService {
  private readonly createClient = inject(BINGO_STOMP_CLIENT_FACTORY);
  private readonly apiUrl = inject(COLLABORATIF_API_URL);
  private readonly bearerToken = inject(COLLABORATIF_BEARER_TOKEN);

  /** Current connection status. */
  readonly status = signal<BingoConnectionStatus>('connecting');

  /** Raw STOMP message bodies received on the subscribed room topic. */
  readonly messages$ = new Subject<string>();

  /**
   * Raw STOMP message bodies received on this session's own `/user/queue/errors` — targeted
   * rejections of this client's own `mark` attempts (AC-47.1.1-14/18/19), never a room broadcast.
   */
  readonly errors$ = new Subject<string>();

  private client: StompClient | null = null;
  private topicSubscription: Subscription | null = null;
  private errorQueueSubscription: Subscription | null = null;
  private stateSubscription: Subscription | null = null;
  private stompErrorSubscription: Subscription | null = null;
  private roomId: string | null = null;
  private accessToken: string | null = null;
  private everConnecting = false;

  /**
   * Connects and subscribes to the given room's topic.
   *
   * @param topic the room's STOMP destination (`wsTopic` from the create/join response)
   * @param roomId the room's id — stored so {@link mark} can address the room's application
   *   destination without the caller passing it again on every mark
   * @param accessToken the opaque, room-scoped access token from the create/join response
   * @param isAnonymous whether the caller joined without a PIVOT account (AC-47.1.1-03) — when
   *   `true`, the composite `"{roomId}:{accessToken}"` guest credential is sent on CONNECT
   *   instead of an `Authorization` bearer header
   */
  connect(topic: string, roomId: string, accessToken: string, isAnonymous: boolean): void {
    this.disconnect();
    this.everConnecting = false;
    this.status.set('connecting');
    this.roomId = roomId;
    this.accessToken = accessToken;

    const client = this.createClient();
    client.configure({
      brokerURL: this.buildWsUrl(),
      connectHeaders: this.buildConnectHeaders(roomId, accessToken, isAnonymous),
    });
    this.client = client;

    this.stateSubscription = client.connectionState$.subscribe(state => this.onStateChange(state));
    this.stompErrorSubscription = client.stompErrors$.subscribe(() => this.status.set('error'));
    this.topicSubscription = client
      .watch(topic, { [ACCESS_TOKEN_HEADER]: accessToken })
      .subscribe(message => this.messages$.next(message.body));
    this.errorQueueSubscription = client
      .watch('/user/queue/errors')
      .subscribe(message => this.errors$.next(message.body));

    client.activate();
  }

  /**
   * Marks or unmarks a cell of the caller's own grid (AC-47.1.1-07), over STOMP SEND to
   * `/app/collaboratif/bingo/{roomId}/mark`. No-ops if {@link connect} was never called or the
   * connection has since been torn down.
   *
   * @param cellIndex the target cell's position (0..24)
   * @param marked the requested marked state
   */
  mark(cellIndex: number, marked: boolean): void {
    if (!this.client || !this.roomId || !this.accessToken) {
      return;
    }
    this.client.publish({
      destination: `/app/collaboratif/bingo/${this.roomId}/mark`,
      body: JSON.stringify({ cellIndex, marked }),
      headers: { [ACCESS_TOKEN_HEADER]: this.accessToken },
    });
  }

  /** Tears down the STOMP connection and its subscriptions. Safe to call repeatedly. */
  disconnect(): void {
    this.topicSubscription?.unsubscribe();
    this.errorQueueSubscription?.unsubscribe();
    this.stateSubscription?.unsubscribe();
    this.stompErrorSubscription?.unsubscribe();
    this.topicSubscription = null;
    this.errorQueueSubscription = null;
    this.stateSubscription = null;
    this.stompErrorSubscription = null;
    this.roomId = null;
    this.accessToken = null;

    void this.client?.deactivate();
    this.client = null;
  }

  private onStateChange(state: RxStompState): void {
    switch (state) {
      case RxStompState.CONNECTING:
        this.everConnecting = true;
        this.status.set('connecting');
        break;
      case RxStompState.OPEN:
        this.status.set('connected');
        break;
      case RxStompState.CLOSED:
        if (this.everConnecting) {
          this.status.set('error');
        }
        break;
      case RxStompState.CLOSING:
        break;
    }
  }

  /**
   * `Authorization: Bearer <token>` for an authenticated caller, or the composite
   * `X-Guest-Token: "{roomId}:{accessToken}"` for an anonymous one.
   */
  private buildConnectHeaders(roomId: string, accessToken: string, isAnonymous: boolean): Record<string, string> {
    if (isAnonymous) {
      return { [GUEST_TOKEN_HEADER]: `${roomId}:${accessToken}` };
    }
    const token = this.bearerToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /** Targets the Bingo-dedicated `/ws/collaboratif` endpoint (`CollaboratifWebSocketConfig`). */
  private buildWsUrl(): string {
    const apiUrl = this.apiUrl;
    if (/^https?:\/\//.test(apiUrl)) {
      return `${apiUrl.replace(/^http/, 'ws')}/ws/collaboratif`;
    }
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${scheme}://${window.location.host}${apiUrl}/ws/collaboratif`;
  }
}
