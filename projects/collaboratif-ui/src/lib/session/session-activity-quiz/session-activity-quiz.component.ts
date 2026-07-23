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
import { Subscription, interval } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  LeaderboardEntry,
  ParticipantSessionResponse,
  QuizState,
} from '../models/session.model';
import { SessionApiService } from '../services/session-api.service';
import { SessionWsService } from '../services/session-ws.service';

/**
 * QUIZ activity participant view (US19.3.1) — a facilitator-paced, server-timed multiplayer quiz.
 * Answer the live question before the countdown ends (the timer is display-only; the backend is
 * the authority and rejects late answers), see the correct answer and the leaderboard revealed
 * when the facilitator ends the question. State is hydrated once from
 * {@link SessionApiService.getQuizState} (so a reconnecting player rejoins mid-quiz) then kept
 * current from `QUESTION_STARTED`/`QUIZ_ANSWERED`/`QUESTION_ENDED` broadcasts. All quiz text via
 * interpolation, never `innerHTML`.
 */
@Component({
  selector: 'app-session-activity-quiz',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './session-activity-quiz.component.html',
  styleUrl: './session-activity-quiz.component.scss',
})
export class SessionActivityQuizComponent implements OnInit, OnDestroy {
  private readonly sessionApi = inject(SessionApiService);
  private readonly sessionWs = inject(SessionWsService);

  readonly session = input.required<ParticipantSessionResponse>();
  readonly disabled = input(false);
  /** The caller's own participant id, to highlight their leaderboard row. */
  readonly participantId = input<string | null>(null);

  readonly started = signal(false);
  readonly questionIndex = signal(-1);
  readonly totalQuestions = signal(0);
  readonly questionText = signal<string | null>(null);
  readonly options = signal<string[]>([]);
  readonly durationSeconds = signal(0);
  readonly ended = signal(false);
  readonly correctIndices = signal<number[]>([]);
  readonly leaderboard = signal<LeaderboardEntry[]>([]);
  readonly answered = signal(false);
  readonly myScore = signal(0);
  readonly answerCount = signal(0);
  readonly selected = signal<number[]>([]);
  readonly submitting = signal(false);
  readonly submitError = signal(false);

  private readonly startedAtMs = signal<number | null>(null);
  private readonly nowMs = signal(Date.now());

  /** Seconds left in the current question's window (0 once elapsed or ended). */
  readonly remaining = computed(() => {
    const startedAt = this.startedAtMs();
    if (startedAt === null || this.ended()) {
      return 0;
    }
    const elapsed = (this.nowMs() - startedAt) / 1000;
    return Math.max(0, Math.ceil(this.durationSeconds() - elapsed));
  });

  readonly canSubmit = computed(
    () =>
      !this.disabled() &&
      this.started() &&
      !this.ended() &&
      !this.answered() &&
      !this.submitting() &&
      this.remaining() > 0 &&
      this.selected().length > 0,
  );

  private messagesSubscription: Subscription | null = null;
  private tickSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.messagesSubscription = this.sessionWs.messages$.subscribe(raw => this.onMessage(raw));
    this.tickSubscription = interval(1000).subscribe(() => this.nowMs.set(Date.now()));
    this.sessionApi.getQuizState(this.session().id).subscribe({
      next: state => this.hydrate(state),
      error: () => this.started.set(false),
    });
  }

  ngOnDestroy(): void {
    this.messagesSubscription?.unsubscribe();
    this.tickSubscription?.unsubscribe();
  }

  isCorrect(index: number): boolean {
    return this.ended() && this.correctIndices().includes(index);
  }

  isSelected(index: number): boolean {
    return this.selected().includes(index);
  }

  isOwnRow(entry: LeaderboardEntry): boolean {
    return this.participantId() !== null && entry.participantId === this.participantId();
  }

  toggleOption(index: number): void {
    if (this.disabled() || this.ended() || this.answered() || this.remaining() <= 0) {
      return;
    }
    this.selected.update(current =>
      current.includes(index) ? current.filter(i => i !== index) : [...current, index],
    );
  }

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    this.submitting.set(true);
    this.submitError.set(false);
    this.sessionApi
      .submitQuizAnswer(this.session().id, {
        questionIndex: this.questionIndex(),
        selectedIndices: this.selected(),
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.answered.set(true);
        },
        error: () => {
          this.submitting.set(false);
          this.submitError.set(true);
        },
      });
  }

  private hydrate(state: QuizState): void {
    this.started.set(state.started);
    this.questionIndex.set(state.currentQuestionIndex);
    this.totalQuestions.set(state.totalQuestions);
    this.questionText.set(state.questionText);
    this.options.set(state.options);
    this.durationSeconds.set(state.durationSeconds ?? 0);
    this.ended.set(state.questionEnded);
    this.correctIndices.set(state.correctIndices);
    this.leaderboard.set(state.leaderboard);
    this.answered.set(state.hasAnswered);
    this.myScore.set(state.myScore);
    this.startedAtMs.set(state.questionStartedAt ? Date.parse(state.questionStartedAt) : null);
    this.selected.set([]);
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
    if (type === 'QUESTION_STARTED') {
      this.applyQuestionStarted(parsed as QuestionStartedPayload);
    } else if (type === 'QUIZ_ANSWERED') {
      this.answerCount.set((parsed as { answerCount: number }).answerCount);
    } else if (type === 'QUESTION_ENDED') {
      this.applyQuestionEnded(parsed as QuestionEndedPayload);
    }
  }

  private applyQuestionStarted(event: QuestionStartedPayload): void {
    this.started.set(true);
    this.questionIndex.set(event.questionIndex);
    this.totalQuestions.set(event.totalQuestions);
    this.questionText.set(event.text);
    this.options.set(event.options);
    this.durationSeconds.set(event.durationSeconds);
    this.ended.set(false);
    this.correctIndices.set([]);
    this.answered.set(false);
    this.selected.set([]);
    this.answerCount.set(0);
    // The event has no start timestamp — it is broadcast at start, so local receipt time is the
    // display clock (the server remains the authority for whether an answer is in time).
    this.startedAtMs.set(Date.now());
    this.nowMs.set(Date.now());
  }

  private applyQuestionEnded(event: QuestionEndedPayload): void {
    this.ended.set(true);
    this.correctIndices.set(event.correctIndices);
    this.leaderboard.set(event.leaderboard);
    const mine = this.participantId();
    if (mine) {
      const own = event.leaderboard.find(e => e.participantId === mine);
      if (own) {
        this.myScore.set(own.score);
      }
    }
  }
}

interface QuestionStartedPayload {
  readonly questionIndex: number;
  readonly totalQuestions: number;
  readonly text: string;
  readonly options: string[];
  readonly durationSeconds: number;
}

interface QuestionEndedPayload {
  readonly correctIndices: number[];
  readonly leaderboard: LeaderboardEntry[];
}
