import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import {
  CadenceRequest,
  CapacityAbsenceRequest,
  CapacityEventRequest,
  CapacityEventResponse,
  CapacityMemberRequest,
  CapacityVelocityRequest,
} from '../models/capacity.model';
import { CapacityApiService } from './capacity-api.service';

describe('CapacityApiService', () => {
  let service: CapacityApiService;
  let httpMock: HttpTestingController;

  const event: CapacityEventResponse = {
    id: 'e-1',
    tenantId: 1,
    teamId: 1,
    type: 'SPRINT',
    status: 'PLANNING',
    name: 'Sprint 1',
    startDate: '2026-07-01',
    endDate: '2026-07-14',
    parentId: null,
    maturityLevel: null,
    focusFactor: null,
    margeSecurite: null,
    pointsPerDay: null,
    committedPoints: null,
    completedPoints: null,
    workingDays: [1, 2, 3, 4, 5],
    notes: null,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CapacityApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('createEvent() calls POST /capacity/events with the request body', () => {
    const body: CapacityEventRequest = {
      teamId: 1,
      type: 'SPRINT',
      name: 'Sprint 1',
      startDate: '2026-07-01',
      endDate: '2026-07-14',
    };
    service.createEvent(body).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(event);
  });

  it('listEvents() calls GET /capacity/events without params by default', () => {
    service.listEvents().subscribe();
    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/capacity/events` &&
        !r.params.has('teamId') &&
        !r.params.has('type') &&
        !r.params.has('status'),
    );
    expect(req.request.method).toBe('GET');
    req.flush([event]);
  });

  it('listEvents() passes teamId/type/status query params when given', () => {
    service.listEvents(1, 'SPRINT', 'ACTIVE').subscribe();
    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/capacity/events` &&
        r.params.get('teamId') === '1' &&
        r.params.get('type') === 'SPRINT' &&
        r.params.get('status') === 'ACTIVE',
    );
    expect(req.request.method).toBe('GET');
    req.flush([event]);
  });

  it('getEvent() calls GET /capacity/events/{id}', () => {
    service.getEvent('e-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1`);
    expect(req.request.method).toBe('GET');
    req.flush(event);
  });

  it('updateEvent() calls PUT /capacity/events/{id} with the request body', () => {
    const body: CapacityEventRequest = {
      type: 'SPRINT',
      name: 'Sprint 1 renamed',
      startDate: '2026-07-01',
      endDate: '2026-07-14',
    };
    service.updateEvent('e-1', body).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush(event);
  });

  it('deleteEvent() calls DELETE /capacity/events/{id}', () => {
    service.deleteEvent('e-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('listChildren() calls GET /capacity/events/{piId}/children', () => {
    service.listChildren('pi-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/pi-1/children`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('generateCadence() calls POST /capacity/events/{piId}/cadence with the request body', () => {
    const body: CadenceRequest = { sprintLengthWeeks: 2, sprintCount: 6, includeIpSprint: true };
    service.generateCadence('pi-1', body).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/pi-1/cadence`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush([]);
  });

  it('addMember() calls POST /capacity/events/{eventId}/members with the request body', () => {
    const body: CapacityMemberRequest = { name: 'Ada Lovelace', quotite: 1 };
    service.addMember('e-1', body).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/members`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({
      id: 'm-1',
      eventId: 'e-1',
      teamMemberRef: null,
      name: 'Ada Lovelace',
      role: null,
      quotite: 1,
      focusFactor: null,
      locality: null,
      excluded: false,
      position: 0,
    });
  });

  it('updateMember() calls PUT /capacity/members/{memberId} with the request body', () => {
    const body: CapacityMemberRequest = { name: 'Ada Lovelace', quotite: 0.8 };
    service.updateMember('m-1', body).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/members/m-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({
      id: 'm-1',
      eventId: 'e-1',
      teamMemberRef: null,
      name: 'Ada Lovelace',
      role: null,
      quotite: 0.8,
      focusFactor: null,
      locality: null,
      excluded: false,
      position: 0,
    });
  });

  it('deleteMember() calls DELETE /capacity/members/{memberId}', () => {
    service.deleteMember('m-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/members/m-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('addAbsence() calls POST /capacity/members/{memberId}/absences with the request body', () => {
    const body: CapacityAbsenceRequest = { startDate: '2026-07-06', endDate: '2026-07-06', fraction: 1 };
    service.addAbsence('m-1', body).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/members/m-1/absences`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({
      id: 'a-1',
      eventMemberId: 'm-1',
      startDate: '2026-07-06',
      endDate: '2026-07-06',
      fraction: 1,
      source: 'MANUAL',
    });
  });

  it('deleteAbsence() calls DELETE /capacity/absences/{absenceId}', () => {
    service.deleteAbsence('a-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/absences/a-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('upsertVelocity() calls PATCH /capacity/events/{id}/velocity with the request body', () => {
    const body: CapacityVelocityRequest = { pointsEngages: 30, pointsLivres: 28 };
    service.upsertVelocity('e-1', body).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/velocity`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(body);
    req.flush({ id: 'v-1', sprintEventId: 'e-1', pointsEngages: 30, pointsLivres: 28, createdAt: '2026-07-14T00:00:00Z' });
  });

  it('getHistory() calls GET /capacity/events/{id}/history', () => {
    service.getHistory('e-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/history`);
    expect(req.request.method).toBe('GET');
    req.flush({ history: [], forecast: null });
  });

  it('getBurndown() calls GET /capacity/events/{id}/burndown', () => {
    service.getBurndown('e-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/burndown`);
    expect(req.request.method).toBe('GET');
    req.flush({ real: [], ideal: [] });
  });

  it('getSummary() calls GET /capacity/events/{id}/summary', () => {
    service.getSummary('e-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/summary`);
    expect(req.request.method).toBe('GET');
    req.flush({
      eventId: 'e-1',
      eventType: 'SPRINT',
      eventName: 'Sprint 1',
      totalWorkingDays: 10,
      members: [],
      totalNetPersonDays: 0,
      totalNetCapacity: 0,
      totalPoints: null,
      totalRecommendedEngagement: 0,
      loadRatio: null,
      predictability: null,
      consolidation: null,
      gauge: { engagedPoints: 0, referenceEngagement: 0, overflowThreshold: 1, engagementRatio: null, overCommitted: false },
    });
  });

  it('getKpis() calls GET /kpi with the eventId query param', () => {
    service.getKpis('e-1').subscribe();
    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/kpi` && r.params.get('eventId') === 'e-1',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ teamId: 1, eventSampleSize: 1, sprintSampleSize: 1, kpis: {} });
  });
});
