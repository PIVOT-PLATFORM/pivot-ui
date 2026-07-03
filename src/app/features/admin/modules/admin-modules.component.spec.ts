import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { AdminModulesComponent } from './admin-modules.component';
import { ToastService } from '../../../shared/toast/toast.service';
import { environment } from '../../../../environments/environment';

const frTranslations = {
  common: { loading: 'Chargement en cours…' },
  admin: {
    modules: {
      list: {
        title: 'Modules',
        subtitle: 'Activez ou désactivez les modules PIVOT pour votre organisation.',
        empty: 'Aucun module disponible pour votre plan',
        error: 'Impossible de charger les modules. Réessayez.',
        retry: 'Réessayer',
      },
      card: {
        active: 'Actif',
        inactive: 'Inactif',
        action_activate: 'Activer',
        action_deactivate: 'Désactiver',
        toggle_activate: 'Activer {{ name }}',
        toggle_deactivate: 'Désactiver {{ name }}',
        not_in_plan: "Ce module n'est pas inclus dans votre plan",
      },
      toast: {
        activated: 'Module {{ name }} activé',
        deactivated: 'Module {{ name }} désactivé',
        activate_error: "Impossible d'activer le module {{ name }}. Réessayez.",
        deactivate_error: 'Impossible de désactiver le module {{ name }}. Réessayez.',
      },
      confirm: {
        title: 'Désactiver {{ name }} ?',
        message: 'Les utilisateurs connectés seront bloqués. Confirmer ?',
        confirm: 'Désactiver',
        cancel: 'Annuler',
      },
    },
  },
};

describe('AdminModulesComponent', () => {
  let fixture: ComponentFixture<AdminModulesComponent>;
  let httpMock: HttpTestingController;
  let toastService: ToastService;

  const flushList = (
    modules: { id: string; name: string; enabled: boolean; description: string }[] = [
      { id: 'whiteboard', name: 'Whiteboard', enabled: false, description: 'Tableau collaboratif' },
      { id: 'quiz', name: 'Quiz', enabled: true, description: '' },
    ]
  ) => {
    httpMock.expectOne(`${environment.apiUrl}/admin/modules`).flush(modules);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AdminModulesComponent,
        TranslocoTestingModule.forRoot({
          langs: { fr: frTranslations, en: {} },
          translocoConfig: { defaultLang: 'fr', availableLangs: ['fr', 'en'] },
        }),
      ],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminModulesComponent);
    httpMock = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('mounts and triggers the initial GET /api/admin/modules', () => {
    expect(fixture.componentInstance).toBeTruthy();
    httpMock.expectOne(`${environment.apiUrl}/admin/modules`).flush([]);
  });

  it('shows the loading skeleton while the request is pending', () => {
    const skeleton = fixture.nativeElement.querySelector('[data-testid="admin-modules-skeleton"]');
    expect(skeleton).not.toBeNull();
    httpMock.expectOne(`${environment.apiUrl}/admin/modules`).flush([]);
  });

  it('shows the empty state when the module list is empty', () => {
    flushList([]);
    const empty = fixture.nativeElement.querySelector('[data-testid="admin-modules-empty"]');
    expect(empty?.textContent).toContain('Aucun module disponible pour votre plan');
  });

  it('shows the error state with a retry button when the GET fails, and retry re-fetches', () => {
    httpMock
      .expectOne(`${environment.apiUrl}/admin/modules`)
      .flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    const errorState = fixture.nativeElement.querySelector('[data-testid="admin-modules-error"]');
    expect(errorState).not.toBeNull();

    fixture.nativeElement.querySelector('[data-testid="admin-modules-retry"]').click();
    httpMock.expectOne(`${environment.apiUrl}/admin/modules`).flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="admin-modules-empty"]')).not.toBeNull();
  });

  it('renders a text status badge — not color-only — for active and inactive modules', () => {
    flushList();
    expect(fixture.nativeElement.querySelector('[data-testid="module-status-whiteboard"]').textContent.trim()).toBe(
      'Inactif'
    );
    expect(fixture.nativeElement.querySelector('[data-testid="module-status-quiz"]').textContent.trim()).toBe(
      'Actif'
    );
  });

  it('omits the description line gracefully when description is empty', () => {
    flushList();
    const quizCard = fixture.nativeElement.querySelector('[data-testid="module-card-quiz"]');
    expect(quizCard.querySelector('.admin-modules__card-description')).toBeNull();
    const whiteboardCard = fixture.nativeElement.querySelector('[data-testid="module-card-whiteboard"]');
    expect(whiteboardCard.querySelector('.admin-modules__card-description')?.textContent).toContain(
      'Tableau collaboratif'
    );
  });

  it('sets an aria-label naming the module and the activate action on an inactive module toggle', () => {
    flushList();
    const toggle = fixture.nativeElement.querySelector('[data-testid="module-toggle-whiteboard"]');
    expect(toggle.getAttribute('aria-label')).toBe('Activer Whiteboard');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });

  it('sets an aria-label naming the module and the deactivate action on an active module toggle', () => {
    flushList();
    const toggle = fixture.nativeElement.querySelector('[data-testid="module-toggle-quiz"]');
    expect(toggle.getAttribute('aria-label')).toBe('Désactiver Quiz');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });

  it('activates an inactive module directly on toggle click (no confirmation needed)', () => {
    flushList();
    fixture.nativeElement.querySelector('[data-testid="module-toggle-whiteboard"]').click();
    fixture.detectChanges();

    // No confirm dialog for activation.
    expect(fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]')).toBeNull();

    const req = httpMock.expectOne(`${environment.apiUrl}/admin/modules/whiteboard/activate`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'whiteboard', enabled: true });
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="module-status-whiteboard"]').textContent.trim()
    ).toBe('Actif');
    expect(
      toastService
        .toasts()
        .some(
          t => t.type === 'info' && t.messageKey === 'admin.modules.toast.activated' && t.params?.['name'] === 'Whiteboard'
        )
    ).toBe(true);
  });

  it('disables the toggle while its own request is in flight, without affecting other cards', () => {
    flushList();
    const whiteboardToggle = fixture.nativeElement.querySelector('[data-testid="module-toggle-whiteboard"]');
    whiteboardToggle.click();
    fixture.detectChanges();

    expect(whiteboardToggle.disabled).toBe(true);
    const quizToggle = fixture.nativeElement.querySelector('[data-testid="module-toggle-quiz"]');
    expect(quizToggle.disabled).toBe(false);

    httpMock.expectOne(`${environment.apiUrl}/admin/modules/whiteboard/activate`).flush({ id: 'whiteboard', enabled: true });
    fixture.detectChanges();
    expect(whiteboardToggle.disabled).toBe(false);
  });

  it('shows an inline "not in plan" message on the card when activation fails with 403 MODULE_NOT_IN_PLAN', () => {
    flushList();
    fixture.nativeElement.querySelector('[data-testid="module-toggle-whiteboard"]').click();
    httpMock.expectOne(`${environment.apiUrl}/admin/modules/whiteboard/activate`).flush(
      { error: 'MODULE_NOT_IN_PLAN', message: "Ce module n'est pas inclus dans votre plan" },
      { status: 403, statusText: 'Forbidden' }
    );
    fixture.detectChanges();

    const inlineError = fixture.nativeElement.querySelector('[data-testid="module-card-error-whiteboard"]');
    expect(inlineError?.textContent).toContain("Ce module n'est pas inclus dans votre plan");
    // rollback: still inactive
    expect(
      fixture.nativeElement.querySelector('[data-testid="module-status-whiteboard"]').textContent.trim()
    ).toBe('Inactif');
    expect(toastService.toasts().some(t => t.type === 'error')).toBe(true);
  });

  it('requires confirmation before deactivating an active module, and does not call the API on cancel', () => {
    flushList();
    fixture.nativeElement.querySelector('[data-testid="module-toggle-quiz"]').click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Les utilisateurs connectés seront bloqués. Confirmer ?');

    fixture.nativeElement.querySelector('[data-testid="confirm-dialog-cancel"]').click();
    fixture.detectChanges();

    httpMock.expectNone(
      request => request.method === 'DELETE' && request.url === `${environment.apiUrl}/admin/modules/quiz/activate`
    );
    expect(fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]')).toBeNull();
    // Still active — nothing changed.
    expect(fixture.nativeElement.querySelector('[data-testid="module-status-quiz"]').textContent.trim()).toBe(
      'Actif'
    );
  });

  it('calls DELETE .../activate only after confirmation, and shows the success toast', () => {
    flushList();
    fixture.nativeElement.querySelector('[data-testid="module-toggle-quiz"]').click();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();
    fixture.detectChanges();

    const req = httpMock.expectOne(
      request => request.method === 'DELETE' && request.url === `${environment.apiUrl}/admin/modules/quiz/activate`
    );
    req.flush({ id: 'quiz', enabled: false });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="module-status-quiz"]').textContent.trim()).toBe(
      'Inactif'
    );
    expect(
      toastService
        .toasts()
        .some(
          t => t.type === 'info' && t.messageKey === 'admin.modules.toast.deactivated' && t.params?.['name'] === 'Quiz'
        )
    ).toBe(true);
  });

  it('confirmDeactivate() is a no-op if called with no pending confirmation target', () => {
    flushList();
    expect(() => fixture.componentInstance.confirmDeactivate()).not.toThrow();
    httpMock.expectNone(
      request => request.method === 'DELETE' && request.url.includes('/activate')
    );
  });

  it('structures each module card as a <ul><li> list item', () => {
    flushList();
    const list = fixture.nativeElement.querySelector('[data-testid="admin-modules-grid"]');
    expect(list.tagName.toLowerCase()).toBe('ul');
    expect(list.querySelector('li[data-testid="module-card-whiteboard"]')).not.toBeNull();
  });
});
