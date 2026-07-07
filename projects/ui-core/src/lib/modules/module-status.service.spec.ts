import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach } from 'vitest';
import { ModuleStatusService } from './module-status.service';
import { PIVOT_API_URL } from '../config/tokens';

describe('ModuleStatusService', () => {
  let service: ModuleStatusService;
  let httpMock: HttpTestingController;
  const API = 'http://api.test';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PIVOT_API_URL, useValue: API },
      ],
    });
    service = TestBed.inject(ModuleStatusService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('fetches module status with no-cache header', () => {
    service.getStatus('whiteboard').subscribe();
    const req = httpMock.expectOne(`${API}/modules/whiteboard/status`);
    expect(req.request.headers.get('Cache-Control')).toBe('no-cache');
    req.flush({ enabled: true });
  });

  it('emits the DTO from the server', () => {
    let result: { enabled: boolean } | undefined;
    service.getStatus('pilotage').subscribe(dto => (result = dto));
    httpMock.expectOne(`${API}/modules/pilotage/status`).flush({ enabled: false });
    expect(result?.enabled).toBe(false);
  });
});
