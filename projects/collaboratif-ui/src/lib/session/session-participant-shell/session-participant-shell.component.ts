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
import { Subscription } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';
import { SessionResponse, SessionType } from '../models/session.model';
import { SessionApiService } from '../services/session-api.service';
import { SessionWsService } from '../services/session-ws.service';
import { SessionPausedOverlayComponent } from '../session-paused-overlay/session-paused-overlay.component';

/**
 * Generic per-type activity component loader — lazy `import()` per {@link SessionType}
 * (US19.2.2 AC: "le composant d'activité adapté est chargé en lazy-load"). QUIZ/BRAINSTORM/QA/
 * VOTE resolve to {@link SessionActivityPlaceholderComponent} in this PR (1/2 of E19) —
 * PR2 replaces each of those four entries with its real component, this map is the single
 * place that changes.
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
    import('../session-activity-placeholder/session-activity-placeholder.component').then(
      m => m.SessionActivityPlaceholderComponent,
    ),
  QA: () =>
    import('../session-activity-placeholder/session-activity-placeholder.component').then(
      m => m.SessionActivityPlaceholderComponent,
    ),
  VOTE: () =>
    import('../session-activity-placeholder/session-activity-placeholder.component').then(
      m => m.SessionActivityPlaceholderComponent,
    ),
};

/**
 * The four types not yet built in this PR (PR2/2 of E19) — resolve to
 * {@link SessionActivityPlaceholderComponent}, which declares only a `type` input.
 * `NgComponentOutlet` throws `NG0303` on any input the mounted component doesn't declare, so the
 * inputs object built for a mounted component must match *exactly* what that component declares
 * — never a single shared shape across every activity type.
 */
const PLACEHOLDER_TYPES: ReadonlySet<SessionType> = new Set(['QUIZ', 'BRAINSTORM', 'QA', 'VOTE']);

/** Inputs passed to whichever activity component {@link NgComponentOutlet} mounts. */
type ActivityInputs = Record<string, unknown>;

/**
 * Generic participant shell (US19.2.2) — the contract every activity type shares regardless of
 * `session.type`: loads the right activity component, overlays {@link SessionPausedOverlayComponent}
 * on `SESSION_PAUSED`, redirects to the results view on `SESSION_ENDED`, and — on STOMP
 * reconnection — reloads session state from REST *before* trusting the WS stream again, so no
 * stale visual state is ever shown between a network drop and recovery.
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

  readonly session = signal<SessionResponse | null>(null);
  readonly loadError = signal(false);
  readonly activityComponent = signal<Type<unknown> | null>(null);

  protected readonly activityInputs = signal<ActivityInputs | null>(null);

  private messagesSubscription: Subscription | null = null;
  private wasDisconnected = false;

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
    this.loadAndSync();
    this.messagesSubscription = this.sessionWs.messages$.subscribe(raw => this.onMessage(raw));
  }

  ngOnDestroy(): void {
    this.messagesSubscription?.unsubscribe();
  }

  private loadAndSync(): void {
    const sessionId = this.route.snapshot.paramMap.get('sessionId');
    if (!sessionId) {
      this.loadError.set(true);
      return;
    }
    this.sessionApi.getSession(sessionId).subscribe({
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

  private syncActivityComponent(session: SessionResponse): void {
    ACTIVITY_LOADERS[session.type]().then(component => {
      this.activityComponent.set(component);
      this.activityInputs.set(this.buildActivityInputs(session));
    });
  }

  private buildActivityInputs(session: SessionResponse): ActivityInputs {
    if (PLACEHOLDER_TYPES.has(session.type)) {
      return { type: session.type };
    }
    return { session, disabled: session.status !== 'LIVE' };
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
