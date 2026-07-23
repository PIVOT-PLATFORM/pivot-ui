import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { RxStomp, RxStompState } from '@stomp/rx-stomp';
import { Observable, Subject, Subscription } from 'rxjs';
import { COLLABORATIF_API_URL, COLLABORATIF_BEARER_TOKEN } from '../../core/whiteboard/config/tokens';

/**
 * Native STOMP header carrying a Module Session guest token on `CONNECT` (US19.2.1) —
 * `SessionGuestPrincipalResolver` reads it server-side as the anonymous-participant fallback when
 * no `Authorization` bearer header is present. Verified against the real backend
 * (`StompAuthenticationChannelInterceptor`, `pivot-core` branch `feat/sprint22-session-infra-backend`):
 * auth happens once, on `CONNECT` — never per-`SUBSCRIBE` (an earlier draft of this service
 * assumed a poker-style `access-token` header on `SUBSCRIBE`, which does not match this module's
 * actual contract).
 */
const GUEST_TOKEN_HEADER = 'X-Guest-Token';

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
  configure(config: { brokerURL: string; connectHeaders?: Record<string, string> }): void;
  activate(): void;
  deactivate(): Promise<unknown>;
  watch(destination: string): Observable<{ body: string }>;
}

/** Factory producing the {@link StompClient} used by {@link SessionWsService.connect}. */
export const SESSION_STOMP_CLIENT_FACTORY = new InjectionToken<() => StompClient>(
  'SESSION_STOMP_CLIENT_FACTORY',
  { providedIn: 'root', factory: () => () => new RxStomp() },
);

/**
 * Minimal STOMP client wrapper for a single live session (US19.2.2) — subscribes to
 * `/topic/collaboratif/session/{id}` on the **shared** `collaboratif` real-time endpoint
 * (`/ws/whiteboard` — session has no dedicated endpoint of its own; the backend multiplexes every
 * collaboratif real-time feature over that one connection, differentiated by destination, not by
 * a separate handshake path). Watch-only: every mutating action in this module (vote, word
 * submission, lifecycle transitions) is a plain REST call via {@link SessionApiService}; the WS
 * link exists solely to receive broadcast events.
 *
 * Authenticates once on `CONNECT` (never per-`SUBSCRIBE`), mirroring `WhiteboardSyncService`'s
 * bearer-on-CONNECT pattern, extended with a guest-token fallback: `Authorization: Bearer <token>`
 * for an authenticated caller (via {@link COLLABORATIF_BEARER_TOKEN}), or `X-Guest-Token` for an
 * anonymous `ROLE_GUEST` participant — never both, and never a header on `SUBSCRIBE` at all.
 */
@Injectable({ providedIn: 'root' })
export class SessionWsService {
  private readonly createClient = inject(SESSION_STOMP_CLIENT_FACTORY);
  private readonly apiUrl = inject(COLLABORATIF_API_URL);
  private readonly bearerToken = inject(COLLABORATIF_BEARER_TOKEN);

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
   * Connects and subscribes to the given session's topic. Safe to call once per join; call
   * {@link disconnect} first to switch sessions on the same service instance.
   *
   * @param topic the session's STOMP destination (`/topic/collaboratif/session/{id}`)
   * @param guestToken the sealed guest token from the join response, for an anonymous
   *   `ROLE_GUEST` participant — omit (or pass `null`) for an authenticated caller, whose bearer
   *   token is read from {@link COLLABORATIF_BEARER_TOKEN} instead.
   */
  connect(topic: string, guestToken: string | null = null): void {
    this.disconnect();
    this.everConnecting = false;
    this.status.set('connecting');

    const client = this.createClient();
    client.configure({ brokerURL: this.buildWsUrl(), connectHeaders: this.buildConnectHeaders(guestToken) });
    this.client = client;

    this.stateSubscription = client.connectionState$.subscribe(state => this.onStateChange(state));
    this.stompErrorSubscription = client.stompErrors$.subscribe(() => this.status.set('error'));
    this.topicSubscription = client.watch(topic).subscribe(message => this.messages$.next(message.body));

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

  /** `Authorization: Bearer <token>` for an authenticated caller, `X-Guest-Token` for a guest. */
  private buildConnectHeaders(guestToken: string | null): Record<string, string> {
    if (guestToken) {
      return { [GUEST_TOKEN_HEADER]: guestToken };
    }
    const token = this.bearerToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Derives the WebSocket URL from the injected {@link COLLABORATIF_API_URL} — same handling of
   * absolute dev vs. relative production URLs as `WhiteboardSyncService.buildWsUrl`. Targets the
   * shared `/ws/whiteboard` endpoint (`CollaboratifWebSocketConfig`) — verified against the real
   * backend; session has no `/ws/session` endpoint of its own.
   */
  private buildWsUrl(): string {
    const apiUrl = this.apiUrl;
    if (/^https?:\/\//.test(apiUrl)) {
      return `${apiUrl.replace(/^http/, 'ws')}/ws/whiteboard`;
    }
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${scheme}://${window.location.host}${apiUrl}/ws/whiteboard`;
  }
}
