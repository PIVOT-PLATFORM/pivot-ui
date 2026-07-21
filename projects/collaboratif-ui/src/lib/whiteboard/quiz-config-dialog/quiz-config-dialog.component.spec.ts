import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { QuizConfigDialogComponent, MAX_CHOICES, MAX_QUESTIONS, MIN_CHOICES } from './quiz-config-dialog.component';
import type { QuizQuestionDraft } from '../model/board.types';

const FR = {
  whiteboard: {
    quiz: {
      config: {
        title: 'Composer un quiz',
        cancel: 'Annuler',
        hint: 'Composez vos questions',
        questionLabel: 'Question {{n}}',
        questionText: 'Texte de la question',
        addQuestion: 'Ajouter une question',
        removeQuestion: 'Supprimer la question',
        addChoice: 'Ajouter un choix',
        removeChoice: 'Supprimer le choix',
        choiceText: 'Texte du choix {{n}}',
        correctLabel: 'Bonne réponse',
        start: 'Lancer le quiz',
        errorNoCorrect: 'Marquez au moins une bonne réponse',
        errorMinChoices: 'Ajoutez au moins deux choix',
      },
    },
  },
};

describe('QuizConfigDialogComponent', () => {
  let fixture: ComponentFixture<QuizConfigDialogComponent>;
  let component: QuizConfigDialogComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        QuizConfigDialogComponent,
        TranslocoTestingModule.forRoot({
          langs: { fr: FR },
          translocoConfig: { defaultLang: 'fr', availableLangs: ['fr'] },
          preloadLangs: true,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuizConfigDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function dialog(): HTMLElement {
    return fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
  }

  function questionFieldsets(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.wb-quizcfg__question'));
  }

  function choiceRows(questionIndex: number): HTMLElement[] {
    return Array.from(questionFieldsets()[questionIndex].querySelectorAll('.wb-quizcfg__choice'));
  }

  function questionTextInput(questionIndex: number): HTMLInputElement {
    return questionFieldsets()[questionIndex].querySelector('.wb-quizcfg__input--question') as HTMLInputElement;
  }

  function choiceTextInput(questionIndex: number, choiceIndex: number): HTMLInputElement {
    return choiceRows(questionIndex)[choiceIndex].querySelector('.wb-quizcfg__input--choice') as HTMLInputElement;
  }

  function choiceCorrectCheckbox(questionIndex: number, choiceIndex: number): HTMLInputElement {
    return choiceRows(questionIndex)[choiceIndex].querySelector('input[type="checkbox"]') as HTMLInputElement;
  }

  function setInputValue(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function fillValidQuestion(questionIndex: number): void {
    setInputValue(questionTextInput(questionIndex), `Question ${questionIndex + 1}`);
    setInputValue(choiceTextInput(questionIndex, 0), 'Choix A');
    setInputValue(choiceTextInput(questionIndex, 1), 'Choix B');
    choiceCorrectCheckbox(questionIndex, 0).click();
    fixture.detectChanges();
  }

  function clickStart(): void {
    (fixture.nativeElement.querySelector('.wb-quizcfg__btn--primary') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  it('renders as an accessible modal dialog with one question and two empty choices by default', () => {
    const el = dialog();
    expect(el.getAttribute('aria-modal')).toBe('true');
    expect(el.getAttribute('aria-label')).toBe('Composer un quiz');
    expect(questionFieldsets().length).toBe(1);
    expect(choiceRows(0).length).toBe(MIN_CHOICES);
  });

  it('adds and removes questions, never going below one', () => {
    (fixture.nativeElement.querySelector('.wb-quizcfg__add-question') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(questionFieldsets().length).toBe(2);

    // With only one question, no remove-question button is rendered.
    fixture.nativeElement.querySelectorAll('.wb-quizcfg__remove-question')[0].click();
    fixture.detectChanges();
    expect(questionFieldsets().length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.wb-quizcfg__remove-question').length).toBe(0);
  });

  it('caps the number of questions at MAX_QUESTIONS', () => {
    const addBtn = () => fixture.nativeElement.querySelector('.wb-quizcfg__add-question') as HTMLButtonElement | null;
    for (let i = 1; i < MAX_QUESTIONS; i++) {
      addBtn()?.click();
      fixture.detectChanges();
    }
    expect(questionFieldsets().length).toBe(MAX_QUESTIONS);
    expect(addBtn()).toBeNull();
  });

  it('adds and removes choices within MIN_CHOICES..MAX_CHOICES bounds', () => {
    expect(choiceRows(0).length).toBe(MIN_CHOICES);
    expect(choiceRows(0)[0].querySelector('.wb-quizcfg__remove-choice')).toBeNull();

    const addChoiceBtn = () => questionFieldsets()[0].querySelector('.wb-quizcfg__add-choice') as HTMLButtonElement | null;
    for (let i = MIN_CHOICES; i < MAX_CHOICES; i++) {
      addChoiceBtn()?.click();
      fixture.detectChanges();
    }
    expect(choiceRows(0).length).toBe(MAX_CHOICES);
    expect(addChoiceBtn()).toBeNull();

    (choiceRows(0)[0].querySelector('.wb-quizcfg__remove-choice') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(choiceRows(0).length).toBe(MAX_CHOICES - 1);
  });

  it('does not emit start and shows errorMinChoices when fewer than two choices have text', () => {
    setInputValue(questionTextInput(0), 'Q1');
    setInputValue(choiceTextInput(0, 0), 'Seul choix');
    // Second choice left empty -> only one filled choice.

    let emitted: QuizQuestionDraft[] | undefined;
    component.start.subscribe((q: QuizQuestionDraft[]) => (emitted = q));
    clickStart();

    expect(emitted).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain('Ajoutez au moins deux choix');
  });

  it('does not emit start and shows errorNoCorrect when no choice is marked correct', () => {
    setInputValue(questionTextInput(0), 'Q1');
    setInputValue(choiceTextInput(0, 0), 'Choix A');
    setInputValue(choiceTextInput(0, 1), 'Choix B');

    let emitted: QuizQuestionDraft[] | undefined;
    component.start.subscribe((q: QuizQuestionDraft[]) => (emitted = q));
    clickStart();

    expect(emitted).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain('Marquez au moins une bonne réponse');
  });

  it('does not emit start when a question text is empty, even if choices are valid', () => {
    // Question text left empty.
    setInputValue(choiceTextInput(0, 0), 'Choix A');
    setInputValue(choiceTextInput(0, 1), 'Choix B');
    choiceCorrectCheckbox(0, 0).click();
    fixture.detectChanges();

    let emitted: QuizQuestionDraft[] | undefined;
    component.start.subscribe((q: QuizQuestionDraft[]) => (emitted = q));
    clickStart();

    expect(emitted).toBeUndefined();
  });

  it('emits start with the full question set, mirroring the quiz:start wire shape', () => {
    fillValidQuestion(0);

    let emitted: QuizQuestionDraft[] | undefined;
    component.start.subscribe((q: QuizQuestionDraft[]) => (emitted = q));
    clickStart();

    expect(emitted).toEqual([
      {
        text: 'Question 1',
        choices: [
          { text: 'Choix A', correct: true },
          { text: 'Choix B', correct: false },
        ],
      },
    ]);
  });

  it('emits start with multiple valid questions in order', () => {
    (fixture.nativeElement.querySelector('.wb-quizcfg__add-question') as HTMLButtonElement).click();
    fixture.detectChanges();
    fillValidQuestion(0);
    fillValidQuestion(1);

    let emitted: QuizQuestionDraft[] | undefined;
    component.start.subscribe((q: QuizQuestionDraft[]) => (emitted = q));
    clickStart();

    expect(emitted?.length).toBe(2);
    expect(emitted?.[1].text).toBe('Question 2');
  });

  it('clears the error message once the quiz becomes valid after a failed attempt', () => {
    clickStart();
    expect(fixture.nativeElement.textContent).toContain('Ajoutez au moins deux choix');

    fillValidQuestion(0);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Ajoutez au moins deux choix');
  });

  it('emits close when the cancel button is clicked', () => {
    const closed: boolean[] = [];
    component.close.subscribe(() => closed.push(true));
    (fixture.nativeElement.querySelector('.wb-quizcfg__btn--ghost') as HTMLButtonElement).click();
    expect(closed).toEqual([true]);
  });

  it('emits close when the header close button is clicked', () => {
    const closed: boolean[] = [];
    component.close.subscribe(() => closed.push(true));
    (fixture.nativeElement.querySelector('.wb-quizcfg__close') as HTMLButtonElement).click();
    expect(closed).toEqual([true]);
  });

  it('emits close when clicking the backdrop', () => {
    const closed: boolean[] = [];
    component.close.subscribe(() => closed.push(true));
    (fixture.nativeElement.querySelector('.wb-quizcfg__backdrop') as HTMLButtonElement).click();
    expect(closed).toEqual([true]);
  });

  it('does not close when clicking inside the dialog panel', () => {
    const closed: boolean[] = [];
    component.close.subscribe(() => closed.push(true));
    dialog().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(closed).toEqual([]);
  });

  it('emits close on Escape', () => {
    const closed: boolean[] = [];
    component.close.subscribe(() => closed.push(true));
    fixture.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(closed).toEqual([true]);
  });
});
