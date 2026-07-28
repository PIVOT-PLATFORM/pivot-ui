import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { MeetingApiService } from './meeting-api.service';
import {
  MeetingActionResponse,
  MeetingBookingResponse,
  MeetingLiveState,
  MeetingResponse,
} from '../models/meeting.model';

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';
const BASE = `${TEST_API_URL}/meetings`;

const MEETING: MeetingResponse = {
  id: 'm-1',
  title: 'Sprint Review',
  status: 'DRAFT',
  scheduledAt: '2026-08-01T10:00:00Z',
  totalDurationMinutes: 60,
  teamId: null,
  agendaItems: [],
  createdAt: '2026-07-27T08:00:00Z',
};

const BOOKING_MEETING: MeetingBookingResponse = {
  id: 'm-2',
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
  ],
};

describe('MeetingApiService', () => {
  let service: MeetingApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
      ],
    });
    service = TestBed.inject(MeetingApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('createMeeting() POSTs to /meetings with the given body', () => {
    service
      .createMeeting({ title: 'Sprint Review', scheduledAt: '2026-08-01T10:00:00Z', totalDurationMinutes: 60 })
      .subscribe();
    const req = httpMock.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      title: 'Sprint Review',
      scheduledAt: '2026-08-01T10:00:00Z',
      totalDurationMinutes: 60,
    });
    req.flush(MEETING);
  });

  it('createMeeting() forwards agendaItems and teamId when provided', () => {
    service
      .createMeeting({
        title: 'Planning',
        scheduledAt: '2026-08-01T10:00:00Z',
        totalDurationMinutes: 30,
        teamId: 42,
        agendaItems: [{ title: 'Point A', durationMinutes: 10, type: 'INFO' }],
      })
      .subscribe();
    const req = httpMock.expectOne(BASE);
    expect(req.request.body.teamId).toBe(42);
    expect(req.request.body.agendaItems).toEqual([{ title: 'Point A', durationMinutes: 10, type: 'INFO' }]);
    req.flush(MEETING);
  });

  // -----------------------------------------------------------------------------------------
  // Animation (US12.2.1)
  // -----------------------------------------------------------------------------------------

  it('start() POSTs to /meetings/{id}/start with an empty body', () => {
    service.start('m-1').subscribe();
    const req = httpMock.expectOne(`${BASE}/m-1/start`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(null);
  });

  it('next() POSTs to /meetings/{id}/agenda/next', () => {
    service.next('m-1').subscribe();
    const req = httpMock.expectOne(`${BASE}/m-1/agenda/next`);
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('end() POSTs to /meetings/{id}/end', () => {
    service.end('m-1').subscribe();
    const req = httpMock.expectOne(`${BASE}/m-1/end`);
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('addAction() POSTs to /meetings/{id}/actions with the given body', () => {
    const action: MeetingActionResponse = {
      id: 'a-1',
      meetingId: 'm-1',
      label: 'Follow up',
      status: 'OPEN',
      createdAt: '2026-08-01T10:05:00Z',
    };
    service.addAction('m-1', { label: 'Follow up', ownerUserId: 42, dueDate: '2026-08-10' }).subscribe();
    const req = httpMock.expectOne(`${BASE}/m-1/actions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ label: 'Follow up', ownerUserId: 42, dueDate: '2026-08-10' });
    req.flush(action);
  });

  it('live() GETs /meetings/{id}/live', () => {
    const state: MeetingLiveState = {
      meetingId: 'm-1',
      status: 'IN_PROGRESS',
      currentIndex: 0,
      totalItems: 2,
      currentAgendaItemId: 'ai-1',
      elapsedSeconds: 30,
      remainingSeconds: 270,
      overtime: false,
      overtimeSeconds: 0,
      agendaItems: [],
    };
    let received: MeetingLiveState | undefined;
    service.live('m-1').subscribe(s => (received = s));
    const req = httpMock.expectOne(`${BASE}/m-1/live`);
    expect(req.request.method).toBe('GET');
    req.flush(state);
    expect(received).toEqual(state);
  });

  // -----------------------------------------------------------------------------------------
  // Booking flow (US12.4.1)
  // -----------------------------------------------------------------------------------------

  it('getMeeting() GETs /meetings/{id}', () => {
    service.getMeeting('m-2').subscribe(response => {
      expect(response).toEqual(BOOKING_MEETING);
    });
    const req = httpMock.expectOne(`${BASE}/m-2`);
    expect(req.request.method).toBe('GET');
    req.flush(BOOKING_MEETING);
  });

  it('confirmSlot() POSTs the slotId to /meetings/{id}/confirm', () => {
    service.confirmSlot('m-2', { slotId: 'slot-1' }).subscribe();
    const req = httpMock.expectOne(`${BASE}/m-2/confirm`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ slotId: 'slot-1' });
    req.flush({ ...BOOKING_MEETING, status: 'CONFIRMED' });
  });

  it('adjustSlot() PATCHes the new boundaries to /meetings/{id}/slot', () => {
    service
      .adjustSlot('m-2', { slotId: 'slot-1', start: '2026-08-03T14:00:00Z', end: '2026-08-03T14:30:00Z' })
      .subscribe();
    const req = httpMock.expectOne(`${BASE}/m-2/slot`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      slotId: 'slot-1',
      start: '2026-08-03T14:00:00Z',
      end: '2026-08-03T14:30:00Z',
    });
    req.flush(BOOKING_MEETING);
  });
});
