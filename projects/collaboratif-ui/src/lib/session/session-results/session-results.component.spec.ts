import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { RxStompState } from '@stomp/rx-stomp';
import { Subject } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { SessionResponse, SessionStatus, SessionType } from '../models/session.model';
import { SESSION_STOMP_CLIENT_FACTORY, SessionWsService, StompClient } from '../services/session-ws.service';
import { SessionResultsComponent } from './session-results.component';

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';
const SESSION_URL = `${TEST_API_URL}/sessions/s-1`;

/** Same minimal fake as the shell/ws specs — no real WebSocket in tests. */
class FakeRxStomp implements StompClient {
  readonly connectionState$ = new Subject<RxStompState>();
  readonly stompErrors$ = new Subject<unknown>();
  activateCalls = 0;
  deactivateCalls = 0;
  watch() {
    return new Subject<{ body: string }>().asObservable();
  }
  configure(): void {
    /* no-op */
  }
  activate(): void {
    this.activateCalls++;
  }
  deactivate(): Promise<void> {
    this.deactivateCalls++;
    return Promise.resolve();
  }
}

function sessionResponse(type: SessionType, status: SessionStatus = 'LIVE'): SessionResponse {
  return {
    id: 's-1',
    title: 'Sprint retro',
    type,
    status,
    joinCode: 'ABCDEF',
    config: {},
    teamId: null,
    participantCount: 3,
    createdAt: '2026-07-23T08:00:00Z',
    startedAt: '2026-07-23T08:01:00Z',
    endedAt: null,
  };
}

describe('SessionResultsComponent', () => {
  let httpMock: HttpTestingController;
  let fake: FakeRxStomp;

  function configure(sessionId: string | null): void {
    fake = new FakeRxStomp();
    TestBed.configureTestingModule({
      imports: [SessionResultsComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
        { provide: SESSION_STOMP_CLIENT_FACTORY, useValue: () => fake },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(sessionId ? { sessionId } : {}) } },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => httpMock.verify());

  /** Mounts the component, flushes the session load, and returns the fixture. */
  function mount(session: SessionResponse) {
    configure('s-1');
    const fixture = TestBed.createComponent(SessionResultsComponent);
    fixture.detectChanges();
    httpMock.expectOne(SESSION_URL).flush(session);
    return fixture;
  }

  function ws(): SessionWsService {
    return TestBed.inject(SessionWsService);
  }

  it('flags loadError when the route has no sessionId', () => {
    configure(null);
    const fixture = TestBed.createComponent(SessionResultsComponent);
    fixture.detectChanges();
    httpMock.expectNone(SESSION_URL);
    expect(fixture.componentInstance.loadError()).toBe(true);
  });

  it('flags loadError when the session load fails', () => {
    configure('s-1');
    const fixture = TestBed.createComponent(SessionResultsComponent);
    fixture.detectChanges();
    httpMock.expectOne(SESSION_URL).flush(null, { status: 404, statusText: 'Not Found' });
    expect(fixture.componentInstance.loadError()).toBe(true);
  });

  it('POLL: hydrates tallies and refreshes them from POLL_UPDATED', () => {
    const fixture = mount(sessionResponse('POLL'));
    httpMock
      .expectOne(`${SESSION_URL}/poll/results`)
      .flush([{ optionId: 'a', label: 'A', count: 2, percent: 40 }]);
    expect(fixture.componentInstance.pollResults()).toHaveLength(1);

    ws().messages$.next(
      JSON.stringify({
        type: 'POLL_UPDATED',
        sessionId: 's-1',
        results: [
          { optionId: 'a', label: 'A', count: 3, percent: 60 },
          { optionId: 'b', label: 'B', count: 2, percent: 40 },
        ],
      }),
    );
    expect(fixture.componentInstance.pollResults()).toHaveLength(2);
    expect(fixture.componentInstance.pollTotal()).toBe(5);
  });

  it('WORDCLOUD: hydrates, upserts on WORD_ADDED, drops on WORD_REMOVED', () => {
    const fixture = mount(sessionResponse('WORDCLOUD'));
    httpMock.expectOne(`${SESSION_URL}/wordcloud/words`).flush([{ word: 'agile', frequency: 2 }]);

    ws().messages$.next(JSON.stringify({ type: 'WORD_ADDED', sessionId: 's-1', entry: { word: 'agile', frequency: 5 } }));
    expect(fixture.componentInstance.words()).toEqual([{ word: 'agile', frequency: 5 }]);

    ws().messages$.next(JSON.stringify({ type: 'WORD_ADDED', sessionId: 's-1', entry: { word: 'lean', frequency: 1 } }));
    expect(fixture.componentInstance.words()).toHaveLength(2);
    expect(fixture.componentInstance.wordSize(5)).toBeGreaterThan(fixture.componentInstance.wordSize(1));

    ws().messages$.next(JSON.stringify({ type: 'WORD_REMOVED', sessionId: 's-1', word: 'agile' }));
    expect(fixture.componentInstance.words()).toEqual([{ word: 'lean', frequency: 1 }]);
  });

  it('QA: hydrates sorted by upvotes and marks a question answered', () => {
    const fixture = mount(sessionResponse('QA'));
    httpMock.expectOne(`${SESSION_URL}/qa/questions`).flush([
      { id: 'q1', text: 'First', authorName: null, anonymous: true, answered: false, upvotes: 1, createdAt: '2026-07-23T08:00:00Z' },
      { id: 'q2', text: 'Second', authorName: 'Ana', anonymous: false, answered: false, upvotes: 5, createdAt: '2026-07-23T08:02:00Z' },
    ]);
    expect(fixture.componentInstance.sortedQuestions().map(q => q.id)).toEqual(['q2', 'q1']);

    ws().messages$.next(JSON.stringify({ type: 'QUESTION_ANSWERED', sessionId: 's-1', questionId: 'q2' }));
    expect(fixture.componentInstance.sortedQuestions()[0].answered).toBe(true);
  });

  it('BRAINSTORM: groups cards by category with uncategorized last', () => {
    const fixture = mount(sessionResponse('BRAINSTORM'));
    httpMock.expectOne(`${SESSION_URL}/brainstorm/cards`).flush([
      { id: 'c1', text: 'Idea 1', color: 'YELLOW', category: 'Risks', authorParticipantId: 'p1', createdAt: 't1' },
      { id: 'c2', text: 'Idea 2', color: 'BLUE', category: null, authorParticipantId: 'p2', createdAt: 't2' },
      { id: 'c3', text: 'Idea 3', color: 'GREEN', category: 'Actions', authorParticipantId: 'p3', createdAt: 't3' },
    ]);
    const groups = fixture.componentInstance.cardGroups();
    expect(groups.map(g => g.category)).toEqual(['Actions', 'Risks', null]);
  });

  it('VOTE: hydrates results and reveals them from VOTE_CLOSED', () => {
    const fixture = mount(sessionResponse('VOTE'));
    httpMock.expectOne(`${SESSION_URL}/vote/results`).flush({
      voteType: 'FIST_TO_FIVE', closed: false, ballotCount: 0, average: null,
      consensusLevel: null, veto: false, options: [], matrix: [],
    });

    ws().messages$.next(
      JSON.stringify({
        type: 'VOTE_CLOSED',
        sessionId: 's-1',
        results: {
          voteType: 'FIST_TO_FIVE', closed: true, ballotCount: 4, average: 4.2,
          consensusLevel: 'STRONG', veto: false, options: [], matrix: [],
        },
      }),
    );
    expect(fixture.componentInstance.voteResults()?.consensusLevel).toBe('STRONG');
  });

  it('QUIZ: hydrates the leaderboard and refreshes it on QUESTION_ENDED', () => {
    const fixture = mount(sessionResponse('QUIZ'));
    httpMock.expectOne(`${SESSION_URL}/quiz/results`).flush({
      leaderboard: [{ participantId: 'p1', displayName: 'Ana', score: 10 }],
      correctRatePerQuestion: [80],
    });
    expect(fixture.componentInstance.leaderboard()).toHaveLength(1);

    ws().messages$.next(
      JSON.stringify({
        type: 'QUESTION_ENDED',
        sessionId: 's-1',
        questionIndex: 1,
        correctIndices: [0],
        leaderboard: [
          { participantId: 'p2', displayName: 'Bo', score: 25 },
          { participantId: 'p1', displayName: 'Ana', score: 15 },
        ],
      }),
    );
    expect(fixture.componentInstance.leaderboard().map(e => e.displayName)).toEqual(['Bo', 'Ana']);
    expect(fixture.componentInstance.quizResults()?.correctRatePerQuestion).toEqual([80]);
  });

  it('QA: applies QUESTION_ADDED then re-sorts on QUESTION_UPVOTED', () => {
    const fixture = mount(sessionResponse('QA'));
    httpMock.expectOne(`${SESSION_URL}/qa/questions`).flush([
      { id: 'q1', text: 'First', authorName: null, anonymous: true, answered: false, upvotes: 1, createdAt: '2026-07-23T08:00:00Z' },
    ]);

    ws().messages$.next(
      JSON.stringify({
        type: 'QUESTION_ADDED',
        sessionId: 's-1',
        question: { id: 'q2', text: 'Second', authorName: 'Bo', anonymous: false, answered: false, upvotes: 0, createdAt: '2026-07-23T08:05:00Z' },
      }),
    );
    expect(fixture.componentInstance.sortedQuestions().map(q => q.id)).toEqual(['q1', 'q2']);

    ws().messages$.next(JSON.stringify({ type: 'QUESTION_UPVOTED', sessionId: 's-1', questionId: 'q2', upvotes: 9 }));
    expect(fixture.componentInstance.sortedQuestions().map(q => q.id)).toEqual(['q2', 'q1']);
  });

  it('BRAINSTORM: applies CARD_ADDED / CARD_UPDATED / CARD_REMOVED live', () => {
    const fixture = mount(sessionResponse('BRAINSTORM'));
    httpMock.expectOne(`${SESSION_URL}/brainstorm/cards`).flush([]);
    const base = { color: 'YELLOW', category: null, authorParticipantId: 'p1', createdAt: 't1' };

    ws().messages$.next(JSON.stringify({ type: 'CARD_ADDED', sessionId: 's-1', card: { id: 'c1', text: 'Idea', ...base } }));
    expect(fixture.componentInstance.cards().map(c => c.id)).toEqual(['c1']);

    ws().messages$.next(JSON.stringify({ type: 'CARD_UPDATED', sessionId: 's-1', card: { id: 'c1', text: 'Edited', ...base, category: 'Risks' } }));
    expect(fixture.componentInstance.cards()[0].text).toBe('Edited');
    expect(fixture.componentInstance.cardGroups()[0].category).toBe('Risks');

    ws().messages$.next(JSON.stringify({ type: 'CARD_REMOVED', sessionId: 's-1', cardId: 'c1' }));
    expect(fixture.componentInstance.cards()).toEqual([]);
  });

  it('degrades to an empty/null snapshot when a per-type hydrate GET fails', () => {
    const fixture = mount(sessionResponse('VOTE'));
    httpMock.expectOne(`${SESSION_URL}/vote/results`).flush(null, { status: 500, statusText: 'Server Error' });
    expect(fixture.componentInstance.voteResults()).toBeNull();
  });

  it('toggles projection mode', () => {
    const fixture = mount(sessionResponse('POLL'));
    httpMock.expectOne(`${SESSION_URL}/poll/results`).flush([]);
    expect(fixture.componentInstance.projection()).toBe(false);
    fixture.componentInstance.toggleProjection();
    expect(fixture.componentInstance.projection()).toBe(true);
  });

  it('does not open a WS connection for a COMPLETED session', () => {
    const fixture = mount(sessionResponse('POLL', 'COMPLETED'));
    httpMock.expectOne(`${SESSION_URL}/poll/results`).flush([{ optionId: 'a', label: 'A', count: 1, percent: 100 }]);
    expect(fake.activateCalls).toBe(0);
    expect(fixture.componentInstance.pollResults()).toHaveLength(1);
  });

  it('export: requests the chosen format as a blob for a COMPLETED session', () => {
    const fixture = mount(sessionResponse('POLL', 'COMPLETED'));
    httpMock.expectOne(`${SESSION_URL}/poll/results`).flush([]);

    fixture.componentInstance.downloadResults('json');
    const req = httpMock.expectOne(
      r => r.url === `${SESSION_URL}/results` && r.params.get('format') === 'json',
    );
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['{}'], { type: 'application/json' }));

    expect(fixture.componentInstance.exporting()).toBe(false);
    expect(fixture.componentInstance.exportError()).toBe(false);
  });

  it('export: surfaces exportError when the export fails (e.g. 409)', () => {
    const fixture = mount(sessionResponse('POLL', 'COMPLETED'));
    httpMock.expectOne(`${SESSION_URL}/poll/results`).flush([]);

    fixture.componentInstance.downloadResults('csv');
    httpMock
      .expectOne(r => r.url === `${SESSION_URL}/results` && r.params.get('format') === 'csv')
      .flush(null, { status: 409, statusText: 'Conflict' });

    expect(fixture.componentInstance.exportError()).toBe(true);
    expect(fixture.componentInstance.exporting()).toBe(false);
  });

  it('re-hydrates the snapshot on WS reconnect (error → connected)', () => {
    const fixture = mount(sessionResponse('POLL'));
    httpMock.expectOne(`${SESSION_URL}/poll/results`).flush([{ optionId: 'a', label: 'A', count: 1, percent: 100 }]);

    // Each transition flushed separately (effects observe the settled value, so a synchronous
    // error→connected would coalesce and skip 'error') — mirrors the real async status stream.
    const wsService = ws();
    wsService.status.set('error');
    fixture.detectChanges();
    wsService.status.set('connected');
    fixture.detectChanges();

    // A fresh snapshot fetch is issued so tallies broadcast during the outage aren't lost.
    httpMock.expectOne(`${SESSION_URL}/poll/results`).flush([]);
    expect(fixture.componentInstance.pollResults()).toEqual([]);
  });

  it('re-hydrates the final snapshot when the session ends (SESSION_ENDED)', () => {
    const fixture = mount(sessionResponse('QUIZ'));
    httpMock.expectOne(`${SESSION_URL}/quiz/results`).flush({ leaderboard: [], correctRatePerQuestion: [] });

    ws().messages$.next(JSON.stringify({ type: 'SESSION_ENDED', sessionId: 's-1' }));
    expect(fixture.componentInstance.status()).toBe('COMPLETED');

    // The end transition re-fetches final results the live events don't carry (per-question rates).
    httpMock.expectOne(`${SESSION_URL}/quiz/results`).flush({
      leaderboard: [{ participantId: 'p1', displayName: 'Ana', score: 10 }],
      correctRatePerQuestion: [80],
    });
    expect(fixture.componentInstance.quizResults()?.correctRatePerQuestion).toEqual([80]);
  });

  it('disconnects and ignores late messages on destroy', () => {
    const fixture = mount(sessionResponse('POLL'));
    httpMock.expectOne(`${SESSION_URL}/poll/results`).flush([]);
    expect(fake.activateCalls).toBe(1);

    fixture.destroy();
    ws().messages$.next(
      JSON.stringify({ type: 'POLL_UPDATED', sessionId: 's-1', results: [{ optionId: 'a', label: 'A', count: 9, percent: 100 }] }),
    );
    expect(fixture.componentInstance.pollResults()).toHaveLength(0);
    expect(fake.deactivateCalls).toBeGreaterThan(0);
  });
});
