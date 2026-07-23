import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { SessionResponse, SessionStatus } from '../models/session.model';
import { SessionRunnerComponent } from './session-runner.component';

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';

function session(status: SessionStatus): SessionResponse {
  return {
    id: 's-1',
    title: 'Sprint retro',
    type: 'POLL',
    status,
    joinCode: 'ABCDEF',
    config: {},
    teamId: null,
    participantCount: 0,
    createdBy: 1,
    createdAt: '2026-07-22T08:00:00Z',
    startedAt: null,
    endedAt: null,
  };
}

describe('SessionRunnerComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [SessionRunnerComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ sessionId: 's-1' }) } },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  function createFixture(initial = session('DRAFT')) {
    const fixture = TestBed.createComponent(SessionRunnerComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${TEST_API_URL}/sessions/s-1`).flush(initial);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the session and exposes it', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.session()).toEqual(session('DRAFT'));
  });

  it('flags loadError when the initial load fails', () => {
    const fixture = TestBed.createComponent(SessionRunnerComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${TEST_API_URL}/sessions/s-1`).flush(null, { status: 500, statusText: 'Server Error' });
    expect(fixture.componentInstance.loadError()).toBe(true);
  });

  it('polls the session every 5s and stops polling on destroy', () => {
    const fixture = createFixture();
    vi.advanceTimersByTime(5000);
    httpMock.expectOne(`${TEST_API_URL}/sessions/s-1`).flush(session('LIVE'));
    expect(fixture.componentInstance.session()?.status).toBe('LIVE');

    fixture.destroy();
    vi.advanceTimersByTime(5000);
    httpMock.expectNone(`${TEST_API_URL}/sessions/s-1`);
  });

  it.each<[SessionStatus, 'canStart' | 'canPause' | 'canResume' | 'canEnd', boolean]>([
    ['DRAFT', 'canStart', true],
    ['DRAFT', 'canEnd', false],
    ['LIVE', 'canPause', true],
    ['LIVE', 'canEnd', true],
    ['PAUSED', 'canResume', true],
    ['PAUSED', 'canEnd', true],
    ['COMPLETED', 'canStart', false],
  ])('for status %s, %s is %s', (status, prop, expected) => {
    const fixture = createFixture(session(status));
    expect(fixture.componentInstance[prop]()).toBe(expected);
  });

  it('start() transitions the session and clears actionInFlight', () => {
    const fixture = createFixture(session('DRAFT'));
    fixture.componentInstance.start();
    expect(fixture.componentInstance.actionInFlight()).toBe(true);
    httpMock.expectOne(`${TEST_API_URL}/sessions/s-1/start`).flush(session('LIVE'));
    expect(fixture.componentInstance.actionInFlight()).toBe(false);
    expect(fixture.componentInstance.session()?.status).toBe('LIVE');
  });

  it('pause()/resume()/end() call their respective endpoints', () => {
    const fixture = createFixture(session('LIVE'));
    fixture.componentInstance.pause();
    httpMock.expectOne(`${TEST_API_URL}/sessions/s-1/pause`).flush(session('PAUSED'));

    fixture.componentInstance.resume();
    httpMock.expectOne(`${TEST_API_URL}/sessions/s-1/resume`).flush(session('LIVE'));

    fixture.componentInstance.end();
    httpMock.expectOne(`${TEST_API_URL}/sessions/s-1/end`).flush(session('COMPLETED'));
  });

  it('surfaces actionError on a failed transition', () => {
    const fixture = createFixture(session('DRAFT'));
    fixture.componentInstance.start();
    httpMock.expectOne(`${TEST_API_URL}/sessions/s-1/start`).flush(null, { status: 404, statusText: 'Not Found' });
    expect(fixture.componentInstance.actionError()).toBe(true);
    expect(fixture.componentInstance.actionInFlight()).toBe(false);
  });

  it('ignores a second action while one is already in flight', () => {
    const fixture = createFixture(session('DRAFT'));
    fixture.componentInstance.start();
    fixture.componentInstance.start();
    httpMock.expectOne(`${TEST_API_URL}/sessions/s-1/start`).flush(session('LIVE'));
  });
});
