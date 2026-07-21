import { ChangeDetectionStrategy, Component, ElementRef, computed, input, output, signal, viewChildren } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { QuizQuestion, QuizSession } from '../model/board.types';

/**
 * Participant view of the whiteboard quiz's currently `OPEN` question (US-Q2).
 *
 * Purely presentational — calqued on {@link VoteEndOverlayComponent} / {@link TimerOverlayComponent}
 * for the full-screen overlay shell (§4.1). Renders the current question as an accessible
 * `radiogroup`; picking a choice emits {@link answer} immediately (no separate confirm step —
 * "selecting" *is* the submit, per §2.3 US-Q2) and switches the view to a "recorded" confirmation
 * state until the host swaps in the next question. Between questions (no current question, or the
 * current one has already moved to `REVEALED`), a "waiting" state is shown instead.
 *
 * §2.4 masking (hard rule): the server never sends `QuizChoice.correct`/`count` before the
 * question is `REVEALED` (§5.2). This component goes further and structurally never *reads*
 * those fields at all — no template binding references `choice.correct` or `choice.count` — so
 * even a caller that mistakenly passed a revealed question through here could not leak the
 * correct answer via this view.
 *
 * WIP: the host (`board-page`, Lot C3) owns visibility — it mounts this overlay only while a quiz
 * is active for a non-owner participant and tears it down once the quiz session closes.
 */
@Component({
  selector: 'wb-quiz-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './quiz-overlay.component.html',
  styleUrl: './quiz-overlay.component.scss',
})
export class QuizParticipantOverlayComponent {
  /** The quiz session whose current question is displayed. */
  readonly session = input.required<QuizSession>();

  /**
   * Total number of questions in the quiz, feeding the "Question x / total" progress text
   * (§4.1, §6 `whiteboard.quiz.overlay.questionProgress`). Deliberately **not** part of
   * {@link QuizSession}: the wire contract only ever streams the *current* question to
   * participants (§5.2) and never the full question list (that would leak how many questions
   * remain in a way the design doesn't require, and more importantly the server-side
   * `QuizSessionResponse` — §3.5 — has no such field). The host may supply it from the
   * facilitator's local composition (`QuizConfigDialogComponent`'s emitted question count) when
   * it has it; the progress line is simply omitted when it doesn't.
   */
  readonly totalQuestions = input<number | null>(null);

  /** Emitted with the selected choice id as soon as the participant picks an answer. */
  readonly answer = output<string>();

  /** Ids of questions this participant has already answered during this component's lifetime. */
  private readonly answeredIds = signal<ReadonlySet<string>>(new Set());

  /** The choice id last submitted for the current question, if any (drives `aria-checked`). */
  private readonly checkedChoiceId = signal<string | null>(null);

  /** Roving-tabindex focus index within the radiogroup (WAI-ARIA APG "Radio Group" pattern). */
  protected readonly focusedIndex = signal(0);

  /** Focusable choice buttons, in DOM order, for roving-tabindex focus management. */
  private readonly choiceButtons = viewChildren<ElementRef<HTMLButtonElement>>('choiceBtn');

  /** 1-based position of the current question within the quiz, or `null` if there is none. */
  protected readonly progressIndex = computed<number | null>(() => {
    const q = this.session().currentQuestion;
    return q ? q.position + 1 : null;
  });

  /** Whether the current question has already been answered by this participant. */
  protected readonly hasAnsweredCurrent = computed<boolean>(() => {
    const q = this.session().currentQuestion;
    return q !== null && this.answeredIds().has(q.id);
  });

  /**
   * The question to render a live radiogroup for — `null` whenever there is nothing to answer
   * right now (no current question, already `REVEALED`, or already answered), in which case the
   * template falls back to the "answered" / "waiting" status views.
   */
  protected readonly answerableQuestion = computed<QuizQuestion | null>(() => {
    const q = this.session().currentQuestion;
    if (!q || q.state !== 'OPEN' || this.hasAnsweredCurrent()) {
      return null;
    }
    return q;
  });

  /** Whether a given choice is the one this participant currently has checked. */
  protected isChecked(choiceId: string): boolean {
    return this.checkedChoiceId() === choiceId;
  }

  /** Records the participant's answer and switches the view to the "recorded" state. */
  protected selectChoice(choiceId: string): void {
    const q = this.session().currentQuestion;
    if (!q || q.state !== 'OPEN') {
      return;
    }
    this.checkedChoiceId.set(choiceId);
    this.answeredIds.update((prev) => {
      const next = new Set(prev);
      next.add(q.id);
      return next;
    });
    this.focusedIndex.set(0);
    this.answer.emit(choiceId);
  }

  /**
   * Arrow-key roving navigation across the radiogroup (Home/End included). Only moves focus —
   * selection/submission stays a deliberate `click` or `Enter`/`Space` activation of a choice
   * button (native `<button>` behaviour), so exploring options with the keyboard never
   * accidentally submits an answer.
   */
  protected onChoiceKeydown(event: KeyboardEvent, index: number, count: number): void {
    let next: number;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        next = (index + 1) % count;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        next = (index - 1 + count) % count;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = count - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.focusedIndex.set(next);
    this.choiceButtons()[next]?.nativeElement.focus();
  }
}
