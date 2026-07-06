import { vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component, importProvidersFrom } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { environment } from '../../../../../environments/environment';
import { ExportComponent } from './export.component';
import { ToastService } from '../../../../shared/toast/toast.service';
import type { ExportStatusResponse } from '../../service/export.model';

@Component({ template: '', standalone: true })
class StubComponent {}

const TRANSLOCO_FR = {
  common: { back: 'Retour' },
  account: {
    rgpd: {
      export: {
        main_aria: 'Export de mes données',
        title: 'Exporter mes données',
        subtitle: 'Téléchargez vos données personnelles.',
        loading_status: 'Vérification du statut…',
        load_error: 'Impossible de vérifier le statut.',
        retry: 'Réessayer',
        submit: 'Demander mon export',
        received_title: 'Demande reçue',
        received_estimate: 'Vous recevrez un email dans quelques minutes.',
        ready_notice: 'Export prêt (expire à {{ time }}).',
        failed_notice: 'La génération a échoué.',
        rate_limited_until: 'Prochain export disponible à {{ time }}.',
        toast: {
          error_generic: "Une erreur est survenue lors de la demande d'export.",
          already_pending: 'Une demande est déjà en cours.',
          rate_limited: 'Export déjà demandé récemment.',
        },
        live: {
          idle: 'Vous pouvez demander un export.',
          submitting: 'Envoi en cours…',
          received: 'Demande reçue.',
          ready: 'Export prêt.',
          failed: 'Échec de la génération.',
          rate_limited: 'Export déjà demandé récemment.',
        },
      },
    },
  },
};

const NONE_STATUS: ExportStatusResponse = {
  status: 'NONE',
  requestedAt: null,
  completedAt: null,
  expiresAt: null,
  nextAvailableAt: null,
};

describe('ExportComponent', () => {
  let fixture: ComponentFixture<ExportComponent>;
  let component: ExportComponent;
  let httpMock: HttpTestingController;
  let toast: ToastService;
  const statusUrl = `${environment.apiUrl}/account/export/status`;
  const postUrl = `${environment.apiUrl}/account/export`;

  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ExportComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: StubComponent }]),
        importProvidersFrom(
          TranslocoTestingModule.forRoot({
            langs: { fr: TRANSLOCO_FR, en: TRANSLOCO_FR },
            translocoConfig: { defaultLang: 'fr', availableLangs: ['fr', 'en'] },
            preloadLangs: true,
          }),
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExportComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
    fixture.detectChanges();
  }

  afterEach(() => {
    // Tear down the component first so any in-flight poll subscription
    // (`takeUntilDestroyed`) is cancelled before verifying no request leaked.
    fixture?.destroy();
    httpMock.verify();
    vi.useRealTimers();
  });

  describe('initial load', () => {
    beforeEach(async () => setup());

    it('AC-06 — shows a loading state before the first status response', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('[data-testid="export-loading"]')).toBeTruthy();
      // Drain the request the constructor issued so afterEach's httpMock.verify() is clean.
      httpMock.expectOne(statusUrl).flush(NONE_STATUS);
    });

    it('AC-06 — enables the submit button when status is NONE with no rate limit', () => {
      httpMock.expectOne(statusUrl).flush(NONE_STATUS);
      fixture.detectChanges();

      expect(component.canRequest()).toBe(true);
      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="export-submit"]');
      expect(btn.disabled).toBe(false);
      expect(btn.getAttribute('aria-disabled')).toBe('false');
    });

    it('shows a retry affordance when the status fetch fails', () => {
      httpMock.expectOne(statusUrl).flush('boom', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(component.loadError()).toBe(true);
      expect(fixture.nativeElement.querySelector('[data-testid="export-load-error"]')).toBeTruthy();
    });

    it('retryLoad() re-fetches the status', () => {
      httpMock.expectOne(statusUrl).flush('boom', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      component.retryLoad();
      httpMock.expectOne(statusUrl).flush(NONE_STATUS);
      fixture.detectChanges();

      expect(component.loadError()).toBe(false);
      expect(component.canRequest()).toBe(true);
    });
  });

  describe('rate limited (AC: disabled button + aria-describedby reason)', () => {
    beforeEach(async () => setup());

    it('AC-16 — sets aria-disabled and a describedby reason, but keeps the button natively focusable', () => {
      const future = new Date(Date.now() + 3_600_000).toISOString();
      httpMock.expectOne(statusUrl).flush({ ...NONE_STATUS, status: 'READY', nextAvailableAt: future });
      fixture.detectChanges();

      expect(component.canRequest()).toBe(false);
      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="export-submit"]');
      expect(btn.getAttribute('aria-disabled')).toBe('true');
      expect(btn.disabled).toBe(false);
      expect(btn.getAttribute('aria-describedby')).toBe('export-rate-limit-reason');
      expect(fixture.nativeElement.querySelector('[data-testid="export-rate-limit-reason"]')).toBeTruthy();
    });

    it('AC-16 — does not submit when clicked while rate-limited', () => {
      const future = new Date(Date.now() + 3_600_000).toISOString();
      httpMock.expectOne(statusUrl).flush({ ...NONE_STATUS, nextAvailableAt: future });
      fixture.detectChanges();

      component.requestExport();
      httpMock.expectNone(postUrl);
      expect(component.submitting()).toBe(false);
    });

    it('AC-16 — treats a past nextAvailableAt as no longer rate-limited', () => {
      const past = new Date(Date.now() - 1000).toISOString();
      httpMock.expectOne(statusUrl).flush({ ...NONE_STATUS, nextAvailableAt: past });
      fixture.detectChanges();

      expect(component.canRequest()).toBe(true);
    });

    it('AC-16 — automatically re-enables once nextAvailableAt elapses, without waiting for a new status fetch', () => {
      vi.useFakeTimers();
      const future = new Date(Date.now() + 5000).toISOString();
      httpMock.expectOne(statusUrl).flush({ ...NONE_STATUS, nextAvailableAt: future });
      fixture.detectChanges();

      expect(component.canRequest()).toBe(false);

      vi.advanceTimersByTime(5001);
      fixture.detectChanges();

      expect(component.canRequest()).toBe(true);
      expect(component.rateLimitedUntil()).toBeNull();
      // No extra status round-trip — purely a local clock re-evaluation.
      httpMock.expectNone(statusUrl);
    });
  });

  describe('pending / processing (AC: "Demande reçue" persistent state)', () => {
    beforeEach(async () => setup());

    it('AC-13 — shows the received panel instead of the button when already PENDING on load', () => {
      vi.useFakeTimers();
      httpMock.expectOne(statusUrl).flush({ ...NONE_STATUS, status: 'PENDING' });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="export-received"]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('[data-testid="export-submit"]')).toBeNull();
      // Loading an already-PENDING status also (re)starts polling — no assertion on the
      // scheduled tick here, just proving it doesn't fire synchronously on load.
      httpMock.expectNone(statusUrl);
    });
  });

  describe('ready / failed notices', () => {
    beforeEach(async () => setup());

    it('shows the ready notice with the formatted expiry time', () => {
      httpMock.expectOne(statusUrl).flush({ ...NONE_STATUS, status: 'READY', expiresAt: new Date().toISOString() });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="export-ready-notice"]')).toBeTruthy();
    });

    it('shows the failed notice', () => {
      httpMock.expectOne(statusUrl).flush({ ...NONE_STATUS, status: 'FAILED' });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="export-failed-notice"]')).toBeTruthy();
    });
  });

  describe('requestExport() — happy path', () => {
    beforeEach(async () => setup());

    it('AC-15 — disables the button and shows a spinner while the POST is in flight', () => {
      httpMock.expectOne(statusUrl).flush(NONE_STATUS);
      fixture.detectChanges();

      component.requestExport();
      fixture.detectChanges();

      expect(component.submitting()).toBe(true);
      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="export-submit"]');
      expect(btn.disabled).toBe(true);
      httpMock.expectOne(postUrl).flush(
        { requestId: 1, status: 'PENDING', requestedAt: new Date().toISOString() },
        { status: 202, statusText: 'Accepted' },
      );
    });

    it('AC-13 — shows the "Demande reçue" panel immediately after a 202, and starts polling', () => {
      vi.useFakeTimers();
      httpMock.expectOne(statusUrl).flush(NONE_STATUS);
      fixture.detectChanges();

      component.requestExport();
      httpMock.expectOne(postUrl).flush(
        { requestId: 1, status: 'PENDING', requestedAt: new Date().toISOString() },
        { status: 202, statusText: 'Accepted' },
      );
      fixture.detectChanges();

      expect(component.isPending()).toBe(true);
      expect(fixture.nativeElement.querySelector('[data-testid="export-received"]')).toBeTruthy();

      // Poll tick: still processing.
      vi.advanceTimersByTime(5000);
      httpMock.expectOne(statusUrl).flush({ ...NONE_STATUS, status: 'PROCESSING' });
      fixture.detectChanges();
      expect(component.isPending()).toBe(true);

      // Poll tick: settles to READY — polling stops and the received panel is replaced.
      vi.advanceTimersByTime(5000);
      httpMock.expectOne(statusUrl).flush({ ...NONE_STATUS, status: 'READY', expiresAt: new Date().toISOString() });
      fixture.detectChanges();

      expect(component.isPending()).toBe(false);
      expect(fixture.nativeElement.querySelector('[data-testid="export-received"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="export-ready-notice"]')).toBeTruthy();

      // No further poll requests once settled.
      vi.advanceTimersByTime(20000);
      httpMock.expectNone(statusUrl);
    });
  });

  describe('requestExport() — error handling', () => {
    beforeEach(async () => setup());

    it('AC-14 — shows an error toast and re-enables the button on a generic (500) failure', () => {
      httpMock.expectOne(statusUrl).flush(NONE_STATUS);
      fixture.detectChanges();
      const showSpy = vi.spyOn(toast, 'show');

      component.requestExport();
      httpMock.expectOne(postUrl).flush('boom', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(showSpy).toHaveBeenCalledWith('account.rgpd.export.toast.error_generic', 'error');
      expect(component.submitting()).toBe(false);
      expect(component.canRequest()).toBe(true);
    });

    it('AC-14 — on 409 (already pending), resyncs status instead of re-enabling blindly', () => {
      httpMock.expectOne(statusUrl).flush(NONE_STATUS);
      fixture.detectChanges();
      const showSpy = vi.spyOn(toast, 'show');

      component.requestExport();
      httpMock.expectOne(postUrl).flush('already pending', { status: 409, statusText: 'Conflict' });
      httpMock.expectOne(statusUrl).flush({ ...NONE_STATUS, status: 'PENDING' });
      fixture.detectChanges();

      expect(showSpy).toHaveBeenCalledWith('account.rgpd.export.toast.already_pending', 'error');
      expect(component.isPending()).toBe(true);
    });

    it('AC-16 — on 429 (rate limited), resyncs status to reflect the authoritative nextAvailableAt', () => {
      httpMock.expectOne(statusUrl).flush(NONE_STATUS);
      fixture.detectChanges();
      const showSpy = vi.spyOn(toast, 'show');

      component.requestExport();
      httpMock.expectOne(postUrl).flush(
        { code: 'RATE_LIMITED', retryAfterSeconds: 120 },
        { status: 429, statusText: 'Too Many Requests' },
      );
      const future = new Date(Date.now() + 120_000).toISOString();
      httpMock.expectOne(statusUrl).flush({ ...NONE_STATUS, nextAvailableAt: future });
      fixture.detectChanges();

      expect(showSpy).toHaveBeenCalledWith('account.rgpd.export.toast.rate_limited', 'error');
      expect(component.canRequest()).toBe(false);
      expect(component.rateLimitedUntil()).not.toBeNull();
    });

    it('AC-15 — requestExport() is a no-op while already submitting (no duplicate POST)', () => {
      httpMock.expectOne(statusUrl).flush(NONE_STATUS);
      fixture.detectChanges();

      component.requestExport();
      component.requestExport();
      httpMock.expectOne(postUrl).flush(
        { requestId: 1, status: 'PENDING', requestedAt: new Date().toISOString() },
        { status: 202, statusText: 'Accepted' },
      );
      fixture.detectChanges();

      expect(component.isPending()).toBe(true);
    });
  });

  describe('accessibility', () => {
    beforeEach(async () => setup());

    it('AC-17 — exposes a polite, atomic live region reflecting the current state', () => {
      httpMock.expectOne(statusUrl).flush(NONE_STATUS);
      fixture.detectChanges();

      const region = fixture.nativeElement.querySelector('[data-testid="export-live-region"]');
      expect(region.getAttribute('aria-live')).toBe('polite');
      expect(region.getAttribute('aria-atomic')).toBe('true');
      expect(component.liveKey()).toBe('account.rgpd.export.live.idle');
    });

    it('AC-17 — switches the live-region key to "submitting" while the POST is in flight', () => {
      httpMock.expectOne(statusUrl).flush(NONE_STATUS);
      fixture.detectChanges();

      component.requestExport();
      expect(component.liveKey()).toBe('account.rgpd.export.live.submitting');
      httpMock.expectOne(postUrl).flush(
        { requestId: 1, status: 'PENDING', requestedAt: new Date().toISOString() },
        { status: 202, statusText: 'Accepted' },
      );
    });
  });

  describe('goBack()', () => {
    beforeEach(async () => setup());

    it('does not throw', () => {
      httpMock.expectOne(statusUrl).flush(NONE_STATUS);
      expect(() => component.goBack()).not.toThrow();
    });
  });
});
