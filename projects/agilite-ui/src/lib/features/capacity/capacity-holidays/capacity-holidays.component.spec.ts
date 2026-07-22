import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { CapacityHolidaysComponent } from './capacity-holidays.component';

describe('CapacityHolidaysComponent', () => {
  let httpMock: HttpTestingController;

  async function setup() {
    await TestBed.configureTestingModule({
      imports: [CapacityHolidaysComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => httpMock.verify());

  it('loads and displays the tenant holidays', async () => {
    await setup();
    const fixture = TestBed.createComponent(CapacityHolidaysComponent);
    fixture.detectChanges();
    httpMock
      .expectOne(r => r.url === `${environment.apiUrl}/capacity/holidays`)
      .flush([{ id: 'h-1', date: '2026-12-25', label: 'Noël' }]);
    fixture.detectChanges();

    expect(fixture.componentInstance.holidays()).toEqual([{ id: 'h-1', date: '2026-12-25', label: 'Noël' }]);
    expect(fixture.componentInstance.forbidden()).toBe(false);
    expect(fixture.componentInstance.loadError()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Noël');
    expect(fixture.nativeElement.querySelectorAll('.capacity-holidays__list li').length).toBe(1);
  });

  it('shows the empty state when the tenant has no holidays configured', async () => {
    await setup();
    const fixture = TestBed.createComponent(CapacityHolidaysComponent);
    fixture.detectChanges();
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/holidays`).flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.capacity-holidays__list li').length).toBe(0);
  });

  it('flags forbidden (not loadError) on a 403 — tenant-admin-only resource, not the team-scoped 404 convention', async () => {
    await setup();
    const fixture = TestBed.createComponent(CapacityHolidaysComponent);
    fixture.detectChanges();
    httpMock
      .expectOne(r => r.url === `${environment.apiUrl}/capacity/holidays`)
      .flush(null, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(fixture.componentInstance.forbidden()).toBe(true);
    expect(fixture.componentInstance.loadError()).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('flags loadError (not forbidden) on a non-403 failure, with a retry button', async () => {
    await setup();
    const fixture = TestBed.createComponent(CapacityHolidaysComponent);
    fixture.detectChanges();
    httpMock
      .expectOne(r => r.url === `${environment.apiUrl}/capacity/holidays`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toBe(true);
    expect(fixture.componentInstance.forbidden()).toBe(false);

    fixture.nativeElement.querySelector('[role="alert"] button').click();
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/holidays`).flush([]);
    fixture.detectChanges();
    expect(fixture.componentInstance.loadError()).toBe(false);
  });

  it('adds a holiday and reloads the list', async () => {
    await setup();
    const fixture = TestBed.createComponent(CapacityHolidaysComponent);
    fixture.detectChanges();
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/holidays`).flush([]);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.dateDraft.set('2026-12-25');
    component.labelDraft.set('Noël');
    component.addHoliday();

    const postReq = httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/holidays` && r.method === 'POST');
    expect(postReq.request.body).toEqual({ date: '2026-12-25', label: 'Noël' });
    postReq.flush({ id: 'h-1', date: '2026-12-25', label: 'Noël' });

    httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/holidays` && r.method === 'GET').flush([{ id: 'h-1', date: '2026-12-25', label: 'Noël' }]);
    fixture.detectChanges();

    expect(component.dateDraft()).toBe('');
    expect(component.labelDraft()).toBe('');
    expect(component.holidays()).toEqual([{ id: 'h-1', date: '2026-12-25', label: 'Noël' }]);
  });

  it('does not submit with an empty label', async () => {
    await setup();
    const fixture = TestBed.createComponent(CapacityHolidaysComponent);
    fixture.detectChanges();
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/holidays`).flush([]);

    const component = fixture.componentInstance;
    component.dateDraft.set('2026-12-25');
    component.addHoliday();

    httpMock.expectNone(r => r.url === `${environment.apiUrl}/capacity/holidays` && r.method === 'POST');
  });

  it('surfaces a field error code from a 400 response on add', async () => {
    await setup();
    const fixture = TestBed.createComponent(CapacityHolidaysComponent);
    fixture.detectChanges();
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/holidays`).flush([]);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.dateDraft.set('2026-12-25');
    component.labelDraft.set('Noël');
    component.addHoliday();

    const postReq = httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/holidays` && r.method === 'POST');
    postReq.flush({ code: 'DUPLICATE_HOLIDAY' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(component.fieldErrorCode()).toBe('DUPLICATE_HOLIDAY');
    expect(fixture.nativeElement.querySelector('#capacity-holiday-error')).not.toBeNull();
  });

  it('deletes a holiday and reloads the list', async () => {
    await setup();
    const fixture = TestBed.createComponent(CapacityHolidaysComponent);
    fixture.detectChanges();
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/holidays`).flush([{ id: 'h-1', date: '2026-12-25', label: 'Noël' }]);
    fixture.detectChanges();

    fixture.componentInstance.deleteHoliday('h-1');

    httpMock.expectOne(`${environment.apiUrl}/capacity/holidays/h-1`).flush(null, { status: 204, statusText: 'No Content' });
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/holidays` && r.method === 'GET').flush([]);
    fixture.detectChanges();

    expect(fixture.componentInstance.holidays()).toEqual([]);
  });
});
