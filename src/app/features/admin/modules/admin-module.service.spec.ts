import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AdminModuleService } from './admin-module.service';
import type { AdminModuleDto } from './admin-module.model';
import { environment } from '../../../../environments/environment';

const makeDto = (id: string, enabled = false, source: AdminModuleDto['source'] = 'plan'): AdminModuleDto => ({
  id,
  name: id,
  enabled,
  description: `${id} description`,
  source,
});

describe('AdminModuleService', () => {
  let service: AdminModuleService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminModuleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates the service', () => {
    expect(service).toBeTruthy();
  });

  describe('loadModules()', () => {
    it('calls GET /api/admin/modules and populates the modules signal on success', () => {
      service.loadModules().subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/admin/modules`);
      expect(req.request.method).toBe('GET');
      req.flush([makeDto('whiteboard', true), makeDto('quiz', false)]);

      expect(service.modules()).toHaveLength(2);
      expect(service.loading()).toBe(false);
      expect(service.loadError()).toBe(false);
    });

    it('sets loading true while the request is in flight', () => {
      service.loadModules().subscribe();
      expect(service.loading()).toBe(true);
      httpMock.expectOne(`${environment.apiUrl}/admin/modules`).flush([]);
      expect(service.loading()).toBe(false);
    });

    it('sets loadError true and empties modules on a GET failure', () => {
      service.loadModules().subscribe();
      httpMock
        .expectOne(`${environment.apiUrl}/admin/modules`)
        .flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(service.loadError()).toBe(true);
      expect(service.loading()).toBe(false);
      expect(service.modules()).toEqual([]);
    });

    it('completes without throwing on GET failure (callers do not need an error handler)', () => {
      let errored = false;
      let completed = false;
      service.loadModules().subscribe({ error: () => (errored = true), complete: () => (completed = true) });
      httpMock
        .expectOne(`${environment.apiUrl}/admin/modules`)
        .flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(errored).toBe(false);
      expect(completed).toBe(true);
    });
  });

  describe('activate()', () => {
    it('optimistically flips enabled to true before the response arrives', () => {
      service.loadModules().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/admin/modules`).flush([makeDto('whiteboard', false)]);

      const module = service.modules()[0];
      service.activate(module).subscribe();

      expect(service.modules()[0].enabled).toBe(true);
      expect(service.isInFlight('whiteboard')).toBe(true);

      httpMock
        .expectOne(`${environment.apiUrl}/admin/modules/whiteboard/activate`)
        .flush({ id: 'whiteboard', enabled: true });

      expect(service.isInFlight('whiteboard')).toBe(false);
      expect(service.modules()[0].enabled).toBe(true);
    });

    it('rolls back to the previous state and clears in-flight on a generic error', () => {
      service.loadModules().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/admin/modules`).flush([makeDto('whiteboard', false)]);

      const module = service.modules()[0];
      let errored = false;
      service.activate(module).subscribe({ error: () => (errored = true) });

      httpMock
        .expectOne(`${environment.apiUrl}/admin/modules/whiteboard/activate`)
        .flush('Network error', { status: 0, statusText: 'Unknown Error' });

      expect(errored).toBe(true);
      expect(service.modules()[0].enabled).toBe(false);
      expect(service.isInFlight('whiteboard')).toBe(false);
      expect(service.cardError('whiteboard')).toBe('generic');
    });

    it('classifies 403 MODULE_NOT_IN_PLAN as a "not-in-plan" card error', () => {
      service.loadModules().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/admin/modules`).flush([makeDto('whiteboard', false)]);

      const module = service.modules()[0];
      service.activate(module).subscribe({ error: () => undefined });

      httpMock.expectOne(`${environment.apiUrl}/admin/modules/whiteboard/activate`).flush(
        { error: 'MODULE_NOT_IN_PLAN', message: "Ce module n'est pas inclus dans votre plan" },
        { status: 403, statusText: 'Forbidden' }
      );

      expect(service.modules()[0].enabled).toBe(false);
      expect(service.cardError('whiteboard')).toBe('not-in-plan');
    });

    it('clears a previous card error when a new attempt starts', () => {
      service.loadModules().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/admin/modules`).flush([makeDto('whiteboard', false)]);
      const module = service.modules()[0];

      service.activate(module).subscribe({ error: () => undefined });
      httpMock.expectOne(`${environment.apiUrl}/admin/modules/whiteboard/activate`).flush(
        { error: 'MODULE_NOT_IN_PLAN', message: 'nope' },
        { status: 403, statusText: 'Forbidden' }
      );
      expect(service.cardError('whiteboard')).toBe('not-in-plan');

      service.activate(service.modules()[0]).subscribe();
      expect(service.cardError('whiteboard')).toBeNull();
      httpMock.expectOne(`${environment.apiUrl}/admin/modules/whiteboard/activate`).flush({ id: 'whiteboard', enabled: true });
    });
  });

  describe('deactivate()', () => {
    it('optimistically flips enabled to false and confirms on success', () => {
      service.loadModules().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/admin/modules`).flush([makeDto('quiz', true)]);

      const module = service.modules()[0];
      service.deactivate(module).subscribe();

      expect(service.modules()[0].enabled).toBe(false);

      httpMock
        .expectOne(request => request.method === 'DELETE' && request.url === `${environment.apiUrl}/admin/modules/quiz/activate`)
        .flush({ id: 'quiz', enabled: false });

      expect(service.isInFlight('quiz')).toBe(false);
      expect(service.modules()[0].enabled).toBe(false);
    });

    it('rolls back to enabled on error', () => {
      service.loadModules().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/admin/modules`).flush([makeDto('quiz', true)]);

      const module = service.modules()[0];
      service.deactivate(module).subscribe({ error: () => undefined });

      httpMock
        .expectOne(request => request.method === 'DELETE' && request.url === `${environment.apiUrl}/admin/modules/quiz/activate`)
        .flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(service.modules()[0].enabled).toBe(true);
      expect(service.cardError('quiz')).toBe('generic');
    });

    it('tracks in-flight state independently per module', () => {
      service.loadModules().subscribe();
      httpMock
        .expectOne(`${environment.apiUrl}/admin/modules`)
        .flush([makeDto('whiteboard', false), makeDto('quiz', true)]);

      const [whiteboard, quiz] = service.modules();
      service.activate(whiteboard).subscribe();

      expect(service.isInFlight('whiteboard')).toBe(true);
      expect(service.isInFlight('quiz')).toBe(false);

      httpMock.expectOne(`${environment.apiUrl}/admin/modules/whiteboard/activate`).flush({ id: 'whiteboard', enabled: true });
      expect(quiz.enabled).toBe(true);
    });
  });
});
