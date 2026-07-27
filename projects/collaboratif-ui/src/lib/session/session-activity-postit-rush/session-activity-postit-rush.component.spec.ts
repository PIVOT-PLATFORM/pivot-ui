import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { ParticipantSessionResponse, PostitRushState } from '../models/session.model';
import { SessionWsService } from '../services/session-ws.service';
import { SessionActivityPostitRushComponent } from './session-activity-postit-rush.component';

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';
const STATE_URL = `${TEST_API_URL}/sessions/s-1/postit-rush/state`;
const CLICK_URL = `${TEST_API_URL}/sessions/s-1/postit-rush/click`;
const RESULTS_URL = `${TEST_API_URL}/sessions/s-1/postit-rush/results`;

const SESSION: ParticipantSessionResponse = {
  id: 's-1',
  title: 'Rush',
  type: 'POSTIT_RUSH',
  status: 'LIVE',
  config: {},
  participantCount: 1,
  startedAt: '2026-07-27T08:01:00Z',
  endedAt: null,
};

const NOT_ACTIVE: PostitRushState = {
  roundActive: false,
  roundId: null,
  remainingSeconds: null,
  livePostits: [],
  myScore: 0,
  myCurrentCombo: 0,
  myBestCombo: 0,
  myHits: 0,
};

const ACTIVE: PostitRushState = {
  roundActive: true,
  roundId: 'r-1',
  remainingSeconds: 42,
  livePostits: [{ postitId: 'p-1', x: 10, y: 20, colorKey: 'amber', remainingMs: 1800 }],
  myScore: 10,
  myCurrentCombo: 1,
  myBestCombo: 1,
  myHits: 1,
};

const ROUND_STARTED = { type: 'ROUND_STARTED', roundId: 'r-2', durationSeconds: 90, startedAt: '2026-07-27T09:00:00Z' };

describe('SessionActivityPostitRushComponent', () => {
  let httpMock: HttpTestingController;
  let fixtures: ComponentFixture<SessionActivityPostitRushComponent>[] = [];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SessionActivityPostitRushComponent,
        TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    fixtures.forEach(f => f.destroy());
    fixtures = [];
    httpMock.verify();
  });

  function createFixture(state: PostitRushState = NOT_ACTIVE, participantId: string | null = 'p-me') {
    const fixture = TestBed.createComponent(SessionActivityPostitRushComponent);
    fixture.componentRef.setInput('session', SESSION);
    fixture.componentRef.setInput('participantId', participantId);
    fixture.detectChanges();
    httpMock.expectOne(STATE_URL).flush(state);
    fixtures.push(fixture);
    return fixture;
  }

  it('hydrates the inactive state from the initial GET', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.roundActive()).toBe(false);
  });

  it('hydrates an active round with live post-its and own score', () => {
    const fixture = createFixture(ACTIVE);
    expect(fixture.componentInstance.roundActive()).toBe(true);
    expect(fixture.componentInstance.livePostits()).toHaveLength(1);
    expect(fixture.componentInstance.myScore()).toBe(10);
    expect(fixture.componentInstance.remainingSeconds()).toBe(42);
  });

  it('opens a round from a ROUND_STARTED message and resets round-scoped state', () => {
    const fixture = createFixture();
    TestBed.inject(SessionWsService).messages$.next(JSON.stringify(ROUND_STARTED));
    expect(fixture.componentInstance.roundActive()).toBe(true);
    expect(fixture.componentInstance.remainingSeconds()).toBe(90);
    expect(fixture.componentInstance.myScore()).toBe(0);
    expect(fixture.componentInstance.livePostits()).toEqual([]);
  });

  it('adds a post-it on POSTIT_SPAWNED', () => {
    const fixture = createFixture(ACTIVE);
    TestBed.inject(SessionWsService).messages$.next(
      JSON.stringify({ type: 'POSTIT_SPAWNED', postitId: 'p-2', x: 5, y: 5, colorKey: 'sky', spawnedAt: '', lifespanMs: 2000 }),
    );
    expect(fixture.componentInstance.livePostits()).toHaveLength(2);
  });

  it('removes a post-it on POSTIT_EXPIRED', () => {
    const fixture = createFixture(ACTIVE);
    TestBed.inject(SessionWsService).messages$.next(JSON.stringify({ type: 'POSTIT_EXPIRED', postitId: 'p-1' }));
    expect(fixture.componentInstance.livePostits()).toHaveLength(0);
  });

  it('removes a post-it for everyone on POSTIT_CLAIMED, regardless of claimant', () => {
    const fixture = createFixture(ACTIVE);
    TestBed.inject(SessionWsService).messages$.next(
      JSON.stringify({ type: 'POSTIT_CLAIMED', postitId: 'p-1', participantId: 'someone-else' }),
    );
    expect(fixture.componentInstance.livePostits()).toHaveLength(0);
  });

  it('updates the leaderboard and own score on LEADERBOARD_UPDATED', () => {
    const fixture = createFixture(ACTIVE);
    TestBed.inject(SessionWsService).messages$.next(
      JSON.stringify({
        type: 'LEADERBOARD_UPDATED',
        entries: [
          { participantId: 'p-me', displayName: 'Me', score: 30, rank: 1 },
          { participantId: 'p-2', displayName: 'Bob', score: 20, rank: 2 },
        ],
      }),
    );
    expect(fixture.componentInstance.leaderboard()).toHaveLength(2);
    expect(fixture.componentInstance.myScore()).toBe(30);
    expect(fixture.componentInstance.isOwnRow({ participantId: 'p-me' })).toBe(true);
    expect(fixture.componentInstance.isOwnRow({ participantId: 'p-2' })).toBe(false);
  });

  it('ends the round on ROUND_ENDED and fetches the final results', () => {
    const fixture = createFixture(ACTIVE);
    TestBed.inject(SessionWsService).messages$.next(JSON.stringify({ type: 'ROUND_ENDED', roundId: 'r-1' }));
    expect(fixture.componentInstance.roundActive()).toBe(false);
    expect(fixture.componentInstance.assertiveMessageKey()).toBe('session.postitRush.announcements.timeUp');

    const req = httpMock.expectOne(RESULTS_URL);
    req.flush({
      standings: [{ rank: 1, participantId: 'p-me', displayName: 'Me', score: 30, hits: 3, bestCombo: 2 }],
    });
    expect(fixture.componentInstance.finalStandings()).toHaveLength(1);
  });

  it('click() posts only the postitId and updates own score/combo/multiplier on success', () => {
    const fixture = createFixture(ACTIVE);
    fixture.componentInstance.click('p-1');

    // Optimistic removal happens immediately, before the response arrives.
    expect(fixture.componentInstance.livePostits()).toHaveLength(0);

    const req = httpMock.expectOne(CLICK_URL);
    expect(req.request.body).toEqual({ postitId: 'p-1' });
    req.flush({ pointsAwarded: 20, multiplier: 2, score: 30, currentCombo: 3, hits: 2 });

    expect(fixture.componentInstance.myScore()).toBe(30);
    expect(fixture.componentInstance.myCurrentCombo()).toBe(3);
    expect(fixture.componentInstance.myMultiplier()).toBe(2);
    expect(fixture.componentInstance.feedbackKey()).toBe('session.postitRush.feedback.hit');
  });

  it('click() on an unavailable post-it resets the combo and shows the POSTIT_UNAVAILABLE error', () => {
    const fixture = createFixture(ACTIVE);
    fixture.componentInstance.click('p-1');
    httpMock.expectOne(CLICK_URL).flush({ code: 'POSTIT_UNAVAILABLE' }, { status: 409, statusText: 'Conflict' });

    expect(fixture.componentInstance.myCurrentCombo()).toBe(0);
    expect(fixture.componentInstance.feedbackKey()).toBe('session.postitRush.feedback.miss');
    expect(fixture.componentInstance.errorMessageKey()).toBe('session.postitRush.errors.unavailable');
  });

  it('click() maps a 429 rate-limit response to a dedicated error key', () => {
    const fixture = createFixture(ACTIVE);
    fixture.componentInstance.click('p-1');
    httpMock.expectOne(CLICK_URL).flush(null, { status: 429, statusText: 'Too Many Requests' });

    expect(fixture.componentInstance.errorMessageKey()).toBe('session.postitRush.errors.rateLimited');
  });

  it('click() no-ops while no round is active', () => {
    const fixture = createFixture(NOT_ACTIVE);
    fixture.componentInstance.click('p-1');
    httpMock.expectNone(CLICK_URL);
  });

  it('the per-second countdown ticks down purely client-side (visual only)', async () => {
    vi.useFakeTimers();
    try {
      const fixture = createFixture(ACTIVE);
      expect(fixture.componentInstance.remainingSeconds()).toBe(42);
      await vi.advanceTimersByTimeAsync(3000);
      expect(fixture.componentInstance.remainingSeconds()).toBe(39);
    } finally {
      vi.useRealTimers();
    }
  });

  it('announces "time up" exactly once when the visual countdown reaches zero', async () => {
    vi.useFakeTimers();
    try {
      const fixture = createFixture({ ...ACTIVE, remainingSeconds: 2 });
      expect(fixture.componentInstance.assertiveMessageKey()).toBeNull();
      await vi.advanceTimersByTimeAsync(2500);
      expect(fixture.componentInstance.remainingSeconds()).toBe(0);
      expect(fixture.componentInstance.assertiveMessageKey()).toBe('session.postitRush.announcements.timeUp');
    } finally {
      vi.useRealTimers();
    }
  });

  it('unsubscribes from WS messages on destroy', () => {
    const fixture = createFixture();
    fixture.destroy();
    TestBed.inject(SessionWsService).messages$.next(JSON.stringify(ROUND_STARTED));
    expect(fixture.componentInstance.roundActive()).toBe(false);
  });

  it('degrades to inactive when the reconnect state GET fails', () => {
    const fixture = TestBed.createComponent(SessionActivityPostitRushComponent);
    fixture.componentRef.setInput('session', SESSION);
    fixture.componentRef.setInput('participantId', 'p-me');
    fixture.detectChanges();
    httpMock.expectOne(STATE_URL).flush(null, { status: 500, statusText: 'Server Error' });
    fixtures.push(fixture);
    expect(fixture.componentInstance.roundActive()).toBe(false);
  });
});
