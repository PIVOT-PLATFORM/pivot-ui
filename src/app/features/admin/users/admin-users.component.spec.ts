import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { AdminUsersComponent } from './admin-users.component';
import type { AdminUserDto, AdminUserPage } from './admin-user.model';
import { ToastService } from '../../../shared/toast/toast.service';
import { environment } from '../../../../environments/environment';

const frTranslations = {
  common: { loading: 'Chargement en cours…' },
  admin: {
    users: {
      list: {
        title: 'Utilisateurs',
        subtitle: 'Consultez les utilisateurs de votre organisation.',
        empty: 'Aucun utilisateur correspondant à vos filtres',
        empty_reset: 'Réinitialiser les filtres',
        error: 'Impossible de charger les utilisateurs. Réessayez.',
        retry: 'Réessayer',
        table_aria: 'Liste des utilisateurs du tenant',
        live_count: '{{ count }} utilisateur(s) affiché(s)',
        filters: {
          aria: 'Filtres de recherche des utilisateurs',
          search: 'Recherche',
          search_placeholder: 'Nom ou email',
          role: 'Rôle',
          status: 'Statut',
        },
        role: { all: 'Tous', admin: 'Administrateur', user: 'Utilisateur', other: 'Autre' },
        status: { all: 'Tous', active: 'Actif', inactive: 'Inactif', blocked: 'Bloqué' },
        columns: {
          name: 'Nom',
          email: 'Email',
          role: 'Rôle',
          status: 'Statut',
          created_at: 'Date de création',
          actions: 'Actions',
        },
        row: {
          expand: 'Afficher les détails de {{ name }}',
          collapse: 'Masquer les détails de {{ name }}',
        },
        pagination: {
          nav_aria: 'Pagination',
          previous: 'Précédent',
          previous_aria: 'Page précédente',
          next: 'Suivant',
          next_aria: 'Page suivante',
          status: 'Utilisateurs {{ start }}-{{ end }} sur {{ total }}',
        },
      },
      role: {
        select_aria: 'Rôle de {{ name }}',
        confirm: {
          title: 'Changer le rôle de {{ name }} de {{ from }} vers {{ to }} ?',
          message: 'Cette modification prend effet immédiatement.',
          confirm: 'Confirmer',
          cancel: 'Annuler',
        },
        toast: {
          updated: 'Rôle mis à jour',
          error: 'Impossible de modifier le rôle de {{ name }}. Réessayez.',
          self_demotion: 'Vous ne pouvez pas modifier votre propre rôle.',
          invalid_role: "Le rôle sélectionné n'est pas valide.",
          not_found: 'Utilisateur introuvable.',
        },
      },
    },
  },
};

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

describe('AdminUsersComponent', () => {
  let fixture: ComponentFixture<AdminUsersComponent>;
  let httpMock: HttpTestingController;
  let toastService: ToastService;

  const expectListRequest = () =>
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/admin/users` && r.method === 'GET');

  const flushList = (page: AdminUserPage = makePage([makeDto(1), makeDto(2)])) => {
    expectListRequest().flush(page);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AdminUsersComponent,
        TranslocoTestingModule.forRoot({
          langs: { fr: frTranslations, en: {} },
          translocoConfig: { defaultLang: 'fr', availableLangs: ['fr', 'en'] },
        }),
      ],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUsersComponent);
    httpMock = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('mounts and triggers the initial GET /api/admin/users', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expectListRequest().flush(makePage([]));
  });

  it('shows the loading skeleton while the request is pending', () => {
    const skeleton = fixture.nativeElement.querySelector('[data-testid="admin-users-skeleton"]');
    expect(skeleton).not.toBeNull();
    expectListRequest().flush(makePage([]));
  });

  it('shows the empty state with a reset-filters button, which reloads with cleared filters', () => {
    flushList(makePage([]));
    const empty = fixture.nativeElement.querySelector('[data-testid="admin-users-empty"]');
    expect(empty?.textContent).toContain('Aucun utilisateur correspondant à vos filtres');

    fixture.nativeElement.querySelector('[data-testid="admin-users-reset-filters"]').click();
    fixture.detectChanges();

    const req = expectListRequest();
    expect(req.request.params.has('search')).toBe(false);
    expect(req.request.params.has('role')).toBe(false);
    expect(req.request.params.has('status')).toBe(false);
    req.flush(makePage([makeDto(1)]));
  });

  it('shows the network error state with a retry button when the GET fails, and retry re-fetches', () => {
    expectListRequest().flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    const errorState = fixture.nativeElement.querySelector('[data-testid="admin-users-error"]');
    expect(errorState).not.toBeNull();
    expect(errorState.textContent).toContain('Impossible de charger les utilisateurs. Réessayez.');

    fixture.nativeElement.querySelector('[data-testid="admin-users-retry"]').click();
    expectListRequest().flush(makePage([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="admin-users-empty"]')).not.toBeNull();
  });

  it('renders a table row per user with the documented columns and text badges', () => {
    flushList(
      makePage([
        makeDto(1, { firstName: 'Alice', lastName: 'Martin', role: 'ROLE_USER', status: 'ACTIVE' }),
        makeDto(2, { firstName: 'Bob', lastName: 'Durand', role: 'ROLE_ADMIN', status: 'BLOCKED' }),
      ])
    );

    const table = fixture.nativeElement.querySelector('[data-testid="admin-users-table"]');
    expect(table).not.toBeNull();
    expect(table.getAttribute('aria-label')).toBe('Liste des utilisateurs du tenant');

    const row1 = fixture.nativeElement.querySelector('[data-testid="user-row-1"]');
    expect(row1.textContent).toContain('Alice Martin');
    expect(row1.textContent).toContain('user1@tenant.test');
    expect(fixture.nativeElement.querySelector('[data-testid="user-role-1"]').textContent.trim()).toBe('Utilisateur');
    expect(fixture.nativeElement.querySelector('[data-testid="user-status-1"]').textContent.trim()).toBe('Actif');
    // createdAt rendered via DatePipe 'short' — assert shape only (locale/timezone-dependent).
    expect(row1.textContent).toMatch(/\d{1,2}\/\d{1,2}\/\d{2,4}/);

    expect(fixture.nativeElement.querySelector('[data-testid="user-role-2"]').textContent.trim()).toBe(
      'Administrateur'
    );
    expect(fixture.nativeElement.querySelector('[data-testid="user-status-2"]').textContent.trim()).toBe('Bloqué');
  });

  it('falls back to the email as display name when firstName and lastName are both null', () => {
    flushList(makePage([makeDto(3, { firstName: null, lastName: null })]));
    const row = fixture.nativeElement.querySelector('[data-testid="user-row-3"]');
    expect(row.textContent).toContain('user3@tenant.test');
  });

  it('renders the "Inactif" status badge for the INACTIVE status', () => {
    flushList(makePage([makeDto(5, { status: 'INACTIVE' })]));
    expect(fixture.nativeElement.querySelector('[data-testid="user-status-5"]').textContent.trim()).toBe('Inactif');
  });

  it('falls back to a generic "Autre" role badge for an unexpected backend role value', () => {
    flushList(makePage([makeDto(4, { role: 'ROLE_SUPER_ADMIN' })]));
    expect(fixture.nativeElement.querySelector('[data-testid="user-role-4"]').textContent.trim()).toBe('Autre');
  });

  it('previousPage() is a no-op on the first page (no HTTP request sent)', () => {
    flushList(makePage([makeDto(1)], { number: 0, totalPages: 2, totalElements: 21 }));
    fixture.componentInstance.previousPage();
    httpMock.expectNone(r => r.url === `${environment.apiUrl}/admin/users`);
  });

  it('announces the total match count via the aria-live region after a successful load', () => {
    flushList(makePage([makeDto(1)], { totalElements: 47 }));
    const live = fixture.nativeElement.querySelector('[data-testid="admin-users-live-region"]');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toContain('47 utilisateur(s) affiché(s)');
  });

  it('debounces the search filter and re-queries from page 0 after 300ms of inactivity', async () => {
    vi.useFakeTimers();
    try {
      flushList(makePage([makeDto(1)]));

      const searchInput = fixture.nativeElement.querySelector('[data-testid="admin-users-filter-search"]');
      searchInput.value = 'alice';
      searchInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      httpMock.expectNone(r => r.url === `${environment.apiUrl}/admin/users`);

      await vi.advanceTimersByTimeAsync(300);
      fixture.detectChanges();

      const req = expectListRequest();
      expect(req.request.params.get('search')).toBe('alice');
      expect(req.request.params.get('page')).toBe('0');
      req.flush(makePage([]));
    } finally {
      vi.useRealTimers();
    }
  });

  it('applies the role select filter immediately on change (no debounce)', () => {
    flushList(makePage([makeDto(1)]));

    const select = fixture.nativeElement.querySelector('[data-testid="admin-users-filter-role"]');
    select.value = 'ROLE_ADMIN';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = expectListRequest();
    expect(req.request.params.get('role')).toBe('ROLE_ADMIN');
    req.flush(makePage([]));
  });

  it('applies the status select filter immediately on change (no debounce)', () => {
    flushList(makePage([makeDto(1)]));

    const select = fixture.nativeElement.querySelector('[data-testid="admin-users-filter-status"]');
    select.value = 'BLOCKED';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = expectListRequest();
    expect(req.request.params.get('status')).toBe('BLOCKED');
    req.flush(makePage([]));
  });

  it('disables the filter fieldset while a request is in flight, and re-enables it once settled', () => {
    const fieldset = fixture.nativeElement.querySelector('[data-testid="admin-users-filter-fieldset"]');
    expect(fieldset.disabled).toBe(true);

    flushList(makePage([makeDto(1)]));
    expect(fieldset.disabled).toBe(false);
  });

  it('paginates: next/previous call the service with the adjacent page and are disabled at the bounds', () => {
    flushList(makePage([makeDto(1)], { number: 0, totalPages: 2, totalElements: 21 }));

    const prevBtn = fixture.nativeElement.querySelector('[data-testid="admin-users-page-previous"]');
    const nextBtn = fixture.nativeElement.querySelector('[data-testid="admin-users-page-next"]');
    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(false);
    expect(prevBtn.getAttribute('aria-label')).toBe('Page précédente');
    expect(nextBtn.getAttribute('aria-label')).toBe('Page suivante');

    nextBtn.click();
    fixture.detectChanges();

    const req = expectListRequest();
    expect(req.request.params.get('page')).toBe('1');
    req.flush(makePage([makeDto(2)], { number: 1, totalPages: 2, totalElements: 21 }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="admin-users-page-next"]').disabled).toBe(true);
    const prevBtnAfter = fixture.nativeElement.querySelector('[data-testid="admin-users-page-previous"]');
    expect(prevBtnAfter.disabled).toBe(false);

    prevBtnAfter.click();
    fixture.detectChanges();
    const req2 = expectListRequest();
    expect(req2.request.params.get('page')).toBe('0');
    req2.flush(makePage([makeDto(1)], { number: 0, totalPages: 2, totalElements: 21 }));
  });

  it('shows the "Utilisateurs start-end sur total" pagination range', () => {
    flushList(makePage([makeDto(1)], { number: 0, totalPages: 3, totalElements: 47, size: 20 }));
    const status = fixture.nativeElement.querySelector('[data-testid="admin-users-page-status"]');
    expect(status.textContent).toContain('Utilisateurs 1-20 sur 47');
  });

  it('sets aria-label="Pagination" on the pagination nav', () => {
    flushList(makePage([makeDto(1)]));
    const nav = fixture.nativeElement.querySelector('nav.admin-users__pagination');
    expect(nav.getAttribute('aria-label')).toBe('Pagination');
  });

  it('toggles the mobile expand row and its aria-expanded state on click', () => {
    flushList(makePage([makeDto(1, { firstName: 'Alice', lastName: 'Martin' })]));

    const toggle = fixture.nativeElement.querySelector('[data-testid="user-expand-toggle-1"]');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('[data-testid="user-expanded-1"]')).toBeNull();

    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Masquer les détails de Alice Martin');
    const expandedRow = fixture.nativeElement.querySelector('[data-testid="user-expanded-1"]');
    expect(expandedRow).not.toBeNull();
    expect(expandedRow.textContent).toContain('user1@tenant.test');

    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('[data-testid="user-expanded-1"]')).toBeNull();
  });

  describe('role change (US06.1.3)', () => {
    const roleSelect = (id: number): HTMLSelectElement =>
      fixture.nativeElement.querySelector(`[data-testid="user-role-select-${id}"]`);

    const changeRoleViaSelect = (id: number, newRole: string): HTMLSelectElement => {
      const select = roleSelect(id);
      select.value = newRole;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      return select;
    };

    it('renders a role select per row with a unique aria-label naming the user', () => {
      flushList(
        makePage([
          makeDto(1, { firstName: 'Alice', lastName: 'Martin', role: 'ROLE_USER' }),
          makeDto(2, { firstName: 'Bob', lastName: 'Durand', role: 'ROLE_ADMIN' }),
        ])
      );

      const select1 = roleSelect(1);
      const select2 = roleSelect(2);
      expect(select1.getAttribute('aria-label')).toBe('Rôle de Alice Martin');
      expect(select2.getAttribute('aria-label')).toBe('Rôle de Bob Durand');
      expect(select1.getAttribute('aria-label')).not.toBe(select2.getAttribute('aria-label'));
      expect(select1.value).toBe('ROLE_USER');
      expect(select2.value).toBe('ROLE_ADMIN');
    });

    it('re-selecting the current role does not open the confirmation dialog nor call the API', () => {
      flushList(makePage([makeDto(1, { role: 'ROLE_USER' })]));
      changeRoleViaSelect(1, 'ROLE_USER');

      expect(fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]')).toBeNull();
      httpMock.expectNone(`${environment.apiUrl}/admin/users/1/role`);
    });

    it('opens a role="dialog" confirmation with aria-labelledby before calling the API', () => {
      flushList(makePage([makeDto(1, { firstName: 'Alice', lastName: 'Martin', role: 'ROLE_USER' })]));
      changeRoleViaSelect(1, 'ROLE_ADMIN');

      const dialog = fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]');
      expect(dialog).not.toBeNull();
      expect(dialog.getAttribute('role')).toBe('dialog');
      expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
      expect(dialog.textContent).toContain('Changer le rôle de Alice Martin de Utilisateur vers Administrateur ?');

      httpMock.expectNone(`${environment.apiUrl}/admin/users/1/role`);
    });

    it('cancelling the confirmation reverts the select to the previous role and sends no API call', () => {
      flushList(makePage([makeDto(1, { role: 'ROLE_USER' })]));
      const select = changeRoleViaSelect(1, 'ROLE_ADMIN');
      expect(select.value).toBe('ROLE_ADMIN'); // native DOM already flipped by the browser on pick

      fixture.nativeElement.querySelector('[data-testid="confirm-dialog-cancel"]').click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]')).toBeNull();
      expect(select.value).toBe('ROLE_USER');
      expect(fixture.nativeElement.querySelector('[data-testid="user-role-1"]').textContent.trim()).toBe(
        'Utilisateur'
      );
      httpMock.expectNone(`${environment.apiUrl}/admin/users/1/role`);
    });

    it('confirms the change: calls PATCH, disables the select while in flight, updates the badge, and toasts success', () => {
      flushList(makePage([makeDto(1, { role: 'ROLE_USER' })]));
      const select = changeRoleViaSelect(1, 'ROLE_ADMIN');

      fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]')).toBeNull();
      expect(select.disabled).toBe(true);

      const req = httpMock.expectOne(`${environment.apiUrl}/admin/users/1/role`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ role: 'ROLE_ADMIN' });

      req.flush(makeDto(1, { role: 'ROLE_ADMIN' }));
      fixture.detectChanges();

      expect(select.disabled).toBe(false);
      expect(fixture.nativeElement.querySelector('[data-testid="user-role-1"]').textContent.trim()).toBe(
        'Administrateur'
      );
      expect(
        toastService.toasts().some(t => t.type === 'info' && t.messageKey === 'admin.users.role.toast.updated')
      ).toBe(true);
    });

    it('rolls back to the previous role and shows the generic error toast when the PATCH fails with a 500', () => {
      flushList(makePage([makeDto(1, { firstName: 'Alice', lastName: 'Martin', role: 'ROLE_USER' })]));
      const select = changeRoleViaSelect(1, 'ROLE_ADMIN');
      fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();
      fixture.detectChanges();

      httpMock
        .expectOne(`${environment.apiUrl}/admin/users/1/role`)
        .flush('Server error', { status: 500, statusText: 'Internal Server Error' });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="user-role-1"]').textContent.trim()).toBe(
        'Utilisateur'
      );
      expect(select.disabled).toBe(false);
      expect(
        toastService
          .toasts()
          .some(
            t =>
              t.type === 'error' &&
              t.messageKey === 'admin.users.role.toast.error' &&
              t.params?.['name'] === 'Alice Martin'
          )
      ).toBe(true);
    });

    it('shows the self-demotion toast and rolls back on a 403', () => {
      flushList(makePage([makeDto(1, { role: 'ROLE_ADMIN' })]));
      changeRoleViaSelect(1, 'ROLE_USER');
      fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();
      fixture.detectChanges();

      httpMock
        .expectOne(`${environment.apiUrl}/admin/users/1/role`)
        .flush({ error: 'SELF_DEMOTION' }, { status: 403, statusText: 'Forbidden' });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="user-role-1"]').textContent.trim()).toBe(
        'Administrateur'
      );
      expect(
        toastService.toasts().some(t => t.type === 'error' && t.messageKey === 'admin.users.role.toast.self_demotion')
      ).toBe(true);
    });

    it('shows the not-found toast on a 404 (cross-tenant)', () => {
      flushList(makePage([makeDto(1, { role: 'ROLE_USER' })]));
      changeRoleViaSelect(1, 'ROLE_ADMIN');
      fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();
      fixture.detectChanges();

      httpMock
        .expectOne(`${environment.apiUrl}/admin/users/1/role`)
        .flush({ error: 'NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();

      expect(
        toastService.toasts().some(t => t.type === 'error' && t.messageKey === 'admin.users.role.toast.not_found')
      ).toBe(true);
    });

    it('confirmRoleChange() is a no-op if called with no pending confirmation', () => {
      flushList(makePage([makeDto(1)]));
      expect(() => fixture.componentInstance.confirmRoleChange()).not.toThrow();
      httpMock.expectNone(r => r.url.includes('/role'));
    });

    it('cancelRoleChange() is a no-op if called with no pending confirmation', () => {
      flushList(makePage([makeDto(1)]));
      expect(() => fixture.componentInstance.cancelRoleChange()).not.toThrow();
    });
  });
});
