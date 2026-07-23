import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';
import { PollConfig, PollOptionResult, SessionResponse } from '../models/session.model';
import { SessionApiService } from '../services/session-api.service';
import { SessionWsService } from '../services/session-ws.service';

/**
 * POLL activity participant view (US19.3.2) — option selection (single or multiple per
 * `config.allowMultiple`) plus a live results bar chart, updated from `POLL_UPDATED` broadcasts
 * consumed by the parent {@link SessionParticipantShellComponent} and passed down via
 * {@link results}. `results` is `null` while the facilitator has hidden them
 * (`hide-results`) — the payload itself omits counts/percentages server-side, this component
 * never infers or estimates them client-side.
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

  readonly session = input.required<SessionResponse>();
  readonly disabled = input(false);

  readonly selectedOptionIds = signal<string[]>([]);
  readonly results = signal<PollOptionResult[] | null>(null);
  readonly submitting = signal(false);
  readonly submitError = signal(false);
  readonly hasVoted = signal(false);

  readonly config = computed<PollConfig>(() => this.session().config as PollConfig);

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

  resultFor(optionId: string): PollOptionResult | null {
    return this.results()?.find(r => r.optionId === optionId) ?? null;
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
      this.results.set((parsed as { results: PollOptionResult[] | null }).results);
    }
  }
}
