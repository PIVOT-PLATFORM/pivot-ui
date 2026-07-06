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

  describe('changeRole (US06.1.3)', () => {
    const loadOneUser = (overrides: Partial<AdminUserDto> = {}) => {
      service.load(0, { ...EMPTY_ADMIN_USER_FILTERS }).subscribe();
      httpMock
        .expectOne(r => r.url === `${environment.apiUrl}/admin/users`)
        .flush(makePage([makeDto(1, { role: 'ROLE_USER', ...overrides })]));
    };

    it('sends PATCH /api/admin/users/{id}/role with the requested role and applies role optimistically', () => {
      loadOneUser();
      service.changeRole(service.users()[0], 'ROLE_ADMIN').subscribe();

      // Optimistic: applied before the response arrives.
      expect(service.users()[0].role).toBe('ROLE_ADMIN');
      expect(service.isRoleChangeInFlight(1)).toBe(true);

      const req = httpMock.expectOne(`${environment.apiUrl}/admin/users/1/role`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ role: 'ROLE_ADMIN' });

      req.flush(makeDto(1, { role: 'ROLE_ADMIN' }));
      expect(service.users()[0].role).toBe('ROLE_ADMIN');
      expect(service.isRoleChangeInFlight(1)).toBe(false);
      expect(service.roleChangeError(1)).toBeNull();
    });

    it('reconciles with the role returned by the backend rather than assuming an echo', () => {
      loadOneUser();
      service.changeRole(service.users()[0], 'ROLE_ADMIN').subscribe();
      httpMock
        .expectOne(`${environment.apiUrl}/admin/users/1/role`)
        // Defensive: even if the backend ever returned a different role than requested.
        .flush(makeDto(1, { role: 'ROLE_USER' }));
      expect(service.users()[0].role).toBe('ROLE_USER');
    });

    it('rolls back to the previous role and classifies a 403 as self-demotion', () => {
      loadOneUser();
      service.changeRole(service.users()[0], 'ROLE_ADMIN').subscribe({ error: () => undefined });

      httpMock
        .expectOne(`${environment.apiUrl}/admin/users/1/role`)
        .flush({ error: 'SELF_DEMOTION' }, { status: 403, statusText: 'Forbidden' });

      expect(service.users()[0].role).toBe('ROLE_USER');
      expect(service.isRoleChangeInFlight(1)).toBe(false);
      expect(service.roleChangeError(1)).toBe('self-demotion');
    });

    it('classifies a 400 as invalid-role and a 404 as not-found', () => {
      loadOneUser();
      service.changeRole(service.users()[0], 'ROLE_ADMIN').subscribe({ error: () => undefined });
      httpMock
        .expectOne(`${environment.apiUrl}/admin/users/1/role`)
        .flush({ error: 'INVALID_ROLE' }, { status: 400, statusText: 'Bad Request' });
      expect(service.roleChangeError(1)).toBe('invalid-role');

      service.changeRole(service.users()[0], 'ROLE_ADMIN').subscribe({ error: () => undefined });
      httpMock
        .expectOne(`${environment.apiUrl}/admin/users/1/role`)
        .flush({ error: 'NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
      expect(service.roleChangeError(1)).toBe('not-found');
    });

    it('classifies a 500 as generic and clears a previous row error on a new attempt', () => {
      loadOneUser();
      service.changeRole(service.users()[0], 'ROLE_ADMIN').subscribe({ error: () => undefined });
      httpMock
        .expectOne(`${environment.apiUrl}/admin/users/1/role`)
        .flush('Server error', { status: 500, statusText: 'Internal Server Error' });
      expect(service.roleChangeError(1)).toBe('generic');

      service.changeRole(service.users()[0], 'ROLE_ADMIN').subscribe();
      // clearRoleChangeError runs synchronously before the request settles.
      expect(service.roleChangeError(1)).toBeNull();
      httpMock.expectOne(`${environment.apiUrl}/admin/users/1/role`).flush(makeDto(1, { role: 'ROLE_ADMIN' }));
    });

    it('tracks in-flight state per user id independently', () => {
      service.load(0, { ...EMPTY_ADMIN_USER_FILTERS }).subscribe();
      httpMock
        .expectOne(r => r.url === `${environment.apiUrl}/admin/users`)
        .flush(makePage([makeDto(1, { role: 'ROLE_USER' }), makeDto(2, { role: 'ROLE_USER' })]));

      service.changeRole(service.users()[0], 'ROLE_ADMIN').subscribe();
      expect(service.isRoleChangeInFlight(1)).toBe(true);
      expect(service.isRoleChangeInFlight(2)).toBe(false);

      httpMock.expectOne(`${environment.apiUrl}/admin/users/1/role`).flush(makeDto(1, { role: 'ROLE_ADMIN' }));
    });
  });

  describe('changeStatus (US06.1.4 deactivate / US06.1.5 reactivate)', () => {
    const loadOneUser = (overrides: Partial<AdminUserDto> = {}) => {
      service.load(0, { ...EMPTY_ADMIN_USER_FILTERS }).subscribe();
      httpMock
        .expectOne(r => r.url === `${environment.apiUrl}/admin/users`)
        .flush(makePage([makeDto(1, { status: 'ACTIVE', ...overrides })]));
    };

    it('sends PATCH /api/admin/users/{id}/status with the requested status and applies it optimistically', () => {
      loadOneUser();
      service.changeStatus(service.users()[0], 'INACTIVE').subscribe();

      // Optimistic: applied before the response arrives.
      expect(service.users()[0].status).toBe('INACTIVE');
      expect(service.isStatusChangeInFlight(1)).toBe(true);

      const req = httpMock.expectOne(`${environment.apiUrl}/admin/users/1/status`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ status: 'INACTIVE' });

      req.flush(makeDto(1, { status: 'INACTIVE' }));
      expect(service.users()[0].status).toBe('INACTIVE');
      expect(service.isStatusChangeInFlight(1)).toBe(false);
      expect(service.statusChangeError(1)).toBeNull();
    });

    it('shares the same endpoint for reactivation (status: ACTIVE)', () => {
      loadOneUser({ status: 'INACTIVE' });
      service.changeStatus(service.users()[0], 'ACTIVE').subscribe();

      expect(service.users()[0].status).toBe('ACTIVE');

      const req = httpMock.expectOne(`${environment.apiUrl}/admin/users/1/status`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ status: 'ACTIVE' });
      req.flush(makeDto(1, { status: 'ACTIVE' }));
      expect(service.users()[0].status).toBe('ACTIVE');
    });

    it('reconciles with the status returned by the backend rather than assuming an echo', () => {
      loadOneUser();
      service.changeStatus(service.users()[0], 'INACTIVE').subscribe();
      httpMock
        .expectOne(`${environment.apiUrl}/admin/users/1/status`)
        // Defensive: even if the backend ever returned a different status than requested
        // (e.g. the documented idempotent 200 on reactivating an already-ACTIVE account).
        .flush(makeDto(1, { status: 'ACTIVE' }));
      expect(service.users()[0].status).toBe('ACTIVE');
    });

    it('rolls back to the previous status and classifies a 403 as self-deactivation', () => {
      loadOneUser();
      service.changeStatus(service.users()[0], 'INACTIVE').subscribe({ error: () => undefined });

      httpMock
        .expectOne(`${environment.apiUrl}/admin/users/1/status`)
        .flush({ error: 'SELF_DEACTIVATION' }, { status: 403, statusText: 'Forbidden' });

      expect(service.users()[0].status).toBe('ACTIVE');
      expect(service.isStatusChangeInFlight(1)).toBe(false);
      expect(service.statusChangeError(1)).toBe('self-deactivation');
    });

    it('classifies a 400 as invalid-status and a 404 as not-found', () => {
      loadOneUser();
      service.changeStatus(service.users()[0], 'INACTIVE').subscribe({ error: () => undefined });
      httpMock
        .expectOne(`${environment.apiUrl}/admin/users/1/status`)
        .flush({ error: 'INVALID_STATUS' }, { status: 400, statusText: 'Bad Request' });
      expect(service.statusChangeError(1)).toBe('invalid-status');

      service.changeStatus(service.users()[0], 'INACTIVE').subscribe({ error: () => undefined });
      httpMock
        .expectOne(`${environment.apiUrl}/admin/users/1/status`)
        .flush({ error: 'NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
      expect(service.statusChangeError(1)).toBe('not-found');
    });

    it('classifies a 500 as generic and clears a previous row error on a new attempt', () => {
      loadOneUser();
      service.changeStatus(service.users()[0], 'INACTIVE').subscribe({ error: () => undefined });
      httpMock
        .expectOne(`${environment.apiUrl}/admin/users/1/status`)
        .flush('Server error', { status: 500, statusText: 'Internal Server Error' });
      expect(service.statusChangeError(1)).toBe('generic');

      service.changeStatus(service.users()[0], 'INACTIVE').subscribe();
      // clearStatusChangeError runs synchronously before the request settles.
      expect(service.statusChangeError(1)).toBeNull();
      httpMock.expectOne(`${environment.apiUrl}/admin/users/1/status`).flush(makeDto(1, { status: 'INACTIVE' }));
    });

    it('tracks in-flight state per user id independently from role-change and other rows', () => {
      service.load(0, { ...EMPTY_ADMIN_USER_FILTERS }).subscribe();
      httpMock
        .expectOne(r => r.url === `${environment.apiUrl}/admin/users`)
        .flush(makePage([makeDto(1, { status: 'ACTIVE' }), makeDto(2, { status: 'ACTIVE' })]));

      service.changeStatus(service.users()[0], 'INACTIVE').subscribe();
      expect(service.isStatusChangeInFlight(1)).toBe(true);
      expect(service.isStatusChangeInFlight(2)).toBe(false);
      expect(service.isRoleChangeInFlight(1)).toBe(false);

      httpMock.expectOne(`${environment.apiUrl}/admin/users/1/status`).flush(makeDto(1, { status: 'INACTIVE' }));
    });
  });
});
