import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { PlanDetailComponent } from './plan-detail.component';
import type { PlanDto } from './plan.model';
import { environment } from '../../../../environments/environment';

const API_URL = `${environment.apiUrl}/superadmin/plans`;

const frTranslations = {
  common: { loading: 'Chargement en cours…', back: 'Retour', error_generic: 'Une erreur est survenue. Réessayez.' },
  superadmin: {
    plans: {
      detail: {
        title: 'Détail du plan',
        subtitle: '{{ count }} module(s) inclus',
        not_found: "Ce plan n'existe pas.",
        error: 'Impossible de charger le plan. Réessayez.',
        retry: 'Réessayer',
        empty_modules: 'Aucun module dans ce plan',
        modules_list_aria: 'Modules du plan',
        remove_module_aria: 'Retirer {{ moduleId }}',
        add_module_label: 'Ajouter un module',
        add_module_placeholder: 'whiteboard',
        add_module_submit: 'Ajouter',
        error_unknown_module: "Le module {{ moduleId }} n'existe pas.",
        error_plan_not_found: "Ce plan n'existe plus.",
        error_remove: 'Impossible de retirer ce module. Réessayez.',
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

describe('PlanDetailComponent', () => {
  let fixture: ComponentFixture<PlanDetailComponent>;
  let httpMock: HttpTestingController;

  const expectGetRequest = () => httpMock.expectOne(r => r.url === `${API_URL}/1` && r.method === 'GET');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        PlanDetailComponent,
        TranslocoTestingModule.forRoot({
          langs: { fr: frTranslations, en: {} },
          translocoConfig: { defaultLang: 'fr', availableLangs: ['fr', 'en'] },
        }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanDetailComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('mounts and triggers the initial GET /superadmin/plans/{planId}', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expectGetRequest().flush(makeDto(1));
  });

  it('shows the loading skeleton while the request is pending', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="plan-detail-skeleton"]')).not.toBeNull();
    expectGetRequest().flush(makeDto(1));
  });

  it('shows the not-found state on a 404', () => {
    expectGetRequest().flush({ error: 'PLAN_NOT_FOUND', message: 'x' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    const notFound = fixture.nativeElement.querySelector('[data-testid="plan-detail-not-found"]');
    expect(notFound?.textContent).toContain("Ce plan n'existe pas.");
  });

  it('shows the error state with a retry button on a non-404 failure, and retry re-fetches', () => {
    expectGetRequest().flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    const errorState = fixture.nativeElement.querySelector('[data-testid="plan-detail-error"]');
    expect(errorState?.textContent).toContain('Impossible de charger le plan. Réessayez.');

    fixture.nativeElement.querySelector('[data-testid="plan-detail-retry"]').click();
    expectGetRequest().flush(makeDto(1, { name: 'Gold' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Gold');
  });

  it('renders the plan name, module count and empty state when it has no modules', () => {
    expectGetRequest().flush(makeDto(1, { name: 'Gold', moduleIds: [] }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Gold');
    expect(fixture.nativeElement.querySelector('[data-testid="plan-modules-empty"]')).not.toBeNull();
  });

  it('renders a chip per module with a remove button', () => {
    expectGetRequest().flush(makeDto(1, { name: 'Gold', moduleIds: ['whiteboard', 'quiz'] }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="plan-module-whiteboard"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="plan-module-quiz"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="plan-modules-empty"]')).toBeNull();
  });

  describe('add module', () => {
    it('does not submit a blank module id', () => {
      expectGetRequest().flush(makeDto(1, { moduleIds: [] }));
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('[data-testid="plan-add-module-submit"]') as HTMLButtonElement;
      expect(button.disabled).toBe(true);

      button.click();
      httpMock.expectNone(r => r.url.includes('/modules/'));
    });

    it('adds a module via POST .../modules/{moduleId} and clears the input on success', async () => {
      expectGetRequest().flush(makeDto(1, { moduleIds: ['quiz'] }));
      fixture.detectChanges();
      // Lets the zoneless scheduler finish wiring up the ngModel-bound input's
      // ControlValueAccessor before we dispatch a synthetic 'input' event on it —
      // without this, the accessor registration (which happens asynchronously
      // relative to the @if view just being created above) hasn't completed yet
      // and the dispatched event is silently dropped.
      await fixture.whenStable();

      const input = fixture.nativeElement.querySelector('[data-testid="plan-add-module-input"]') as HTMLInputElement;
      input.value = 'whiteboard';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      fixture.nativeElement.querySelector('[data-testid="plan-add-module-submit"]').click();
      const req = httpMock.expectOne(r => r.url === `${API_URL}/1/modules/whiteboard` && r.method === 'POST');
      expect(req.request.body).toBeNull();
      req.flush({ moduleIds: ['quiz', 'whiteboard'] });
      fixture.detectChanges();
      // Same zoneless-scheduler tick needed for the model->view write-back
      // (moduleIdInput.set('')) to reach the native input's `.value` property.
      await fixture.whenStable();

      expect(fixture.nativeElement.querySelector('[data-testid="plan-module-whiteboard"]')).not.toBeNull();
      expect((fixture.nativeElement.querySelector('[data-testid="plan-add-module-input"]') as HTMLInputElement).value).toBe(
        ''
      );
    });

    it('re-adding an already-listed module (idempotent 200) does not show an error', async () => {
      expectGetRequest().flush(makeDto(1, { moduleIds: ['whiteboard'] }));
      fixture.detectChanges();
      await fixture.whenStable();

      const input = fixture.nativeElement.querySelector('[data-testid="plan-add-module-input"]') as HTMLInputElement;
      input.value = 'whiteboard';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      fixture.nativeElement.querySelector('[data-testid="plan-add-module-submit"]').click();
      httpMock.expectOne(r => r.url === `${API_URL}/1/modules/whiteboard`).flush({ moduleIds: ['whiteboard'] });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="plan-add-module-error"]')).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('[data-testid="plan-module-whiteboard"]')).toHaveLength(1);
    });

    it('on 400 UNKNOWN_MODULE_ID, shows an inline error naming the rejected module id', async () => {
      expectGetRequest().flush(makeDto(1, { moduleIds: [] }));
      fixture.detectChanges();
      await fixture.whenStable();

      const input = fixture.nativeElement.querySelector('[data-testid="plan-add-module-input"]') as HTMLInputElement;
      input.value = 'bogus';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      fixture.nativeElement.querySelector('[data-testid="plan-add-module-submit"]').click();
      httpMock
        .expectOne(r => r.url === `${API_URL}/1/modules/bogus`)
        .flush({ error: 'UNKNOWN_MODULE_ID', message: 'x' }, { status: 400, statusText: 'Bad Request' });
      fixture.detectChanges();

      const error = fixture.nativeElement.querySelector('[data-testid="plan-add-module-error"]');
      expect(error?.textContent).toContain("Le module bogus n'existe pas.");
    });

    it('clears the add-module error as soon as the input is edited again', async () => {
      expectGetRequest().flush(makeDto(1, { moduleIds: [] }));
      fixture.detectChanges();
      await fixture.whenStable();

      const input = fixture.nativeElement.querySelector('[data-testid="plan-add-module-input"]') as HTMLInputElement;
      input.value = 'bogus';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      fixture.nativeElement.querySelector('[data-testid="plan-add-module-submit"]').click();
      httpMock
        .expectOne(r => r.url === `${API_URL}/1/modules/bogus`)
        .flush({ error: 'UNKNOWN_MODULE_ID', message: 'x' }, { status: 400, statusText: 'Bad Request' });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="plan-add-module-error"]')).not.toBeNull();

      input.value = 'whiteboard';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="plan-add-module-error"]')).toBeNull();
    });
  });

  describe('remove module', () => {
    it('removes a module via PUT .../modules with the current list minus the removed one', () => {
      expectGetRequest().flush(makeDto(1, { moduleIds: ['whiteboard', 'quiz'] }));
      fixture.detectChanges();

      fixture.nativeElement.querySelector('[data-testid="plan-module-remove-whiteboard"]').click();
      const req = httpMock.expectOne(r => r.url === `${API_URL}/1/modules` && r.method === 'PUT');
      expect(req.request.body).toEqual({ moduleIds: ['quiz'] });
      req.flush({ moduleIds: ['quiz'] });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="plan-module-whiteboard"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="plan-module-quiz"]')).not.toBeNull();
    });

    it('removing the last module sends an explicit empty array and shows the empty state', () => {
      expectGetRequest().flush(makeDto(1, { moduleIds: ['whiteboard'] }));
      fixture.detectChanges();

      fixture.nativeElement.querySelector('[data-testid="plan-module-remove-whiteboard"]').click();
      const req = httpMock.expectOne(r => r.url === `${API_URL}/1/modules` && r.method === 'PUT');
      expect(req.request.body).toEqual({ moduleIds: [] });
      req.flush({ moduleIds: [] });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="plan-modules-empty"]')).not.toBeNull();
    });

    it('shows an inline error and keeps the module listed when the remove PUT fails', () => {
      expectGetRequest().flush(makeDto(1, { moduleIds: ['whiteboard'] }));
      fixture.detectChanges();

      fixture.nativeElement.querySelector('[data-testid="plan-module-remove-whiteboard"]').click();
      httpMock
        .expectOne(r => r.url === `${API_URL}/1/modules`)
        .flush('Server error', { status: 500, statusText: 'Internal Server Error' });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="plan-detail-remove-error"]')?.textContent).toContain(
        'Impossible de retirer ce module. Réessayez.'
      );
      expect(fixture.nativeElement.querySelector('[data-testid="plan-module-whiteboard"]')).not.toBeNull();
    });

    it('disables the remove button for a module while its removal is in flight', () => {
      expectGetRequest().flush(makeDto(1, { moduleIds: ['whiteboard'] }));
      fixture.detectChanges();

      fixture.nativeElement.querySelector('[data-testid="plan-module-remove-whiteboard"]').click();
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector(
        '[data-testid="plan-module-remove-whiteboard"]'
      ) as HTMLButtonElement;
      expect(button.disabled).toBe(true);

      httpMock.expectOne(r => r.url === `${API_URL}/1/modules`).flush({ moduleIds: [] });
    });
  });
});
