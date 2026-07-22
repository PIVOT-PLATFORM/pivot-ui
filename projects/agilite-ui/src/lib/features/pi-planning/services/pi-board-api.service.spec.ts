import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { PiBoardResponse, PiDependencyResponse, PiTicketResponse } from '../models/pi-planning.model';
import { PiBoardApiService } from './pi-board-api.service';

describe('PiBoardApiService', () => {
  let service: PiBoardApiService;
  let httpMock: HttpTestingController;

  const board: PiBoardResponse = { cycleId: 'c-1', iterations: [], teams: [], tickets: [], dependencies: [] };

  const ticket: PiTicketResponse = {
    id: 'tk-1',
    cycleId: 'c-1',
    type: 'FEATURE',
    title: 'Ticket 1',
    description: null,
    teamId: null,
    iterationId: null,
    order: 0,
  };

  const dependency: PiDependencyResponse = {
    id: 'd-1',
    cycleId: 'c-1',
    fromTicketId: 'tk-1',
    toTicketId: 'tk-2',
    status: 'OK',
    note: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PiBoardApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getBoard() calls GET /pi/cycles/{id}/board', () => {
    service.getBoard('c-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/board`);
    expect(req.request.method).toBe('GET');
    req.flush(board);
  });

  it('createTicket() POSTs /pi/cycles/{id}/tickets with the given request body', () => {
    service.createTicket('c-1', { type: 'FEATURE', title: 'Ticket 1' }).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/tickets`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ type: 'FEATURE', title: 'Ticket 1' });
    req.flush(ticket);
  });

  it('updateTicket() PATCHes /pi/cycles/{id}/tickets/{ticketId}, used for both edits and moves', () => {
    service.updateTicket('c-1', 'tk-1', { teamId: 't-1', iterationId: 'i-1', order: 2 }).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/tickets/tk-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ teamId: 't-1', iterationId: 'i-1', order: 2 });
    req.flush(ticket);
  });

  it('deleteTicket() calls DELETE /pi/cycles/{id}/tickets/{ticketId}', () => {
    service.deleteTicket('c-1', 'tk-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/tickets/tk-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('createDependency() POSTs /pi/cycles/{id}/dependencies with the given request body', () => {
    service.createDependency('c-1', { fromTicketId: 'tk-1', toTicketId: 'tk-2' }).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/dependencies`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ fromTicketId: 'tk-1', toTicketId: 'tk-2' });
    req.flush(dependency);
  });

  it('updateDependency() PATCHes /pi/cycles/{id}/dependencies/{depId}', () => {
    service.updateDependency('c-1', 'd-1', { status: 'BLOCKED' }).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/dependencies/d-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'BLOCKED' });
    req.flush(dependency);
  });

  it('deleteDependency() calls DELETE /pi/cycles/{id}/dependencies/{depId}', () => {
    service.deleteDependency('c-1', 'd-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/dependencies/d-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
