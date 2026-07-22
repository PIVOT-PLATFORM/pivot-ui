import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { RxStomp, RxStompState } from '@stomp/rx-stomp';
import { Observable, Subject, Subscription } from 'rxjs';
import { AGILITE_WS_URL } from '../../../core/config/tokens';

/**
 * Native STOMP header carrying the caller's real platform bearer token — same convention as
 * `WheelWsService`'s identical header: a standup session has no join-flow-scoped access token
 * (see backend `StandupChannelInterceptor`), it is authorized exactly like its REST endpoints.
 */
const AUTHORIZATION_HEADER = 'Authorization';

/** Prefix for a standup session's broadcast topic — mirrors backend `StandupDestinations.TOPIC_STANDUP_PREFIX`. */
const TOPIC_STANDUP_PREFIX = '/topic/agilite/standup/';

/**
 * Builds the STOMP topic destination for a given standup session, mirroring backend
 * `StandupDestinations#sessionTopic`.
 *
 * @param sessionId the session's identifier
 * @returns `/topic/agilite/standup/{sessionId}`
 */
export function standupSessionTopic(sessionId: string): string {
  return `${TOPIC_STANDUP_PREFIX}${sessionId}`;
}

/** UI connection status for the STOMP link opened while viewing a standup session. */
export type StandupWsConnectionStatus = 'connecting' | 'connected' | 'error';

/**
 * The minimal slice of `@stomp/rx-stomp`'s `RxStomp` surface this service depends on. Duplicated
 * from `wheels/services/wheel-ws.service.ts`'s identical `StompClient` interface rather than
 * imported across feature folders — see that file's TSDoc for the rationale (this codebase's
 * established small, domain-scoped duplication convention).
 */
export interface StompClient {
  readonly connectionState$: Observable<RxStompState>;
  readonly stompErrors$: Observable<unknown>;
  configure(config: { brokerURL: string }): void;
  activate(): void;
  deactivate(): Promise<unknown>;
  watch(destination: string, headers?: Record<string, string>): Observable<{ body: string }>;
}

/**
 * Factory producing the {@link StompClient} used by {@link StandupWsService.connect}. Defaults to
 * a real `RxStomp` instance; overridden in tests via
 * `{ provide: STANDUP_STOMP_CLIENT_FACTORY, useValue: () => fake }`.
 */
export const STANDUP_STOMP_CLIENT_FACTORY = new InjectionToken<() => StompClient>(
  'STANDUP_STOMP_CLIENT_FACTORY',
  {
    providedIn: 'root',
    factory: () => () => new RxStomp(),
  },
);

/**
 * STOMP client wrapper for a single standup session's real-time broadcast topic (US10.1.2).
 *
 * Connects to the same native (non-SockJS) `/ws/agilite` endpoint as planning poker/wheels/retro,
 * but only ever watches — every mutation (`start`/`next`/`end`/`skip`/`extend`/`reorder`) is a
 * REST call, computed and persisted server-side (see backend `StandupDestinations`'s TSDoc), so
 * this service exposes no `publish`/`submit*` method, exactly like `WheelWsService`.
 *
 * Automatic reconnection (and re-subscription to the session's topic) is `@stomp/rx-stomp`'s own
 * built-in behavior for an active `watch()` observable — no additional mechanism is written here.
 */
@Injectable({ providedIn: 'root' })
export class StandupWsService {
  private readonly createClient = inject(STANDUP_STOMP_CLIENT_FACTORY);
  private readonly wsBaseUrl = inject(AGILITE_WS_URL);

  /** Current connection status. */
  readonly status = signal<StandupWsConnectionStatus>('connecting');

  /** Raw STOMP message bodies received on the subscribed session topic. */
  readonly messages$ = new Subject<string>();

  private client: StompClient | null = null;
  private topicSubscription: Subscription | null = null;
  private stateSubscription: Subscription | null = null;
  private stompErrorSubscription: Subscription | null = null;

  /** See `RoomWsService`'s identical field for why this guard exists (stale seeded `CLOSED`). */
  private everConnecting = false;

  /**
   * Connects to `/ws/agilite` and subscribes to the given session's broadcast topic, presenting
   * `authToken` (if any) on the native `Authorization` header. Safe to call once per view; call
   * {@link disconnect} first to switch sessions on the same service instance.
   *
   * @param sessionId the session being viewed
   * @param authToken the caller's raw bearer token, or `null` if none is available (see
   *   `WheelWsService`'s TSDoc — EN17.3 gap)
   */
  connect(sessionId: string, authToken: string | null): void {
    this.disconnect();
    this.everConnecting = false;
    this.status.set('connecting');

    const client = this.createClient();
    client.configure({ brokerURL: this.buildWsUrl() });
    this.client = client;

    this.stateSubscription = client.connectionState$.subscribe(state => this.onStateChange(state));
    this.stompErrorSubscription = client.stompErrors$.subscribe(() => this.status.set('error'));
    const headers = authToken ? { [AUTHORIZATION_HEADER]: `Bearer ${authToken}` } : undefined;
    this.topicSubscription = client
      .watch(standupSessionTopic(sessionId), headers)
      .subscribe(message => this.messages$.next(message.body));

    client.activate();
  }

  /**
   * Tears down the STOMP connection and its subscription. Safe to call repeatedly, including
   * before any {@link connect} call.
   */
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

  /** See `RoomWsService.buildWsUrl`'s identical logic/rationale. */
  private buildWsUrl(): string {
    const wsUrl = this.wsBaseUrl;
    if (/^wss?:\/\//.test(wsUrl)) {
      return wsUrl;
    }
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${scheme}://${window.location.host}${wsUrl}`;
  }
}
