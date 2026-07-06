import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { CreateTenantService } from './create-tenant.service';
import type { CreateTenantRequest, CreateTenantResponse, SlugAvailability } from './create-tenant.model';
import { environment } from '../../../../environments/environment';

describe('CreateTenantService', () => {
  let service: CreateTenantService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CreateTenantService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates the service', () => {
    expect(service).toBeTruthy();
  });

  describe('create()', () => {
    const request: CreateTenantRequest = { name: 'Acme Corp', slug: 'acme-corp', plan: 'SAAS', authMode: 'LOCAL' };

    it('POSTs the request body verbatim (camelCase) and returns the created tenant', () => {
      let result: CreateTenantResponse | undefined;
      service.create(request).subscribe(r => (result = r));

      const req = httpMock.expectOne(`${environment.apiUrl}/superadmin/tenants`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);

      req.flush({ id: 42, slug: 'acme-corp', invitationUrl: 'https://app.pivot.example/auth/register?tenant=acme-corp' });

      expect(result).toEqual({
        id: 42,
        slug: 'acme-corp',
        invitationUrl: 'https://app.pivot.example/auth/register?tenant=acme-corp',
      });
    });

    it('propagates a 409 error to the caller (duplicate slug)', () => {
      let error: unknown;
      service.create(request).subscribe({ error: e => (error = e) });

      httpMock
        .expectOne(`${environment.apiUrl}/superadmin/tenants`)
        .flush(
          { error: 'TENANT_SLUG_ALREADY_EXISTS', message: 'Ce slug est déjà utilisé par un autre tenant' },
          { status: 409, statusText: 'Conflict' }
        );

      expect((error as { status: number }).status).toBe(409);
    });

    it('propagates a 422 error to the caller (reserved slug)', () => {
      let error: unknown;
      service.create(request).subscribe({ error: e => (error = e) });

      httpMock
        .expectOne(`${environment.apiUrl}/superadmin/tenants`)
        .flush(
          { error: 'TENANT_SLUG_RESERVED', message: 'Ce slug est réservé' },
          { status: 422, statusText: 'Unprocessable Entity' }
        );

      expect((error as { status: number }).status).toBe(422);
    });

    it('propagates a 429 error with retryAfterSeconds to the caller', () => {
      let error: unknown;
      service.create(request).subscribe({ error: e => (error = e) });

      httpMock
        .expectOne(`${environment.apiUrl}/superadmin/tenants`)
        .flush({ code: 'RATE_LIMITED', retryAfterSeconds: 120 }, { status: 429, statusText: 'Too Many Requests' });

      expect((error as { status: number; error: { retryAfterSeconds: number } }).error.retryAfterSeconds).toBe(120);
    });
  });

  describe('checkSlug()', () => {
    it('calls GET check-slug with the candidate slug as a query param', () => {
      let result: SlugAvailability | undefined;
      service.checkSlug('acme-corp').subscribe(r => (result = r));

      const req = httpMock.expectOne(
        r => r.url === `${environment.apiUrl}/superadmin/tenants/check-slug` && r.method === 'GET'
      );
      expect(req.request.params.get('slug')).toBe('acme-corp');

      req.flush({ available: true, reason: null });

      expect(result).toEqual({ available: true, reason: null });
    });

    it('resolves 200 with available:false and a reason (never a 409/422 per contract)', () => {
      let result: SlugAvailability | undefined;
      service.checkSlug('admin').subscribe(r => (result = r));

      httpMock
        .expectOne(r => r.url === `${environment.apiUrl}/superadmin/tenants/check-slug`)
        .flush({ available: false, reason: 'RESERVED' });

      expect(result).toEqual({ available: false, reason: 'RESERVED' });
    });
  });
});
