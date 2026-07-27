import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  LivePostit,
  ParticipantSessionResponse,
  PostitRushLeaderboardEntry,
  PostitRushStandingEntry,
  PostitRushState,
  ProblemDetailResponse,
} from '../models/session.model';
import { SessionApiService } from '../services/session-api.service';
import { SessionWsService } from '../services/session-ws.service';

/** Non-color visual identity glyph per `colorKey` (WCAG 1.4.1 — never color alone). */
const SHAPE_BY_COLOR_KEY: Record<string, string> = {
  amber: '▲',
  rose: '●',
  sky: '■',
  lime: '◆',
  violet: '▼',
  teal: '★',
};
const DEFAULT_SHAPE = '★';

/**
 * POST-IT RUSH activity participant view (US47.2.1) — a server-timed, server-scored real-time
 * mini-game. Every live post-it is server-generated (position, color, spawn instant, lifespan);
 * this component only ever reacts to `ROUND_STARTED`/`POSTIT_SPAWNED`/`POSTIT_EXPIRED`/
 * `POSTIT_CLAIMED`/`LEADERBOARD_UPDATED`/`ROUND_ENDED` broadcasts and sends `{ postitId }` on
 * click — never a score, points, or combo (server-authoritative, see
 * `fr.pivot.collaboratif.session.postitrush.PostitRushActivityService`).
 *
 * State is hydrated once from {@link SessionApiService.getPostitRushState} (so a reconnecting
 * player rejoins mid-round without double-counting prior clicks) then kept current from the WS
 * broadcasts. All text via interpolation, never `innerHTML`.
 */
@Component({
  selector: 'app-session-activity-postit-rush',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './session-activity-postit-rush.component.html',
  styleUrl: './session-activity-postit-rush.component.scss',
})
export class SessionActivityPostitRushComponent implements OnInit, OnDestroy {
  private readonly sessionApi = inject(SessionApiService);
  private readonly sessionWs = inject(SessionWsService);

  readonly session = input.required<ParticipantSessionResponse>();
  readonly disabled = input(false);
  /** The caller's own participant id, to highlight their leaderboard row and gate their clicks. */
  readonly participantId = input<string | null>(null);

  readonly roundActive = signal(false);
  /** Purely visual countdown (AC: "Client countdown is purely visual; server owns the clock"). */
  readonly remainingSeconds = signal(0);
  readonly livePostits = signal<LivePostit[]>([]);
  readonly myScore = signal(0);
  readonly myCurrentCombo = signal(0);
  readonly myBestCombo = signal(0);
  readonly myHits = signal(0);
  readonly leaderboard = signal<PostitRushLeaderboardEntry[]>([]);
  readonly finalStandings = signal<PostitRushStandingEntry[] | null>(null);
  readonly feedbackKey = signal<string | null>(null);
  readonly errorMessageKey = signal<string | null>(null);
  /**
   * The single visually-hidden assertive announcement (AC: only round-start and "temps écoulé"
   * are announced — the per-second countdown itself is never in a live region, anti-flooding).
   */
  readonly assertiveMessageKey = signal<string | null>(null);

  /** Combo multiplier ladder mirrored client-side for display only — the server alone scores. */
  readonly myMultiplier = computed(() => {
    const combo = this.myCurrentCombo();
    if (combo >= 6) {
      return 3;
    }
    if (combo >= 3) {
      return 2;
    }
    return 1;
  });

  private messagesSubscription: Subscription | null = null;
  private tickHandle: ReturnType<typeof setInterval> | null = null;
  private timeUpAnnouncedForRound = false;

  ngOnInit(): void {
    this.messagesSubscription = this.sessionWs.messages$.subscribe(raw => this.onMessage(raw));
    this.sessionApi.getPostitRushState(this.session().id).subscribe({
      next: state => this.hydrate(state),
      error: () => this.roundActive.set(false),
    });
  }

  ngOnDestroy(): void {
    this.messagesSubscription?.unsubscribe();
    this.stopCountdown();
  }

  /** Non-color visual identity glyph for a post-it (paired with `colorKey`, never color alone). */
  shapeFor(colorKey: string): string {
    return SHAPE_BY_COLOR_KEY[colorKey] ?? DEFAULT_SHAPE;
  }

  isOwnRow(entry: { participantId: string }): boolean {
    return this.participantId() !== null && entry.participantId === this.participantId();
  }

  click(postitId: string): void {
    if (this.disabled() || !this.roundActive()) {
      return;
    }
    this.errorMessageKey.set(null);
    // Optimistic removal: a live post-it disappears from this board immediately on click so a
    // rapid double-tap can't resubmit the same postitId while the request is in flight — the
    // server remains the sole authority on whether the click actually counted.
    this.livePostits.update(list => list.filter(p => p.postitId !== postitId));

    this.sessionApi.clickPostit(this.session().id, { postitId }).subscribe({
      next: response => {
        this.myScore.set(response.score);
        this.myCurrentCombo.set(response.currentCombo);
        this.myBestCombo.set(Math.max(this.myBestCombo(), response.currentCombo));
        this.myHits.set(response.hits);
        this.feedbackKey.set('session.postitRush.feedback.hit');
      },
      error: (error: HttpErrorResponse) => {
        // Mirrors the server's own combo reset immediately — server remains authoritative; the
        // next hydrate/LEADERBOARD_UPDATED reconciles if this ever drifted.
        this.myCurrentCombo.set(0);
        this.feedbackKey.set('session.postitRush.feedback.miss');
        this.errorMessageKey.set(this.resolveErrorKey(error));
      },
    });
  }

  private resolveErrorKey(error: HttpErrorResponse): string {
    const body = error.error as ProblemDetailResponse | null;
    switch (body?.code) {
      case 'POSTIT_UNAVAILABLE':
        return 'session.postitRush.errors.unavailable';
      case 'ROUND_NOT_ACTIVE':
        return 'session.postitRush.errors.roundNotActive';
      default:
        if (error.status === 404) {
          return 'session.postitRush.errors.unavailable';
        }
        if (error.status === 429) {
          return 'session.postitRush.errors.rateLimited';
        }
        return 'session.postitRush.errors.generic';
    }
  }

  private hydrate(state: PostitRushState): void {
    this.roundActive.set(state.roundActive);
    this.livePostits.set(state.livePostits);
    this.myScore.set(state.myScore);
    this.myCurrentCombo.set(state.myCurrentCombo);
    this.myBestCombo.set(state.myBestCombo);
    this.myHits.set(state.myHits);
    if (state.roundActive) {
      this.startCountdown(state.remainingSeconds ?? 0);
    } else {
      this.stopCountdown();
      this.remainingSeconds.set(0);
    }
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
    switch (type) {
      case 'ROUND_STARTED':
        this.applyRoundStarted(parsed as { durationSeconds: number });
        break;
      case 'POSTIT_SPAWNED':
        this.applyPostitSpawned(parsed as LivePostitSpawnedPayload);
        break;
      case 'POSTIT_EXPIRED':
        this.removeLivePostit((parsed as { postitId: string }).postitId);
        break;
      case 'POSTIT_CLAIMED':
        this.removeLivePostit((parsed as { postitId: string }).postitId);
        break;
      case 'LEADERBOARD_UPDATED':
        this.applyLeaderboardUpdated(parsed as { entries: PostitRushLeaderboardEntry[] });
        break;
      case 'ROUND_ENDED':
        this.applyRoundEnded();
        break;
      default:
        break;
    }
  }

  private applyRoundStarted(event: { durationSeconds: number }): void {
    this.roundActive.set(true);
    this.livePostits.set([]);
    this.leaderboard.set([]);
    this.finalStandings.set(null);
    this.myScore.set(0);
    this.myCurrentCombo.set(0);
    this.myBestCombo.set(0);
    this.myHits.set(0);
    this.feedbackKey.set(null);
    this.errorMessageKey.set(null);
    this.assertiveMessageKey.set('session.postitRush.announcements.roundStarted');
    this.startCountdown(event.durationSeconds);
  }

  private applyPostitSpawned(event: LivePostitSpawnedPayload): void {
    this.livePostits.update(list => [
      ...list,
      { postitId: event.postitId, x: event.x, y: event.y, colorKey: event.colorKey, remainingMs: event.lifespanMs },
    ]);
  }

  private removeLivePostit(postitId: string): void {
    this.livePostits.update(list => list.filter(p => p.postitId !== postitId));
  }

  private applyLeaderboardUpdated(event: { entries: PostitRushLeaderboardEntry[] }): void {
    this.leaderboard.set(event.entries);
    const mine = this.participantId();
    if (mine) {
      const own = event.entries.find(e => e.participantId === mine);
      if (own) {
        this.myScore.set(own.score);
      }
    }
  }

  private applyRoundEnded(): void {
    this.roundActive.set(false);
    this.livePostits.set([]);
    this.stopCountdown();
    this.remainingSeconds.set(0);
    this.assertiveMessageKey.set('session.postitRush.announcements.timeUp');
    this.sessionApi.getPostitRushResults(this.session().id).subscribe({
      next: results => this.finalStandings.set(results.standings),
      error: () => this.finalStandings.set(null),
    });
  }

  private startCountdown(seconds: number): void {
    this.stopCountdown();
    this.timeUpAnnouncedForRound = false;
    this.remainingSeconds.set(Math.max(0, seconds));
    if (this.remainingSeconds() <= 0) {
      return;
    }
    this.tickHandle = setInterval(() => {
      const next = Math.max(0, this.remainingSeconds() - 1);
      this.remainingSeconds.set(next);
      if (next === 0 && !this.timeUpAnnouncedForRound) {
        this.timeUpAnnouncedForRound = true;
        this.assertiveMessageKey.set('session.postitRush.announcements.timeUp');
        this.stopCountdown();
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.tickHandle !== null) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }
}

interface LivePostitSpawnedPayload {
  readonly postitId: string;
  readonly x: number;
  readonly y: number;
  readonly colorKey: string;
  readonly lifespanMs: number;
}
