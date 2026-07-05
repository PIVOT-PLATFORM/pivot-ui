import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AdminUsersService } from './admin-users.service';
import type { AdminUserDto, AdminUserPage } from './admin-user.model';
import { EMPTY_ADMIN_USER_FILTERS } from './admin-user.model';
import { environment } from '../../../../environments/environment';

const makeDto = (id: number, overrides: Partial<AdminUserDto> = {}): AdminUserDto => ({
  id,
  email: `user${id}@tenant.test`,
  firstName: 'Alice',
  lastName: 'Martin',
  role: 'ROLE_USER',
  status: 'ACTIVE',
  createdAt: '2026-07-01T10:15:30Z',
  ...overrides,
});

const makePage = (content: AdminUserDto[], overrides: Partial<AdminUserPage> = {}): AdminUserPage => ({
  content,
  totalElements: content.length,
  totalPages: 1,
  number: 0,
  size: 20,
  ...overrides,
});

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminUsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('requests GET /api/admin/users with page/size and no optional filters when filters are empty', () => {
    service.load(0, { ...EMPTY_ADMIN_USER_FILTERS }).subscribe();

    const req = httpMock.expectOne(r => r.url === `${environment.apiUrl}/admin/users`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.has('search')).toBe(false);
    expect(req.request.params.has('role')).toBe(false);
    expect(req.request.params.has('status')).toBe(false);

    req.flush(makePage([makeDto(1)]));
    expect(service.users()).toHaveLength(1);
    expect(service.totalElements()).toBe(1);
    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(false);
  });

  it('sends the trimmed search, role, and status filters as query params when set', () => {
    service.load(0, { search: '  alice  ', role: 'ROLE_ADMIN', status: 'ACTIVE' }).subscribe();

    const req = httpMock.expectOne(r => r.url === `${environment.apiUrl}/admin/users`);
    expect(req.request.params.get('search')).toBe('alice');
    expect(req.request.params.get('role')).toBe('ROLE_ADMIN');
    expect(req.request.params.get('status')).toBe('ACTIVE');
    req.flush(makePage([]));
  });

  it('omits the search param entirely when it is blank/whitespace-only', () => {
    service.load(0, { search: '   ', role: '', status: '' }).subscribe();

    const req = httpMock.expectOne(r => r.url === `${environment.apiUrl}/admin/users`);
    expect(req.request.params.has('search')).toBe(false);
    req.flush(makePage([]));
  });

  it('sets loading true synchronously while the request is pending', () => {
    service.load(0, { ...EMPTY_ADMIN_USER_FILTERS }).subscribe();
    expect(service.loading()).toBe(true);

    httpMock.expectOne(r => r.url === `${environment.apiUrl}/admin/users`).flush(makePage([]));
    expect(service.loading()).toBe(false);
  });

  it('updates page/totalPages/totalElements/size from the Spring Page envelope on success', () => {
    service.load(1, { ...EMPTY_ADMIN_USER_FILTERS }).subscribe();

    httpMock
      .expectOne(r => r.url === `${environment.apiUrl}/admin/users`)
      .flush(makePage([makeDto(21)], { number: 1, totalPages: 3, totalElements: 47, size: 20 }));

    expect(service.page()).toBe(1);
    expect(service.totalPages()).toBe(3);
    expect(service.totalElements()).toBe(47);
    expect(service.size()).toBe(20);
  });

  it('sets loadError and clears the user list on a network/5xx failure', () => {
    service.load(0, { ...EMPTY_ADMIN_USER_FILTERS }).subscribe();

    httpMock
      .expectOne(r => r.url === `${environment.apiUrl}/admin/users`)
      .flush('Server error', { status: 500, statusText: 'Internal Server Error' });

    expect(service.loadError()).toBe(true);
    expect(service.loading()).toBe(false);
    expect(service.users()).toEqual([]);
  });

  it('sets loadError (generic error state) on a 400 INVALID_FILTER response, without throwing', () => {
    // Structurally unreachable from the UI (role/status are closed <select> inputs),
    // but the service must still fail safe if the contract ever drifts — see
    // admin-user.model.ts and admin-users.service.ts doc comments.
    expect(() => {
      service.load(0, { ...EMPTY_ADMIN_USER_FILTERS, status: 'ACTIVE' }).subscribe();
      httpMock
        .expectOne(r => r.url === `${environment.apiUrl}/admin/users`)
        .flush({ error: 'INVALID_FILTER', field: 'status' }, { status: 400, statusText: 'Bad Request' });
    }).not.toThrow();

    expect(service.loadError()).toBe(true);
    expect(service.users()).toEqual([]);
  });
});
