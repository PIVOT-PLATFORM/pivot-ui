import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ModuleStatusService } from './module-status.service';
import { environment } from '../../../environments/environment';

describe('ModuleStatusService', () => {
  let service: ModuleStatusService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ModuleStatusService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates the service', () => {
    expect(service).toBeTruthy();
  });

  it('calls GET /api/modules/{id}/status', () => {
    service.getStatus('whiteboard').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/modules/whiteboard/status`);
    expect(req.request.method).toBe('GET');
    req.flush({ enabled: true });
  });

  it('sets a no-cache request header defensively against intermediate caches', () => {
    service.getStatus('whiteboard').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/modules/whiteboard/status`);
    expect(req.request.headers.get('Cache-Control')).toBe('no-cache');
    req.flush({ enabled: true });
  });

  it('emits { enabled: true } on 200 for an activated module', () => {
    let result: { enabled: boolean } | undefined;
    service.getStatus('whiteboard').subscribe(res => (result = res));

    httpMock.expectOne(`${environment.apiUrl}/modules/whiteboard/status`).flush({ enabled: true });

    expect(result).toEqual({ enabled: true });
  });

  it('emits { enabled: false } on 200 for a deactivated module', () => {
    let result: { enabled: boolean } | undefined;
    service.getStatus('whiteboard').subscribe(res => (result = res));

    httpMock.expectOne(`${environment.apiUrl}/modules/whiteboard/status`).flush({ enabled: false });

    expect(result).toEqual({ enabled: false });
  });

  it('propagates an error to the caller on 404 (unknown module id)', () => {
    let errored = false;
    service.getStatus('ghost-module').subscribe({ error: () => (errored = true) });

    httpMock
      .expectOne(`${environment.apiUrl}/modules/ghost-module/status`)
      .flush({ code: 'MODULE_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });

    expect(errored).toBe(true);
  });

  it('propagates an error to the caller on 401 (unauthenticated)', () => {
    let errored = false;
    service.getStatus('whiteboard').subscribe({ error: () => (errored = true) });

    httpMock
      .expectOne(`${environment.apiUrl}/modules/whiteboard/status`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(errored).toBe(true);
  });
});
