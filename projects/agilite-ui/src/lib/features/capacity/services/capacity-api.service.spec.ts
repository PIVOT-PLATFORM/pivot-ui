import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { CapacityEventResponse } from '../models/capacity.model';
import { CapacityApiService } from './capacity-api.service';

describe('CapacityApiService', () => {
  let service: CapacityApiService;
  let httpMock: HttpTestingController;

  const event: CapacityEventResponse = {
    id: 'e-1',
    tenantId: 1,
    teamId: 42,
    parentEventId: null,
    type: 'SPRINT',
    name: 'Sprint 20',
    startDate: '2026-08-01',
    endDate: '2026-08-14',
    pointsPerDay: null,
    committedPoints: null,
    completedPoints: null,
    isIpIteration: false,
    focusFactorPercent: null,
    createdBy: 1,
    parent: null,
    children: [],
    createdAt: '2026-07-22T08:00:00Z',
    updatedAt: '2026-07-22T08:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CapacityApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listTeams() calls GET /teams', () => {
    service.listTeams().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/teams`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, name: 'Team A' }]);
  });

  it('createEvent() POSTs /capacity/events with the given request body', () => {
    service.createEvent({ type: 'SPRINT', name: 'Sprint 20', teamId: 42, startDate: '2026-08-01', endDate: '2026-08-14' }).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ type: 'SPRINT', name: 'Sprint 20', teamId: 42, startDate: '2026-08-01', endDate: '2026-08-14' });
    req.flush(event);
  });

  it('listEvents() calls GET /capacity/events with team/type query params', () => {
    service.listEvents(42, 'SPRINT').subscribe();
    const req = httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/events`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('teamId')).toBe('42');
    expect(req.request.params.get('type')).toBe('SPRINT');
    req.flush([]);
  });

  it('getEvent() calls GET /capacity/events/{id}', () => {
    service.getEvent('e-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1`);
    expect(req.request.method).toBe('GET');
    req.flush(event);
  });

  it('updateEvent() PATCHes /capacity/events/{id}', () => {
    service.updateEvent('e-1', { name: 'Sprint 20 (renamed)' }).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'Sprint 20 (renamed)' });
    req.flush(event);
  });

  it('deleteEvent() calls DELETE /capacity/events/{id}', () => {
    service.deleteEvent('e-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('listChildren() calls GET /capacity/events/{id}/children', () => {
    service.listChildren('pi-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/pi-1/children`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getSummary() calls GET /capacity/events/{id}/summary', () => {
    service.getSummary('e-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/summary`);
    expect(req.request.method).toBe('GET');
    req.flush({
      durationDays: 14,
      workingDays: 10,
      memberCount: 5,
      totalAbsenceDays: 0,
      netCapacityDays: 50,
      netCapacityPoints: null,
      isProvisional: true,
      marginPercent: null,
      maturitySource: null,
      forecastPoints: null,
      engagementRecommendedPoints: null,
    });
  });

  it('listMembers() calls GET /capacity/events/{id}/members', () => {
    service.listMembers('e-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/members`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('updateMember() PATCHes /capacity/events/{id}/members/{memberId}', () => {
    service.updateMember('e-1', 'm-1', { excluded: true }).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/members/m-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ excluded: true });
    req.flush({ id: 'm-1', eventId: 'e-1', teamMemberId: 1, name: 'Alice', availabilityPercent: 100, excluded: true, focusFactorPercent: null, absences: [] });
  });

  it('createAbsence() POSTs /capacity/events/{id}/members/{memberId}/absences with ONLY a date range — no reason field in the request contract', () => {
    service.createAbsence('e-1', 'm-1', { dateDebut: '2026-08-03', dateFin: '2026-08-04' }).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/members/m-1/absences`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ dateDebut: '2026-08-03', dateFin: '2026-08-04' });
    expect(Object.keys(req.request.body)).not.toContain('motif');
    expect(Object.keys(req.request.body)).not.toContain('reason');
    req.flush({ id: 'a-1', dateDebut: '2026-08-03', dateFin: '2026-08-04' });
  });

  it('deleteAbsence() calls DELETE /capacity/events/{id}/absences/{absenceId}', () => {
    service.deleteAbsence('e-1', 'a-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/absences/a-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('updateVelocity() PATCHes /capacity/events/{id}/velocity', () => {
    service.updateVelocity('e-1', { committedPoints: 20 }).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/velocity`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ committedPoints: 20 });
    req.flush(event);
  });

  it('getVelocityHistory() calls GET /capacity/teams/{teamId}/velocity-history', () => {
    service.getVelocityHistory(42, 5).subscribe();
    const req = httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/teams/42/velocity-history`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('limit')).toBe('5');
    req.flush([]);
  });

  it('getVelocityAverage() calls GET /capacity/teams/{teamId}/velocity-history/average', () => {
    service.getVelocityAverage(42, 3, 0.85).subscribe();
    const req = httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/teams/42/velocity-history/average`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('count')).toBe('3');
    expect(req.request.params.get('factor')).toBe('0.85');
    req.flush({ averageVelocity: null, suggestedCapacity: null });
  });

  it('getBurndown() calls GET /capacity/events/{id}/burndown', () => {
    service.getBurndown('e-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/burndown`);
    expect(req.request.method).toBe('GET');
    req.flush({ ideal: [], actual: [], atRisk: false, stale: false });
  });

  it('upsertBurndownEntry() PUTs /capacity/events/{id}/burndown/{date}', () => {
    service.upsertBurndownEntry('e-1', '2026-08-03', 42).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/burndown/2026-08-03`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ pointsRemaining: 42 });
    req.flush(null);
  });

  it('listHolidays() calls GET /capacity/holidays with optional period params', () => {
    service.listHolidays('2026-01-01', '2026-12-31').subscribe();
    const req = httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/holidays`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('from')).toBe('2026-01-01');
    expect(req.request.params.get('to')).toBe('2026-12-31');
    req.flush([]);
  });

  it('createHoliday() POSTs /capacity/holidays', () => {
    service.createHoliday({ date: '2026-12-25', label: 'Noël' }).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/holidays`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ date: '2026-12-25', label: 'Noël' });
    req.flush({ id: 'h-1', date: '2026-12-25', label: 'Noël' });
  });

  it('deleteHoliday() calls DELETE /capacity/holidays/{id}', () => {
    service.deleteHoliday('h-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/holidays/h-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('getTeamMaturity() calls GET /capacity/teams/{teamId}/capacity-maturity', () => {
    service.getTeamMaturity(42).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/teams/42/capacity-maturity`);
    expect(req.request.method).toBe('GET');
    req.flush({ teamId: 42, maturity: null, effectiveFocusFactorPercent: 70, effectiveMarginPercent: 15 });
  });

  it('updateTeamMaturity() PATCHes /capacity/teams/{teamId}/capacity-maturity', () => {
    service.updateTeamMaturity(42, { maturity: 'NORMING' }).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/teams/42/capacity-maturity`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ maturity: 'NORMING' });
    req.flush({ teamId: 42, maturity: 'NORMING', effectiveFocusFactorPercent: 70, effectiveMarginPercent: 10 });
  });

  it('getVelocityForecast() calls GET /capacity/teams/{teamId}/velocity-forecast with an optional window param', () => {
    service.getVelocityForecast(42, 5).subscribe();
    const req = httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/teams/42/velocity-forecast`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('window')).toBe('5');
    req.flush({ forecastPoints: 24, confidenceInterval: 'NARROW', basis: 'HISTORY' });
  });

  it('importAbsencesCsv() POSTs multipart/form-data to /capacity/events/{id}/absences/import', () => {
    const file = new File(['teamMemberIdOrEmail,dateDebut,dateFin\nalice@x.com,2026-08-03,2026-08-04'], 'absences.csv', { type: 'text/csv' });
    service.importAbsencesCsv('e-1', file).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/absences/import`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush({ imported: 1, errors: [] });
  });
});
