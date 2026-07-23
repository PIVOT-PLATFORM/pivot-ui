import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  Type,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, interval, switchMap } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';
import { ParticipantSessionResponse, SessionType } from '../models/session.model';
import { SessionApiService } from '../services/session-api.service';
import { SessionWsService } from '../services/session-ws.service';
import { SessionPausedOverlayComponent } from '../session-paused-overlay/session-paused-overlay.component';
import { SessionJoinNavigationState } from '../session-join/session-join.component';

/**
 * Generic per-type activity component loader — lazy `import()` per {@link SessionType}
 * (US19.2.2 AC: "le composant d'activité adapté est chargé en lazy-load"). POLL, WORDCLOUD, Q&A
 * and BRAINSTORM resolve to their real components; QUIZ/VOTE still resolve to
 * {@link SessionActivityPlaceholderComponent} pending their own PR — this map is the single
 * place each remaining type is wired in.
 */
const ACTIVITY_LOADERS: Record<SessionType, () => Promise<Type<unknown>>> = {
  QUIZ: () =>
    import('../session-activity-placeholder/session-activity-placeholder.component').then(
      m => m.SessionActivityPlaceholderComponent,
    ),
  POLL: () =>
    import('../session-activity-poll/session-activity-poll.component').then(
      m => m.SessionActivityPollComponent,
    ),
  WORDCLOUD: () =>
    import('../session-activity-wordcloud/session-activity-wordcloud.component').then(
      m => m.SessionActivityWordcloudComponent,
    ),
  BRAINSTORM: () =>
    import('../session-activity-brainstorm/session-activity-brainstorm.component').then(
      m => m.SessionActivityBrainstormComponent,
    ),
  QA: () =>
    import('../session-activity-qa/session-activity-qa.component').then(
      m => m.SessionActivityQaComponent,
    ),
  VOTE: () =>
    import('../session-activity-placeholder/session-activity-placeholder.component').then(
      m => m.SessionActivityPlaceholderComponent,
    ),
};

/**
 * The types not yet built (QUIZ/VOTE) — resolve to
 * {@link SessionActivityPlaceholderComponent}, which declares only a `type` input.
 * `NgComponentOutlet` throws `NG0303` on any input the mounted component doesn't declare, so the
 * inputs object built for a mounted component must match *exactly* what that component declares
 * — never a single shared shape across every activity type.
 */
const PLACEHOLDER_TYPES: ReadonlySet<SessionType> = new Set(['QUIZ', 'VOTE']);

/** Inputs passed to whichever activity component {@link NgComponentOutlet} mounts. */
type ActivityInputs = Record<string, unknown>;

/** Heartbeat interval — a comfortable margin under the backend's guest-session rolling TTL. */
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Generic participant shell (US19.2.2) — the contract every activity type shares regardless of
 * `session.type`: loads the right activity component, overlays {@link SessionPausedOverlayComponent}
 * on `SESSION_PAUSED`, redirects to the results view on `SESSION_ENDED`, and — on STOMP
 * reconnection — reloads session state from REST *before* trusting the WS stream again, so no
 * stale visual state is ever shown between a network drop and recovery.
 *
 * Owns the WS connection and the (guest-only) heartbeat — not {@link SessionJoinComponent},
 * which is destroyed the instant navigation here succeeds; a connection opened by a component
 * about to be destroyed never survives to be usable by the page that needs it. Credentials from a
 * fresh join arrive via `router.navigate(..., { state })` (read from `history.state`, since
 * `Router.getCurrentNavigation()` is already `null` by the time `ngOnInit` runs) — see
 * {@link SessionJoinNavigationState}. Absent state (direct navigation, reload, or an authenticated
 * user arriving some other way) falls back to connecting with the caller's bearer token instead
 * (`SessionWsService` reads it from `COLLABORATIF_BEARER_TOKEN` when no guest token is passed).
 *
 * {@link loadAndSync} uses {@link SessionApiService.getParticipantSessionState} (US19.2.2,
 * `GET /sessions/{id}/state`), not the facilitator-only, bearer-only {@link
 * SessionApiService.getSession} — the same {@link guestToken} handed off by {@link
 * SessionJoinComponent} is forwarded as the `X-Guest-Token` header, so an anonymous `ROLE_GUEST`
 * participant's state reload succeeds instead of 401ing.
 */
@Component({
  selector: 'app-session-participant-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet, TranslocoPipe, SessionPausedOverlayComponent],
  templateUrl: './session-participant-shell.component.html',
  styleUrl: './session-participant-shell.component.scss',
})
export class SessionParticipantShellComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sessionApi = inject(SessionApiService);
  protected readonly sessionWs = inject(SessionWsService);

  readonly session = signal<ParticipantSessionResponse | null>(null);
  readonly loadError = signal(false);
  readonly activityComponent = signal<Type<unknown> | null>(null);

  protected readonly activityInputs = signal<ActivityInputs | null>(null);

  private messagesSubscription: Subscription | null = null;
  private heartbeatSubscription: Subscription | null = null;
  private wasDisconnected = false;
  private guestToken: string | null = null;
  private participantId: string | null = null;

  constructor() {
    // Reconnection detection lives on the WS status signal itself, not on message arrival —
    // an `error` state (network drop) followed by `connected` again (reconnect) is the actual
    // reconnection event; a message merely arriving is not evidence of one (US19.2.2 AC).
    effect(() => {
      const status = this.sessionWs.status();
      if (status === 'error') {
        this.wasDisconnected = true;
      } else if (status === 'connected' && this.wasDisconnected) {
        this.wasDisconnected = false;
        this.loadAndSync();
      }
    });
  }

  ngOnInit(): void {
    const navigationState = history.state as Partial<SessionJoinNavigationState> | undefined;
    this.guestToken = navigationState?.guestToken ?? null;
    this.participantId = navigationState?.participantId ?? null;

    this.loadAndSync();
    this.connectWs();
    this.messagesSubscription = this.sessionWs.messages$.subscribe(raw => this.onMessage(raw));
    if (this.guestToken) {
      this.startHeartbeat(this.guestToken);
    }
  }

  ngOnDestroy(): void {
    this.messagesSubscription?.unsubscribe();
    this.stopHeartbeat();
    this.sessionWs.disconnect();
  }

  private connectWs(): void {
    const sessionId = this.route.snapshot.paramMap.get('sessionId');
    if (!sessionId) {
      return;
    }
    this.sessionWs.connect(`/topic/collaboratif/session/${sessionId}`, this.guestToken);
  }

  private startHeartbeat(guestToken: string): void {
    const sessionId = this.route.snapshot.paramMap.get('sessionId');
    if (!sessionId || !this.participantId) {
      return;
    }
    const participantId = this.participantId;
    this.stopHeartbeat();
    this.heartbeatSubscription = interval(HEARTBEAT_INTERVAL_MS)
      .pipe(switchMap(() => this.sessionApi.guestHeartbeat(sessionId, participantId, { token: guestToken })))
      .subscribe({ error: () => this.sessionWs.disconnect() });
  }

  private stopHeartbeat(): void {
    this.heartbeatSubscription?.unsubscribe();
    this.heartbeatSubscription = null;
  }

  private loadAndSync(): void {
    const sessionId = this.route.snapshot.paramMap.get('sessionId');
    if (!sessionId) {
      this.loadError.set(true);
      return;
    }
    this.sessionApi.getParticipantSessionState(sessionId, this.guestToken).subscribe({
      next: session => {
        this.session.set(session);
        this.syncActivityComponent(session);
        if (session.status === 'COMPLETED') {
          void this.router.navigate(['/session', session.id, 'results']);
        }
      },
      error: () => this.loadError.set(true),
    });
  }

  private syncActivityComponent(session: ParticipantSessionResponse): void {
    ACTIVITY_LOADERS[session.type]().then(component => {
      this.activityComponent.set(component);
      this.activityInputs.set(this.buildActivityInputs(session));
    });
  }

  private buildActivityInputs(session: ParticipantSessionResponse): ActivityInputs {
    if (PLACEHOLDER_TYPES.has(session.type)) {
      return { type: session.type };
    }
    const inputs: ActivityInputs = { session, disabled: session.status !== 'LIVE' };
    // BRAINSTORM is the only activity that needs the caller's own participant id (to gate the
    // edit/delete controls to their own cards) — NgComponentOutlet throws NG0303 on an input the
    // mounted component doesn't declare, so it is added for that type only.
    if (session.type === 'BRAINSTORM') {
      return { ...inputs, participantId: this.participantId };
    }
    return inputs;
  }

  private onMessage(raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (typeof parsed !== 'object' || parsed === null) {
      return;
    }
    const type = (parsed as { type?: string }).type;
    const current = this.session();
    if (!current) {
      return;
    }
    if (type === 'SESSION_PAUSED') {
      this.session.set({ ...current, status: 'PAUSED' });
      this.updateActivityDisabled(true);
    } else if (type === 'SESSION_RESUMED') {
      this.session.set({ ...current, status: 'LIVE' });
      this.updateActivityDisabled(false);
    } else if (type === 'SESSION_ENDED') {
      this.session.set({ ...current, status: 'COMPLETED' });
      void this.router.navigate(['/session', current.id, 'results']);
    }
  }

  /** No-op for a placeholder-mounted activity, which declares no `disabled` input to set. */
  private updateActivityDisabled(disabled: boolean): void {
    this.activityInputs.update(inputs => (inputs && 'session' in inputs ? { ...inputs, disabled } : inputs));
  }
}
