import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { SessionResponse } from '../models/session.model';
import { SessionApiService } from '../services/session-api.service';

/**
 * Facilitator's control view for a live session (US19.1.2) — Démarrer/Pause/Reprendre/Terminer.
 * Only the session's creator (or a `ROLE_ADMIN`) is authorized server-side; a non-owner caller
 * gets a 404 from every transition endpoint (anti-enumeration), surfaced here as a generic
 * "not allowed" state rather than a distinguishable error.
 */
@Component({
  selector: 'app-session-runner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './session-runner.component.html',
  styleUrl: './session-runner.component.scss',
})
export class SessionRunnerComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly sessionApi = inject(SessionApiService);

  readonly session = signal<SessionResponse | null>(null);
  readonly loadError = signal(false);
  readonly actionError = signal(false);
  readonly actionInFlight = signal(false);

  readonly canStart = computed(() => this.session()?.status === 'DRAFT');
  readonly canPause = computed(() => this.session()?.status === 'LIVE');
  readonly canResume = computed(() => this.session()?.status === 'PAUSED');
  readonly canEnd = computed(() => {
    const status = this.session()?.status;
    return status === 'LIVE' || status === 'PAUSED';
  });

  private pollHandle: ReturnType<typeof setInterval> | null = null;
  /** Bumped on every successful lifecycle action so a poll issued before it can discard its stale result. */
  private actionGeneration = 0;

  ngOnInit(): void {
    this.load();
    // Lightweight polling fallback so the facilitator's own view reflects participant activity
    // (e.g. join count) without requiring this view to also open a STOMP connection — the
    // generic participant shell (US19.2.2) owns the real-time path for participants.
    this.pollHandle = setInterval(() => this.load(), 5000);
  }

  ngOnDestroy(): void {
    if (this.pollHandle !== null) {
      clearInterval(this.pollHandle);
    }
  }

  private load(): void {
    const sessionId = this.route.snapshot.paramMap.get('sessionId');
    if (!sessionId) {
      this.loadError.set(true);
      return;
    }
    const generation = this.actionGeneration;
    this.sessionApi.getSession(sessionId).subscribe({
      next: session => {
        // Discard a poll whose fetch started before a lifecycle action that has since completed —
        // its status is stale and would otherwise revert the freshly-applied transition.
        if (generation === this.actionGeneration) {
          this.session.set(session);
        }
      },
      error: () => this.loadError.set(true),
    });
  }

  start(): void {
    this.runAction(id => this.sessionApi.startSession(id));
  }

  pause(): void {
    this.runAction(id => this.sessionApi.pauseSession(id));
  }

  resume(): void {
    this.runAction(id => this.sessionApi.resumeSession(id));
  }

  end(): void {
    this.runAction(id => this.sessionApi.endSession(id));
  }

  private runAction(
    call: (sessionId: string) => ReturnType<SessionApiService['startSession']>,
  ): void {
    const current = this.session();
    if (!current || this.actionInFlight()) {
      return;
    }
    this.actionInFlight.set(true);
    this.actionError.set(false);
    call(current.id).subscribe({
      next: updated => {
        this.actionInFlight.set(false);
        this.actionGeneration++;
        this.session.set(updated);
      },
      error: () => {
        this.actionInFlight.set(false);
        this.actionError.set(true);
      },
    });
  }
}
