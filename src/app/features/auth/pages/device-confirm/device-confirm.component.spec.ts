import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute, Router } from '@angular/router';
import { Component } from '@angular/core';
import { vi } from 'vitest';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { DeviceConfirmComponent } from './device-confirm.component';
import { DeviceService } from '../../../../core/auth/service/device.service';
import { PostLoginRedirectService } from '../../../../core/auth/service/post-login-redirect.service';
import { environment } from '../../../../../environments/environment';

@Component({ template: '', standalone: true })
class StubComponent {}

/** DeviceService stub déterministe (pas de navigator réel). */
const deviceStub = {
  getDeviceFingerprint: () => 'fp-fallback',
  getDeviceName: () => 'Chrome · Windows',
};

function setup(fingerprint: string | null): {
  fixture: ComponentFixture<DeviceConfirmComponent>;
  component: DeviceConfirmComponent;
  httpMock: HttpTestingController;
  router: Router;
} {
  TestBed.configureTestingModule({
    imports: [
      DeviceConfirmComponent,
      TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } }),
    ],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: '**', component: StubComponent }]),
      { provide: DeviceService, useValue: deviceStub },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParamMap: { get: (key: string) => (key === 'fingerprint' ? fingerprint : null) },
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(DeviceConfirmComponent);
  const component = fixture.componentInstance;
  const httpMock = TestBed.inject(HttpTestingController);
  const router = TestBed.inject(Router);
  fixture.detectChanges(); // ngOnInit
  return { fixture, component, httpMock, router };
}

describe('DeviceConfirmComponent', () => {
  const URL = `${environment.apiUrl}/auth/device/verify`;
  afterEach(() => TestBed.resetTestingModule());

  it('utilise le fingerprint de la query string si présent', () => {
    const { component, httpMock } = setup('fp-query');
    expect(component.fingerprint()).toBe('fp-query');
    httpMock.verify();
  });

  it('retombe sur DeviceService.getDeviceFingerprint() si absent', () => {
    const { component, httpMock } = setup(null);
    expect(component.fingerprint()).toBe('fp-fallback');
    httpMock.verify();
  });

  it('OTP invalide (< 6 chiffres) → pas de soumission', () => {
    const { component, httpMock } = setup('fp-query');
    component.form.setValue({ otp: '123' });
    component.submit();
    httpMock.expectNone(r => r.url === URL);
    expect(component.loading()).toBe(false);
    httpMock.verify();
  });

  it('succès sans returnUrl → navigation vers /home (US01.1.4)', () => {
    const { component, httpMock, router } = setup('fp-query');
    const navSpy = vi.spyOn(router, 'navigateByUrl');
    component.form.setValue({ otp: '123456' });
    component.submit();
    httpMock.expectOne(r => r.url === URL).flush({
      accessToken: 'tok', expiresAt: Date.now() + 3600_000,
      user: { id: 1, email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'ROLE_USER', emailVerified: true, tenantId: 1, tenantSlug: 't' },
    });
    expect(navSpy).toHaveBeenCalledWith('/home');
    httpMock.verify();
  });

  it('succès avec returnUrl mémorisé en session Angular → navigation vers la cible (US01.1.4)', () => {
    const { component, httpMock, router } = setup('fp-query');
    TestBed.inject(PostLoginRedirectService).remember('/dashboard?tab=2');
    const navSpy = vi.spyOn(router, 'navigateByUrl');
    component.form.setValue({ otp: '123456' });
    component.submit();
    httpMock.expectOne(r => r.url === URL).flush({
      accessToken: 'tok', expiresAt: Date.now() + 3600_000,
      user: { id: 1, email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'ROLE_USER', emailVerified: true, tenantId: 1, tenantSlug: 't' },
    });
    expect(navSpy).toHaveBeenCalledWith('/dashboard?tab=2');
    httpMock.verify();
  });

  it('429 → message rate limit', () => {
    const { component, httpMock } = setup('fp-query');
    component.form.setValue({ otp: '123456' });
    component.submit();
    httpMock.expectOne(r => r.url === URL).flush('', { status: 429, statusText: 'Too Many Requests' });
    expect(component.error()).toBe('auth.device_confirm.error_rate_limit');
    expect(component.loading()).toBe(false);
    httpMock.verify();
  });

  it('autre erreur → message OTP invalide', () => {
    const { component, httpMock } = setup('fp-query');
    component.form.setValue({ otp: '123456' });
    component.submit();
    httpMock.expectOne(r => r.url === URL).flush('', { status: 400, statusText: 'Bad Request' });
    expect(component.error()).toBe('auth.device_confirm.error_invalid');
    httpMock.verify();
  });
});
