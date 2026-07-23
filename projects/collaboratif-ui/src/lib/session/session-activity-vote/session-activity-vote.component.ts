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
import { Subscription } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  ParticipantSessionResponse,
  VoteConfig,
  VoteResults,
  VoteType,
} from '../models/session.model';
import { SessionApiService } from '../services/session-api.service';
import { SessionWsService } from '../services/session-ws.service';

/** The Fist-to-Five rating scale. */
const RATINGS: readonly number[] = [0, 1, 2, 3, 4, 5];

const DEFAULT_POINTS = 5;

/**
 * VOTE activity participant view (US19.3.6) — Fist-to-Five (rate a proposal 0-5) or WEIGHTED
 * (distribute a points budget across options), one ballot per participant. Ballots stay secret:
 * the live count updates from `VOTE_SUBMITTED`, and the tallies (Fist average + consensus level +
 * veto alert, or weighted points per option) appear only once the facilitator closes the vote
 * (`VOTE_CLOSED`). All labels rendered through interpolation, never `innerHTML`.
 */
@Component({
  selector: 'app-session-activity-vote',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './session-activity-vote.component.html',
  styleUrl: './session-activity-vote.component.scss',
})
export class SessionActivityVoteComponent implements OnInit, OnDestroy {
  private readonly sessionApi = inject(SessionApiService);
  private readonly sessionWs = inject(SessionWsService);

  readonly session = input.required<ParticipantSessionResponse>();
  readonly disabled = input(false);

  readonly ratings = RATINGS;

  readonly config = computed<VoteConfig>(() => this.session().config as VoteConfig);
  readonly voteType = computed<VoteType>(() => this.config().voteType ?? 'FIST_TO_FIVE');
  readonly proposal = computed(() => this.config().proposal ?? '');
  readonly options = computed(() => this.config().options ?? []);
  readonly budget = computed(() => this.config().pointsPerParticipant ?? DEFAULT_POINTS);

  readonly selectedRating = signal<number | null>(null);
  readonly allocations = signal<Record<string, number>>({});
  readonly hasVoted = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal(false);
  readonly ballotCount = signal(0);
  readonly results = signal<VoteResults | null>(null);

  /** Points still to allocate in a WEIGHTED ballot — must reach exactly 0 to submit. */
  readonly remaining = computed(
    () => this.budget() - Object.values(this.allocations()).reduce((sum, p) => sum + p, 0),
  );

  readonly canSubmit = computed(() => {
    if (this.disabled() || this.submitting() || this.hasVoted()) {
      return false;
    }
    return this.voteType() === 'WEIGHTED'
      ? this.budget() > 0 && this.remaining() === 0
      : this.selectedRating() !== null;
  });

  private messagesSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.messagesSubscription = this.sessionWs.messages$.subscribe(raw => this.onMessage(raw));
    this.sessionApi.getVoteResults(this.session().id).subscribe({
      next: results => {
        this.results.set(results);
        this.ballotCount.set(results.ballotCount);
      },
      error: () => this.results.set(null),
    });
  }

  ngOnDestroy(): void {
    this.messagesSubscription?.unsubscribe();
  }

  selectRating(rating: number): void {
    if (!this.disabled() && !this.hasVoted()) {
      this.selectedRating.set(rating);
    }
  }

  setAllocation(index: number, raw: string): void {
    const points = Math.max(0, Math.trunc(Number(raw) || 0));
    this.allocations.update(current => ({ ...current, [String(index)]: points }));
  }

  allocationFor(index: number): number {
    return this.allocations()[String(index)] ?? 0;
  }

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    const body =
      this.voteType() === 'WEIGHTED'
        ? { allocations: this.allocations() }
        : { value: this.selectedRating() as number };

    this.submitting.set(true);
    this.submitError.set(false);
    this.sessionApi.submitVoteBallot(this.session().id, body).subscribe({
      next: () => {
        this.submitting.set(false);
        this.hasVoted.set(true);
      },
      error: () => {
        this.submitting.set(false);
        this.submitError.set(true);
      },
    });
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
    if (type === 'VOTE_SUBMITTED') {
      this.ballotCount.set((parsed as { ballotCount: number }).ballotCount);
    } else if (type === 'VOTE_CLOSED') {
      this.results.set((parsed as { results: VoteResults }).results);
    }
  }
}
