import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, it, expect, beforeEach } from 'vitest';
import { QuizResultsPanelComponent } from './quiz-results-panel.component';
import type { QuizQuestion, QuizSession } from '../model/board.types';

const FR = {
  whiteboard: {
    quiz: {
      close: 'Fermer le quiz',
      config: {
        correctLabel: 'Bonne réponse',
      },
      results: {
        title: 'Résultats du quiz',
        responders: '{{n}} participant·e·s ont répondu',
        reveal: 'Révéler la réponse',
        next: 'Question suivante',
        stop: 'Terminer le quiz',
        leaderboard: 'Classement',
        rank: '{{rank}}. {{name}} — {{score}} pts',
        empty: "Aucune réponse pour l'instant",
      },
    },
  },
};

function configure(): Promise<void> {
  return TestBed.configureTestingModule({
    imports: [
      QuizResultsPanelComponent,
      TranslocoTestingModule.forRoot({
        langs: { fr: FR },
        translocoConfig: { defaultLang: 'fr', availableLangs: ['fr'] },
        preloadLangs: true,
      }),
    ],
  }).compileComponents();
}

function baseSession(overrides: Partial<QuizSession> = {}): QuizSession {
  return {
    id: 'session-1',
    boardId: 'board-1',
    status: 'ACTIVE',
    currentQuestionIndex: 0,
    currentQuestion: null,
    leaderboard: [],
    createdAt: '2026-07-21T00:00:00Z',
    closedAt: null,
    ...overrides,
  };
}

function openQuestion(overrides: Partial<QuizQuestion> = {}): QuizQuestion {
  return {
    id: 'q-1',
    position: 0,
    text: 'Capitale de la France ?',
    state: 'OPEN',
    answeredCount: 4,
    choices: [
      { id: 'c-1', text: 'Paris', position: 0 },
      { id: 'c-2', text: 'Lyon', position: 1 },
    ],
    ...overrides,
  };
}

function revealedQuestion(overrides: Partial<QuizQuestion> = {}): QuizQuestion {
  return {
    id: 'q-1',
    position: 0,
    text: 'Capitale de la France ?',
    state: 'REVEALED',
    answeredCount: 4,
    choices: [
      { id: 'c-1', text: 'Paris', position: 0, correct: true, count: 3 },
      { id: 'c-2', text: 'Lyon', position: 1, correct: false, count: 1 },
    ],
    ...overrides,
  };
}

describe('QuizResultsPanelComponent', () => {
  let fixture: ComponentFixture<QuizResultsPanelComponent>;

  function q<T extends HTMLElement>(sel: string): T | null {
    return fixture.nativeElement.querySelector(sel) as T | null;
  }

  function qAll<T extends HTMLElement>(sel: string): T[] {
    return Array.from(fixture.nativeElement.querySelectorAll(sel)) as T[];
  }

  beforeEach(async () => {
    await configure();
    fixture = TestBed.createComponent(QuizResultsPanelComponent);
  });

  it('shows the empty state when there is no question and no leaderboard yet', () => {
    fixture.componentRef.setInput('session', baseSession());
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("Aucune réponse pour l'instant");
    expect(q('.wb-quiz-results__distribution')).toBeNull();
  });

  it('shows only the live responder count while the question is OPEN — no distribution, no correct marker', () => {
    fixture.componentRef.setInput('session', baseSession({ currentQuestion: openQuestion() }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('4 participant');
    expect(q('.wb-quiz-results__distribution')).toBeNull();
    expect(fixture.nativeElement.innerHTML).not.toContain('Bonne réponse');
  });

  it('renders the proportional distribution with visible text + value (not colour alone) and the correct marker once REVEALED', () => {
    fixture.componentRef.setInput('session', baseSession({ currentQuestion: revealedQuestion() }));
    fixture.detectChanges();

    const items = qAll<HTMLLIElement>('.wb-quiz-results__item');
    expect(items.length).toBe(2);

    const parisItem = items.find((it) => it.textContent?.includes('Paris'));
    expect(parisItem).toBeDefined();
    expect(parisItem?.querySelector('.wb-quiz-results__count')?.textContent?.trim()).toBe('3');
    expect(parisItem?.textContent).toContain('Bonne réponse');
    expect(parisItem?.classList.contains('wb-quiz-results__item--correct')).toBe(true);

    const bar = parisItem?.querySelector<HTMLElement>('.wb-quiz-results__bar');
    expect(bar?.style.width).toBe('100%'); // max count (3) => 100%

    const lyonItem = items.find((it) => it.textContent?.includes('Lyon'));
    expect(lyonItem?.textContent).not.toContain('Bonne réponse');
    expect(lyonItem?.querySelector<HTMLElement>('.wb-quiz-results__bar')?.style.width).toBe(
      '33%',
    );
  });

  it('renders the leaderboard as a semantic ordered list, sorted by rank', () => {
    fixture.componentRef.setInput(
      'session',
      baseSession({
        leaderboard: [
          { userId: 'u-2', score: 5, rank: 2 },
          { userId: 'u-1', score: 10, rank: 1 },
        ],
      }),
    );
    fixture.detectChanges();

    const list = q<HTMLOListElement>('.wb-quiz-results__leaderboard');
    expect(list).not.toBeNull();
    expect(list?.tagName).toBe('OL');
    const items = qAll<HTMLLIElement>('.wb-quiz-results__rank-item').map((li) =>
      li.textContent?.trim(),
    );
    expect(items).toEqual(['1. u-1 — 10 pts', '2. u-2 — 5 pts']);
  });

  it('hides all facilitator controls for a non-owner', () => {
    fixture.componentRef.setInput('session', baseSession({ currentQuestion: openQuestion() }));
    fixture.componentRef.setInput('isOwner', false);
    fixture.detectChanges();

    expect(qAll('.wb-quiz-results__btn').length).toBe(0);
  });

  it('shows reveal/next/stop/close for the owner while the question is OPEN, and wires the outputs', () => {
    fixture.componentRef.setInput('session', baseSession({ currentQuestion: openQuestion() }));
    fixture.componentRef.setInput('isOwner', true);
    fixture.detectChanges();

    const events: string[] = [];
    fixture.componentInstance.reveal.subscribe(() => events.push('reveal'));
    fixture.componentInstance.next.subscribe(() => events.push('next'));
    fixture.componentInstance.stop.subscribe(() => events.push('stop'));
    fixture.componentInstance.close.subscribe(() => events.push('close'));

    expect(q('.wb-quiz-results__btn--primary')?.textContent?.trim()).toBe('Révéler la réponse');
    q<HTMLButtonElement>('.wb-quiz-results__btn--primary')!.click();
    qAll<HTMLButtonElement>('.wb-quiz-results__btn')
      .find((b) => b.textContent?.includes('Question suivante'))!
      .click();
    qAll<HTMLButtonElement>('.wb-quiz-results__btn')
      .find((b) => b.textContent?.includes('Terminer le quiz'))!
      .click();
    qAll<HTMLButtonElement>('.wb-quiz-results__btn')
      .find((b) => b.textContent?.includes('Fermer le quiz'))!
      .click();

    expect(events).toEqual(['reveal', 'next', 'stop', 'close']);
  });

  it('hides reveal once REVEALED, but keeps next/stop/close for the owner', () => {
    fixture.componentRef.setInput('session', baseSession({ currentQuestion: revealedQuestion() }));
    fixture.componentRef.setInput('isOwner', true);
    fixture.detectChanges();

    expect(q('.wb-quiz-results__btn--primary')).toBeNull();
    const labels = qAll<HTMLButtonElement>('.wb-quiz-results__btn').map((b) => b.textContent?.trim());
    expect(labels).toEqual(['Question suivante', 'Terminer le quiz', 'Fermer le quiz']);
  });

  it('once CLOSED, only the owner close control remains — and Escape respects the same gate', () => {
    fixture.componentRef.setInput(
      'session',
      baseSession({
        status: 'CLOSED',
        closedAt: '2026-07-21T01:00:00Z',
        leaderboard: [{ userId: 'u-1', score: 10, rank: 1 }],
      }),
    );
    fixture.componentRef.setInput('isOwner', true);
    fixture.detectChanges();

    const labels = qAll<HTMLButtonElement>('.wb-quiz-results__btn').map((b) => b.textContent?.trim());
    expect(labels).toEqual(['Fermer le quiz']);

    let closed = false;
    fixture.componentInstance.close.subscribe(() => (closed = true));
    q('[role="dialog"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(closed).toBe(true);
  });

  it('Escape does not emit close for a non-owner (same gate as the button)', () => {
    fixture.componentRef.setInput('session', baseSession({ status: 'CLOSED' }));
    fixture.componentRef.setInput('isOwner', false);
    fixture.detectChanges();

    let closed = false;
    fixture.componentInstance.close.subscribe(() => (closed = true));
    q('[role="dialog"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(closed).toBe(false);
  });
});
