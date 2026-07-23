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
import { ParticipantSessionResponse, QaQuestion } from '../models/session.model';
import { SessionApiService } from '../services/session-api.service';
import { SessionWsService } from '../services/session-ws.service';

/** Max question length — mirrors the backend's `SubmitQuestionRequest` `@Size(max = 500)`. */
const MAX_QUESTION_LENGTH = 500;

/**
 * Q&A activity participant view (US19.3.5) — submit a question (optionally anonymous), upvote
 * others' questions (once each), and watch the list re-order live as upvotes arrive.
 *
 * <p>The list is hydrated once from {@link SessionApiService.listQaQuestions} on init and then
 * kept current purely from the parent {@link SessionParticipantShellComponent}'s WS broadcast
 * stream — {@code QUESTION_ADDED}/{@code QUESTION_UPVOTED}/{@code QUESTION_ANSWERED}. Ordering
 * (upvotes descending, oldest-first tie-break) is a client-side {@link computed} so a live upvote
 * re-sorts without a refetch. Question text is rendered exclusively through Angular interpolation
 * (`{{ }}`), never `innerHTML` (US19.3.5 XSS AC).
 */
@Component({
  selector: 'app-session-activity-qa',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './session-activity-qa.component.html',
  styleUrl: './session-activity-qa.component.scss',
})
export class SessionActivityQaComponent implements OnInit, OnDestroy {
  private readonly sessionApi = inject(SessionApiService);
  private readonly sessionWs = inject(SessionWsService);

  readonly session = input.required<ParticipantSessionResponse>();
  readonly disabled = input(false);

  readonly maxLength = MAX_QUESTION_LENGTH;

  readonly draft = signal('');
  readonly anonymous = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal(false);

  private readonly questions = signal<QaQuestion[]>([]);
  private readonly upvotedIds = signal<ReadonlySet<string>>(new Set());

  /** Questions ordered most-upvoted first, oldest-first as the stable tie-break. */
  readonly sortedQuestions = computed(() =>
    [...this.questions()].sort(
      (a, b) => b.upvotes - a.upvotes || a.createdAt.localeCompare(b.createdAt),
    ),
  );

  readonly canSubmit = computed(
    () =>
      !this.disabled() &&
      !this.submitting() &&
      this.draft().trim().length > 0 &&
      this.draft().trim().length <= MAX_QUESTION_LENGTH,
  );

  private messagesSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.messagesSubscription = this.sessionWs.messages$.subscribe(raw => this.onMessage(raw));
    // Best-effort hydration: new questions still arrive live over WS, so a failed initial load
    // (e.g. an anonymous guest against the bearer-only variants) degrades to an empty list, never
    // a hard error in the participant view.
    this.sessionApi.listQaQuestions(this.session().id).subscribe({
      next: questions => this.questions.set(questions),
      error: () => this.questions.set([]),
    });
  }

  ngOnDestroy(): void {
    this.messagesSubscription?.unsubscribe();
  }

  /** Whether the caller has already upvoted the given question (button then stays disabled). */
  hasUpvoted(questionId: string): boolean {
    return this.upvotedIds().has(questionId);
  }

  toggleAnonymous(): void {
    this.anonymous.update(value => !value);
  }

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    this.submitting.set(true);
    this.submitError.set(false);
    this.sessionApi
      .submitQaQuestion(this.session().id, { text: this.draft().trim(), anonymous: this.anonymous() })
      .subscribe({
        next: () => {
          // The submitted question arrives back over WS (QUESTION_ADDED) like everyone else's —
          // clear the field rather than optimistically inserting a duplicate.
          this.submitting.set(false);
          this.draft.set('');
          this.anonymous.set(false);
        },
        error: () => {
          this.submitting.set(false);
          this.submitError.set(true);
        },
      });
  }

  upvote(questionId: string): void {
    if (this.disabled() || this.hasUpvoted(questionId)) {
      return;
    }
    // Optimistically lock the button; the tally itself updates from the QUESTION_UPVOTED
    // broadcast. A 409 (already upvoted from another device) is a success for our purposes —
    // the vote exists — so we keep it locked; any other error unlocks it to allow a retry.
    this.markUpvoted(questionId);
    this.sessionApi.upvoteQaQuestion(this.session().id, questionId).subscribe({
      error: err => {
        if (err?.status !== 409) {
          this.unmarkUpvoted(questionId);
        }
      },
    });
  }

  private markUpvoted(questionId: string): void {
    this.upvotedIds.update(current => new Set(current).add(questionId));
  }

  private unmarkUpvoted(questionId: string): void {
    this.upvotedIds.update(current => {
      const next = new Set(current);
      next.delete(questionId);
      return next;
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
    if (type === 'QUESTION_ADDED') {
      this.applyQuestionAdded((parsed as { question: QaQuestion }).question);
    } else if (type === 'QUESTION_UPVOTED') {
      const event = parsed as { questionId: string; upvotes: number };
      this.applyUpvote(event.questionId, event.upvotes);
    } else if (type === 'QUESTION_ANSWERED') {
      this.applyAnswered((parsed as { questionId: string }).questionId);
    }
  }

  private applyQuestionAdded(question: QaQuestion): void {
    this.questions.update(current =>
      current.some(q => q.id === question.id) ? current : [...current, question],
    );
  }

  private applyUpvote(questionId: string, upvotes: number): void {
    this.questions.update(current =>
      current.map(q => (q.id === questionId ? { ...q, upvotes } : q)),
    );
  }

  private applyAnswered(questionId: string): void {
    this.questions.update(current =>
      current.map(q => (q.id === questionId ? { ...q, answered: true } : q)),
    );
  }
}
