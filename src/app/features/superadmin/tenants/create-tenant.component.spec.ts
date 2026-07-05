import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { vi } from 'vitest';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { CreateTenantComponent } from './create-tenant.component';
import { ToastService } from '../../../shared/toast/toast.service';
import { environment } from '../../../../environments/environment';

@Component({ template: '', standalone: true })
class StubComponent {}

const API_URL = `${environment.apiUrl}/superadmin/tenants`;
const CHECK_SLUG_URL = `${environment.apiUrl}/superadmin/tenants/check-slug`;

function setup(): {
  fixture: ComponentFixture<CreateTenantComponent>;
  component: CreateTenantComponent;
  httpMock: HttpTestingController;
  router: Router;
  toast: { show: ReturnType<typeof vi.fn> };
} {
  const toast = { show: vi.fn() };

  TestBed.configureTestingModule({
    imports: [CreateTenantComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: '**', component: StubComponent }]),
      { provide: ToastService, useValue: toast },
    ],
  });

  const fixture = TestBed.createComponent(CreateTenantComponent);
  const component = fixture.componentInstance;
  const httpMock = TestBed.inject(HttpTestingController);
  const router = TestBed.inject(Router);
  fixture.detectChanges();

  return { fixture, component, httpMock, router, toast };
}

const validSlugCheckOk = () => ({ available: true, reason: null });

describe('CreateTenantComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates the component with sensible defaults', () => {
    const { component, httpMock } = setup();
    expect(component).toBeTruthy();
    expect(component.form.value.plan).toBe('SAAS');
    expect(component.form.value.authMode).toBe('LOCAL');
    httpMock.verify();
  });

  it('form is invalid when name/slug are empty', () => {
    const { component, httpMock } = setup();
    expect(component.form.invalid).toBe(true);
    httpMock.verify();
  });

  describe('slug auto-generation', () => {
    it('auto-generates the slug from the name in real time', () => {
      const { component, httpMock } = setup();
      component.form.controls.name.setValue('Acme Corp');
      expect(component.form.value.slug).toBe('acme-corp');

      component.form.controls.name.setValue('Société Générale');
      expect(component.form.value.slug).toBe('societe-generale');
      httpMock.verify();
    });

    it('stops auto-generating once the slug has been edited directly', () => {
      const { component, httpMock } = setup();
      component.form.controls.name.setValue('Acme Corp');
      expect(component.form.value.slug).toBe('acme-corp');

      // Simulates the (input) event bound in the template on the slug field.
      component.markSlugEdited();
      component.form.controls.slug.setValue('acme-custom');

      component.form.controls.name.setValue('Acme Corp Renamed');
      expect(component.form.value.slug).toBe('acme-custom');
      httpMock.verify();
    });
  });

  describe('real-time slug availability (debounced check-slug)', () => {
    it('does not call check-slug before the 500ms debounce elapses', () => {
      vi.useFakeTimers();
      const { component, httpMock } = setup();
      component.form.controls.slug.setValue('acme-corp');
      expect(component.slugChecking()).toBe(true);

      vi.advanceTimersByTime(499);
      httpMock.expectNone(r => r.url === CHECK_SLUG_URL);
    });

    it('calls GET check-slug 500ms after the last edit', () => {
      vi.useFakeTimers();
      const { component, httpMock } = setup();
      component.form.controls.slug.setValue('acme-corp');

      vi.advanceTimersByTime(500);
      const req = httpMock.expectOne(r => r.url === CHECK_SLUG_URL && r.method === 'GET');
      expect(req.request.params.get('slug')).toBe('acme-corp');
      req.flush(validSlugCheckOk());

      expect(component.slugChecking()).toBe(false);
      expect(component.slugAvailableShown()).toBe(true);
    });

    it('collapses rapid successive edits into a single request (debounce + distinctUntilChanged)', () => {
      vi.useFakeTimers();
      const { component, httpMock } = setup();

      for (const partial of ['a', 'ac', 'acm', 'acme']) {
        component.form.controls.slug.setValue(partial);
        vi.advanceTimersByTime(100);
      }
      vi.advanceTimersByTime(500);

      const req = httpMock.expectOne(r => r.url === CHECK_SLUG_URL);
      expect(req.request.params.get('slug')).toBe('acme');
      req.flush(validSlugCheckOk());
    });

    it('does not call check-slug for an empty slug', () => {
      vi.useFakeTimers();
      const { component, httpMock } = setup();
      component.form.controls.slug.setValue('');
      vi.advanceTimersByTime(500);
      expect(component.slugChecking()).toBe(false);
      httpMock.expectNone(r => r.url === CHECK_SLUG_URL);
    });

    it('marks the slug field as taken (409-equivalent) when check-slug reports TAKEN', () => {
      vi.useFakeTimers();
      const { component, httpMock } = setup();
      component.form.controls.slug.setValue('acme-corp');
      vi.advanceTimersByTime(500);
      httpMock.expectOne(r => r.url === CHECK_SLUG_URL).flush({ available: false, reason: 'TAKEN' });

      expect(component.form.controls.slug.errors).toEqual({ slugTaken: true });
      expect(component.slugErrorKey()).toBe('admin.tenants.create.error_slug_taken');
      expect(component.form.invalid).toBe(true);
    });

    it('marks the slug field as reserved when check-slug reports RESERVED', () => {
      vi.useFakeTimers();
      const { component, httpMock } = setup();
      component.form.controls.slug.setValue('admin');
      vi.advanceTimersByTime(500);
      httpMock.expectOne(r => r.url === CHECK_SLUG_URL).flush({ available: false, reason: 'RESERVED' });

      expect(component.slugErrorKey()).toBe('admin.tenants.create.error_slug_reserved');
    });

    it('clears a stale slugTaken error as soon as the slug is edited again', () => {
      vi.useFakeTimers();
      const { component, httpMock } = setup();
      component.form.controls.slug.setValue('acme-corp');
      vi.advanceTimersByTime(500);
      httpMock.expectOne(r => r.url === CHECK_SLUG_URL).flush({ available: false, reason: 'TAKEN' });
      expect(component.form.controls.slug.errors).toEqual({ slugTaken: true });

      component.form.controls.slug.setValue('acme-corp-2');
      expect(component.form.controls.slug.errors).toBeNull();

      vi.advanceTimersByTime(500);
      httpMock.expectOne(r => r.url === CHECK_SLUG_URL).flush(validSlugCheckOk());
    });

    it('resets slugChecking without throwing when check-slug fails', () => {
      vi.useFakeTimers();
      const { component, httpMock } = setup();
      component.form.controls.slug.setValue('acme-corp');
      vi.advanceTimersByTime(500);
      httpMock
        .expectOne(r => r.url === CHECK_SLUG_URL)
        .flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(component.slugChecking()).toBe(false);
      expect(component.slugAvailability()).toBeNull();
    });
  });

  describe('submit()', () => {
    const fillValidForm = (component: CreateTenantComponent) => {
      component.form.setValue({ name: 'Acme Corp', slug: 'acme-corp', plan: 'SAAS', authMode: 'LOCAL' });
    };

    it('does not submit an invalid form', () => {
      const { component, httpMock } = setup();
      component.submit();
      httpMock.expectNone(API_URL);
      expect(component.submitting()).toBe(false);
    });

    it('sets submitting true while the request is in flight, then false on success', () => {
      const { component, httpMock } = setup();
      fillValidForm(component);
      component.submit();
      expect(component.submitting()).toBe(true);

      httpMock.expectOne(API_URL).flush({ id: 42, slug: 'acme-corp', invitationUrl: 'https://x/auth/register?tenant=acme-corp' });
      expect(component.submitting()).toBe(false);
    });

    it('shows a success toast and redirects to the tenants list on success', () => {
      const { component, httpMock, router, toast } = setup();
      const navSpy = vi.spyOn(router, 'navigateByUrl');
      fillValidForm(component);
      component.submit();

      httpMock.expectOne(API_URL).flush({ id: 42, slug: 'acme-corp', invitationUrl: 'https://x/auth/register?tenant=acme-corp' });

      expect(toast.show).toHaveBeenCalledWith('admin.tenants.create.toast_success', 'info', { name: 'Acme Corp' });
      expect(navSpy).toHaveBeenCalledWith('/superadmin/tenants');
    });

    it('does not send a second request while one is already in flight', () => {
      const { component, httpMock } = setup();
      fillValidForm(component);
      component.submit();
      component.submit();

      const reqs = httpMock.match(API_URL);
      expect(reqs).toHaveLength(1);
      reqs[0].flush({ id: 1, slug: 'acme-corp', invitationUrl: 'https://x' });
    });

    it('on 409, shows the duplicate-slug error inline on the slug field (not a generic banner)', () => {
      const { component, httpMock, toast, router } = setup();
      const navSpy = vi.spyOn(router, 'navigateByUrl');
      fillValidForm(component);
      component.submit();

      httpMock
        .expectOne(API_URL)
        .flush({ error: 'TENANT_SLUG_ALREADY_EXISTS', message: 'x' }, { status: 409, statusText: 'Conflict' });

      expect(component.form.controls.slug.errors).toEqual({ slugTaken: true });
      expect(component.submitError()).toBeNull();
      expect(component.submitting()).toBe(false);
      expect(toast.show).not.toHaveBeenCalled();
      expect(navSpy).not.toHaveBeenCalled();
    });

    it('on 422, shows the reserved-slug error inline on the slug field', () => {
      const { component, httpMock } = setup();
      fillValidForm(component);
      component.submit();

      httpMock
        .expectOne(API_URL)
        .flush({ error: 'TENANT_SLUG_RESERVED', message: 'x' }, { status: 422, statusText: 'Unprocessable Entity' });

      expect(component.form.controls.slug.errors).toEqual({ slugReserved: true });
    });

    it('on 429, sets a generic rate-limit error with the formatted retry delay', () => {
      const { component, httpMock } = setup();
      fillValidForm(component);
      component.submit();

      httpMock
        .expectOne(API_URL)
        .flush({ code: 'RATE_LIMITED', retryAfterSeconds: 125 }, { status: 429, statusText: 'Too Many Requests' });

      expect(component.submitError()).toBe('admin.tenants.create.error_rate_limit');
      expect(component.submitErrorParams()).toEqual({ time: '2m 5s' });
    });

    it('on 429 with a missing/zero/negative retryAfterSeconds, still formats a non-empty delay', () => {
      const { component, httpMock } = setup();
      fillValidForm(component);
      component.submit();

      httpMock.expectOne(API_URL).flush({ code: 'RATE_LIMITED' }, { status: 429, statusText: 'Too Many Requests' });

      expect(component.submitError()).toBe('admin.tenants.create.error_rate_limit');
      expect(component.submitErrorParams()['time']).toBe('1s');
    });

    it('on 403, sets a forbidden error', () => {
      const { component, httpMock } = setup();
      fillValidForm(component);
      component.submit();
      httpMock.expectOne(API_URL).flush('', { status: 403, statusText: 'Forbidden' });
      expect(component.submitError()).toBe('admin.tenants.create.error_forbidden');
    });

    it('on 400, sets a validation error', () => {
      const { component, httpMock } = setup();
      fillValidForm(component);
      component.submit();
      httpMock.expectOne(API_URL).flush('', { status: 400, statusText: 'Bad Request' });
      expect(component.submitError()).toBe('admin.tenants.create.error_validation');
    });

    it('on 500 (or any other error), sets a generic error', () => {
      const { component, httpMock } = setup();
      fillValidForm(component);
      component.submit();
      httpMock.expectOne(API_URL).flush('', { status: 500, statusText: 'Internal Server Error' });
      expect(component.submitError()).toBe('common.error_generic');
    });
  });

  describe('accessibility', () => {
    it('marks name, slug, plan and authMode as aria-required', () => {
      const { fixture } = setup();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('#tenant-name')?.getAttribute('aria-required')).toBe('true');
      expect(el.querySelector('#tenant-slug')?.getAttribute('aria-required')).toBe('true');
      expect(el.querySelector('#tenant-plan')?.getAttribute('aria-required')).toBe('true');
      expect(el.querySelector('#tenant-auth-mode')?.getAttribute('aria-required')).toBe('true');
    });

    it('links the slug field to its hint via aria-describedby by default', () => {
      const { fixture } = setup();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('#tenant-slug')?.getAttribute('aria-describedby')).toBe('tenant-slug-hint');
    });

    it('links the slug field to the error message once touched and invalid', () => {
      const { fixture, component } = setup();
      component.form.controls.slug.markAsTouched();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const describedBy = el.querySelector('#tenant-slug')?.getAttribute('aria-describedby');
      expect(describedBy).toContain('tenant-slug-error');
      expect(el.querySelector('#tenant-slug-error')).toBeTruthy();
    });

    it('shows a spinner and disables the submit button while submitting', () => {
      const { fixture, component, httpMock } = setup();
      component.form.setValue({ name: 'Acme Corp', slug: 'acme-corp', plan: 'SAAS', authMode: 'LOCAL' });
      component.submit();
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const button = el.querySelector('[data-testid="create-tenant-submit"]') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(el.querySelector('.spinner')).toBeTruthy();

      httpMock.expectOne(API_URL).flush({ id: 1, slug: 'acme-corp', invitationUrl: 'https://x' });
    });
  });
});
