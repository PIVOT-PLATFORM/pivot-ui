import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { ExportService } from './export.service';
import type { ExportRequestResponse, ExportStatusResponse } from './export.model';

describe('ExportService', () => {
  let service: ExportService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/account/export`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ExportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getStatus()', () => {
    it('issues a GET to /account/export/status and returns the body', () => {
      const body: ExportStatusResponse = {
        status: 'NONE',
        requestedAt: null,
        completedAt: null,
        expiresAt: null,
        nextAvailableAt: null,
      };
      let result: ExportStatusResponse | undefined;
      service.getStatus().subscribe(res => (result = res));

      const req = httpMock.expectOne(`${baseUrl}/status`);
      expect(req.request.method).toBe('GET');
      req.flush(body);

      expect(result).toEqual(body);
    });
  });

  describe('requestExport()', () => {
    it('issues a POST with a null body to /account/export', () => {
      const body: ExportRequestResponse = { requestId: 42, status: 'PENDING', requestedAt: '2026-07-05T10:00:00Z' };
      let result: ExportRequestResponse | undefined;
      service.requestExport().subscribe(res => (result = res));

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      req.flush(body, { status: 202, statusText: 'Accepted' });

      expect(result).toEqual(body);
    });
  });

  describe('download()', () => {
    it('issues a GET to /account/export/download/{token} as a blob, observing the full response', () => {
      const blob = new Blob(['zip-content'], { type: 'application/octet-stream' });
      let result: import('@angular/common/http').HttpResponse<Blob> | undefined;
      service.download('raw-token-123').subscribe(res => (result = res));

      const req = httpMock.expectOne(`${baseUrl}/download/raw-token-123`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      req.flush(blob, {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Disposition': 'attachment; filename="pivot-export-42.zip"' },
      });

      expect(result?.body).toBe(blob);
      expect(result?.headers.get('Content-Disposition')).toContain('pivot-export-42.zip');
    });

    it('URL-encodes the export token', () => {
      service.download('a token/with-special+chars').subscribe();
      const req = httpMock.expectOne(`${baseUrl}/download/${encodeURIComponent('a token/with-special+chars')}`);
      req.flush(new Blob());
    });
  });
});
