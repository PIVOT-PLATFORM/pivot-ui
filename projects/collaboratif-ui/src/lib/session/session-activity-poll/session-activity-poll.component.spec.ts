import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { PollConfig, SessionResponse } from '../models/session.model';
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

const SESSION: SessionResponse = {
  id: 's-1',
  title: 'Sprint retro',
  type: 'POLL',
  status: 'LIVE',
  joinCode: 'ABCDEF',
  config: POLL_CONFIG,
  teamId: null,
  participantCount: 1,
  createdBy: 1,
  createdAt: '2026-07-22T08:00:00Z',
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
    expect(fixture.componentInstance.results()).toBeNull();

    ws.messages$.next(
      JSON.stringify({ type: 'POLL_UPDATED', results: [{ optionId: 'o-1', count: 3, percentage: 100 }] }),
    );
    expect(fixture.componentInstance.results()).toEqual([{ optionId: 'o-1', count: 3, percentage: 100 }]);
    expect(fixture.componentInstance.resultFor('o-1')).toEqual({ optionId: 'o-1', count: 3, percentage: 100 });
    expect(fixture.componentInstance.resultFor('o-2')).toBeNull();
  });

  it('handles results:null (facilitator hid results)', () => {
    const fixture = createFixture();
    const ws = TestBed.inject(SessionWsService);
    ws.messages$.next(JSON.stringify({ type: 'POLL_UPDATED', results: null }));
    expect(fixture.componentInstance.results()).toBeNull();
  });

  it('unsubscribes from WS messages on destroy', () => {
    const fixture = createFixture();
    const ws = TestBed.inject(SessionWsService);
    fixture.destroy();
    ws.messages$.next(JSON.stringify({ type: 'POLL_UPDATED', results: [] }));
    expect(fixture.componentInstance.results()).toBeNull();
  });
});
