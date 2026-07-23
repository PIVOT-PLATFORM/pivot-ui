import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { ParticipantSessionResponse, VoteResults } from '../models/session.model';
import { SessionWsService } from '../services/session-ws.service';
import { SessionActivityVoteComponent } from './session-activity-vote.component';

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';
const RESULTS_URL = `${TEST_API_URL}/sessions/s-1/vote/results`;
const BALLOT_URL = `${TEST_API_URL}/sessions/s-1/vote/ballot`;

const FIST_SESSION: ParticipantSessionResponse = {
  id: 's-1',
  title: 'Decision',
  type: 'VOTE',
  status: 'LIVE',
  config: { proposal: 'Ship it?' },
  participantCount: 1,
  startedAt: '2026-07-23T08:01:00Z',
  endedAt: null,
};

const WEIGHTED_SESSION: ParticipantSessionResponse = {
  ...FIST_SESSION,
  config: { voteType: 'WEIGHTED', options: ['A', 'B'], pointsPerParticipant: 5 },
};

const MATRIX_SESSION: ParticipantSessionResponse = {
  ...FIST_SESSION,
  config: {
    voteType: 'MATRIX',
    options: ['A', 'B'],
    criteria: [
      { label: 'Cost', weight: 3 },
      { label: 'Security', weight: 5 },
    ],
    maxScore: 5,
  },
};

const OPEN_RESULTS: VoteResults = {
  voteType: 'FIST_TO_FIVE',
  closed: false,
  ballotCount: 0,
  average: null,
  consensusLevel: null,
  veto: false,
  options: [],
  matrix: [],
};

describe('SessionActivityVoteComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionActivityVoteComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function createFixture(session: ParticipantSessionResponse, results: VoteResults = OPEN_RESULTS) {
    const fixture = TestBed.createComponent(SessionActivityVoteComponent);
    fixture.componentRef.setInput('session', session);
    fixture.detectChanges();
    httpMock.expectOne(RESULTS_URL).flush(results);
    return fixture;
  }

  it('hydrates open results without revealing tallies', () => {
    const fixture = createFixture(FIST_SESSION, { ...OPEN_RESULTS, ballotCount: 2 });
    expect(fixture.componentInstance.results()?.closed).toBe(false);
    expect(fixture.componentInstance.ballotCount()).toBe(2);
  });

  it('fist: submit() no-ops until a rating is chosen', () => {
    const fixture = createFixture(FIST_SESSION);
    expect(fixture.componentInstance.canSubmit()).toBe(false);
    fixture.componentInstance.submit();
    httpMock.expectNone(BALLOT_URL);
  });

  it('fist: submit() posts the chosen rating and flags hasVoted', () => {
    const fixture = createFixture(FIST_SESSION);
    fixture.componentInstance.selectRating(4);
    fixture.componentInstance.submit();

    const req = httpMock.expectOne(BALLOT_URL);
    expect(req.request.body).toEqual({ value: 4 });
    req.flush(null);

    expect(fixture.componentInstance.hasVoted()).toBe(true);
  });

  it('fist: submit() surfaces submitError on failure', () => {
    const fixture = createFixture(FIST_SESSION);
    fixture.componentInstance.selectRating(3);
    fixture.componentInstance.submit();
    httpMock.expectOne(BALLOT_URL).flush(null, { status: 409, statusText: 'Conflict' });
    expect(fixture.componentInstance.submitError()).toBe(true);
  });

  it('weighted: can only submit once points are fully allocated', () => {
    const fixture = createFixture(WEIGHTED_SESSION);
    expect(fixture.componentInstance.remaining()).toBe(5);
    expect(fixture.componentInstance.canSubmit()).toBe(false);

    fixture.componentInstance.setAllocation(0, '3');
    fixture.componentInstance.setAllocation(1, '2');
    expect(fixture.componentInstance.remaining()).toBe(0);
    expect(fixture.componentInstance.canSubmit()).toBe(true);

    fixture.componentInstance.submit();
    const req = httpMock.expectOne(BALLOT_URL);
    expect(req.request.body).toEqual({ allocations: { '0': 3, '1': 2 } });
    req.flush(null);
    expect(fixture.componentInstance.hasVoted()).toBe(true);
  });

  it('updates the live count from a VOTE_SUBMITTED message', () => {
    const fixture = createFixture(FIST_SESSION);
    const ws = TestBed.inject(SessionWsService);
    ws.messages$.next(JSON.stringify({ type: 'VOTE_SUBMITTED', sessionId: 's-1', ballotCount: 7 }));
    expect(fixture.componentInstance.ballotCount()).toBe(7);
  });

  it('reveals results from a VOTE_CLOSED message', () => {
    const fixture = createFixture(FIST_SESSION);
    const ws = TestBed.inject(SessionWsService);
    const closed: VoteResults = {
      voteType: 'FIST_TO_FIVE',
      closed: true,
      ballotCount: 3,
      average: 3,
      consensusLevel: 'MODERATE',
      veto: true,
      options: [],
      matrix: [],
    };
    ws.messages$.next(JSON.stringify({ type: 'VOTE_CLOSED', sessionId: 's-1', results: closed }));
    expect(fixture.componentInstance.results()?.closed).toBe(true);
    expect(fixture.componentInstance.results()?.veto).toBe(true);
  });

  it('matrix: initializes a zero grid and posts the scored matrix', () => {
    const fixture = createFixture(MATRIX_SESSION);
    // 2 options × 2 criteria, all zero to start — a zero grid is a valid ballot.
    expect(fixture.componentInstance.matrixScoreAt(0, 0)).toBe(0);
    expect(fixture.componentInstance.canSubmit()).toBe(true);

    fixture.componentInstance.setMatrixScore(0, 0, '4');
    fixture.componentInstance.setMatrixScore(0, 1, '2');
    fixture.componentInstance.setMatrixScore(1, 0, '2');
    fixture.componentInstance.setMatrixScore(1, 1, '5');
    expect(fixture.componentInstance.matrixScoreAt(1, 1)).toBe(5);

    fixture.componentInstance.submit();
    const req = httpMock.expectOne(BALLOT_URL);
    expect(req.request.body).toEqual({ scores: [[4, 2], [2, 5]] });
    req.flush(null);
    expect(fixture.componentInstance.hasVoted()).toBe(true);
  });

  it('matrix: clamps a cell to the configured maxScore', () => {
    const fixture = createFixture(MATRIX_SESSION);
    fixture.componentInstance.setMatrixScore(0, 0, '9');
    expect(fixture.componentInstance.matrixScoreAt(0, 0)).toBe(5);
  });

  it('matrix: renders the revealed ranking from results', () => {
    const fixture = createFixture(MATRIX_SESSION, {
      ...OPEN_RESULTS,
      voteType: 'MATRIX',
      closed: true,
      ballotCount: 2,
      matrix: [
        { optionIndex: 1, label: 'B', score: 31 },
        { optionIndex: 0, label: 'A', score: 27 },
      ],
    });
    expect(fixture.componentInstance.results()?.matrix.map(m => m.label)).toEqual(['B', 'A']);
  });

  it('unsubscribes from WS messages on destroy', () => {
    const fixture = createFixture(FIST_SESSION);
    const ws = TestBed.inject(SessionWsService);
    fixture.destroy();
    ws.messages$.next(JSON.stringify({ type: 'VOTE_SUBMITTED', sessionId: 's-1', ballotCount: 99 }));
    expect(fixture.componentInstance.ballotCount()).toBe(0);
  });
});
