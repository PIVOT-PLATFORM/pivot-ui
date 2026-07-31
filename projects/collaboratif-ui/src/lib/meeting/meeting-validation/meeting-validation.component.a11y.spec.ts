/**
 * Automated accessibility tests (axe-core) for `MeetingValidationComponent` (US12.4.1 A11y AC —
 * WCAG 2.1 AA). Mirrors the design system's own `*.a11y.spec.ts` files' `axe` usage (`vitest-axe`
 * + `axe-core`, workspace-root devDependencies) — the `configureAxe`/matcher setup itself is
 * duplicated locally rather than reached for across the `design-system` project boundary via a
 * relative import, keeping this module self-contained.
 */
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { RxStompState } from '@stomp/rx-stomp';
import { Subject } from 'rxjs';
import { configureAxe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';
import { describe, expect, it } from 'vitest';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { MeetingBookingResponse } from '../models/meeting.model';
import { MEETING_STOMP_CLIENT_FACTORY, MeetingStompClient } from '../services/meeting-ws.service';
import { MeetingValidationComponent } from './meeting-validation.component';

expect.extend(axeMatchers);

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Matchers<T = any> {
    toHaveNoViolations(): T;
  }
}

/** WCAG 2.1 A/AA-scoped axe instance — same rule set as the design system's own a11y specs. */
const axe = configureAxe({
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
});

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';
const MEETING_URL = `${TEST_API_URL}/meetings/m-1`;

class FakeRxStomp implements MeetingStompClient {
  readonly connectionState$ = new Subject<RxStompState>();
  readonly stompErrors$ = new Subject<unknown>();
  watch() {
    return new Subject<{ body: string }>().asObservable();
  }
  configure(): void {
    /* no-op */
  }
  activate(): void {
    /* no-op */
  }
  deactivate(): Promise<void> {
    return Promise.resolve();
  }
}

const MEETING: MeetingBookingResponse = {
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
};

describe('MeetingValidationComponent — a11y (axe)', () => {
  function configure(): HttpTestingController {
    TestBed.configureTestingModule({
      imports: [MeetingValidationComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
        { provide: MEETING_STOMP_CLIENT_FACTORY, useValue: () => new FakeRxStomp() },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ meetingId: 'm-1' }) } } },
      ],
    });
    return TestBed.inject(HttpTestingController);
  }

  it('has no detectable axe violations on the PRE_RESERVED validation screen', async () => {
    const httpMock = configure();
    const fixture = TestBed.createComponent(MeetingValidationComponent);
    fixture.detectChanges();
    httpMock.expectOne(MEETING_URL).flush(MEETING);
    fixture.detectChanges();

    expect(await axe(fixture.nativeElement as HTMLElement)).toHaveNoViolations();
    httpMock.verify();
  });

  it('has no detectable axe violations once CONFIRMED (listbox replaced by a status message)', async () => {
    const httpMock = configure();
    const fixture = TestBed.createComponent(MeetingValidationComponent);
    fixture.detectChanges();
    httpMock.expectOne(MEETING_URL).flush({ ...MEETING, status: 'CONFIRMED' });
    fixture.detectChanges();

    expect(await axe(fixture.nativeElement as HTMLElement)).toHaveNoViolations();
    httpMock.verify();
  });

  it('has no detectable axe violations with the manual-adjustment form open', async () => {
    const httpMock = configure();
    const fixture = TestBed.createComponent(MeetingValidationComponent);
    fixture.detectChanges();
    httpMock.expectOne(MEETING_URL).flush(MEETING);
    fixture.detectChanges();
    fixture.componentInstance.openAdjust();
    fixture.detectChanges();

    expect(await axe(fixture.nativeElement as HTMLElement)).toHaveNoViolations();
    httpMock.verify();
  });
});
