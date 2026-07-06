import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { EmailChangeService } from './email-change.service';
import { environment } from '../../../../../environments/environment';

describe('EmailChangeService', () => {
  let service: EmailChangeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EmailChangeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('requestChange() POSTs to /account/email with newEmail and currentPassword only', () => {
    service.requestChange('new@example.com', 'Secret1!').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/account/email`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ newEmail: 'new@example.com', currentPassword: 'Secret1!' });
    // Jamais de userId dans le body — identité dérivée du token porteur (règle CLAUDE.md).
    expect(req.request.body.userId).toBeUndefined();
    req.flush(null, { status: 202, statusText: 'Accepted' });
  });

  it('confirm() GETs /account/email/confirm with the token as a query param', () => {
    service.confirm('raw-token-value').subscribe();
    const req = httpMock.expectOne(r => r.url === `${environment.apiUrl}/account/email/confirm`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('token')).toBe('raw-token-value');
    req.flush(null);
  });

  it('confirm() propagates a 410 EMAIL_CHANGE_TOKEN_ALREADY_USED error to the caller', () => {
    let captured: unknown;
    service.confirm('used-token').subscribe({ error: (err) => (captured = err) });
    httpMock
      .expectOne(r => r.url === `${environment.apiUrl}/account/email/confirm`)
      .flush({ code: 'EMAIL_CHANGE_TOKEN_ALREADY_USED' }, { status: 410, statusText: 'Gone' });
    expect((captured as { status: number }).status).toBe(410);
  });
});
