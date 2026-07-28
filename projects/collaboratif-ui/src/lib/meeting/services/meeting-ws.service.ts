import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { RxStomp, RxStompState } from '@stomp/rx-stomp';
import { Observable, Subject, Subscription } from 'rxjs';
import { COLLABORATIF_API_URL, COLLABORATIF_BEARER_TOKEN } from '../../core/whiteboard/config/tokens';

/** UI connection status for the STOMP link opened while animating/watching a meeting (US12.2.1). */
export type MeetingConnectionStatus = 'connecting' | 'connected' | 'error';

/**
 * The minimal slice of `@stomp/rx-stomp`'s `RxStomp` surface this service depends on — same DI
 * substitution seam as `SessionWsService.StompClient` (module-level mocking of `@stomp/rx-stomp`
 * proved unreliable under this repo's CI runner).
 */
export interface MeetingStompClient {
  readonly connectionState$: Observable<RxStompState>;
  readonly stompErrors$: Observable<unknown>;
  configure(config: { brokerURL: string; connectHeaders?: Record<string, string> }): void;
  activate(): void;
  deactivate(): Promise<unknown>;
  watch(destination: string): Observable<{ body: string }>;
}

/** Factory producing the {@link MeetingStompClient} used by {@link MeetingWsService.connect}. */
export const MEETING_STOMP_CLIENT_FACTORY = new InjectionToken<() => MeetingStompClient>(
  'MEETING_STOMP_CLIENT_FACTORY',
  { providedIn: 'root', factory: () => () => new RxStomp() },
);

/**
 * Minimal STOMP client wrapper for a single animated meeting (US12.2.1) — subscribes to
 * `/topic/collaboratif/meeting/{id}` on the **shared** `collaboratif` real-time endpoint
 * (`/ws/whiteboard`, same multiplexed connection `SessionWsService` uses — MeetOps has no
 * dedicated WebSocket endpoint of its own). Watch-only: every mutating animation action (start,
 * agenda/next, end, actions) is a plain REST call via {@link MeetingApiService}; the WS link
 * exists solely to receive broadcast events (`MEETING_STARTED`/`TIMER_TICK`/
 * `AGENDA_ITEM_CHANGED`/`MEETING_ENDED`/`MEETING_ACTION_ADDED`).
 *
 * Unlike {@link SessionWsService}, MeetOps has no guest-token concept — every meeting participant
 * is an authenticated bearer-token caller (`CollaboratifRequestPrincipal` server-side), so
 * `connect` only ever sends `Authorization: Bearer <token>` (from {@link COLLABORATIF_BEARER_TOKEN}).
 */
@Injectable({ providedIn: 'root' })
export class MeetingWsService {
  private readonly createClient = inject(MEETING_STOMP_CLIENT_FACTORY);
  private readonly apiUrl = inject(COLLABORATIF_API_URL);
  private readonly bearerToken = inject(COLLABORATIF_BEARER_TOKEN);

  /** Current connection status. */
  readonly status = signal<MeetingConnectionStatus>('connecting');

  /** Raw STOMP message bodies received on the subscribed meeting topic. */
  readonly messages$ = new Subject<string>();

  private client: MeetingStompClient | null = null;
  private topicSubscription: Subscription | null = null;
  private stateSubscription: Subscription | null = null;
  private stompErrorSubscription: Subscription | null = null;
  /** Guards against replaying `RxStomp`'s seeded `CLOSED` state before any real attempt. */
  private everConnecting = false;

  /**
   * Connects and subscribes to the given meeting's topic. Safe to call once per join; call
   * {@link disconnect} first to switch meetings on the same service instance.
   *
   * @param topic the meeting's STOMP destination (`/topic/collaboratif/meeting/{id}`)
   */
  connect(topic: string): void {
    this.disconnect();
    this.everConnecting = false;
    this.status.set('connecting');

    const client = this.createClient();
    client.configure({ brokerURL: this.buildWsUrl(), connectHeaders: this.buildConnectHeaders() });
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

  private buildConnectHeaders(): Record<string, string> {
    const token = this.bearerToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Derives the WebSocket URL from the injected {@link COLLABORATIF_API_URL} — same handling of
   * absolute dev vs. relative production URLs as `SessionWsService.buildWsUrl`. Targets the
   * shared `/ws/whiteboard` endpoint (`CollaboratifWebSocketConfig`) — MeetOps has no `/ws/meeting`
   * endpoint of its own.
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
