import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { StandupSessionResponse, StandupTopicEvent } from '../models/standup.model';
import { extractErrorCode } from '../services/standup-error.util';
import { StandupApiService } from '../services/standup-api.service';
import { StandupWsService } from '../services/standup-ws.service';
import { StandupTimerComponent } from '../standup-timer/standup-timer.component';

/**
 * Live "runner" view of a daily standup session (US10.1.2/US10.2.1/US10.2.2) — the equivalent of
 * `RoomBoardComponent` for planning poker. Every team member is an animator (US10.1.2: "tout
 * membre de l'équipe liée à la session"), so skip/extend/reorder/next/end controls are visible
 * to every viewer of a `RUNNING` session, not gated behind a single-owner check.
 *
 * Real-time updates arrive on `/topic/agilite/standup/{sessionId}` (see `StandupWsService`).
 * `SESSION_STARTED`/`PARTICIPANTS_REORDERED` carry a full, directly-applicable payload;
 * `PARTICIPANT_CHANGED`/`PARTICIPANT_SKIPPED`/`SESSION_ENDED`/`TIMER_EXTENDED` only carry a
 * partial delta (no outgoing-participant terminal fields, no updated `currentIndex`) — this
 * component re-fetches the full session (`GET .../sessions/{id}`) on those instead of hand-
 * splicing partial state, trading one extra round-trip for correctness and simplicity. UX
 * (current speaker large + next speaker preview, skip/extend controls) modeled on the reference
 * POC PouetPouet's session page, rebuilt with PIVOT's signals/OnPush/Transloco/design-system
 * conventions.
 */
@Component({
  selector: 'app-standup-runner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe, StandupTimerComponent, CdkDropList, CdkDrag],
  templateUrl: './standup-runner.component.html',
  styleUrl: './standup-runner.component.scss',
})
export class StandupRunnerComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly standupApi = inject(StandupApiService);
  private readonly standupWs = inject(StandupWsService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly sessionId: string;

  readonly session = signal<StandupSessionResponse | null>(null);
  readonly loadError = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly acting = signal(false);

  readonly wsStatus = this.standupWs.status;

  readonly currentParticipant = computed(
    () => this.session()?.participants.find(p => p.status === 'SPEAKING') ?? null,
  );

  readonly nextParticipant = computed(() => {
    const session = this.session();
    if (!session) {
      return null;
    }
    return (
      session.participants
        .filter(p => p.status === 'WAITING')
        .sort((a, b) => a.order - b.order)[0] ?? null
    );
  });

  /** The still-`WAITING` tail of the queue, in order — the only reorderable portion (US10.2.2). */
  readonly waitingParticipants = computed(
    () => this.session()?.participants.filter(p => p.status === 'WAITING').sort((a, b) => a.order - b.order) ?? [],
  );

  readonly isLastSpeaker = computed(() => this.waitingParticipants().length === 0);

  constructor() {
    this.sessionId = this.route.snapshot.paramMap.get('sessionId') ?? '';
  }

  ngOnInit(): void {
    this.loadSession();
    this.standupWs.connect(this.sessionId, null);
    this.standupWs.messages$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(body => this.onMessage(body));
    this.destroyRef.onDestroy(() => this.standupWs.disconnect());
  }

  /** Starts a `PENDING` session. */
  start(): void {
    this.runAction(() => this.standupApi.start(this.sessionId));
  }

  /** Rotates to the next participant, or ends the session. */
  next(): void {
    this.runAction(() => this.standupApi.next(this.sessionId));
  }

  /** Skips the current speaker (US10.2.2). */
  skip(): void {
    this.runAction(() => this.standupApi.skip(this.sessionId));
  }

  /** Ends the session early (US10.1.2). */
  end(): void {
    this.runAction(() => this.standupApi.end(this.sessionId));
  }

  /** Extends the current speaker's time by 30 or 60 seconds (US10.2.2). */
  extend(seconds: 30 | 60): void {
    this.runAction(() => this.standupApi.extend(this.sessionId, seconds));
  }

  /** Reorders the `WAITING` tail of the queue after a drag-drop move (US10.2.2). */
  onReorder(event: CdkDragDrop<string[]>): void {
    const reordered = this.waitingParticipants().map(p => p.id);
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.runAction(() => this.standupApi.reorder(this.sessionId, reordered));
  }

  private runAction(call: () => ReturnType<StandupApiService['next']>): void {
    if (this.acting()) {
      return;
    }
    this.acting.set(true);
    this.actionError.set(null);
    call().subscribe({
      next: session => {
        this.acting.set(false);
        this.session.set(session);
      },
      error: error => {
        this.acting.set(false);
        this.actionError.set(extractErrorCode(error) ?? 'NETWORK_ERROR');
      },
    });
  }

  private loadSession(): void {
    this.standupApi.getSession(this.sessionId).subscribe({
      next: session => this.session.set(session),
      error: () => this.loadError.set(true),
    });
  }

  private onMessage(body: string): void {
    let event: StandupTopicEvent;
    try {
      event = JSON.parse(body) as StandupTopicEvent;
    } catch {
      return;
    }
    switch (event.type) {
      case 'SESSION_STARTED':
        this.session.set(event.session);
        break;
      case 'PARTICIPANTS_REORDERED':
        this.session.update(current => (current ? { ...current, participants: event.participants } : current));
        break;
      case 'PARTICIPANT_CHANGED':
      case 'PARTICIPANT_SKIPPED':
      case 'SESSION_ENDED':
      case 'TIMER_EXTENDED':
        this.loadSession();
        break;
    }
  }
}
