import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { TrustedDevicesListComponent } from './trusted-devices-list.component';
import { ToastService } from '../../../../shared/toast/toast.service';
import { environment } from '../../../../../environments/environment';
import type { TrustedDeviceDto } from './trusted-device.model';

const frTranslations = {
  common: { loading: 'Chargement en cours…' },
  account: {
    devices: {
      list: {
        title: 'Appareils de confiance',
        subtitle:
          'Faites confiance à un appareil pour ne plus avoir à confirmer votre identité par code à chaque connexion depuis celui-ci.',
        empty: 'Aucun autre appareil de confiance',
        error: 'Impossible de charger vos appareils de confiance. Réessayez.',
        retry: 'Réessayer',
        column_device: 'Appareil',
        column_ip: 'Adresse IP',
        column_trusted_since: 'Approuvé le',
        column_last_seen: 'Dernière activité',
        column_actions: 'Actions',
        unknown_device: 'Appareil inconnu',
        current_device: 'Appareil actuel',
        not_revocable: 'Non révocable',
        revoke: 'Révoquer',
        revoke_aria: 'Révoquer la confiance accordée à {{ device }} depuis le {{ date }}',
      },
      confirm: {
        title: 'Révoquer cet appareil de confiance ?',
        message:
          "Cet appareil ne sera plus reconnu comme approuvé : une prochaine connexion depuis celui-ci demandera à nouveau un code de vérification. Continuer ?",
        confirm: 'Révoquer',
        cancel: 'Annuler',
      },
      toast: {
        revoked: 'Appareil de confiance révoqué',
        revoke_error: 'Impossible de révoquer cet appareil. Réessayez.',
      },
    },
  },
};

const makeDto = (id: number, overrides: Partial<TrustedDeviceDto> = {}): TrustedDeviceDto => ({
  id,
  device: `Device ${id}`,
  ip: '203.0.113.5',
  createdAt: '2026-07-01T10:00:00Z',
  lastSeenAt: '2026-07-05T09:30:00Z',
  isCurrent: false,
  ...overrides,
});

describe('TrustedDevicesListComponent', () => {
  let fixture: ComponentFixture<TrustedDevicesListComponent>;
  let httpMock: HttpTestingController;
  let toastService: ToastService;

  const flushList = (devices: TrustedDeviceDto[] = [makeDto(1, { isCurrent: true }), makeDto(2)]) => {
    httpMock.expectOne(`${environment.apiUrl}/auth/devices`).flush(devices);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TrustedDevicesListComponent,
        TranslocoTestingModule.forRoot({
          langs: { fr: frTranslations, en: {} },
          translocoConfig: { defaultLang: 'fr', availableLangs: ['fr', 'en'] },
        }),
      ],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TrustedDevicesListComponent);
    httpMock = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('mounts and triggers the initial GET /api/auth/devices', () => {
    expect(fixture.componentInstance).toBeTruthy();
    httpMock.expectOne(`${environment.apiUrl}/auth/devices`).flush([]);
  });

  it('shows the loading skeleton while the request is pending', () => {
    const skeleton = fixture.nativeElement.querySelector('[data-testid="trusted-devices-skeleton"]');
    expect(skeleton).not.toBeNull();
    httpMock.expectOne(`${environment.apiUrl}/auth/devices`).flush([]);
  });

  it('shows the error state with a retry button when the GET fails, and retry re-fetches', () => {
    httpMock
      .expectOne(`${environment.apiUrl}/auth/devices`)
      .flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    const errorState = fixture.nativeElement.querySelector('[data-testid="trusted-devices-error"]');
    expect(errorState).not.toBeNull();

    fixture.nativeElement.querySelector('[data-testid="trusted-devices-retry"]').click();
    httpMock.expectOne(`${environment.apiUrl}/auth/devices`).flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="trusted-devices-empty"]')).not.toBeNull();
  });

  it('shows the empty state ("Aucun autre appareil de confiance") when only the current device is trusted', () => {
    flushList([makeDto(1, { isCurrent: true })]);
    const empty = fixture.nativeElement.querySelector('[data-testid="trusted-devices-empty"]');
    expect(empty?.textContent).toContain('Aucun autre appareil de confiance');
  });

  it('does NOT show the empty state when other devices exist alongside the current one', () => {
    flushList();
    expect(fixture.nativeElement.querySelector('[data-testid="trusted-devices-empty"]')).toBeNull();
  });

  it('renders the current device with a visible + textual badge and no revoke button', () => {
    flushList();
    const currentRow = fixture.nativeElement.querySelector('[data-testid="device-row-1"]');
    expect(currentRow.querySelector('[data-testid="device-current-badge-1"]').textContent.trim()).toBe(
      'Appareil actuel'
    );
    expect(currentRow.querySelector('[data-testid="device-revoke-1"]')).toBeNull();
    expect(currentRow.textContent).toContain('Non révocable');
  });

  it('falls back to "Appareil inconnu" when device is null', () => {
    flushList([makeDto(1, { isCurrent: true }), makeDto(2, { device: null })]);
    const row = fixture.nativeElement.querySelector('[data-testid="device-row-2"]');
    expect(row.textContent).toContain('Appareil inconnu');
  });

  it('renders device text via interpolation, never innerHTML (defence-in-depth against stored XSS)', () => {
    flushList([makeDto(1, { isCurrent: true }), makeDto(2, { device: '<img src=x onerror=alert(1)>' })]);
    const row = fixture.nativeElement.querySelector('[data-testid="device-row-2"]');
    expect(row.querySelector('img')).toBeNull();
    expect(row.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('sets a contextual aria-label on the revoke button naming the device and date', () => {
    flushList();
    const button = fixture.nativeElement.querySelector('[data-testid="device-revoke-2"]');
    expect(button.getAttribute('aria-label')).toBe(
      'Révoquer la confiance accordée à Device 2 depuis le 1 juil. 2026, 10:00'
    );
  });

  it('opens a role="dialog" confirmation before revoking a device, and does not call the API on cancel', () => {
    flushList();
    fixture.nativeElement.querySelector('[data-testid="device-revoke-2"]').click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.hasAttribute('aria-labelledby')).toBe(true);

    fixture.nativeElement.querySelector('[data-testid="confirm-dialog-cancel"]').click();
    fixture.detectChanges();

    httpMock.expectNone(`${environment.apiUrl}/auth/devices/2`);
    expect(fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="device-row-2"]')).not.toBeNull();
  });

  it('revokes a device after confirmation, shows a success toast, and removes it optimistically', () => {
    flushList();
    fixture.nativeElement.querySelector('[data-testid="device-revoke-2"]').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();
    fixture.detectChanges();

    // Optimistic removal happens before the HTTP response resolves.
    expect(fixture.nativeElement.querySelector('[data-testid="device-row-2"]')).toBeNull();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/devices/2`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(
      toastService.toasts().some(t => t.type === 'info' && t.messageKey === 'account.devices.toast.revoked')
    ).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="trusted-devices-empty"]')).not.toBeNull();
  });

  it('keeps the device in the list and shows an error toast when revocation fails', () => {
    flushList();
    fixture.nativeElement.querySelector('[data-testid="device-revoke-2"]').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();
    fixture.detectChanges();

    httpMock
      .expectOne(`${environment.apiUrl}/auth/devices/2`)
      .flush('Not Found', { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="device-row-2"]')).not.toBeNull();
    expect(
      toastService.toasts().some(t => t.type === 'error' && t.messageKey === 'account.devices.toast.revoke_error')
    ).toBe(true);
  });

  it('never renders a "revoke all" affordance (no bulk-revoke endpoint for devices)', () => {
    flushList([makeDto(1, { isCurrent: true }), makeDto(2), makeDto(3)]);
    expect(fixture.nativeElement.querySelector('[data-testid="trusted-devices-revoke-all"]')).toBeNull();
  });

  it('structures the devices list as a <table> with column headers', () => {
    flushList();
    const table = fixture.nativeElement.querySelector('[data-testid="trusted-devices-table"]');
    expect(table.tagName.toLowerCase()).toBe('table');
    const headers = Array.from(table.querySelectorAll('th') as NodeListOf<HTMLElement>).map(th =>
      th.textContent?.trim()
    );
    expect(headers).toEqual(['Appareil', 'Adresse IP', 'Approuvé le', 'Dernière activité', 'Actions']);
  });
});
