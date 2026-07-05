import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { TenantsListComponent } from './tenants-list.component';
import type { TenantDto, TenantPage } from './tenant.model';
import { environment } from '../../../../environments/environment';

const frTranslations = {
  common: { loading: 'Chargement en cours…' },
  superadmin: {
    tenants: {
      list: {
        title: 'Tenants',
        subtitle: "Vue d'ensemble de tous les tenants de la plateforme.",
        empty: 'Aucun tenant ne correspond aux filtres',
        error: 'Impossible de charger les tenants. Réessayez.',
        retry: 'Réessayer',
      },
      filters: {
        form_aria: 'Filtres de recherche des tenants',
        name: 'Nom',
        plan: 'Plan',
        plan_all: 'Tous',
        plan_saas: 'SaaS',
        plan_enterprise: 'Entreprise',
        plan_trial: 'Essai',
        is_active: 'Statut',
        is_active_all: 'Tous',
        is_active_true: 'Actif',
        is_active_false: 'Inactif',
        auth_mode: "Mode d'authentification",
        auth_mode_all: 'Tous',
        auth_mode_saas: 'SaaS',
        auth_mode_enterprise: 'Entreprise',
        auth_mode_hybrid: 'Hybride',
        submit: 'Filtrer',
      },
      columns: {
        name: 'Nom',
        slug: 'Slug',
        plan: 'Plan',
        auth_mode: "Mode d'authentification",
        is_active: 'Statut',
        user_count: 'Utilisateurs',
        created_at: 'Créé le',
      },
      status: { active: 'Actif', inactive: 'Inactif' },
      pagination: {
        nav_aria: 'Pagination des tenants',
        previous: '← Précédent',
        next: 'Suivant →',
        status: 'Page {{ page }} sur {{ totalPages }} ({{ total }} tenants)',
      },
    },
  },
};

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

describe('TenantsListComponent', () => {
  let fixture: ComponentFixture<TenantsListComponent>;
  let httpMock: HttpTestingController;

  const expectListRequest = () =>
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/superadmin/tenants` && r.method === 'GET');

  const flushList = (page: TenantPage = makePage([makeDto(1), makeDto(2)])) => {
    expectListRequest().flush(page);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TenantsListComponent,
        TranslocoTestingModule.forRoot({
          langs: { fr: frTranslations, en: {} },
          translocoConfig: { defaultLang: 'fr', availableLangs: ['fr', 'en'] },
        }),
      ],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TenantsListComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('mounts and triggers the initial GET /api/superadmin/tenants', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expectListRequest().flush(makePage([]));
  });

  it('shows the loading skeleton while the request is pending', () => {
    const skeleton = fixture.nativeElement.querySelector('[data-testid="tenants-skeleton"]');
    expect(skeleton).not.toBeNull();
    expectListRequest().flush(makePage([]));
  });

  it('shows the empty state when no tenant matches the filters', () => {
    flushList(makePage([]));
    const empty = fixture.nativeElement.querySelector('[data-testid="tenants-empty"]');
    expect(empty?.textContent).toContain('Aucun tenant ne correspond aux filtres');
  });

  it('shows the error state with a retry button when the GET fails, and retry re-fetches', () => {
    expectListRequest().flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    const errorState = fixture.nativeElement.querySelector('[data-testid="tenants-error"]');
    expect(errorState).not.toBeNull();
    expect(errorState.textContent).toContain('Impossible de charger les tenants. Réessayez.');

    fixture.nativeElement.querySelector('[data-testid="tenants-retry"]').click();
    expectListRequest().flush(makePage([]));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="tenants-empty"]')).not.toBeNull();
  });

  it('renders a table row per tenant with the documented columns', () => {
    flushList(
      makePage([
        makeDto(1, { name: 'Acme', slug: 'acme', plan: 'ENTERPRISE', authMode: 'SAAS', isActive: true, userCount: 12 }),
        makeDto(2, { name: 'Globex', slug: 'globex', plan: 'TRIAL', authMode: 'HYBRID', isActive: false, userCount: 0 }),
      ])
    );

    const table = fixture.nativeElement.querySelector('[data-testid="tenants-table"]');
    expect(table).not.toBeNull();

    const row1 = fixture.nativeElement.querySelector('[data-testid="tenant-row-1"]');
    expect(row1.textContent).toContain('Acme');
    expect(row1.textContent).toContain('acme');
    expect(row1.textContent).toContain('ENTERPRISE');
    expect(row1.textContent).toContain('SAAS');
    expect(row1.textContent).toContain('12');
    expect(fixture.nativeElement.querySelector('[data-testid="tenant-status-1"]').textContent.trim()).toBe('Actif');

    const row2 = fixture.nativeElement.querySelector('[data-testid="tenant-row-2"]');
    expect(row2.textContent).toContain('Globex');
    expect(fixture.nativeElement.querySelector('[data-testid="tenant-status-2"]').textContent.trim()).toBe('Inactif');
  });

  it('submits the name filter and re-queries from page 0', () => {
    flushList(makePage([makeDto(1)]));

    const nameInput = fixture.nativeElement.querySelector('[data-testid="tenant-filter-name"]');
    nameInput.value = 'acme';
    nameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid="tenant-filter-submit"]').click();
    fixture.detectChanges();

    const req = expectListRequest();
    expect(req.request.params.get('name')).toBe('acme');
    expect(req.request.params.get('page')).toBe('0');
    req.flush(makePage([]));
  });

  it('applies the is_active select filter immediately on change (no submit needed)', () => {
    flushList(makePage([makeDto(1)]));

    const select = fixture.nativeElement.querySelector('[data-testid="tenant-filter-active"]');
    select.value = 'false';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = expectListRequest();
    expect(req.request.params.get('is_active')).toBe('false');
    req.flush(makePage([]));
  });

  it('applies the plan select filter immediately on change (no submit needed)', () => {
    // plan is an exact-match backend enum (CHECK constraint), not free text — rendered
    // as a <select>, same immediate-apply behavior as is_active/auth_mode.
    flushList(makePage([makeDto(1)]));

    const select = fixture.nativeElement.querySelector('[data-testid="tenant-filter-plan"]');
    select.value = 'ENTERPRISE';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = expectListRequest();
    expect(req.request.params.get('plan')).toBe('ENTERPRISE');
    req.flush(makePage([]));
  });

  it('applies the auth_mode select filter immediately on change (no submit needed)', () => {
    flushList(makePage([makeDto(1)]));

    const select = fixture.nativeElement.querySelector('[data-testid="tenant-filter-auth-mode"]');
    select.value = 'HYBRID';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = expectListRequest();
    expect(req.request.params.get('auth_mode')).toBe('HYBRID');
    req.flush(makePage([]));
  });

  it('paginates: next/previous call the service with the adjacent page and are disabled at the bounds', () => {
    flushList(makePage([makeDto(1)], { number: 0, totalPages: 2, totalElements: 2 }));

    const prevBtn = fixture.nativeElement.querySelector('[data-testid="tenants-page-previous"]');
    const nextBtn = fixture.nativeElement.querySelector('[data-testid="tenants-page-next"]');
    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(false);

    nextBtn.click();
    fixture.detectChanges();

    const req = expectListRequest();
    expect(req.request.params.get('page')).toBe('1');
    req.flush(makePage([makeDto(2)], { number: 1, totalPages: 2, totalElements: 2 }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="tenants-page-next"]').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="tenants-page-previous"]').disabled).toBe(false);
  });

  it('shows the pagination status with 1-indexed page numbers for display', () => {
    flushList(makePage([makeDto(1)], { number: 0, totalPages: 3, totalElements: 45 }));
    const status = fixture.nativeElement.querySelector('[data-testid="tenants-page-status"]');
    expect(status.textContent).toContain('Page 1 sur 3');
    expect(status.textContent).toContain('45 tenants');
  });

  it('disables the filter fieldset while a request is in flight, and re-enables it once settled', () => {
    // The 4 filter controls + submit button live inside a single native
    // <fieldset [disabled]="loading()"> (not individual per-control [disabled]
    // bindings — Angular's NgModel/ControlValueAccessor owns the disabled state of
    // any element it's attached to and silently overrides a co-located [disabled]
    // binding on the same element). The browser natively cascades the fieldset's
    // disabled state to every descendant control; jsdom does not implement that
    // cascade (a known jsdom gap — real browsers do), so this test asserts on the
    // fieldset's own binding, which is what our template actually controls.
    const fieldset = fixture.nativeElement.querySelector('[data-testid="tenants-filter-fieldset"]');

    // Initial mount: the very first GET is already pending from beforeEach's fixture.detectChanges().
    expect(fieldset.disabled).toBe(true);

    flushList(makePage([makeDto(1)]));
    expect(fieldset.disabled).toBe(false);

    fixture.nativeElement.querySelector('[data-testid="tenant-filter-submit"]').click();
    fixture.detectChanges();
    expect(fieldset.disabled).toBe(true);

    expectListRequest().flush(makePage([]));
    fixture.detectChanges();
    expect(fieldset.disabled).toBe(false);
  });
});
