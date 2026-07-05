import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AccountDeletionService } from './account-deletion.service';
import { environment } from '../../../../environments/environment';

describe('AccountDeletionService', () => {
  let service: AccountDeletionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AccountDeletionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates the service', () => {
    expect(service).toBeTruthy();
  });

  describe('getConfirmationMethod()', () => {
    it('GETs the confirmation method', () => {
      let result: { method: string } | undefined;
      service.getConfirmationMethod().subscribe(res => (result = res));

      const req = httpMock.expectOne(`${environment.apiUrl}/account/deletion/confirmation-method`);
      expect(req.request.method).toBe('GET');
      req.flush({ method: 'PASSWORD' });

      expect(result).toEqual({ method: 'PASSWORD' });
    });
  });

  describe('requestOtp()', () => {
    it('POSTs an empty body to trigger the OTP email', () => {
      service.requestOtp().subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/account/deletion/otp`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(null, { status: 202, statusText: 'Accepted' });
    });
  });

  describe('deleteAccount()', () => {
    it('DELETEs /account with the currentPassword body and returns effectiveDeletionDate', () => {
      let result: { effectiveDeletionDate: string } | undefined;
      service.deleteAccount({ currentPassword: 'secret123' }).subscribe(res => (result = res));

      const req = httpMock.expectOne(`${environment.apiUrl}/account`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.body).toEqual({ currentPassword: 'secret123' });
      req.flush({ effectiveDeletionDate: '2026-08-04T00:00:00Z' });

      expect(result).toEqual({ effectiveDeletionDate: '2026-08-04T00:00:00Z' });
    });

    it('DELETEs /account with the otp body for OIDC-only accounts', () => {
      service.deleteAccount({ otp: '123456' }).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/account`);
      expect(req.request.body).toEqual({ otp: '123456' });
      req.flush({ effectiveDeletionDate: '2026-08-04T00:00:00Z' });
    });

    it('propagates a 403 (invalid/missing confirmation) to the caller', () => {
      let status: number | undefined;
      service.deleteAccount({ currentPassword: 'wrong' }).subscribe({
        error: err => (status = err.status),
      });

      httpMock
        .expectOne(`${environment.apiUrl}/account`)
        .flush('Forbidden', { status: 403, statusText: 'Forbidden' });

      expect(status).toBe(403);
    });
  });

  describe('cancelDeletion()', () => {
    it('POSTs the token to the public cancel endpoint', () => {
      let result: { message: string } | undefined;
      service.cancelDeletion('raw-token-abc').subscribe(res => (result = res));

      const req = httpMock.expectOne(`${environment.apiUrl}/account/deletion/cancel`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ token: 'raw-token-abc' });
      req.flush({ message: 'Suppression annulée' });

      expect(result).toEqual({ message: 'Suppression annulée' });
    });

    it('propagates a 410 (grace period already elapsed) to the caller', () => {
      let status: number | undefined;
      service.cancelDeletion('too-late').subscribe({ error: err => (status = err.status) });

      httpMock.expectOne(`${environment.apiUrl}/account/deletion/cancel`).flush('Gone', { status: 410, statusText: 'Gone' });

      expect(status).toBe(410);
    });
  });
});
