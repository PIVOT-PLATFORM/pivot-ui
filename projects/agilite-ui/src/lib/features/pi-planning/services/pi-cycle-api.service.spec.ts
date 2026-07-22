import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { PiCycleResponse, PiCycleTeamResponse, PiIterationResponse } from '../models/pi-planning.model';
import { PiCycleApiService } from './pi-cycle-api.service';

describe('PiCycleApiService', () => {
  let service: PiCycleApiService;
  let httpMock: HttpTestingController;

  const cycle: PiCycleResponse = {
    id: 'c-1',
    tenantId: 1,
    name: 'PI 2026.Q3',
    artName: null,
    status: 'PREPARATION',
    startDate: '2026-08-01',
    endDate: '2026-10-10',
    eventDay1: null,
    eventDay2: null,
    eventLocation: null,
    createdBy: 1,
    iterations: [],
    teams: [],
    createdAt: '2026-07-22T08:00:00Z',
    updatedAt: '2026-07-22T08:00:00Z',
  };

  const team: PiCycleTeamResponse = { id: 't-1', name: 'Team A', color: '#3b82f6', order: 0, sourceTeamId: 1 };

  const iteration: PiIterationResponse = {
    id: 'i-1',
    number: 1,
    label: 'IT1',
    startDate: '2026-08-01',
    endDate: '2026-08-14',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PiCycleApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listTeams() calls GET /teams', () => {
    service.listTeams().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/teams`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, name: 'Team A' }]);
  });

  it('createCycle() POSTs /pi/cycles with the given request body', () => {
    service.createCycle({ name: 'PI 2026.Q3', startDate: '2026-08-01', iterationCount: 5, iterationWeeks: 2 }).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'PI 2026.Q3', startDate: '2026-08-01', iterationCount: 5, iterationWeeks: 2 });
    req.flush(cycle);
  });

  it('listCycles() calls GET /pi/cycles', () => {
    service.listCycles().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getCycle() calls GET /pi/cycles/{id}', () => {
    service.getCycle('c-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1`);
    expect(req.request.method).toBe('GET');
    req.flush(cycle);
  });

  it('updateCycle() PATCHes /pi/cycles/{id} with the given request body', () => {
    service.updateCycle('c-1', { status: 'ACTIVE' }).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'ACTIVE' });
    req.flush(cycle);
  });

  it('deleteCycle() calls DELETE /pi/cycles/{id}', () => {
    service.deleteCycle('c-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('updateIteration() PATCHes /pi/cycles/{id}/iterations/{iterationId}', () => {
    service.updateIteration('c-1', 'i-1', { label: 'IP Sprint (décalé)' }).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/iterations/i-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ label: 'IP Sprint (décalé)' });
    req.flush(iteration);
  });

  it('addManualTeam() POSTs /pi/cycles/{id}/teams', () => {
    service.addManualTeam('c-1', { name: 'Partenaire externe' }).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/teams`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Partenaire externe' });
    req.flush(team);
  });

  it('importTeams() POSTs /pi/cycles/{id}/teams/import with teamIds', () => {
    service.importTeams('c-1', [1, 2, 3]).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/teams/import`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ teamIds: [1, 2, 3] });
    req.flush({ importedCount: 3, teams: [team] });
  });

  it('updateTeam() PATCHes /pi/cycles/{id}/teams/{teamId}', () => {
    service.updateTeam('c-1', 't-1', { order: 2 }).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/teams/t-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ order: 2 });
    req.flush(team);
  });

  it('deleteTeam() calls DELETE /pi/cycles/{id}/teams/{teamId}', () => {
    service.deleteTeam('c-1', 't-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/teams/t-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
