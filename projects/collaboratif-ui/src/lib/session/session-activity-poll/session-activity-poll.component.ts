import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';
import { ParticipantSessionResponse, PollConfig, PollOptionResult } from '../models/session.model';
import { SessionApiService } from '../services/session-api.service';
import { SessionWsService } from '../services/session-ws.service';

/**
 * POLL activity participant view (US19.3.2) — option selection (single or multiple per
 * `config.allowMultiple`) plus a live results bar chart, updated from `POLL_UPDATED` broadcasts
 * consumed by the parent {@link SessionParticipantShellComponent}. `results` is always an array
 * (verified against `PollUpdatedEvent.java`/`PollOptionResult.java`) — while the facilitator has
 * hidden results (`hide-results`), each entry's `count`/`percent` are simply absent
 * (`undefined` after `JSON.parse`, never a `null` value present); `resultFor()` treats an entry
 * with no `count` as "not shown", this component never infers or estimates a hidden tally
 * client-side.
 */
@Component({
  selector: 'app-session-activity-poll',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './session-activity-poll.component.html',
  styleUrl: './session-activity-poll.component.scss',
})
export class SessionActivityPollComponent implements OnInit, OnDestroy {
  private readonly sessionApi = inject(SessionApiService);
  private readonly sessionWs = inject(SessionWsService);

  readonly session = input.required<ParticipantSessionResponse>();
  readonly disabled = input(false);

  readonly selectedOptionIds = signal<string[]>([]);
  readonly results = signal<PollOptionResult[]>([]);
  readonly submitting = signal(false);
  readonly submitError = signal(false);
  readonly hasVoted = signal(false);

  readonly config = computed<PollConfig>(() => this.session().config as PollConfig);

  /** True once the facilitator is showing tallies (an entry carries a `count`). */
  readonly resultsVisible = computed(() => this.results().some(result => result.count !== undefined));
  /** Total votes shown — a single concise SR announcement, vs. re-reading every option per update. */
  readonly totalVotes = computed(() => this.results().reduce((sum, result) => sum + (result.count ?? 0), 0));

  private messagesSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.messagesSubscription = this.sessionWs.messages$.subscribe(raw => this.onMessage(raw));
  }

  ngOnDestroy(): void {
    this.messagesSubscription?.unsubscribe();
  }

  toggleOption(optionId: string): void {
    if (this.disabled()) {
      return;
    }
    const allowMultiple = this.config().allowMultiple;
    this.selectedOptionIds.update(current => {
      if (allowMultiple) {
        return current.includes(optionId)
          ? current.filter(id => id !== optionId)
          : [...current, optionId];
      }
      return current.includes(optionId) ? [] : [optionId];
    });
  }

  submit(): void {
    if (this.disabled() || this.submitting() || this.selectedOptionIds().length === 0) {
      return;
    }
    this.submitting.set(true);
    this.submitError.set(false);
    this.sessionApi
      .submitPollVote(this.session().id, { optionIds: this.selectedOptionIds() })
      .subscribe({
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

  /** `null` when the option has no result yet, or the facilitator has hidden results (no `count`). */
  resultFor(optionId: string): PollOptionResult | null {
    const result = this.results().find(r => r.optionId === optionId);
    return result && result.count !== undefined ? result : null;
  }

  private onMessage(raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as { type?: string }).type === 'POLL_UPDATED'
    ) {
      this.results.set((parsed as { results: PollOptionResult[] }).results);
    }
  }
}
