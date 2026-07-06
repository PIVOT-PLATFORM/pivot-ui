import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { PlansListComponent } from './plans-list.component';
import type { PlanDto } from './plan.model';
import { environment } from '../../../../environments/environment';

const API_URL = `${environment.apiUrl}/superadmin/plans`;

const frTranslations = {
  common: { loading: 'Chargement en cours…', error_generic: 'Une erreur est survenue. Réessayez.' },
  superadmin: {
    plans: {
      list: {
        title: 'Plans',
        subtitle: 'Configurez les modules disponibles par plan tarifaire.',
        empty: "Aucun plan n'existe encore",
        error: 'Impossible de charger les plans. Réessayez.',
        retry: 'Réessayer',
        detail_link: 'Voir',
      },
      columns: { name: 'Nom', module_count: 'Modules', created_at: 'Créé le', actions: 'Actions' },
      create: {
        title: 'Créer un plan',
        name_label: 'Nom',
        name_placeholder: 'Gold',
        submit: 'Créer le plan',
        error_name_required: 'Le nom est obligatoire.',
        error_name_too_long: 'Le nom ne peut pas dépasser 100 caractères.',
        error_name_taken: 'Ce nom de plan est déjà utilisé.',
        error_validation: 'Certains champs sont invalides. Vérifiez le formulaire et réessayez.',
        error_forbidden: "Vous n'avez pas les droits nécessaires pour créer un plan.",
      },
    },
  },
};

const makeDto = (id: number, overrides: Partial<PlanDto> = {}): PlanDto => ({
  id,
  name: `Plan ${id}`,
  moduleIds: [],
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('PlansListComponent', () => {
  let fixture: ComponentFixture<PlansListComponent>;
  let httpMock: HttpTestingController;

  const expectListRequest = () => httpMock.expectOne(r => r.url === API_URL && r.method === 'GET');
  const flushList = (plans: PlanDto[] = [makeDto(1), makeDto(2)]) => {
    expectListRequest().flush(plans);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        PlansListComponent,
        TranslocoTestingModule.forRoot({
          langs: { fr: frTranslations, en: {} },
          translocoConfig: { defaultLang: 'fr', availableLangs: ['fr', 'en'] },
        }),
      ],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PlansListComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('mounts and triggers the initial GET /superadmin/plans', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expectListRequest().flush([]);
  });

  it('shows the loading skeleton while the request is pending', () => {
    const skeleton = fixture.nativeElement.querySelector('[data-testid="plans-skeleton"]');
    expect(skeleton).not.toBeNull();
    expectListRequest().flush([]);
  });

  it('shows the empty state when no plan exists', () => {
    flushList([]);
    const empty = fixture.nativeElement.querySelector('[data-testid="plans-empty"]');
    expect(empty?.textContent).toContain("Aucun plan n'existe encore");
  });

  it('shows the error state with a retry button when the GET fails, and retry re-fetches', () => {
    expectListRequest().flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    const errorState = fixture.nativeElement.querySelector('[data-testid="plans-error"]');
    expect(errorState).not.toBeNull();
    expect(errorState.textContent).toContain('Impossible de charger les plans. Réessayez.');

    fixture.nativeElement.querySelector('[data-testid="plans-retry"]').click();
    expectListRequest().flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="plans-empty"]')).not.toBeNull();
  });

  it('renders a table row per plan with name, module count and a detail link', () => {
    flushList([
      makeDto(1, { name: 'Gold', moduleIds: ['whiteboard', 'quiz'] }),
      makeDto(2, { name: 'Silver', moduleIds: [] }),
    ]);

    const row1 = fixture.nativeElement.querySelector('[data-testid="plan-row-1"]');
    expect(row1.textContent).toContain('Gold');
    expect(fixture.nativeElement.querySelector('[data-testid="plan-module-count-1"]').textContent.trim()).toBe('2');

    const link1 = fixture.nativeElement.querySelector('[data-testid="plan-detail-link-1"]');
    expect(link1.getAttribute('href')).toBe('/superadmin/plans/1');

    const row2 = fixture.nativeElement.querySelector('[data-testid="plan-row-2"]');
    expect(row2.textContent).toContain('Silver');
    expect(fixture.nativeElement.querySelector('[data-testid="plan-module-count-2"]').textContent.trim()).toBe('0');
  });

  describe('create plan form', () => {
    it('does not submit an invalid (blank) name', () => {
      flushList([]);
      fixture.nativeElement.querySelector('[data-testid="plans-create-submit"]').click();
      fixture.detectChanges();

      httpMock.expectNone(r => r.url === API_URL && r.method === 'POST');
      const error = fixture.nativeElement.querySelector('[data-testid="plan-name-error"]');
      expect(error?.textContent).toContain('Le nom est obligatoire.');
    });

    it('creates a plan and appends it to the table on success, resetting the form', () => {
      flushList([makeDto(1, { name: 'Silver' })]);

      const input = fixture.nativeElement.querySelector('[data-testid="plan-name-input"]') as HTMLInputElement;
      input.value = 'Gold';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      fixture.nativeElement.querySelector('[data-testid="plans-create-form"]').dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      const req = httpMock.expectOne(r => r.url === API_URL && r.method === 'POST');
      expect(req.request.body).toEqual({ name: 'Gold' });
      req.flush(makeDto(2, { name: 'Gold' }));
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="plan-row-2"]').textContent).toContain('Gold');
      expect((fixture.nativeElement.querySelector('[data-testid="plan-name-input"]') as HTMLInputElement).value).toBe(
        ''
      );
    });

    it('shows a spinner and disables submit while creating', () => {
      flushList([]);
      const input = fixture.nativeElement.querySelector('[data-testid="plan-name-input"]') as HTMLInputElement;
      input.value = 'Gold';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      fixture.nativeElement.querySelector('[data-testid="plans-create-form"]').dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('[data-testid="plans-create-submit"]') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(fixture.nativeElement.querySelector('.spinner')).toBeTruthy();

      httpMock.expectOne(API_URL).flush(makeDto(1, { name: 'Gold' }));
    });

    it('on 409, shows a duplicate-name error inline on the name field (not a generic banner)', () => {
      flushList([]);
      const input = fixture.nativeElement.querySelector('[data-testid="plan-name-input"]') as HTMLInputElement;
      input.value = 'Gold';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      fixture.nativeElement.querySelector('[data-testid="plans-create-form"]').dispatchEvent(new Event('submit'));
      httpMock
        .expectOne(API_URL)
        .flush({ error: 'PLAN_NAME_ALREADY_EXISTS', message: 'x' }, { status: 409, statusText: 'Conflict' });
      fixture.detectChanges();

      const fieldError = fixture.nativeElement.querySelector('[data-testid="plan-name-error"]');
      expect(fieldError?.textContent).toContain('Ce nom de plan est déjà utilisé.');
      expect(fixture.nativeElement.querySelector('[data-testid="plans-create-error"]')).toBeNull();
    });

    it('on 400, shows a generic validation banner', () => {
      flushList([]);
      const input = fixture.nativeElement.querySelector('[data-testid="plan-name-input"]') as HTMLInputElement;
      input.value = 'Gold';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      fixture.nativeElement.querySelector('[data-testid="plans-create-form"]').dispatchEvent(new Event('submit'));
      httpMock.expectOne(API_URL).flush('', { status: 400, statusText: 'Bad Request' });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="plans-create-error"]').textContent).toContain(
        'Certains champs sont invalides. Vérifiez le formulaire et réessayez.'
      );
    });

    it('on 500, shows a generic error banner', () => {
      flushList([]);
      const input = fixture.nativeElement.querySelector('[data-testid="plan-name-input"]') as HTMLInputElement;
      input.value = 'Gold';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      fixture.nativeElement.querySelector('[data-testid="plans-create-form"]').dispatchEvent(new Event('submit'));
      httpMock.expectOne(API_URL).flush('', { status: 500, statusText: 'Internal Server Error' });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="plans-create-error"]').textContent).toContain(
        'Une erreur est survenue. Réessayez.'
      );
    });

    it('clears the duplicate-name error as soon as the name is edited again', () => {
      flushList([]);
      const input = fixture.nativeElement.querySelector('[data-testid="plan-name-input"]') as HTMLInputElement;
      input.value = 'Gold';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      fixture.nativeElement.querySelector('[data-testid="plans-create-form"]').dispatchEvent(new Event('submit'));
      httpMock
        .expectOne(API_URL)
        .flush({ error: 'PLAN_NAME_ALREADY_EXISTS', message: 'x' }, { status: 409, statusText: 'Conflict' });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="plan-name-error"]')).not.toBeNull();

      input.value = 'Gold Plus';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="plan-name-error"]')).toBeNull();
    });
  });
});
