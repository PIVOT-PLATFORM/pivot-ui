import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { RxStompState } from '@stomp/rx-stomp';
import { Subject } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { MeetingBookingResponse } from '../models/meeting.model';
import { MEETING_STOMP_CLIENT_FACTORY, MeetingStompClient } from '../services/meeting-ws.service';
import { MeetingValidationComponent } from './meeting-validation.component';

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';
const MEETING_URL = `${TEST_API_URL}/meetings/m-1`;

/** Same minimal fake as `meeting-ws.service.spec.ts` — no real WebSocket in tests. */
class FakeRxStomp implements MeetingStompClient {
  readonly connectionState$ = new Subject<RxStompState>();
  readonly stompErrors$ = new Subject<unknown>();
  activateCalls = 0;
  deactivateCalls = 0;
  private readonly topic$ = new Subject<{ body: string }>();

  watch() {
    return this.topic$.asObservable();
  }

  emit(body: string): void {
    this.topic$.next({ body });
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

function meeting(overrides: Partial<MeetingBookingResponse> = {}): MeetingBookingResponse {
  return {
    id: 'm-1',
    status: 'PRE_RESERVED',
    title: 'Sprint Review',
    scheduledAt: '2026-08-03T09:00:00Z',
    totalDurationMinutes: 30,
    bookingWindowStart: '2026-08-03T09:00:00Z',
    bookingWindowEnd: '2026-08-03T11:00:00Z',
    eventRef: 'evt-1',
    projectRef: 'proj-1',
    rescheduleRequested: false,
    proposedSlots: [
      {
        id: 'slot-1',
        start: '2026-08-03T09:00:00Z',
        end: '2026-08-03T09:30:00Z',
        rank: 1,
        hasConflict: false,
        conflictReason: null,
        recommended: true,
      },
      {
        id: 'slot-2',
        start: '2026-08-03T09:30:00Z',
        end: '2026-08-03T10:00:00Z',
        rank: 2,
        hasConflict: true,
        conflictReason: '1/2 participants indisponibles',
        recommended: false,
      },
    ],
    ...overrides,
  };
}

describe('MeetingValidationComponent', () => {
  let httpMock: HttpTestingController;
  let fake: FakeRxStomp;

  function configure(): void {
    fake = new FakeRxStomp();
    TestBed.configureTestingModule({
      imports: [MeetingValidationComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
        { provide: MEETING_STOMP_CLIENT_FACTORY, useValue: () => fake },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ meetingId: 'm-1' }) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  }

  function mount(response: MeetingBookingResponse): ComponentFixture<MeetingValidationComponent> {
    configure();
    const fixture = TestBed.createComponent(MeetingValidationComponent);
    fixture.detectChanges();
    httpMock.expectOne(MEETING_URL).flush(response);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('loads the meeting and renders the ranked proposed slots', () => {
    const fixture = mount(meeting());
    const options = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(options).toHaveLength(2);
  });

  it('pre-selects the recommended (rank 1) slot on load', () => {
    const fixture = mount(meeting());
    const options: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(options[0].getAttribute('aria-selected')).toBe('true');
    expect(options[1].getAttribute('aria-selected')).toBe('false');
  });

  it('exposes the listbox with an accessible label', () => {
    const fixture = mount(meeting());
    const listbox = fixture.nativeElement.querySelector('[role="listbox"]');
    expect(listbox).not.toBeNull();
    expect(listbox.getAttribute('aria-label')).toBeTruthy();
  });

  it('only the selected slot is a keyboard tab stop (roving tabindex)', () => {
    const fixture = mount(meeting());
    const options: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(options[0].getAttribute('tabindex')).toBe('0');
    expect(options[1].getAttribute('tabindex')).toBe('-1');
  });

  it('ArrowDown moves selection to the next slot', () => {
    const fixture = mount(meeting());
    const component = fixture.componentInstance;
    const listbox: HTMLElement = fixture.nativeElement.querySelector('[role="listbox"]');

    listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();

    expect(component.selectedSlotId()).toBe('slot-2');
  });

  it('ArrowUp at the first slot stays on the first slot', () => {
    const fixture = mount(meeting());
    const component = fixture.componentInstance;
    const listbox: HTMLElement = fixture.nativeElement.querySelector('[role="listbox"]');

    listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    fixture.detectChanges();

    expect(component.selectedSlotId()).toBe('slot-1');
  });

  it('clicking a slot selects it', () => {
    const fixture = mount(meeting());
    const options: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('[role="option"]');
    options[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedSlotId()).toBe('slot-2');
  });

  it('confirms the selected slot via POST .../confirm', () => {
    const fixture = mount(meeting());
    const button = fixture.nativeElement.querySelector('.meeting-validation__actions button') as HTMLButtonElement;
    button.click();

    const req = httpMock.expectOne(`${MEETING_URL}/confirm`);
    expect(req.request.body).toEqual({ slotId: 'slot-1' });
    req.flush(meeting({ status: 'CONFIRMED' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.isConfirmed()).toBe(true);
  });

  it('shows a confirmation message and hides the listbox once CONFIRMED', () => {
    const fixture = mount(meeting());
    const button = fixture.nativeElement.querySelector('.meeting-validation__actions button') as HTMLButtonElement;
    button.click();
    httpMock.expectOne(`${MEETING_URL}/confirm`).flush(meeting({ status: 'CONFIRMED' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.meeting-validation__confirmed')).not.toBeNull();
  });

  it('surfaces a 409 double-confirm error via the code-mapped message region', () => {
    const fixture = mount(meeting());
    const button = fixture.nativeElement.querySelector('.meeting-validation__actions button') as HTMLButtonElement;
    button.click();
    httpMock
      .expectOne(`${MEETING_URL}/confirm`)
      .flush({ code: 'ALREADY_CONFIRMED' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(fixture.componentInstance.confirmError()).toBe('ALREADY_CONFIRMED');
  });

  it('opens the manual-adjustment form seeded from the selected slot', () => {
    const fixture = mount(meeting());
    const adjustButton = fixture.nativeElement.querySelectorAll('.meeting-validation__actions button')[1] as HTMLButtonElement;
    adjustButton.click();
    fixture.detectChanges();

    // Computed the same way the component derives its <input type="datetime-local"> value, so
    // this assertion holds regardless of the test runner's local timezone.
    const expectedDate = new Date('2026-08-03T09:00:00Z');
    const pad = (n: number) => String(n).padStart(2, '0');
    const expected = `${expectedDate.getFullYear()}-${pad(expectedDate.getMonth() + 1)}-${pad(expectedDate.getDate())}T${pad(expectedDate.getHours())}:${pad(expectedDate.getMinutes())}`;
    expect(fixture.componentInstance.adjustStart()).toBe(expected);
  });

  it('saves a manual adjustment via PATCH .../slot', () => {
    const fixture = mount(meeting());
    fixture.componentInstance.openAdjust();
    fixture.componentInstance.adjustStart.set('2026-08-03T14:00');
    fixture.componentInstance.adjustEnd.set('2026-08-03T14:30');
    fixture.componentInstance.saveAdjust();

    const req = httpMock.expectOne(`${MEETING_URL}/slot`);
    expect(req.request.body.slotId).toBe('slot-1');
    req.flush(meeting());
  });

  it('applies a real-time push received on the meeting topic and announces it', () => {
    const fixture = mount(meeting());
    fake.emit(JSON.stringify(meeting({ rescheduleRequested: true })));
    fixture.detectChanges();

    expect(fixture.componentInstance.meeting()?.rescheduleRequested).toBe(true);
    expect(fixture.componentInstance.liveMessage()).toBeTruthy();
  });

  it('keeps the current selection across a push when that slot still exists', () => {
    const fixture = mount(meeting());
    fixture.componentInstance.selectSlot('slot-2');

    fake.emit(JSON.stringify(meeting()));
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedSlotId()).toBe('slot-2');
  });

  it('falls back to the recommended slot if the current selection no longer exists after a push', () => {
    const fixture = mount(meeting());
    fixture.componentInstance.selectSlot('slot-2');

    const withoutSlot2 = meeting({ proposedSlots: [meeting().proposedSlots[0]] });
    fake.emit(JSON.stringify(withoutSlot2));
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedSlotId()).toBe('slot-1');
  });

  it('sets a load error when the meeting fails to load', () => {
    configure();
    const fixture = TestBed.createComponent(MeetingValidationComponent);
    fixture.detectChanges();
    httpMock.expectOne(MEETING_URL).flush({}, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toBe(true);
  });

  it('does not open a WS connection for an already-CONFIRMED meeting', () => {
    mount(meeting({ status: 'CONFIRMED' }));
    expect(fake.activateCalls).toBe(0);
  });

  it('disconnects the WS on destroy', () => {
    const fixture = mount(meeting());
    fixture.destroy();
    expect(fake.deactivateCalls).toBeGreaterThanOrEqual(1);
  });
});
