import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';
import { TranslocoPipe } from '@jsverse/transloco';
import type { QuizQuestionDraft } from '../model/board.types';

/** Upper bound on the number of questions a facilitator can compose (§9 — 64 KB STOMP frame). */
export const MAX_QUESTIONS = 20;
/** Upper bound on the number of choices per question (mirrors the backend `Choice` 2–6 rule). */
export const MAX_CHOICES = 6;
/** Lower bound on the number of choices per question. */
export const MIN_CHOICES = 2;
/** Max length of a question's text, mirrors the backend `Question.text VARCHAR(500)`. */
export const MAX_QUESTION_TEXT_LENGTH = 500;
/** Max length of a choice's text, mirrors the backend `Choice.text VARCHAR(300)`. */
export const MAX_CHOICE_TEXT_LENGTH = 300;

/** A single choice being composed, with a stable synthetic id for `@for` tracking. */
interface QuizChoiceDraftState {
  readonly id: number;
  text: string;
  correct: boolean;
}

/** A single question being composed, with a stable synthetic id for `@for` tracking. */
interface QuizQuestionDraftState {
  readonly id: number;
  text: string;
  choices: QuizChoiceDraftState[];
}

/** Blocking validation reason for the question at `questionIndex` (§2.3 US-Q1). */
interface QuizConfigFormError {
  readonly key: 'errorMinChoices' | 'errorNoCorrect';
  readonly questionIndex: number;
}

/**
 * Owner/editor dialog to compose a QCM quiz (N questions, 2–6 choices each, ≥1 correct per
 * question) and start it on the board (US-Q1).
 *
 * Purely presentational: it emits {@link start} with the fully composed question set (the
 * `quiz:start` wire shape, §5.1 of the design doc — `[{ text, choices: [{ text, correct }] }]`),
 * or {@link close}. The host relays `start` to `BoardStore.startQuiz(...)`.
 *
 * `role="dialog" aria-modal="true"` with Escape-to-close, modelled on
 * `vote-config-dialog.component.ts`.
 *
 * Focus-trap (a11y AC, US-Q1): mirrors the CDK `FocusTrapFactory` pattern already used by
 * `design-system`'s `ConfirmDialogComponent` — trapped on view init (this dialog is only ever
 * mounted via the host's `@if`, so "mounted" and "open" are the same event, unlike the
 * `@Input open` + `ngOnChanges` shape of the design-system dialog); initial focus is moved
 * explicitly onto the first question's text field rather than relying on
 * `FocusTrap.focusInitialElement()`'s own heuristic (same reasoning as `ConfirmDialogComponent`'s
 * explicit fallback `.focus()` call — see `ngAfterViewInit`); focus is restored to the triggering
 * element on destroy (Escape / backdrop / close button / Start all unmount the component via the
 * host's `@if`, so `ngOnDestroy` is the single point that covers every path).
 */
@Component({
  selector: 'wb-quiz-config-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './quiz-config-dialog.component.html',
  styleUrl: './quiz-config-dialog.component.scss',
})
export class QuizConfigDialogComponent implements AfterViewInit, OnDestroy {
  /** Emits the fully composed question set, ready for `quiz:start.data.questions`. */
  readonly start = output<QuizQuestionDraft[]>();
  /** Emits when the dialog is dismissed without starting. */
  readonly close = output<void>();

  private readonly focusTrapFactory = inject(FocusTrapFactory);
  private focusTrap?: FocusTrap;
  private previouslyFocused: HTMLElement | null = null;

  @ViewChild('dialogEl') private readonly dialogEl?: ElementRef<HTMLElement>;

  protected readonly maxQuestions = MAX_QUESTIONS;
  protected readonly maxChoices = MAX_CHOICES;
  protected readonly minChoices = MIN_CHOICES;
  protected readonly maxQuestionTextLength = MAX_QUESTION_TEXT_LENGTH;
  protected readonly maxChoiceTextLength = MAX_CHOICE_TEXT_LENGTH;

  private nextId = 0;

  protected readonly questions = signal<QuizQuestionDraftState[]>([this.createQuestion()]);

  /** Set once the facilitator has attempted to start an incomplete/invalid quiz — gates the
   *  visibility of inline error messages so they don't appear before any interaction (a11y:
   *  the Start button stays enabled and focusable rather than natively `disabled`, so failing
   *  it surfaces an explanatory message instead of a silently inert control). */
  protected readonly attemptedStart = signal(false);

  /** First blocking validation reason across all questions (≥2 non-empty choices, ≥1 of them
   *  marked correct — §2.3), or `null` when satisfied. Counts only choices with non-empty text,
   *  so a spare blank choice row doesn't itself trigger `errorMinChoices`. */
  protected readonly formError = computed<QuizConfigFormError | null>(() => {
    const qs = this.questions();
    for (let i = 0; i < qs.length; i++) {
      const filled = qs[i].choices.filter((c) => c.text.trim().length > 0);
      if (filled.length < MIN_CHOICES) {
        return { key: 'errorMinChoices', questionIndex: i };
      }
      if (!filled.some((c) => c.correct)) {
        return { key: 'errorNoCorrect', questionIndex: i };
      }
    }
    return null;
  });

  /** Whether every question/choice text is non-empty (§2.3: "textes de choix non vides"). */
  private readonly isComplete = computed(() => {
    const qs = this.questions();
    if (qs.length === 0) {
      return false;
    }
    return qs.every(
      (q) => q.text.trim().length > 0 && q.choices.every((c) => c.text.trim().length > 0),
    );
  });

  /** Whether the composed quiz is valid and can be started (§2.3: ≥1 question, non-empty texts,
   *  2–6 choices, ≥1 correct per question). */
  protected readonly canStart = computed(() => this.isComplete() && this.formError() === null);

  private createChoice(): QuizChoiceDraftState {
    return { id: this.nextId++, text: '', correct: false };
  }

  private createQuestion(): QuizQuestionDraftState {
    return { id: this.nextId++, text: '', choices: [this.createChoice(), this.createChoice()] };
  }

  protected addQuestion(): void {
    if (this.questions().length >= MAX_QUESTIONS) {
      return;
    }
    this.questions.update((qs) => [...qs, this.createQuestion()]);
  }

  protected removeQuestion(questionId: number): void {
    if (this.questions().length <= 1) {
      return;
    }
    this.questions.update((qs) => qs.filter((q) => q.id !== questionId));
  }

  protected addChoice(questionId: number): void {
    this.questions.update((qs) =>
      qs.map((q) =>
        q.id === questionId && q.choices.length < MAX_CHOICES
          ? { ...q, choices: [...q.choices, this.createChoice()] }
          : q,
      ),
    );
  }

  protected removeChoice(questionId: number, choiceId: number): void {
    this.questions.update((qs) =>
      qs.map((q) =>
        q.id === questionId && q.choices.length > MIN_CHOICES
          ? { ...q, choices: q.choices.filter((c) => c.id !== choiceId) }
          : q,
      ),
    );
  }

  protected onQuestionTextInput(questionId: number, event: Event): void {
    const text = (event.target as HTMLInputElement).value.slice(0, MAX_QUESTION_TEXT_LENGTH);
    this.questions.update((qs) => qs.map((q) => (q.id === questionId ? { ...q, text } : q)));
  }

  protected onChoiceTextInput(questionId: number, choiceId: number, event: Event): void {
    const text = (event.target as HTMLInputElement).value.slice(0, MAX_CHOICE_TEXT_LENGTH);
    this.questions.update((qs) =>
      qs.map((q) =>
        q.id === questionId
          ? { ...q, choices: q.choices.map((c) => (c.id === choiceId ? { ...c, text } : c)) }
          : q,
      ),
    );
  }

  protected onToggleCorrect(questionId: number, choiceId: number, event: Event): void {
    const correct = (event.target as HTMLInputElement).checked;
    this.questions.update((qs) =>
      qs.map((q) =>
        q.id === questionId
          ? { ...q, choices: q.choices.map((c) => (c.id === choiceId ? { ...c, correct } : c)) }
          : q,
      ),
    );
  }

  protected startQuiz(): void {
    if (!this.canStart()) {
      this.attemptedStart.set(true);
      return;
    }
    const questions: QuizQuestionDraft[] = this.questions().map((q) => ({
      text: q.text.trim(),
      choices: q.choices.map((c) => ({ text: c.text.trim(), correct: c.correct })),
    }));
    this.start.emit(questions);
  }

  protected onClose(): void {
    this.close.emit();
  }

  @HostListener('keydown.escape', ['$event'])
  protected onEscape(event: Event): void {
    event.preventDefault();
    this.onClose();
  }

  ngAfterViewInit(): void {
    this.previouslyFocused = document.activeElement as HTMLElement | null;
    queueMicrotask(() => {
      const dialogEl = this.dialogEl?.nativeElement;
      if (!dialogEl) {
        return;
      }
      this.focusTrap = this.focusTrapFactory.create(dialogEl);
      // Deterministic initial-focus target — the first question's text field — rather than
      // relying on `FocusTrap.focusInitialElement()`'s own DOM-order-first-tabbable heuristic
      // (which would land on the header's close button) or its geometry-gated visibility check
      // (a silent no-op under a layout-less DOM, e.g. jsdom in this project's unit tests — the
      // same gap `ConfirmDialogComponent`, design-system, works around with its own explicit
      // fallback `.focus()` call).
      dialogEl.querySelector<HTMLElement>('.wb-quizcfg__input--question')?.focus();
    });
  }

  ngOnDestroy(): void {
    this.focusTrap?.destroy();
    this.previouslyFocused?.focus();
  }
}
