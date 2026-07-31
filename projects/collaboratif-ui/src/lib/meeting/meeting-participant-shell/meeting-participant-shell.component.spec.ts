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
import { MeetingParticipantShellComponent } from './meeting-participant-shell.component';

/** Mirrors `meeting-ws.service.spec.ts`'s `FakeRxStomp` — see that file's TSDoc for why. */
class FakeRxStomp implements MeetingStompClient {
  readonly connectionState$ = new Subject<RxStompState>();
  readonly stompErrors$ = new Subject<unknown>();
  private readonly watchers = new Map<string, Subject<{ body: string }>>();

  configure(): void {
    // no-op for these tests
  }

  activate(): void {
    // no-op for these tests
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
    status: 'IN_PROGRESS',
    currentIndex: 0,
    currentAgendaItemId: 'ai-1',
    totalItems: 2,
    elapsedSeconds: 10,
    remainingSeconds: 290,
    overtime: false,
    overtimeSeconds: 0,
    agendaItems: [
      { id: 'ai-1', position: 0, title: 'Point A', durationMinutes: 5, type: 'INFO', facilitator: null, itemStatus: 'CURRENT' },
      { id: 'ai-2', position: 1, title: 'Point B', durationMinutes: 5, type: 'INFO', facilitator: null, itemStatus: 'PENDING' },
    ],
    ...overrides,
  };
}

describe('MeetingParticipantShellComponent', () => {
  let httpMock: HttpTestingController;
  let fake: FakeRxStomp;

  beforeEach(async () => {
    vi.useFakeTimers();
    fake = new FakeRxStomp();
    await TestBed.configureTestingModule({
      imports: [MeetingParticipantShellComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
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
    const fixture = TestBed.createComponent(MeetingParticipantShellComponent);
    fixture.detectChanges();
    httpMock.expectOne(LIVE_URL).flush(initial);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the live state and exposes the current item', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.currentItem()?.title).toBe('Point A');
  });

  it('flags loadError when the initial load fails', () => {
    const fixture = TestBed.createComponent(MeetingParticipantShellComponent);
    fixture.detectChanges();
    httpMock.expectOne(LIVE_URL).flush(null, { status: 404, statusText: 'Not Found' });
    expect(fixture.componentInstance.loadError()).toBe(true);
  });

  it('seeds the local timer from the initial live state', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.timer.state().elapsedSeconds).toBe(10);
    expect(fixture.componentInstance.timer.state().remainingSeconds).toBe(290);
  });

  it('has no current item before the meeting starts', () => {
    const fixture = createFixture(liveState({ status: 'DRAFT', currentIndex: undefined, currentAgendaItemId: undefined }));
    expect(fixture.componentInstance.currentItem()).toBeNull();
    expect(fixture.componentInstance.hasStarted()).toBe(false);
  });

  it('a WS TIMER_TICK message feeds the local timer directly, without reloading live state', () => {
    createFixture();

    fake.emit(
      '/topic/collaboratif/meeting/m-1',
      JSON.stringify({
        type: 'TIMER_TICK',
        meetingId: 'm-1',
        agendaItemId: 'ai-1',
        elapsedSeconds: 55,
        remainingSeconds: 245,
        overtimeSeconds: 0,
      }),
    );

    httpMock.expectNone(LIVE_URL);
  });

  it('a WS MEETING_ENDED message triggers a fresh GET .../live', () => {
    const fixture = createFixture();

    fake.emit('/topic/collaboratif/meeting/m-1', JSON.stringify({ type: 'MEETING_ENDED', meetingId: 'm-1' }));

    httpMock.expectOne(LIVE_URL).flush(liveState({ status: 'ENDED', currentIndex: undefined, currentAgendaItemId: undefined }));
    expect(fixture.componentInstance.hasEnded()).toBe(true);
    expect(fixture.componentInstance.currentItem()).toBeNull();
  });

  it('AC-A1: announces the meeting ending once, not on the very first load', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.endedAnnouncement()).toBe(false);

    fake.emit('/topic/collaboratif/meeting/m-1', JSON.stringify({ type: 'MEETING_ENDED', meetingId: 'm-1' }));
    httpMock.expectOne(LIVE_URL).flush(liveState({ status: 'ENDED', currentIndex: undefined, currentAgendaItemId: undefined }));

    expect(fixture.componentInstance.endedAnnouncement()).toBe(true);
  });

  it('AC-A1: announces the new current item title on an agenda change, not on the very first load', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.currentItemAnnouncement()).toBeNull();

    fake.emit('/topic/collaboratif/meeting/m-1', JSON.stringify({ type: 'AGENDA_ITEM_CHANGED', meetingId: 'm-1' }));
    httpMock.expectOne(LIVE_URL).flush(liveState({ currentIndex: 1, currentAgendaItemId: 'ai-2' }));

    expect(fixture.componentInstance.currentItemAnnouncement()).toBe('Point B');
  });

  it('announces an overtime transition once via the polite live region signal', () => {
    const fixture = createFixture();

    fake.emit(
      '/topic/collaboratif/meeting/m-1',
      JSON.stringify({
        type: 'TIMER_TICK',
        meetingId: 'm-1',
        agendaItemId: 'ai-1',
        elapsedSeconds: 305,
        remainingSeconds: -5,
        overtimeSeconds: 5,
      }),
    );

    expect(fixture.componentInstance.overtimeAnnouncement()).toBe('5');
  });

  it('ignores malformed WS payloads without throwing', () => {
    createFixture();
    expect(() => fake.emit('/topic/collaboratif/meeting/m-1', 'not json')).not.toThrow();
    httpMock.expectNone(LIVE_URL);
  });

  it('disconnects the WS on destroy', () => {
    const fixture = createFixture();
    fixture.destroy();
    expect(() => fake.emit('/topic/collaboratif/meeting/m-1', '{}')).not.toThrow();
  });
});
