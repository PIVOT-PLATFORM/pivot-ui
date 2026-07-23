import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { ParticipantSessionResponse, PollConfig } from '../models/session.model';
import { SessionWsService } from '../services/session-ws.service';
import { SessionActivityPollComponent } from './session-activity-poll.component';

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';

const POLL_CONFIG: PollConfig = {
  question: 'Langage préféré ?',
  options: [
    { id: 'o-1', label: 'TypeScript' },
    { id: 'o-2', label: 'Java' },
  ],
  allowMultiple: false,
};

const SESSION: ParticipantSessionResponse = {
  id: 's-1',
  title: 'Sprint retro',
  type: 'POLL',
  status: 'LIVE',
  config: POLL_CONFIG,
  participantCount: 1,
  startedAt: '2026-07-22T08:01:00Z',
  endedAt: null,
};

describe('SessionActivityPollComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionActivityPollComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
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
    const fixture = TestBed.createComponent(SessionActivityPollComponent);
    fixture.componentRef.setInput('session', SESSION);
    fixture.detectChanges();
    return fixture;
  }

  it('single-select toggles between one selection at a time', () => {
    const fixture = createFixture();
    fixture.componentInstance.toggleOption('o-1');
    expect(fixture.componentInstance.selectedOptionIds()).toEqual(['o-1']);
    fixture.componentInstance.toggleOption('o-2');
    expect(fixture.componentInstance.selectedOptionIds()).toEqual(['o-2']);
    fixture.componentInstance.toggleOption('o-2');
    expect(fixture.componentInstance.selectedOptionIds()).toEqual([]);
  });

  it('multi-select accumulates selections when allowMultiple is true', () => {
    const fixture = TestBed.createComponent(SessionActivityPollComponent);
    fixture.componentRef.setInput('session', { ...SESSION, config: { ...POLL_CONFIG, allowMultiple: true } });
    fixture.detectChanges();

    fixture.componentInstance.toggleOption('o-1');
    fixture.componentInstance.toggleOption('o-2');
    expect(fixture.componentInstance.selectedOptionIds()).toEqual(['o-1', 'o-2']);
    fixture.componentInstance.toggleOption('o-1');
    expect(fixture.componentInstance.selectedOptionIds()).toEqual(['o-2']);
  });

  it('toggleOption() no-ops when disabled', () => {
    const fixture = TestBed.createComponent(SessionActivityPollComponent);
    fixture.componentRef.setInput('session', SESSION);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    fixture.componentInstance.toggleOption('o-1');
    expect(fixture.componentInstance.selectedOptionIds()).toEqual([]);
  });

  it('submit() no-ops without a selection', () => {
    const fixture = createFixture();
    fixture.componentInstance.submit();
    httpMock.expectNone(`${TEST_API_URL}/sessions/s-1/poll/vote`);
  });

  it('submit() posts the selection and flags hasVoted on success', () => {
    const fixture = createFixture();
    fixture.componentInstance.toggleOption('o-1');
    fixture.componentInstance.submit();
    expect(fixture.componentInstance.submitting()).toBe(true);

    const req = httpMock.expectOne(`${TEST_API_URL}/sessions/s-1/poll/vote`);
    expect(req.request.body).toEqual({ optionIds: ['o-1'] });
    req.flush(null);

    expect(fixture.componentInstance.submitting()).toBe(false);
    expect(fixture.componentInstance.hasVoted()).toBe(true);
  });

  it('submit() surfaces submitError on failure', () => {
    const fixture = createFixture();
    fixture.componentInstance.toggleOption('o-1');
    fixture.componentInstance.submit();
    httpMock.expectOne(`${TEST_API_URL}/sessions/s-1/poll/vote`).flush(null, { status: 500, statusText: 'Server Error' });
    expect(fixture.componentInstance.submitError()).toBe(true);
    expect(fixture.componentInstance.hasVoted()).toBe(false);
  });

  it('updates results from a POLL_UPDATED WS message, ignoring unrelated/malformed payloads', () => {
    const fixture = createFixture();
    const ws = TestBed.inject(SessionWsService);

    ws.messages$.next('not json');
    ws.messages$.next(JSON.stringify({ type: 'PARTICIPANT_JOINED', participantId: 'p-1', displayName: 'Ada' }));
    expect(fixture.componentInstance.results()).toEqual([]);

    ws.messages$.next(
      JSON.stringify({
        type: 'POLL_UPDATED',
        sessionId: 's-1',
        results: [{ optionId: 'o-1', label: 'TypeScript', count: 3, percent: 100 }],
      }),
    );
    expect(fixture.componentInstance.results()).toEqual([
      { optionId: 'o-1', label: 'TypeScript', count: 3, percent: 100 },
    ]);
    expect(fixture.componentInstance.resultFor('o-1')).toEqual({
      optionId: 'o-1',
      label: 'TypeScript',
      count: 3,
      percent: 100,
    });
    expect(fixture.componentInstance.resultFor('o-2')).toBeNull();
  });

  it('treats an entry with no count as hidden (facilitator hide-results — count/percent simply absent)', () => {
    const fixture = createFixture();
    const ws = TestBed.inject(SessionWsService);
    ws.messages$.next(
      JSON.stringify({
        type: 'POLL_UPDATED',
        sessionId: 's-1',
        results: [{ optionId: 'o-1', label: 'TypeScript' }],
      }),
    );
    expect(fixture.componentInstance.resultFor('o-1')).toBeNull();
  });

  it('unsubscribes from WS messages on destroy', () => {
    const fixture = createFixture();
    const ws = TestBed.inject(SessionWsService);
    fixture.destroy();
    ws.messages$.next(JSON.stringify({ type: 'POLL_UPDATED', sessionId: 's-1', results: [] }));
    expect(fixture.componentInstance.results()).toEqual([]);
  });
});
