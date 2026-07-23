import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { RxStomp, RxStompState } from '@stomp/rx-stomp';
import { Observable, Subject, Subscription } from 'rxjs';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';

/**
 * Native STOMP header carrying the session-scoped participant token returned by
 * `POST /sessions/join` (US19.2.1) — proves membership in *this* session, presented on the
 * SUBSCRIBE frame (not CONNECT), mirroring `agilite-ui`'s `RoomWsService` (`access-token`
 * header, same name, same convention — `SessionChannelInterceptor` reads it server-side).
 */
const ACCESS_TOKEN_HEADER = 'access-token';

/** UI connection status for the STOMP link opened after joining a session (US19.2.2 AC). */
export type SessionConnectionStatus = 'connecting' | 'connected' | 'error';

/**
 * The minimal slice of `@stomp/rx-stomp`'s `RxStomp` surface this service depends on — same DI
 * substitution seam as `agilite-ui`'s `RoomWsService.StompClient` (module-level mocking of
 * `@stomp/rx-stomp` proved unreliable under this repo's CI runner).
 */
export interface StompClient {
  readonly connectionState$: Observable<RxStompState>;
  readonly stompErrors$: Observable<unknown>;
  configure(config: { brokerURL: string }): void;
  activate(): void;
  deactivate(): Promise<unknown>;
  watch(destination: string, headers?: Record<string, string>): Observable<{ body: string }>;
}

/** Factory producing the {@link StompClient} used by {@link SessionWsService.connect}. */
export const SESSION_STOMP_CLIENT_FACTORY = new InjectionToken<() => StompClient>(
  'SESSION_STOMP_CLIENT_FACTORY',
  { providedIn: 'root', factory: () => () => new RxStomp() },
);

/**
 * Minimal STOMP client wrapper for a single live session (US19.2.2) — subscribes to
 * `/topic/collaboratif/session/{id}` using the participant-scoped access token from the join
 * response. Watch-only: every mutating action in this module (vote, word submission, lifecycle
 * transitions) is a plain REST call via {@link SessionApiService}; the WS link exists solely to
 * receive broadcast events.
 */
@Injectable({ providedIn: 'root' })
export class SessionWsService {
  private readonly createClient = inject(SESSION_STOMP_CLIENT_FACTORY);
  private readonly apiUrl = inject(COLLABORATIF_API_URL);

  /** Current connection status. */
  readonly status = signal<SessionConnectionStatus>('connecting');

  /** Raw STOMP message bodies received on the subscribed session topic. */
  readonly messages$ = new Subject<string>();

  private client: StompClient | null = null;
  private topicSubscription: Subscription | null = null;
  private stateSubscription: Subscription | null = null;
  private stompErrorSubscription: Subscription | null = null;
  /** Guards against replaying `RxStomp`'s seeded `CLOSED` state before any real attempt. */
  private everConnecting = false;

  /**
   * Connects and subscribes to the given session's topic, presenting the participant-scoped
   * access token on the native `access-token` header. Safe to call once per join; call
   * {@link disconnect} first to switch sessions on the same service instance.
   *
   * @param topic the session's STOMP destination (`wsTopic` from the join response)
   * @param accessToken the opaque, session-scoped participant token from the join response
   */
  connect(topic: string, accessToken: string): void {
    this.disconnect();
    this.everConnecting = false;
    this.status.set('connecting');

    const client = this.createClient();
    client.configure({ brokerURL: this.buildWsUrl() });
    this.client = client;

    this.stateSubscription = client.connectionState$.subscribe(state => this.onStateChange(state));
    this.stompErrorSubscription = client.stompErrors$.subscribe(() => this.status.set('error'));
    this.topicSubscription = client
      .watch(topic, { [ACCESS_TOKEN_HEADER]: accessToken })
      .subscribe(message => this.messages$.next(message.body));

    client.activate();
  }

  /** Tears down the STOMP connection and its subscriptions. Safe to call repeatedly. */
  disconnect(): void {
    this.topicSubscription?.unsubscribe();
    this.stateSubscription?.unsubscribe();
    this.stompErrorSubscription?.unsubscribe();
    this.topicSubscription = null;
    this.stateSubscription = null;
    this.stompErrorSubscription = null;

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
   * Derives the WebSocket URL from the injected {@link COLLABORATIF_API_URL} — same handling of
   * absolute dev vs. relative production URLs as `WhiteboardSyncService.buildWsUrl`. Assumes a
   * dedicated `/ws/session` endpoint (sibling of whiteboard's own `/ws/whiteboard`) — verify
   * against the real `WebSocketConfig` once the backend branch lands.
   */
  private buildWsUrl(): string {
    const apiUrl = this.apiUrl;
    if (/^https?:\/\//.test(apiUrl)) {
      return `${apiUrl.replace(/^http/, 'ws')}/ws/session`;
    }
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${scheme}://${window.location.host}${apiUrl}/ws/session`;
  }
}
