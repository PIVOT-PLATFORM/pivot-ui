import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { ParticipantSessionResponse, QaQuestion } from '../models/session.model';
import { SessionWsService } from '../services/session-ws.service';
import { SessionActivityQaComponent } from './session-activity-qa.component';

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';
const QUESTIONS_URL = `${TEST_API_URL}/sessions/s-1/qa/questions`;

const SESSION: ParticipantSessionResponse = {
  id: 's-1',
  title: 'Ask me anything',
  type: 'QA',
  status: 'LIVE',
  config: {},
  participantCount: 1,
  startedAt: '2026-07-23T08:01:00Z',
  endedAt: null,
};

function question(overrides: Partial<QaQuestion> = {}): QaQuestion {
  return {
    id: 'q-1',
    text: 'What is our goal?',
    authorName: 'Ada',
    anonymous: false,
    answered: false,
    upvotes: 0,
    createdAt: '2026-07-23T08:02:00Z',
    ...overrides,
  };
}

describe('SessionActivityQaComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionActivityQaComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function createFixture(initial: QaQuestion[] = [], flushInit = true) {
    const fixture = TestBed.createComponent(SessionActivityQaComponent);
    fixture.componentRef.setInput('session', SESSION);
    fixture.detectChanges();
    if (flushInit) {
      httpMock.expectOne(QUESTIONS_URL).flush(initial);
    }
    return fixture;
  }

  it('hydrates the list from the initial GET, sorted by upvotes then oldest first', () => {
    const fixture = createFixture([
      question({ id: 'q-1', upvotes: 1, createdAt: '2026-07-23T08:00:00Z' }),
      question({ id: 'q-2', upvotes: 3, createdAt: '2026-07-23T08:05:00Z' }),
      question({ id: 'q-3', upvotes: 3, createdAt: '2026-07-23T08:02:00Z' }),
    ]);
    expect(fixture.componentInstance.sortedQuestions().map(q => q.id)).toEqual(['q-3', 'q-2', 'q-1']);
  });

  it('degrades to an empty list when the initial GET fails', () => {
    const fixture = TestBed.createComponent(SessionActivityQaComponent);
    fixture.componentRef.setInput('session', SESSION);
    fixture.detectChanges();
    httpMock.expectOne(QUESTIONS_URL).flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(fixture.componentInstance.sortedQuestions()).toEqual([]);
  });

  it('submit() no-ops on an empty draft', () => {
    const fixture = createFixture();
    fixture.componentInstance.submit();
    httpMock.expectNone(QUESTIONS_URL);
  });

  it('submit() posts the question and clears the draft on success', () => {
    const fixture = createFixture();
    fixture.componentInstance.draft.set('  Why? ');
    fixture.componentInstance.anonymous.set(true);
    fixture.componentInstance.submit();
    expect(fixture.componentInstance.submitting()).toBe(true);

    const req = httpMock.expectOne(QUESTIONS_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ text: 'Why?', anonymous: true });
    req.flush(null);

    expect(fixture.componentInstance.submitting()).toBe(false);
    expect(fixture.componentInstance.draft()).toBe('');
    expect(fixture.componentInstance.anonymous()).toBe(false);
  });

  it('submit() surfaces submitError on failure', () => {
    const fixture = createFixture();
    fixture.componentInstance.draft.set('Why?');
    fixture.componentInstance.submit();
    httpMock.expectOne(QUESTIONS_URL).flush(null, { status: 500, statusText: 'Server Error' });
    expect(fixture.componentInstance.submitError()).toBe(true);
  });

  it('upvote() posts, locks the button, and keeps it locked on a 409', () => {
    const fixture = createFixture([question({ id: 'q-1' })]);
    fixture.componentInstance.upvote('q-1');
    expect(fixture.componentInstance.hasUpvoted('q-1')).toBe(true);

    httpMock
      .expectOne(`${QUESTIONS_URL}/q-1/upvote`)
      .flush(null, { status: 409, statusText: 'Conflict' });

    expect(fixture.componentInstance.hasUpvoted('q-1')).toBe(true);
  });

  it('upvote() unlocks the button on a non-409 error to allow a retry', () => {
    const fixture = createFixture([question({ id: 'q-1' })]);
    fixture.componentInstance.upvote('q-1');
    httpMock
      .expectOne(`${QUESTIONS_URL}/q-1/upvote`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(fixture.componentInstance.hasUpvoted('q-1')).toBe(false);
  });

  it('upvote() no-ops when already upvoted', () => {
    const fixture = createFixture([question({ id: 'q-1' })]);
    fixture.componentInstance.upvote('q-1');
    httpMock.expectOne(`${QUESTIONS_URL}/q-1/upvote`).flush(null);
    fixture.componentInstance.upvote('q-1');
    httpMock.expectNone(`${QUESTIONS_URL}/q-1/upvote`);
  });

  it('adds a question from a QUESTION_ADDED WS message, ignoring duplicates and malformed payloads', () => {
    const fixture = createFixture();
    const ws = TestBed.inject(SessionWsService);

    ws.messages$.next('not json');
    expect(fixture.componentInstance.sortedQuestions()).toEqual([]);

    const added = question({ id: 'q-9', text: 'New one', upvotes: 0 });
    ws.messages$.next(JSON.stringify({ type: 'QUESTION_ADDED', sessionId: 's-1', question: added }));
    expect(fixture.componentInstance.sortedQuestions().map(q => q.id)).toEqual(['q-9']);

    // Duplicate id is ignored.
    ws.messages$.next(JSON.stringify({ type: 'QUESTION_ADDED', sessionId: 's-1', question: added }));
    expect(fixture.componentInstance.sortedQuestions()).toHaveLength(1);
  });

  it('updates a tally and re-sorts from a QUESTION_UPVOTED WS message', () => {
    const fixture = createFixture([
      question({ id: 'q-1', upvotes: 1, createdAt: '2026-07-23T08:00:00Z' }),
      question({ id: 'q-2', upvotes: 0, createdAt: '2026-07-23T08:01:00Z' }),
    ]);
    const ws = TestBed.inject(SessionWsService);

    ws.messages$.next(JSON.stringify({ type: 'QUESTION_UPVOTED', sessionId: 's-1', questionId: 'q-2', upvotes: 5 }));

    const sorted = fixture.componentInstance.sortedQuestions();
    expect(sorted.map(q => q.id)).toEqual(['q-2', 'q-1']);
    expect(sorted[0].upvotes).toBe(5);
  });

  it('marks a question answered from a QUESTION_ANSWERED WS message', () => {
    const fixture = createFixture([question({ id: 'q-1', answered: false })]);
    const ws = TestBed.inject(SessionWsService);

    ws.messages$.next(JSON.stringify({ type: 'QUESTION_ANSWERED', sessionId: 's-1', questionId: 'q-1' }));

    expect(fixture.componentInstance.sortedQuestions()[0].answered).toBe(true);
  });

  it('unsubscribes from WS messages on destroy', () => {
    const fixture = createFixture();
    const ws = TestBed.inject(SessionWsService);
    fixture.destroy();
    ws.messages$.next(
      JSON.stringify({ type: 'QUESTION_ADDED', sessionId: 's-1', question: question({ id: 'q-x' }) }),
    );
    expect(fixture.componentInstance.sortedQuestions()).toEqual([]);
  });
});
