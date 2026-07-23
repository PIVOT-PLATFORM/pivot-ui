import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { BrainstormCard, ParticipantSessionResponse } from '../models/session.model';
import { SessionWsService } from '../services/session-ws.service';
import { SessionActivityBrainstormComponent } from './session-activity-brainstorm.component';

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';
const CARDS_URL = `${TEST_API_URL}/sessions/s-1/brainstorm/cards`;

const SESSION: ParticipantSessionResponse = {
  id: 's-1',
  title: 'Ideation',
  type: 'BRAINSTORM',
  status: 'LIVE',
  config: {},
  participantCount: 1,
  startedAt: '2026-07-23T08:01:00Z',
  endedAt: null,
};

function card(overrides: Partial<BrainstormCard> = {}): BrainstormCard {
  return {
    id: 'c-1',
    text: 'An idea',
    color: 'YELLOW',
    category: null,
    authorParticipantId: 'p-me',
    createdAt: '2026-07-23T08:02:00Z',
    ...overrides,
  };
}

describe('SessionActivityBrainstormComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionActivityBrainstormComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function createFixture(initial: BrainstormCard[] = [], participantId: string | null = 'p-me') {
    const fixture = TestBed.createComponent(SessionActivityBrainstormComponent);
    fixture.componentRef.setInput('session', SESSION);
    fixture.componentRef.setInput('participantId', participantId);
    fixture.detectChanges();
    httpMock.expectOne(CARDS_URL).flush(initial);
    return fixture;
  }

  it('hydrates the board from the initial GET, ordered by creation time', () => {
    const fixture = createFixture([
      card({ id: 'c-2', createdAt: '2026-07-23T09:00:00Z' }),
      card({ id: 'c-1', createdAt: '2026-07-23T08:00:00Z' }),
    ]);
    expect(fixture.componentInstance.orderedCards().map(c => c.id)).toEqual(['c-1', 'c-2']);
  });

  it('degrades to an empty board when the initial GET fails', () => {
    const fixture = TestBed.createComponent(SessionActivityBrainstormComponent);
    fixture.componentRef.setInput('session', SESSION);
    fixture.detectChanges();
    httpMock.expectOne(CARDS_URL).flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(fixture.componentInstance.orderedCards()).toEqual([]);
  });

  it('add() no-ops on an empty draft', () => {
    const fixture = createFixture();
    fixture.componentInstance.add();
    httpMock.expectNone(CARDS_URL);
  });

  it('add() posts the card and clears the text on success', () => {
    const fixture = createFixture();
    fixture.componentInstance.draftText.set('  new idea ');
    fixture.componentInstance.draftColor.set('BLUE');
    fixture.componentInstance.add();

    const req = httpMock.expectOne(CARDS_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ text: 'new idea', color: 'BLUE' });
    req.flush(null);

    expect(fixture.componentInstance.draftText()).toBe('');
  });

  it('add() surfaces submitError on failure', () => {
    const fixture = createFixture();
    fixture.componentInstance.draftText.set('idea');
    fixture.componentInstance.add();
    httpMock.expectOne(CARDS_URL).flush(null, { status: 500, statusText: 'Server Error' });
    expect(fixture.componentInstance.submitError()).toBe(true);
  });

  it('isOwn() is true only for the caller-authored cards', () => {
    const fixture = createFixture([], 'p-me');
    expect(fixture.componentInstance.isOwn(card({ authorParticipantId: 'p-me' }))).toBe(true);
    expect(fixture.componentInstance.isOwn(card({ authorParticipantId: 'p-other' }))).toBe(false);
  });

  it('isOwn() is false when the caller has no known participant id', () => {
    const fixture = createFixture([], null);
    expect(fixture.componentInstance.isOwn(card({ authorParticipantId: 'p-me' }))).toBe(false);
  });

  it('saveEdit() PATCHes the card and exits edit mode', () => {
    const fixture = createFixture([card({ id: 'c-1' })]);
    fixture.componentInstance.startEdit(card({ id: 'c-1', text: 'old', color: 'YELLOW' }));
    fixture.componentInstance.editText.set('updated');
    fixture.componentInstance.editColor.set('GREEN');
    fixture.componentInstance.saveEdit('c-1');

    const req = httpMock.expectOne(`${CARDS_URL}/c-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ text: 'updated', color: 'GREEN' });
    req.flush(null);

    expect(fixture.componentInstance.editingId()).toBeNull();
  });

  it('remove() DELETEs the card', () => {
    const fixture = createFixture([card({ id: 'c-1' })]);
    fixture.componentInstance.remove('c-1');
    const req = httpMock.expectOne(`${CARDS_URL}/c-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('applies CARD_ADDED / CARD_UPDATED / CARD_REMOVED WS messages', () => {
    const fixture = createFixture();
    const ws = TestBed.inject(SessionWsService);

    ws.messages$.next('not json');
    expect(fixture.componentInstance.orderedCards()).toEqual([]);

    const added = card({ id: 'c-1', text: 'first' });
    ws.messages$.next(JSON.stringify({ type: 'CARD_ADDED', sessionId: 's-1', card: added }));
    ws.messages$.next(JSON.stringify({ type: 'CARD_ADDED', sessionId: 's-1', card: added })); // dup ignored
    expect(fixture.componentInstance.orderedCards()).toHaveLength(1);

    ws.messages$.next(
      JSON.stringify({ type: 'CARD_UPDATED', sessionId: 's-1', card: { ...added, text: 'edited', category: 'Grouped' } }),
    );
    expect(fixture.componentInstance.orderedCards()[0].text).toBe('edited');
    expect(fixture.componentInstance.orderedCards()[0].category).toBe('Grouped');

    ws.messages$.next(JSON.stringify({ type: 'CARD_REMOVED', sessionId: 's-1', cardId: 'c-1' }));
    expect(fixture.componentInstance.orderedCards()).toEqual([]);
  });

  it('clears edit mode if the edited card is removed live', () => {
    const fixture = createFixture([card({ id: 'c-1' })]);
    fixture.componentInstance.startEdit(card({ id: 'c-1' }));
    const ws = TestBed.inject(SessionWsService);
    ws.messages$.next(JSON.stringify({ type: 'CARD_REMOVED', sessionId: 's-1', cardId: 'c-1' }));
    expect(fixture.componentInstance.editingId()).toBeNull();
  });

  it('unsubscribes from WS messages on destroy', () => {
    const fixture = createFixture();
    const ws = TestBed.inject(SessionWsService);
    fixture.destroy();
    ws.messages$.next(JSON.stringify({ type: 'CARD_ADDED', sessionId: 's-1', card: card({ id: 'c-z' }) }));
    expect(fixture.componentInstance.orderedCards()).toEqual([]);
  });
});
