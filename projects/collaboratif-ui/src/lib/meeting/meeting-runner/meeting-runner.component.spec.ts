import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { RxStompState } from '@stomp/rx-stomp';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { MeetingLiveState } from '../models/meeting.model';
import { MEETING_STOMP_CLIENT_FACTORY, MeetingStompClient } from '../services/meeting-ws.service';
import { MeetingRunnerComponent } from './meeting-runner.component';

/** Mirrors `meeting-ws.service.spec.ts`'s `FakeRxStomp` — see that file's TSDoc for why. */
class FakeRxStomp implements MeetingStompClient {
  readonly connectionState$ = new Subject<RxStompState>();
  readonly stompErrors$ = new Subject<unknown>();
  activateCalls = 0;
  private readonly watchers = new Map<string, Subject<{ body: string }>>();

  configure(): void {
    // no-op for these tests
  }

  activate(): void {
    this.activateCalls++;
  }

  deactivate(): Promise<void> {
    return Promise.resolve();
  }

  watch(destination: string) {
    return this.watcher(destination).asObservable();
  }

  emit(destination: string, body: string): void {
    this.watcher(destination).next({ body });
  }

  private watcher(destination: string): Subject<{ body: string }> {
    let subject = this.watchers.get(destination);
    if (!subject) {
      subject = new Subject<{ body: string }>();
      this.watchers.set(destination, subject);
    }
    return subject;
  }
}

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';
const LIVE_URL = `${TEST_API_URL}/meetings/m-1/live`;

function liveState(overrides: Partial<MeetingLiveState> = {}): MeetingLiveState {
  return {
    meetingId: 'm-1',
    status: 'DRAFT',
    totalItems: 2,
    elapsedSeconds: 0,
    remainingSeconds: 0,
    overtime: false,
    overtimeSeconds: 0,
    agendaItems: [
      { id: 'ai-1', position: 0, title: 'Point A', durationMinutes: 5, type: 'INFO', facilitator: null, itemStatus: 'PENDING' },
      { id: 'ai-2', position: 1, title: 'Point B', durationMinutes: 5, type: 'INFO', facilitator: null, itemStatus: 'PENDING' },
    ],
    ...overrides,
  };
}

describe('MeetingRunnerComponent', () => {
  let httpMock: HttpTestingController;
  let fake: FakeRxStomp;

  beforeEach(async () => {
    vi.useFakeTimers();
    fake = new FakeRxStomp();
    await TestBed.configureTestingModule({
      imports: [MeetingRunnerComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
        { provide: MEETING_STOMP_CLIENT_FACTORY, useValue: () => fake },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ meetingId: 'm-1' }) } } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  function createFixture(initial = liveState()) {
    const fixture = TestBed.createComponent(MeetingRunnerComponent);
    fixture.detectChanges();
    httpMock.expectOne(LIVE_URL).flush(initial);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the live state and exposes it', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.liveState()).toEqual(liveState());
  });

  it('flags loadError when the initial load fails', () => {
    const fixture = TestBed.createComponent(MeetingRunnerComponent);
    fixture.detectChanges();
    httpMock.expectOne(LIVE_URL).flush(null, { status: 404, statusText: 'Not Found' });
    expect(fixture.componentInstance.loadError()).toBe(true);
  });

  it.each<['DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'ENDED', boolean, boolean]>([
    ['DRAFT', true, false],
    ['CONFIRMED', true, false],
    ['IN_PROGRESS', false, true],
    ['ENDED', false, false],
  ])('for status %s, canStart=%s and canAnimate=%s', (status, canStart, canAnimate) => {
    const fixture = createFixture(liveState({ status }));
    expect(fixture.componentInstance.canStart()).toBe(canStart);
    expect(fixture.componentInstance.canAnimate()).toBe(canAnimate);
  });

  it('start() POSTs /start and reloads the live state', () => {
    const fixture = createFixture(liveState({ status: 'DRAFT' }));
    fixture.componentInstance.start();
    expect(fixture.componentInstance.actionInFlight()).toBe(true);
    httpMock.expectOne(`${TEST_API_URL}/meetings/m-1/start`).flush(null);
    httpMock
      .expectOne(LIVE_URL)
      .flush(liveState({ status: 'IN_PROGRESS', currentIndex: 0, currentAgendaItemId: 'ai-1', remainingSeconds: 300 }));
    expect(fixture.componentInstance.actionInFlight()).toBe(false);
    expect(fixture.componentInstance.liveState()?.status).toBe('IN_PROGRESS');
  });

  it('next()/end() call their respective endpoints and reload', () => {
    const fixture = createFixture(liveState({ status: 'IN_PROGRESS', currentIndex: 0, currentAgendaItemId: 'ai-1' }));

    fixture.componentInstance.next();
    httpMock.expectOne(`${TEST_API_URL}/meetings/m-1/agenda/next`).flush(null);
    httpMock.expectOne(LIVE_URL).flush(liveState({ status: 'IN_PROGRESS', currentIndex: 1, currentAgendaItemId: 'ai-2' }));

    fixture.componentInstance.end();
    httpMock.expectOne(`${TEST_API_URL}/meetings/m-1/end`).flush(null);
    httpMock.expectOne(LIVE_URL).flush(liveState({ status: 'ENDED' }));

    expect(fixture.componentInstance.liveState()?.status).toBe('ENDED');
  });

  it('surfaces actionError on a failed lifecycle transition', () => {
    const fixture = createFixture(liveState({ status: 'DRAFT' }));
    fixture.componentInstance.start();
    httpMock.expectOne(`${TEST_API_URL}/meetings/m-1/start`).flush(null, { status: 409, statusText: 'Conflict' });
    expect(fixture.componentInstance.actionError()).toBe(true);
    expect(fixture.componentInstance.actionInFlight()).toBe(false);
  });

  it('submitAction() posts the trimmed label and optional owner/dueDate, then clears the form', () => {
    const fixture = createFixture(liveState({ status: 'IN_PROGRESS', currentIndex: 0, currentAgendaItemId: 'ai-1' }));
    fixture.componentInstance.actionLabel.set('  Follow up  ');
    fixture.componentInstance.actionOwnerUserId.set('42');
    fixture.componentInstance.actionDueDate.set('2026-08-10');

    fixture.componentInstance.submitAction();

    const req = httpMock.expectOne(`${TEST_API_URL}/meetings/m-1/actions`);
    expect(req.request.body).toEqual({ label: 'Follow up', ownerUserId: 42, dueDate: '2026-08-10' });
    req.flush({
      id: 'a-1',
      meetingId: 'm-1',
      label: 'Follow up',
      status: 'OPEN',
      createdAt: '2026-08-01T10:05:00Z',
    });

    expect(fixture.componentInstance.actionLabel()).toBe('');
    expect(fixture.componentInstance.actionAddedAnnouncement()).toBe('Follow up');
  });

  it('submitAction() does nothing (no HTTP call) when the label is blank', () => {
    const fixture = createFixture(liveState({ status: 'IN_PROGRESS', currentIndex: 0, currentAgendaItemId: 'ai-1' }));
    fixture.componentInstance.actionLabel.set('   ');

    fixture.componentInstance.submitAction();

    httpMock.expectNone(`${TEST_API_URL}/meetings/m-1/actions`);
  });

  it('a WS TIMER_TICK message feeds the local timer directly, without reloading live state', () => {
    const fixture = createFixture(liveState({ status: 'IN_PROGRESS', currentIndex: 0, currentAgendaItemId: 'ai-1' }));

    fake.emit(
      '/topic/collaboratif/meeting/m-1',
      JSON.stringify({
        type: 'TIMER_TICK',
        meetingId: 'm-1',
        agendaItemId: 'ai-1',
        elapsedSeconds: 42,
        remainingSeconds: 258,
        overtimeSeconds: 0,
      }),
    );

    expect(fixture.componentInstance.timer.state().elapsedSeconds).toBe(42);
    httpMock.expectNone(LIVE_URL);
  });

  it('a WS AGENDA_ITEM_CHANGED message triggers a fresh GET .../live', () => {
    const fixture = createFixture(liveState({ status: 'IN_PROGRESS', currentIndex: 0, currentAgendaItemId: 'ai-1' }));

    fake.emit(
      '/topic/collaboratif/meeting/m-1',
      JSON.stringify({ type: 'AGENDA_ITEM_CHANGED', meetingId: 'm-1', index: 1, total: 2, currentAgendaItemId: 'ai-2' }),
    );

    httpMock.expectOne(LIVE_URL).flush(liveState({ status: 'IN_PROGRESS', currentIndex: 1, currentAgendaItemId: 'ai-2' }));
    expect(fixture.componentInstance.liveState()?.currentIndex).toBe(1);
  });

  it('announces an overtime transition once, and clears it once overtime ends', () => {
    const fixture = createFixture(liveState({ status: 'IN_PROGRESS', currentIndex: 0, currentAgendaItemId: 'ai-1' }));

    fake.emit(
      '/topic/collaboratif/meeting/m-1',
      JSON.stringify({
        type: 'TIMER_TICK',
        meetingId: 'm-1',
        agendaItemId: 'ai-1',
        elapsedSeconds: 310,
        remainingSeconds: -10,
        overtimeSeconds: 10,
      }),
    );
    expect(fixture.componentInstance.overtimeAnnouncement()).toBe('10');

    // A second overtime tick must not re-trigger a fresh announcement value (already true -> true).
    fake.emit(
      '/topic/collaboratif/meeting/m-1',
      JSON.stringify({
        type: 'TIMER_TICK',
        meetingId: 'm-1',
        agendaItemId: 'ai-1',
        elapsedSeconds: 311,
        remainingSeconds: -11,
        overtimeSeconds: 11,
      }),
    );
    expect(fixture.componentInstance.overtimeAnnouncement()).toBe('10');
  });

  it('ignores malformed WS payloads without throwing', () => {
    createFixture(liveState({ status: 'IN_PROGRESS', currentIndex: 0, currentAgendaItemId: 'ai-1' }));
    expect(() => fake.emit('/topic/collaboratif/meeting/m-1', 'not json')).not.toThrow();
    httpMock.expectNone(LIVE_URL);
  });

  it('disconnects the WS on destroy', () => {
    const fixture = createFixture();
    fixture.destroy();
    expect(() => fake.emit('/topic/collaboratif/meeting/m-1', '{}')).not.toThrow();
  });
});
