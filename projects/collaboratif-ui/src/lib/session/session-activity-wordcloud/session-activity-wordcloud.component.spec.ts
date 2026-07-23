import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { SessionResponse, WordcloudConfig } from '../models/session.model';
import { SessionWsService } from '../services/session-ws.service';
import { SessionActivityWordcloudComponent } from './session-activity-wordcloud.component';

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';

const WORDCLOUD_CONFIG: WordcloudConfig = { maxWordsPerParticipant: 3, blocklist: [] };

const SESSION: SessionResponse = {
  id: 's-1',
  title: 'Rétro mots-clés',
  type: 'WORDCLOUD',
  status: 'LIVE',
  joinCode: 'ABCDEF',
  config: WORDCLOUD_CONFIG,
  teamId: null,
  participantCount: 1,
  createdBy: 1,
  createdAt: '2026-07-22T08:00:00Z',
  startedAt: '2026-07-22T08:01:00Z',
  endedAt: null,
};

describe('SessionActivityWordcloudComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionActivityWordcloudComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function createFixture() {
    const fixture = TestBed.createComponent(SessionActivityWordcloudComponent);
    fixture.componentRef.setInput('session', SESSION);
    fixture.detectChanges();
    return fixture;
  }

  it('submit() no-ops on an empty or over-length word', () => {
    const fixture = createFixture();
    fixture.componentInstance.word.set('   ');
    fixture.componentInstance.submit();
    fixture.componentInstance.word.set('a'.repeat(31));
    fixture.componentInstance.submit();
    httpMock.expectNone(`${TEST_API_URL}/sessions/s-1/wordcloud/words`);
  });

  it('submit() posts the trimmed word and clears the input on success', () => {
    const fixture = createFixture();
    fixture.componentInstance.word.set('  agile  ');
    fixture.componentInstance.submit();
    expect(fixture.componentInstance.submitting()).toBe(true);

    const req = httpMock.expectOne(`${TEST_API_URL}/sessions/s-1/wordcloud/words`);
    expect(req.request.body).toEqual({ word: 'agile' });
    req.flush({ word: 'agile', frequency: 1 });

    expect(fixture.componentInstance.submitting()).toBe(false);
    expect(fixture.componentInstance.word()).toBe('');
  });

  it.each([
    [400, { code: 'WORD_BLOCKED' }, 'session.wordcloud.errors.blocked'],
    [400, { code: 'OTHER' }, 'session.wordcloud.errors.invalid'],
    [409, { code: 'WORD_LIMIT_REACHED' }, 'session.wordcloud.errors.limitReached'],
    [409, { code: 'OTHER' }, 'session.wordcloud.errors.invalidStatus'],
    [500, undefined, 'session.wordcloud.errors.generic'],
  ] as const)('maps a %s error (%o) to %s', (status, body, expectedKey) => {
    const fixture = createFixture();
    fixture.componentInstance.word.set('agile');
    fixture.componentInstance.submit();
    httpMock.expectOne(`${TEST_API_URL}/sessions/s-1/wordcloud/words`).flush(body ?? null, { status, statusText: 'Error' });
    expect(fixture.componentInstance.errorMessageKey()).toBe(expectedKey);
    expect(fixture.componentInstance.submitting()).toBe(false);
  });

  it('adds a new word from a WORD_ADDED event and updates frequency for an existing one', () => {
    const fixture = createFixture();
    const ws = TestBed.inject(SessionWsService);

    ws.messages$.next('not json');
    ws.messages$.next(JSON.stringify({ type: 'WORD_ADDED', word: 'agile', frequency: 1 }));
    expect(fixture.componentInstance.words()).toEqual([{ word: 'agile', frequency: 1 }]);

    ws.messages$.next(JSON.stringify({ type: 'WORD_ADDED', word: 'agile', frequency: 2 }));
    expect(fixture.componentInstance.words()).toEqual([{ word: 'agile', frequency: 2 }]);

    ws.messages$.next(JSON.stringify({ type: 'WORD_ADDED', word: 'scrum', frequency: 1 }));
    expect(fixture.componentInstance.words()).toEqual([
      { word: 'agile', frequency: 2 },
      { word: 'scrum', frequency: 1 },
    ]);
  });

  it('removes a word on a WORD_REMOVED event', () => {
    const fixture = createFixture();
    const ws = TestBed.inject(SessionWsService);
    ws.messages$.next(JSON.stringify({ type: 'WORD_ADDED', word: 'agile', frequency: 1 }));
    ws.messages$.next(JSON.stringify({ type: 'WORD_REMOVED', word: 'agile' }));
    expect(fixture.componentInstance.words()).toEqual([]);
  });

  it('fontSizeFor() interpolates linearly between MIN and MAX rem by frequency share of the max', () => {
    const fixture = createFixture();
    const ws = TestBed.inject(SessionWsService);
    ws.messages$.next(JSON.stringify({ type: 'WORD_ADDED', word: 'agile', frequency: 4 }));
    ws.messages$.next(JSON.stringify({ type: 'WORD_ADDED', word: 'scrum', frequency: 2 }));

    expect(fixture.componentInstance.fontSizeFor({ word: 'agile', frequency: 4 })).toBe('3rem');
    expect(fixture.componentInstance.fontSizeFor({ word: 'scrum', frequency: 2 })).toBe('2rem');
  });

  it('unsubscribes from WS messages on destroy', () => {
    const fixture = createFixture();
    const ws = TestBed.inject(SessionWsService);
    fixture.destroy();
    ws.messages$.next(JSON.stringify({ type: 'WORD_ADDED', word: 'agile', frequency: 1 }));
    expect(fixture.componentInstance.words()).toEqual([]);
  });
});
