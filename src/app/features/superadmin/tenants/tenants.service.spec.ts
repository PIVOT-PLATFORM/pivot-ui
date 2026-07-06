import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TenantsService } from './tenants.service';
import type { TenantDto, TenantFilters, TenantPage } from './tenant.model';
import { EMPTY_TENANT_FILTERS } from './tenant.model';
import { environment } from '../../../../environments/environment';

const makeDto = (id: number, overrides: Partial<TenantDto> = {}): TenantDto => ({
  id,
  slug: `tenant-${id}`,
  name: `Tenant ${id}`,
  plan: 'SAAS',
  authMode: 'SAAS',
  isActive: true,
  userCount: 3,
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

const makePage = (content: TenantDto[], overrides: Partial<TenantPage> = {}): TenantPage => ({
  content,
  totalElements: content.length,
  totalPages: 1,
  number: 0,
  size: 20,
  ...overrides,
});

describe('TenantsService', () => {
  let service: TenantsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TenantsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates the service', () => {
    expect(service).toBeTruthy();
  });

  describe('load()', () => {
    it('calls GET /api/superadmin/tenants with page and size, and populates state on success', () => {
      service.load(0, EMPTY_TENANT_FILTERS).subscribe();

      const req = httpMock.expectOne(
        r => r.url === `${environment.apiUrl}/superadmin/tenants` && r.method === 'GET'
      );
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('20');
      expect(req.request.params.has('name')).toBe(false);
      expect(req.request.params.has('is_active')).toBe(false);
      expect(req.request.params.has('plan')).toBe(false);
      expect(req.request.params.has('auth_mode')).toBe(false);

      req.flush(makePage([makeDto(1), makeDto(2)], { totalElements: 2, totalPages: 1 }));

      expect(service.tenants().length).toBe(2);
      expect(service.loading()).toBe(false);
      expect(service.loadError()).toBe(false);
      expect(service.page()).toBe(0);
      expect(service.totalPages()).toBe(1);
      expect(service.totalElements()).toBe(2);
    });

    it('sets loading true while the request is in flight', () => {
      service.load(0, EMPTY_TENANT_FILTERS).subscribe();
      expect(service.loading()).toBe(true);
      httpMock.expectOne(`${environment.apiUrl}/superadmin/tenants?page=0&size=20`).flush(makePage([]));
      expect(service.loading()).toBe(false);
    });

    it('only sends filter params that are set', () => {
      const filters: TenantFilters = { name: 'acme', isActive: 'true', plan: 'ENTERPRISE', authMode: 'HYBRID' };
      service.load(2, filters).subscribe();

      const req = httpMock.expectOne(
        r => r.url === `${environment.apiUrl}/superadmin/tenants` && r.method === 'GET'
      );
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('name')).toBe('acme');
      expect(req.request.params.get('is_active')).toBe('true');
      expect(req.request.params.get('plan')).toBe('ENTERPRISE');
      expect(req.request.params.get('auth_mode')).toBe('HYBRID');

      req.flush(makePage([]));
    });

    it('trims a whitespace-only name filter to "unset"', () => {
      // plan/isActive/authMode are <select> inputs (backend exact-match enums) — only
      // the free-text `name` filter can ever be whitespace-only.
      const filters: TenantFilters = { name: '   ', isActive: '', plan: '', authMode: '' };
      service.load(0, filters).subscribe();

      const req = httpMock.expectOne(
        r => r.url === `${environment.apiUrl}/superadmin/tenants` && r.method === 'GET'
      );
      expect(req.request.params.has('name')).toBe(false);
      req.flush(makePage([]));
    });

    it('sets loadError true and empties tenants on a GET failure', () => {
      service.load(0, EMPTY_TENANT_FILTERS).subscribe();
      httpMock
        .expectOne(r => r.url === `${environment.apiUrl}/superadmin/tenants`)
        .flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(service.loadError()).toBe(true);
      expect(service.loading()).toBe(false);
      expect(service.tenants()).toEqual([]);
    });

    it('completes without throwing on GET failure (callers do not need an error handler)', () => {
      let errored = false;
      let completed = false;
      service.load(0, EMPTY_TENANT_FILTERS).subscribe({ error: () => (errored = true), complete: () => (completed = true) });
      httpMock
        .expectOne(r => r.url === `${environment.apiUrl}/superadmin/tenants`)
        .flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(errored).toBe(false);
      expect(completed).toBe(true);
    });

    it('rejects a 403 (non-super-admin) the same way as any other failure', () => {
      service.load(0, EMPTY_TENANT_FILTERS).subscribe();
      httpMock
        .expectOne(r => r.url === `${environment.apiUrl}/superadmin/tenants`)
        .flush('Forbidden', { status: 403, statusText: 'Forbidden' });

      expect(service.loadError()).toBe(true);
      expect(service.tenants()).toEqual([]);
    });
  });
});
