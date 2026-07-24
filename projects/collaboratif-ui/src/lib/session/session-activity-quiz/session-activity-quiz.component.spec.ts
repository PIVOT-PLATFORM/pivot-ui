import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { ParticipantSessionResponse, QuizState } from '../models/session.model';
import { SessionWsService } from '../services/session-ws.service';
import { SessionActivityQuizComponent } from './session-activity-quiz.component';

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';
const STATE_URL = `${TEST_API_URL}/sessions/s-1/quiz/state`;
const ANSWER_URL = `${TEST_API_URL}/sessions/s-1/quiz/answer`;

const SESSION: ParticipantSessionResponse = {
  id: 's-1',
  title: 'Trivia',
  type: 'QUIZ',
  status: 'LIVE',
  config: {},
  participantCount: 1,
  startedAt: '2026-07-23T08:01:00Z',
  endedAt: null,
};

const NOT_STARTED: QuizState = {
  started: false,
  currentQuestionIndex: -1,
  totalQuestions: 2,
  questionText: null,
  options: [],
  durationSeconds: null,
  questionStartedAt: null,
  questionEnded: true,
  hasAnswered: false,
  myScore: 0,
  correctIndices: [],
  leaderboard: [],
};

const QUESTION_STARTED = {
  type: 'QUESTION_STARTED',
  sessionId: 's-1',
  questionIndex: 0,
  totalQuestions: 2,
  text: 'Capital of France?',
  options: ['Paris', 'Lyon', 'Nice'],
  durationSeconds: 30,
};

describe('SessionActivityQuizComponent', () => {
  let httpMock: HttpTestingController;
  let fixtures: ComponentFixture<SessionActivityQuizComponent>[] = [];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionActivityQuizComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Destroy every fixture so the component's `interval(1000)` countdown timer is torn down —
    // a leaked real timer would otherwise fire across the next spec file and break its TestBed.
    fixtures.forEach(f => f.destroy());
    fixtures = [];
    httpMock.verify();
  });

  function createFixture(state: QuizState = NOT_STARTED, participantId: string | null = 'p-me') {
    const fixture = TestBed.createComponent(SessionActivityQuizComponent);
    fixture.componentRef.setInput('session', SESSION);
    fixture.componentRef.setInput('participantId', participantId);
    fixture.detectChanges();
    httpMock.expectOne(STATE_URL).flush(state);
    fixtures.push(fixture);
    return fixture;
  }

  function startQuestion() {
    TestBed.inject(SessionWsService).messages$.next(JSON.stringify(QUESTION_STARTED));
  }

  it('hydrates the not-started state from the initial GET', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.started()).toBe(false);
    expect(fixture.componentInstance.totalQuestions()).toBe(2);
  });

  it('opens a live question from a QUESTION_STARTED message', () => {
    const fixture = createFixture();
    startQuestion();
    expect(fixture.componentInstance.started()).toBe(true);
    expect(fixture.componentInstance.questionText()).toBe('Capital of France?');
    expect(fixture.componentInstance.options()).toHaveLength(3);
    expect(fixture.componentInstance.ended()).toBe(false);
    expect(fixture.componentInstance.remaining()).toBeGreaterThan(0);
  });

  it('submit() no-ops until an option is selected', () => {
    const fixture = createFixture();
    startQuestion();
    expect(fixture.componentInstance.canSubmit()).toBe(false);
    fixture.componentInstance.submit();
    httpMock.expectNone(ANSWER_URL);
  });

  it('submit() posts the selected answer and flags answered', () => {
    const fixture = createFixture();
    startQuestion();
    fixture.componentInstance.toggleOption(0);
    expect(fixture.componentInstance.canSubmit()).toBe(true);
    fixture.componentInstance.submit();

    const req = httpMock.expectOne(ANSWER_URL);
    expect(req.request.body).toEqual({ questionIndex: 0, selectedIndices: [0] });
    req.flush(null);

    expect(fixture.componentInstance.answered()).toBe(true);
  });

  it('submit() surfaces submitError on failure (e.g. a late 409)', () => {
    const fixture = createFixture();
    startQuestion();
    fixture.componentInstance.toggleOption(0);
    fixture.componentInstance.submit();
    httpMock.expectOne(ANSWER_URL).flush(null, { status: 409, statusText: 'Conflict' });
    expect(fixture.componentInstance.submitError()).toBe(true);
  });

  it('updates the live answer count from a QUIZ_ANSWERED message', () => {
    const fixture = createFixture();
    startQuestion();
    TestBed.inject(SessionWsService).messages$.next(
      JSON.stringify({ type: 'QUIZ_ANSWERED', sessionId: 's-1', questionIndex: 0, answerCount: 4 }),
    );
    expect(fixture.componentInstance.answerCount()).toBe(4);
  });

  it('reveals the correct answer and leaderboard on QUESTION_ENDED', () => {
    const fixture = createFixture();
    startQuestion();
    TestBed.inject(SessionWsService).messages$.next(
      JSON.stringify({
        type: 'QUESTION_ENDED',
        sessionId: 's-1',
        questionIndex: 0,
        correctIndices: [0],
        leaderboard: [
          { participantId: 'p-me', displayName: 'Me', score: 150 },
          { participantId: 'p-2', displayName: 'Bob', score: 100 },
        ],
      }),
    );
    expect(fixture.componentInstance.ended()).toBe(true);
    expect(fixture.componentInstance.isCorrect(0)).toBe(true);
    expect(fixture.componentInstance.isCorrect(1)).toBe(false);
    expect(fixture.componentInstance.leaderboard()).toHaveLength(2);
    expect(fixture.componentInstance.myScore()).toBe(150);
  });

  it('isCorrect() is false while the question is still live', () => {
    const fixture = createFixture();
    startQuestion();
    expect(fixture.componentInstance.isCorrect(0)).toBe(false);
  });

  it('isOwnRow() highlights the caller-owned leaderboard row', () => {
    const fixture = createFixture(NOT_STARTED, 'p-me');
    expect(fixture.componentInstance.isOwnRow({ participantId: 'p-me', displayName: 'Me', score: 1 })).toBe(true);
    expect(fixture.componentInstance.isOwnRow({ participantId: 'p-x', displayName: 'X', score: 1 })).toBe(false);
  });

  it('closes the answer window (server-authoritative) when the display timer elapses', async () => {
    vi.useFakeTimers();
    try {
      const fixture = createFixture(NOT_STARTED);
      startQuestion(); // a 30s question
      fixture.componentInstance.toggleOption(0);
      expect(fixture.componentInstance.canSubmit()).toBe(true);
      expect(fixture.componentInstance.timeUp()).toBe(false);

      await vi.advanceTimersByTimeAsync(31_000);

      expect(fixture.componentInstance.remaining()).toBe(0);
      expect(fixture.componentInstance.canSubmit()).toBe(false); // late answer gated client-side
      expect(fixture.componentInstance.timeUp()).toBe(true); // the assertive "time up" a11y cue
      fixture.componentInstance.toggleOption(1); // no-op once the window closed
      expect(fixture.componentInstance.canSubmit()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('degrades to not-started when the reconnect state GET fails', () => {
    const fixture = TestBed.createComponent(SessionActivityQuizComponent);
    fixture.componentRef.setInput('session', SESSION);
    fixture.componentRef.setInput('participantId', 'p-me');
    fixture.detectChanges();
    httpMock.expectOne(STATE_URL).flush(null, { status: 500, statusText: 'Server Error' });
    fixtures.push(fixture);
    expect(fixture.componentInstance.started()).toBe(false);
  });

  it('unsubscribes from WS messages on destroy', () => {
    const fixture = createFixture();
    fixture.destroy();
    TestBed.inject(SessionWsService).messages$.next(JSON.stringify(QUESTION_STARTED));
    expect(fixture.componentInstance.started()).toBe(false);
  });
});
