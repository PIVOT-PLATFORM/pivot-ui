import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PlansService } from './plans.service';
import type { PlanDto } from './plan.model';
import { environment } from '../../../../environments/environment';

const API_URL = `${environment.apiUrl}/superadmin/plans`;

const makeDto = (id: number, overrides: Partial<PlanDto> = {}): PlanDto => ({
  id,
  name: `Plan ${id}`,
  moduleIds: [],
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('PlansService', () => {
  let service: PlansService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlansService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates the service', () => {
    expect(service).toBeTruthy();
  });

  describe('loadAll()', () => {
    it('calls GET /superadmin/plans and populates state on success', () => {
      service.loadAll().subscribe();

      const req = httpMock.expectOne(r => r.url === API_URL && r.method === 'GET');
      req.flush([makeDto(1), makeDto(2)]);

      expect(service.plans()).toHaveLength(2);
      expect(service.loading()).toBe(false);
      expect(service.loadError()).toBe(false);
    });

    it('sets loading true while the request is in flight', () => {
      service.loadAll().subscribe();
      expect(service.loading()).toBe(true);
      httpMock.expectOne(API_URL).flush([]);
      expect(service.loading()).toBe(false);
    });

    it('sets loadError true and empties plans on a GET failure', () => {
      service.loadAll().subscribe();
      httpMock.expectOne(API_URL).flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(service.loadError()).toBe(true);
      expect(service.loading()).toBe(false);
      expect(service.plans()).toEqual([]);
    });

    it('completes without throwing on GET failure (callers do not need an error handler)', () => {
      let errored = false;
      let completed = false;
      service.loadAll().subscribe({ error: () => (errored = true), complete: () => (completed = true) });
      httpMock.expectOne(API_URL).flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(errored).toBe(false);
      expect(completed).toBe(true);
    });
  });

  describe('create()', () => {
    it('posts the name and appends the created plan to plans() on success', () => {
      service.loadAll().subscribe();
      httpMock.expectOne(API_URL).flush([makeDto(1)]);

      service.create({ name: 'Gold' }).subscribe();
      const req = httpMock.expectOne(r => r.url === API_URL && r.method === 'POST');
      expect(req.request.body).toEqual({ name: 'Gold' });
      req.flush(makeDto(2, { name: 'Gold' }));

      expect(service.plans().map(p => p.name)).toEqual(['Plan 1', 'Gold']);
    });

    it('rejects with the raw HttpErrorResponse on a 409 (name already taken)', () => {
      let caughtStatus: number | undefined;
      service.create({ name: 'Gold' }).subscribe({ error: err => (caughtStatus = err.status) });

      httpMock
        .expectOne(API_URL)
        .flush({ error: 'PLAN_NAME_ALREADY_EXISTS', message: 'x' }, { status: 409, statusText: 'Conflict' });

      expect(caughtStatus).toBe(409);
      expect(service.plans()).toEqual([]);
    });

    it('rejects with the raw HttpErrorResponse on a 400 (blank/too-long name)', () => {
      let caughtStatus: number | undefined;
      service.create({ name: '' }).subscribe({ error: err => (caughtStatus = err.status) });

      httpMock.expectOne(API_URL).flush({ error: 'VALIDATION' }, { status: 400, statusText: 'Bad Request' });

      expect(caughtStatus).toBe(400);
    });
  });

  describe('loadOne()', () => {
    it('calls GET /superadmin/plans/{id} and populates currentPlan on success', () => {
      service.loadOne(1).subscribe();

      const req = httpMock.expectOne(r => r.url === `${API_URL}/1` && r.method === 'GET');
      req.flush(makeDto(1, { moduleIds: ['whiteboard', 'quiz'] }));

      expect(service.currentPlan()).toEqual(makeDto(1, { moduleIds: ['whiteboard', 'quiz'] }));
      expect(service.detailLoading()).toBe(false);
      expect(service.detailError()).toBe(false);
      expect(service.detailNotFound()).toBe(false);
    });

    it('sets detailLoading true while the request is in flight', () => {
      service.loadOne(1).subscribe();
      expect(service.detailLoading()).toBe(true);
      httpMock.expectOne(`${API_URL}/1`).flush(makeDto(1));
      expect(service.detailLoading()).toBe(false);
    });

    it('sets detailNotFound true on a 404, and leaves currentPlan null', () => {
      service.loadOne(999).subscribe();
      httpMock
        .expectOne(`${API_URL}/999`)
        .flush({ error: 'PLAN_NOT_FOUND', message: 'x' }, { status: 404, statusText: 'Not Found' });

      expect(service.detailNotFound()).toBe(true);
      expect(service.detailError()).toBe(false);
      expect(service.currentPlan()).toBeNull();
    });

    it('sets detailError true (not detailNotFound) on a non-404 failure', () => {
      service.loadOne(1).subscribe();
      httpMock.expectOne(`${API_URL}/1`).flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(service.detailError()).toBe(true);
      expect(service.detailNotFound()).toBe(false);
      expect(service.currentPlan()).toBeNull();
    });

    it('completes without throwing on a failed GET', () => {
      let errored = false;
      let completed = false;
      service.loadOne(1).subscribe({ error: () => (errored = true), complete: () => (completed = true) });
      httpMock.expectOne(`${API_URL}/1`).flush('x', { status: 500, statusText: 'Internal Server Error' });

      expect(errored).toBe(false);
      expect(completed).toBe(true);
    });
  });

  describe('replaceModules()', () => {
    it('PUTs the full moduleIds list and patches currentPlan on success', () => {
      service.loadOne(1).subscribe();
      httpMock.expectOne(`${API_URL}/1`).flush(makeDto(1, { moduleIds: ['quiz', 'whiteboard'] }));

      service.replaceModules(1, ['whiteboard']).subscribe();
      const req = httpMock.expectOne(r => r.url === `${API_URL}/1/modules` && r.method === 'PUT');
      expect(req.request.body).toEqual({ moduleIds: ['whiteboard'] });
      req.flush({ moduleIds: ['whiteboard'] });

      expect(service.currentPlan()?.moduleIds).toEqual(['whiteboard']);
      // Other PlanDto fields are preserved, not clobbered by the {moduleIds}-only response.
      expect(service.currentPlan()?.name).toBe('Plan 1');
    });

    it('accepts an explicit empty array as a valid "clear all modules" request', () => {
      service.loadOne(1).subscribe();
      httpMock.expectOne(`${API_URL}/1`).flush(makeDto(1, { moduleIds: ['whiteboard'] }));

      service.replaceModules(1, []).subscribe();
      const req = httpMock.expectOne(r => r.url === `${API_URL}/1/modules` && r.method === 'PUT');
      expect(req.request.body).toEqual({ moduleIds: [] });
      req.flush({ moduleIds: [] });

      expect(service.currentPlan()?.moduleIds).toEqual([]);
    });

    it('propagates a 404 (unknown plan) as an HttpErrorResponse', () => {
      let caughtStatus: number | undefined;
      service.replaceModules(999, []).subscribe({ error: err => (caughtStatus = err.status) });
      httpMock
        .expectOne(`${API_URL}/999/modules`)
        .flush({ error: 'PLAN_NOT_FOUND', message: 'x' }, { status: 404, statusText: 'Not Found' });

      expect(caughtStatus).toBe(404);
    });

    it('propagates a 400 (unknown module id) as an HttpErrorResponse', () => {
      let caughtStatus: number | undefined;
      service.replaceModules(1, ['bogus']).subscribe({ error: err => (caughtStatus = err.status) });
      httpMock
        .expectOne(`${API_URL}/1/modules`)
        .flush({ error: 'UNKNOWN_MODULE_ID', message: 'x' }, { status: 400, statusText: 'Bad Request' });

      expect(caughtStatus).toBe(400);
    });

    it('does not patch currentPlan when replacing modules for a different planId', () => {
      service.loadOne(1).subscribe();
      httpMock.expectOne(`${API_URL}/1`).flush(makeDto(1, { moduleIds: ['whiteboard'] }));

      service.replaceModules(2, ['quiz']).subscribe();
      httpMock.expectOne(`${API_URL}/2/modules`).flush({ moduleIds: ['quiz'] });

      expect(service.currentPlan()?.id).toBe(1);
      expect(service.currentPlan()?.moduleIds).toEqual(['whiteboard']);
    });
  });

  describe('addModule()', () => {
    it('POSTs to the single-add endpoint with no body and patches currentPlan on success', () => {
      service.loadOne(1).subscribe();
      httpMock.expectOne(`${API_URL}/1`).flush(makeDto(1, { moduleIds: ['quiz'] }));

      service.addModule(1, 'whiteboard').subscribe();
      const req = httpMock.expectOne(r => r.url === `${API_URL}/1/modules/whiteboard` && r.method === 'POST');
      expect(req.request.body).toBeNull();
      req.flush({ moduleIds: ['quiz', 'whiteboard'] });

      expect(service.currentPlan()?.moduleIds).toEqual(['quiz', 'whiteboard']);
    });

    it('is idempotent: re-adding an already-present module succeeds (200), not an error', () => {
      service.loadOne(1).subscribe();
      httpMock.expectOne(`${API_URL}/1`).flush(makeDto(1, { moduleIds: ['whiteboard'] }));

      let errored = false;
      service.addModule(1, 'whiteboard').subscribe({ error: () => (errored = true) });
      httpMock.expectOne(`${API_URL}/1/modules/whiteboard`).flush({ moduleIds: ['whiteboard'] });

      expect(errored).toBe(false);
      expect(service.currentPlan()?.moduleIds).toEqual(['whiteboard']);
    });

    it('URL-encodes the moduleId path segment', () => {
      service.addModule(1, 'a b').subscribe();
      httpMock.expectOne(`${API_URL}/1/modules/a%20b`).flush({ moduleIds: ['a b'] });
    });

    it('propagates a 400 (unknown module id) as an HttpErrorResponse', () => {
      let caughtStatus: number | undefined;
      service.addModule(1, 'bogus').subscribe({ error: err => (caughtStatus = err.status) });
      httpMock
        .expectOne(`${API_URL}/1/modules/bogus`)
        .flush({ error: 'UNKNOWN_MODULE_ID', message: 'x' }, { status: 400, statusText: 'Bad Request' });

      expect(caughtStatus).toBe(400);
    });

    it('propagates a 404 (unknown plan) as an HttpErrorResponse', () => {
      let caughtStatus: number | undefined;
      service.addModule(999, 'whiteboard').subscribe({ error: err => (caughtStatus = err.status) });
      httpMock
        .expectOne(`${API_URL}/999/modules/whiteboard`)
        .flush({ error: 'PLAN_NOT_FOUND', message: 'x' }, { status: 404, statusText: 'Not Found' });

      expect(caughtStatus).toBe(404);
    });
  });
});
