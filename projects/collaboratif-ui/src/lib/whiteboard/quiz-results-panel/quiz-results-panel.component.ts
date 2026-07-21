import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { QuizChoice, QuizLeaderboardEntry, QuizSession } from '../model/board.types';

/** A single choice's post-reveal distribution, precomputed for the template. */
interface DistributionEntry {
  /** Choice id. */
  readonly id: string;
  /** Choice text. */
  readonly text: string;
  /** Number of participants who picked this choice. */
  readonly count: number;
  /** Whether this choice was marked correct by the facilitator. */
  readonly correct: boolean;
  /** Bar width as a percentage of the top choice's count (0–100). */
  readonly percent: number;
}

/**
 * Results + facilitator-piloting panel for the whiteboard quiz (US-Q3/US-Q4), calqued on
 * {@link VoteResultsPanelComponent}.
 *
 * Purely presentational: it renders whatever {@link QuizSession} its host supplies and never
 * infers or reconstructs masked data. While the current question is `OPEN`, only the live
 * responder count is shown (§2.4 masking — no per-choice distribution, no `correct` marker) —
 * the same `QuizChoice.correct`/`count` fields the panel reads for the post-reveal distribution
 * are simply `undefined` on the wire until `REVEALED`, so there is nothing to leak. Once
 * `REVEALED`, the per-choice distribution (proportional bars *and* a visible text value — never
 * colour alone, WCAG 2.1 AA) and the correct-answer marker are shown, plus the cumulative/final
 * leaderboard as a semantic ordered list.
 *
 * `next`/`reveal`/`stop`/`close` are all facilitator (owner) controls — gated on {@link isOwner}
 * per §4.1 ("visibles/actifs seulement si isOwner"); this UI gate is a convenience only, the real
 * guard is server-side (`canManage`, §3.4). `isOwner` is confort UI, never a security boundary.
 *
 * WIP: quiz backend not implemented in collaboratif-core yet — this component renders a
 * {@link QuizSession} supplied by its host; wiring to the live quiz store/API is Lot C3.
 */
@Component({
  selector: 'wb-quiz-results-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './quiz-results-panel.component.html',
  styleUrl: './quiz-results-panel.component.scss',
})
export class QuizResultsPanelComponent {
  /** The quiz session whose results/leaderboard are displayed. */
  readonly session = input.required<QuizSession>();

  /** Whether the current user may pilot the quiz (facilitator UI gate — server is authoritative). */
  readonly isOwner = input<boolean>(false);

  /** Emitted when the facilitator advances to the next question. */
  readonly next = output<void>();
  /** Emitted when the facilitator reveals the current question's correct answer(s). */
  readonly reveal = output<void>();
  /** Emitted when the facilitator ends the quiz. */
  readonly stop = output<void>();
  /** Emitted when the panel is dismissed. */
  readonly close = output<void>();

  /** The session's current question, if any. */
  protected readonly question = computed(() => this.session().currentQuestion);

  /** Whether the current question has been revealed (distribution + correct answers visible). */
  protected readonly isRevealed = computed<boolean>(() => this.question()?.state === 'REVEALED');

  /** Number of participants who have answered the current (still masked) question. */
  protected readonly responderCount = computed<number>(() => this.question()?.answeredCount ?? 0);

  /** Per-choice distribution for the current question — empty until `REVEALED` (§2.4 masking). */
  protected readonly distribution = computed<DistributionEntry[]>(() => {
    const q = this.question();
    if (!q || q.state !== 'REVEALED') {
      return [];
    }
    const maxCount = q.choices.reduce((max: number, c: QuizChoice) => Math.max(max, c.count ?? 0), 0);
    return q.choices.map((c: QuizChoice) => ({
      id: c.id,
      text: c.text,
      count: c.count ?? 0,
      correct: c.correct ?? false,
      percent: maxCount > 0 ? Math.round(((c.count ?? 0) / maxCount) * 100) : 0,
    }));
  });

  /** Leaderboard entries (cumulative while active, final once closed), sorted by rank. */
  protected readonly leaderboard = computed<QuizLeaderboardEntry[]>(() =>
    [...this.session().leaderboard].sort((a, b) => a.rank - b.rank),
  );

  /** Whether there is nothing meaningful to show yet (no question, no leaderboard entries). */
  protected readonly isEmpty = computed<boolean>(
    () => !this.question() && this.leaderboard().length === 0,
  );

  /** Whether the facilitator may reveal — only while a question is `OPEN`. */
  protected readonly canReveal = computed<boolean>(
    () =>
      this.isOwner() && this.session().status === 'ACTIVE' && this.question()?.state === 'OPEN',
  );

  /** Whether the facilitator may advance to the next question. */
  protected readonly canNext = computed<boolean>(
    () => this.isOwner() && this.session().status === 'ACTIVE',
  );

  /** Whether the facilitator may end the quiz. */
  protected readonly canStop = computed<boolean>(
    () => this.isOwner() && this.session().status === 'ACTIVE',
  );

  /** Whether the facilitator-only close control is shown (§4.1). */
  protected readonly canClose = computed<boolean>(() => this.isOwner());

  /** Emits the next-question request to the host — guarded so an alternate trigger (e.g. a
   * future keyboard shortcut) can never emit while the control would be hidden. */
  protected onNext(): void {
    if (!this.canNext()) {
      return;
    }
    this.next.emit();
  }

  /** Emits the reveal request to the host (guarded, see {@link onNext}). */
  protected onReveal(): void {
    if (!this.canReveal()) {
      return;
    }
    this.reveal.emit();
  }

  /** Emits the stop request to the host (guarded, see {@link onNext}). */
  protected onStop(): void {
    if (!this.canStop()) {
      return;
    }
    this.stop.emit();
  }

  /**
   * Emits the close request to the host (guarded, see {@link onNext}) — also the target of the
   * host `(keydown.escape)` binding, so Escape must respect the same owner gate as the button.
   */
  protected onClose(): void {
    if (!this.canClose()) {
      return;
    }
    this.close.emit();
  }
}
