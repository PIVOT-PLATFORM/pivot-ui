import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, it, expect, beforeEach } from 'vitest';
import { QuizParticipantOverlayComponent } from './quiz-overlay.component';
import type { QuizQuestion, QuizSession } from '../model/board.types';

const FR = {
  whiteboard: {
    quiz: {
      overlay: {
        questionProgress: 'Question {{index}} / {{total}}',
        chooseAnswer: 'Choisissez votre réponse',
        answered: 'Réponse enregistrée',
        waiting: 'En attente de la prochaine question…',
      },
    },
  },
};

function configure(): Promise<void> {
  return TestBed.configureTestingModule({
    imports: [
      QuizParticipantOverlayComponent,
      TranslocoTestingModule.forRoot({
        langs: { fr: FR },
        translocoConfig: { defaultLang: 'fr', availableLangs: ['fr'] },
        preloadLangs: true,
      }),
    ],
  }).compileComponents();
}

function baseQuestion(overrides: Partial<QuizQuestion> = {}): QuizQuestion {
  return {
    id: 'q-1',
    position: 0,
    text: 'Quelle est la capitale de la France ?',
    state: 'OPEN',
    answeredCount: 0,
    choices: [
      { id: 'c-1', text: 'Paris', position: 0 },
      { id: 'c-2', text: 'Lyon', position: 1 },
      { id: 'c-3', text: 'Marseille', position: 2 },
    ],
    ...overrides,
  };
}

function baseSession(overrides: Partial<QuizSession> = {}): QuizSession {
  return {
    id: 'session-1',
    boardId: 'board-1',
    status: 'ACTIVE',
    currentQuestionIndex: 0,
    currentQuestion: baseQuestion(),
    leaderboard: [],
    createdAt: '2026-07-21T00:00:00Z',
    closedAt: null,
    ...overrides,
  };
}

describe('QuizParticipantOverlayComponent', () => {
  let fixture: ComponentFixture<QuizParticipantOverlayComponent>;

  function q<T extends HTMLElement>(sel: string): T | null {
    return fixture.nativeElement.querySelector(sel) as T | null;
  }

  function qAll<T extends HTMLElement>(sel: string): T[] {
    return Array.from(fixture.nativeElement.querySelectorAll(sel)) as T[];
  }

  beforeEach(async () => {
    await configure();
    fixture = TestBed.createComponent(QuizParticipantOverlayComponent);
  });

  it('shows the "waiting" state when there is no current question', () => {
    fixture.componentRef.setInput('session', baseSession({ currentQuestion: null }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('En attente de la prochaine question');
    expect(q('[role="radiogroup"]')).toBeNull();
  });

  it('shows the "waiting" state once the current question is REVEALED (nothing left to answer)', () => {
    fixture.componentRef.setInput(
      'session',
      baseSession({ currentQuestion: baseQuestion({ state: 'REVEALED' }) }),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('En attente de la prochaine question');
    expect(q('[role="radiogroup"]')).toBeNull();
  });

  it('renders the OPEN question as an accessible radiogroup with the choices, unchecked', () => {
    fixture.componentRef.setInput('session', baseSession());
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Quelle est la capitale de la France ?');
    const group = q('[role="radiogroup"]');
    expect(group).not.toBeNull();

    const radios = qAll<HTMLButtonElement>('[role="radio"]');
    expect(radios.length).toBe(3);
    expect(radios.map((r) => r.textContent?.trim())).toEqual(['Paris', 'Lyon', 'Marseille']);
    for (const radio of radios) {
      expect(radio.getAttribute('aria-checked')).toBe('false');
    }
    // Roving tabindex: only the first choice is initially tab-reachable.
    expect(radios[0].tabIndex).toBe(0);
    expect(radios[1].tabIndex).toBe(-1);
    expect(radios[2].tabIndex).toBe(-1);
  });

  it('renders "Question x / total" only when totalQuestions is supplied', () => {
    fixture.componentRef.setInput('session', baseSession());
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Question 1');

    fixture.componentRef.setInput('totalQuestions', 5);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Question 1 / 5');
  });

  it('emits answer(choiceId) on click and switches to the "answered" state', () => {
    fixture.componentRef.setInput('session', baseSession());
    fixture.detectChanges();

    let emitted: string | undefined;
    fixture.componentInstance.answer.subscribe((id) => (emitted = id));

    qAll<HTMLButtonElement>('[role="radio"]')[1].click();
    fixture.detectChanges();

    expect(emitted).toBe('c-2');
    expect(fixture.nativeElement.textContent).toContain('Réponse enregistrée');
    expect(q('[role="radiogroup"]')).toBeNull();
  });

  it('never renders the correct-answer or per-choice count fields, even if present on the input', () => {
    const revealedLikeChoices = baseQuestion({
      choices: [
        { id: 'c-1', text: 'Paris', position: 0, correct: true, count: 7 },
        { id: 'c-2', text: 'Lyon', position: 1, correct: false, count: 1 },
      ],
    });
    fixture.componentRef.setInput('session', baseSession({ currentQuestion: revealedLikeChoices }));
    fixture.detectChanges();

    // Choice buttons render only their text — no count, no correctness marker.
    const radios = qAll<HTMLButtonElement>('[role="radio"]');
    expect(radios.map((r) => r.textContent?.trim())).toEqual(['Paris', 'Lyon']);
    expect(fixture.nativeElement.textContent).not.toContain('7');
    expect(fixture.nativeElement.innerHTML).not.toContain('correct');
  });

  it('ArrowDown only moves roving focus — it never selects/submits an answer', () => {
    fixture.componentRef.setInput('session', baseSession());
    fixture.detectChanges();

    let emitted: string | undefined;
    fixture.componentInstance.answer.subscribe((id) => (emitted = id));

    const radios = qAll<HTMLButtonElement>('[role="radio"]');
    radios[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();

    expect(emitted).toBeUndefined();
    expect(q('[role="radiogroup"]')).not.toBeNull();
  });

  it('has a role="dialog" aria-modal container labelled via transloco', () => {
    fixture.componentRef.setInput('session', baseSession());
    fixture.detectChanges();

    const dialog = q('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-label')).toBe('Choisissez votre réponse');
  });
});
