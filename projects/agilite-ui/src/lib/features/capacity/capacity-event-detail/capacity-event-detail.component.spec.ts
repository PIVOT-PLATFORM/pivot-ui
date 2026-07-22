import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { CapacityEventMemberResponse, CapacityEventResponse, CapacitySummaryResponse } from '../models/capacity.model';
import { CapacityEventDetailComponent } from './capacity-event-detail.component';

const sprintEvent: CapacityEventResponse = {
  id: 'e-1',
  tenantId: 1,
  teamId: 42,
  parentEventId: null,
  type: 'SPRINT',
  name: 'Sprint 20',
  startDate: '2026-08-01',
  endDate: '2026-08-14',
  pointsPerDay: 5,
  committedPoints: 30,
  completedPoints: null,
  createdBy: 1,
  parent: null,
  children: [],
  createdAt: '2026-07-22T08:00:00Z',
  updatedAt: '2026-07-22T08:00:00Z',
};

const piEvent: CapacityEventResponse = {
  ...sprintEvent,
  id: 'pi-1',
  type: 'PI_PLANNING',
  committedPoints: null,
  children: [{ id: 'e-1', type: 'SPRINT', name: 'Sprint 20', startDate: '2026-08-01', endDate: '2026-08-14' }],
};

const summary: CapacitySummaryResponse = {
  durationDays: 14,
  workingDays: 10,
  memberCount: 3,
  totalAbsenceDays: 1,
  netCapacityDays: 27,
  netCapacityPoints: 135,
  isProvisional: true,
};

const member: CapacityEventMemberResponse = {
  id: 'm-1',
  eventId: 'e-1',
  teamMemberId: 7,
  name: 'Alice',
  availabilityPercent: 100,
  excluded: false,
  absences: [],
};

describe('CapacityEventDetailComponent', () => {
  let httpMock: HttpTestingController;

  async function setup(eventId = 'e-1') {
    await TestBed.configureTestingModule({
      imports: [CapacityEventDetailComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ eventId }) } } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => httpMock.verify());

  function createSprintFixture() {
    const fixture = TestBed.createComponent(CapacityEventDetailComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1`).flush(sprintEvent);
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/summary`).flush(summary);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/members`).flush([member]);
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/teams/42/velocity-history`).flush([]);
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/teams/42/velocity-history/average`).flush({ averageVelocity: null, suggestedCapacity: null });
    fixture.detectChanges();
    return fixture;
  }

  it('loads a SPRINT event, its summary, and its members (fetches members and velocity, not children)', async () => {
    await setup();
    const fixture = createSprintFixture();
    expect(fixture.componentInstance.event()).toEqual(sprintEvent);
    expect(fixture.componentInstance.summary()).toEqual(summary);
    expect(fixture.componentInstance.members()).toEqual([member]);
    expect(fixture.componentInstance.isSprint()).toBe(true);
    expect(fixture.componentInstance.isPiPlanning()).toBe(false);
  });

  it('loads a PI_PLANNING event without fetching members (a PI has no members of its own)', async () => {
    await setup('pi-1');
    const fixture = TestBed.createComponent(CapacityEventDetailComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/pi-1`).flush(piEvent);
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/pi-1/summary`).flush({ ...summary, netCapacityPoints: null });
    fixture.detectChanges();

    expect(fixture.componentInstance.isPiPlanning()).toBe(true);
    httpMock.expectNone(`${environment.apiUrl}/capacity/events/pi-1/members`);
  });

  it('toggles children visibility with an aria-expanded button (US11.3.1 A11y)', async () => {
    await setup('pi-1');
    const fixture = TestBed.createComponent(CapacityEventDetailComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/pi-1`).flush(piEvent);
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/pi-1/summary`).flush(summary);
    fixture.detectChanges();

    expect(fixture.componentInstance.childrenExpanded()).toBe(true);
    fixture.componentInstance.toggleChildrenExpanded();
    fixture.detectChanges();
    expect(fixture.componentInstance.childrenExpanded()).toBe(false);

    const button = (fixture.nativeElement as HTMLElement).querySelector('.capacity-detail__children-toggle');
    expect(button?.getAttribute('aria-expanded')).toBe('false');
  });

  it('toggles a member exclusion and reloads the summary', () => {
    return setup().then(() => {
      const fixture = createSprintFixture();
      fixture.componentInstance.toggleExcluded(member, { target: { checked: true } } as unknown as Event);
      httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/members/m-1`).flush({ ...member, excluded: true });
      httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/summary`).flush(summary);
      expect(fixture.componentInstance.members()[0].excluded).toBe(true);
    });
  });

  it('clamps availability to [10, 100] before sending the PATCH', () => {
    return setup().then(() => {
      const fixture = createSprintFixture();
      fixture.componentInstance.onAvailabilityInput(member, { target: { value: '5' } } as unknown as Event);
      const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/members/m-1`);
      expect(req.request.body).toEqual({ availabilityPercent: 10 });
      req.flush({ ...member, availabilityPercent: 10 });
      httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/summary`).flush(summary);
    });
  });

  it('adds an absence with ONLY a date range in the request body — no reason/category field (RGPD, US11.2.2)', () => {
    return setup().then(() => {
      const fixture = createSprintFixture();
      fixture.componentInstance.onAbsenceStartInput('m-1', { target: { value: '2026-08-03' } } as unknown as Event);
      fixture.componentInstance.onAbsenceEndInput('m-1', { target: { value: '2026-08-04' } } as unknown as Event);
      fixture.componentInstance.addAbsence(member);

      const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/members/m-1/absences`);
      expect(req.request.body).toEqual({ dateDebut: '2026-08-03', dateFin: '2026-08-04' });
      expect(Object.keys(req.request.body)).toHaveLength(2);
      req.flush({ id: 'a-1', dateDebut: '2026-08-03', dateFin: '2026-08-04' });

      httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/members`).flush([{ ...member, absences: [{ id: 'a-1', dateDebut: '2026-08-03', dateFin: '2026-08-04' }] }]);
      httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/summary`).flush(summary);
    });
  });

  it('the rendered absence form template has no reason/category input — only two date fields', () => {
    return setup().then(() => {
      const fixture = createSprintFixture();
      const form = (fixture.nativeElement as HTMLElement).querySelector('.capacity-detail__add-absence');
      const inputs = form ? Array.from(form.querySelectorAll('input')) : [];
      expect(inputs).toHaveLength(2);
      expect(inputs.every(i => i.type === 'date')).toBe(true);
      expect(form?.querySelector('textarea')).toBeNull();
      expect(form?.querySelector('select')).toBeNull();
    });
  });

  it('surfaces an absence error code from a 400 response', () => {
    return setup().then(() => {
      const fixture = createSprintFixture();
      fixture.componentInstance.onAbsenceStartInput('m-1', { target: { value: '2027-01-01' } } as unknown as Event);
      fixture.componentInstance.onAbsenceEndInput('m-1', { target: { value: '2027-01-02' } } as unknown as Event);
      fixture.componentInstance.addAbsence(member);

      httpMock
        .expectOne(`${environment.apiUrl}/capacity/events/e-1/members/m-1/absences`)
        .flush({ code: 'ABSENCE_OUTSIDE_EVENT' }, { status: 400, statusText: 'Bad Request' });

      expect(fixture.componentInstance.absenceError()).toBe('ABSENCE_OUTSIDE_EVENT');
    });
  });

  it('deletes an absence and reloads members/summary', () => {
    return setup().then(() => {
      const fixture = createSprintFixture();
      fixture.componentInstance.deleteAbsence('a-1');
      httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/absences/a-1`).flush(null, { status: 204, statusText: 'No Content' });
      httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/members`).flush([member]);
      httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/summary`).flush(summary);
    });
  });

  it('saves only the velocity fields that were actually edited', () => {
    return setup().then(() => {
      const fixture = createSprintFixture();
      fixture.componentInstance.completedPointsDraft.set('28');
      fixture.componentInstance.saveVelocity();

      const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/velocity`);
      expect(req.request.body).toEqual({ committedPoints: 30, completedPoints: 28 });
      req.flush({ ...sprintEvent, completedPoints: 28 });
      httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/teams/42/velocity-history`).flush([]);
      httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/teams/42/velocity-history/average`).flush({ averageVelocity: 28, suggestedCapacity: 23.8 });

      expect(fixture.componentInstance.velocitySaving()).toBe(false);
    });
  });

  it('flags loadError on a failed event fetch', async () => {
    await setup();
    const fixture = TestBed.createComponent(CapacityEventDetailComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1`).flush(null, { status: 500, statusText: 'Server Error' });
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/summary`).flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(fixture.componentInstance.loadError()).toBe(true);
  });
});
