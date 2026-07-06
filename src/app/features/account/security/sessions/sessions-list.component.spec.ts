import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { SessionsListComponent } from './sessions-list.component';
import { ToastService } from '../../../../shared/toast/toast.service';
import { environment } from '../../../../../environments/environment';
import type { SessionDto } from './session.model';

const frTranslations = {
  common: { loading: 'Chargement en cours…' },
  account: {
    sessions: {
      list: {
        title: 'Sessions actives',
        subtitle: 'Retrouvez les appareils connectés à votre compte et révoquez ceux que vous ne reconnaissez pas.',
        empty: 'Aucune autre session active',
        error: 'Impossible de charger vos sessions. Réessayez.',
        retry: 'Réessayer',
        column_device: 'Appareil',
        column_ip: 'Adresse IP',
        column_created: 'Créée le',
        column_expires: 'Expire le',
        column_actions: 'Actions',
        unknown_device: 'Appareil inconnu',
        current_session: 'Session actuelle',
        not_revocable: 'Non révocable',
        revoke: 'Révoquer',
        revoke_aria: 'Révoquer la session depuis {{ device }} le {{ date }}',
        revoke_all: 'Révoquer toutes les autres sessions',
      },
      confirm: {
        title_one: 'Révoquer cette session ?',
        message_one: 'Cette session sera immédiatement déconnectée. Continuer ?',
        title_all: 'Révoquer toutes les autres sessions ?',
        message_all: 'Toutes vos autres sessions actives seront déconnectées. Cette action est irréversible. Continuer ?',
        confirm: 'Révoquer',
        cancel: 'Annuler',
      },
      toast: {
        revoked: 'Session révoquée',
        revoke_error: 'Impossible de révoquer cette session. Réessayez.',
        revoked_all: 'Toutes les autres sessions ont été révoquées',
        revoke_all_error: 'Impossible de révoquer les autres sessions. Réessayez.',
      },
    },
  },
};

const makeDto = (id: number, overrides: Partial<SessionDto> = {}): SessionDto => ({
  id,
  device: `Device ${id}`,
  ip: '203.0.113.5',
  createdAt: '2026-07-01T10:00:00Z',
  expiresAt: '2026-08-01T10:00:00Z',
  isCurrent: false,
  ...overrides,
});

describe('SessionsListComponent', () => {
  let fixture: ComponentFixture<SessionsListComponent>;
  let httpMock: HttpTestingController;
  let toastService: ToastService;

  const flushList = (sessions: SessionDto[] = [makeDto(1, { isCurrent: true }), makeDto(2)]) => {
    httpMock.expectOne(`${environment.apiUrl}/account/sessions`).flush(sessions);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SessionsListComponent,
        TranslocoTestingModule.forRoot({
          langs: { fr: frTranslations, en: {} },
          translocoConfig: { defaultLang: 'fr', availableLangs: ['fr', 'en'] },
        }),
      ],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(SessionsListComponent);
    httpMock = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('mounts and triggers the initial GET /api/account/sessions', () => {
    expect(fixture.componentInstance).toBeTruthy();
    httpMock.expectOne(`${environment.apiUrl}/account/sessions`).flush([]);
  });

  it('shows the loading skeleton while the request is pending', () => {
    const skeleton = fixture.nativeElement.querySelector('[data-testid="sessions-skeleton"]');
    expect(skeleton).not.toBeNull();
    httpMock.expectOne(`${environment.apiUrl}/account/sessions`).flush([]);
  });

  it('shows the error state with a retry button when the GET fails, and retry re-fetches', () => {
    httpMock
      .expectOne(`${environment.apiUrl}/account/sessions`)
      .flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    const errorState = fixture.nativeElement.querySelector('[data-testid="sessions-error"]');
    expect(errorState).not.toBeNull();

    fixture.nativeElement.querySelector('[data-testid="sessions-retry"]').click();
    httpMock.expectOne(`${environment.apiUrl}/account/sessions`).flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="sessions-empty"]')).not.toBeNull();
  });

  it('shows the empty state ("Aucune autre session active") when only the current session is active', () => {
    flushList([makeDto(1, { isCurrent: true })]);
    const empty = fixture.nativeElement.querySelector('[data-testid="sessions-empty"]');
    expect(empty?.textContent).toContain('Aucune autre session active');
  });

  it('does NOT show the empty state when other sessions exist alongside the current one', () => {
    flushList();
    expect(fixture.nativeElement.querySelector('[data-testid="sessions-empty"]')).toBeNull();
  });

  it('renders the current session with a visible + textual badge and no revoke button', () => {
    flushList();
    const currentRow = fixture.nativeElement.querySelector('[data-testid="session-row-1"]');
    expect(currentRow.querySelector('[data-testid="session-current-badge-1"]').textContent.trim()).toBe(
      'Session actuelle'
    );
    expect(currentRow.querySelector('[data-testid="session-revoke-1"]')).toBeNull();
    expect(currentRow.textContent).toContain('Non révocable');
  });

  it('falls back to "Appareil inconnu" when device is null', () => {
    flushList([makeDto(1, { isCurrent: true }), makeDto(2, { device: null })]);
    const row = fixture.nativeElement.querySelector('[data-testid="session-row-2"]');
    expect(row.textContent).toContain('Appareil inconnu');
  });

  it('renders device text via interpolation, never innerHTML (defence-in-depth against stored XSS)', () => {
    flushList([makeDto(1, { isCurrent: true }), makeDto(2, { device: '<img src=x onerror=alert(1)>' })]);
    const row = fixture.nativeElement.querySelector('[data-testid="session-row-2"]');
    expect(row.querySelector('img')).toBeNull();
    expect(row.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('sets a contextual aria-label on the revoke button naming the device and date', () => {
    flushList();
    const button = fixture.nativeElement.querySelector('[data-testid="session-revoke-2"]');
    expect(button.getAttribute('aria-label')).toBe('Révoquer la session depuis Device 2 le 1 juil. 2026, 10:00');
  });

  it('opens a role="dialog" confirmation before revoking a single session, and does not call the API on cancel', () => {
    flushList();
    fixture.nativeElement.querySelector('[data-testid="session-revoke-2"]').click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.hasAttribute('aria-labelledby')).toBe(true);

    fixture.nativeElement.querySelector('[data-testid="confirm-dialog-cancel"]').click();
    fixture.detectChanges();

    httpMock.expectNone(`${environment.apiUrl}/account/sessions/2`);
    expect(fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="session-row-2"]')).not.toBeNull();
  });

  it('revokes a session after confirmation, shows a success toast, and removes it optimistically', () => {
    flushList();
    fixture.nativeElement.querySelector('[data-testid="session-revoke-2"]').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();
    fixture.detectChanges();

    // Optimistic removal happens before the HTTP response resolves.
    expect(fixture.nativeElement.querySelector('[data-testid="session-row-2"]')).toBeNull();

    const req = httpMock.expectOne(`${environment.apiUrl}/account/sessions/2`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(toastService.toasts().some(t => t.type === 'info' && t.messageKey === 'account.sessions.toast.revoked')).toBe(
      true
    );
    expect(fixture.nativeElement.querySelector('[data-testid="sessions-empty"]')).not.toBeNull();
  });

  it('shows a distinct success toast per session — two revocations confirmed for two different sessions are not deduplicated', () => {
    // Regression: ToastService.show() deduplicates on (messageKey, params) together.
    // The success toast previously carried no params, so revoking two different
    // sessions in the same 8s auto-dismiss window collapsed into a single toast —
    // the second revocation's confirmation was silently dropped (same pitfall as
    // AdminUsersComponent's role/status success toasts).
    flushList([makeDto(1, { isCurrent: true }), makeDto(2), makeDto(3)]);

    fixture.nativeElement.querySelector('[data-testid="session-revoke-2"]').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/sessions/2`).flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid="session-revoke-3"]').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/sessions/3`).flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    const revokedToasts = toastService
      .toasts()
      .filter(t => t.type === 'info' && t.messageKey === 'account.sessions.toast.revoked');
    expect(revokedToasts).toHaveLength(2);
  });

  it('keeps the session in the list and shows an error toast when revocation fails', () => {
    flushList();
    fixture.nativeElement.querySelector('[data-testid="session-revoke-2"]').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();
    fixture.detectChanges();

    httpMock
      .expectOne(`${environment.apiUrl}/account/sessions/2`)
      .flush('Not Found', { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="session-row-2"]')).not.toBeNull();
    expect(toastService.toasts().some(t => t.type === 'error' && t.messageKey === 'account.sessions.toast.revoke_error')).toBe(
      true
    );
  });

  it('shows a "revoke all others" button only when other sessions exist, with its own confirmation', () => {
    flushList([makeDto(1, { isCurrent: true })]);
    expect(fixture.nativeElement.querySelector('[data-testid="sessions-revoke-all"]')).toBeNull();
  });

  it('revokes all other sessions after confirmation and shows a success toast', () => {
    flushList([makeDto(1, { isCurrent: true }), makeDto(2), makeDto(3)]);
    fixture.nativeElement.querySelector('[data-testid="sessions-revoke-all"]').click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]');
    expect(dialog.textContent).toContain('Révoquer toutes les autres sessions ?');

    fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="session-row-2"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="session-row-3"]')).toBeNull();

    const req = httpMock.expectOne(`${environment.apiUrl}/account/sessions`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(
      toastService.toasts().some(t => t.type === 'info' && t.messageKey === 'account.sessions.toast.revoked_all')
    ).toBe(true);
  });

  it('structures the sessions list as a <table> with column headers', () => {
    flushList();
    const table = fixture.nativeElement.querySelector('[data-testid="sessions-table"]');
    expect(table.tagName.toLowerCase()).toBe('table');
    const headers = Array.from(table.querySelectorAll('th') as NodeListOf<HTMLElement>).map(th =>
      th.textContent?.trim()
    );
    expect(headers).toEqual(['Appareil', 'Adresse IP', 'Créée le', 'Expire le', 'Actions']);
  });
});
