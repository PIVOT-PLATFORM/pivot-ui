import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../../environments/environment';
import { CapacityEventResponse } from '../models/capacity.model';
import { CapacityEventFormComponent } from './capacity-event-form.component';

const event: CapacityEventResponse = {
  id: 'e-1',
  tenantId: 1,
  teamId: 42,
  parentEventId: null,
  type: 'SPRINT',
  name: 'Sprint 20',
  startDate: '2026-08-01',
  endDate: '2026-08-14',
  pointsPerDay: null,
  committedPoints: null,
  completedPoints: null,
  isIpIteration: false,
  focusFactorPercent: null,
  createdBy: 1,
  parent: null,
  children: [],
  createdAt: '2026-07-22T08:00:00Z',
  updatedAt: '2026-07-22T08:00:00Z',
};

/** Both parent-capable types are fetched as potential parents on init (US11.5.1) — flush both. */
function flushParentEventLists(httpMock: HttpTestingController, piEvents: unknown[] = [], incrementEvents: unknown[] = []) {
  httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/events` && r.params.get('type') === 'PI_PLANNING').flush(piEvents);
  httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/events` && r.params.get('type') === 'INCREMENT').flush(incrementEvents);
}

describe('CapacityEventFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  async function setup(hasTeam = true) {
    await TestBed.configureTestingModule({
      imports: [CapacityEventFormComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(hasTeam ? { teamId: '42' } : {}) } },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  }

  afterEach(() => httpMock.verify());

  it('defaults to type SPRINT and shows the parent picker', async () => {
    await setup();
    const fixture = TestBed.createComponent(CapacityEventFormComponent);
    fixture.detectChanges();
    flushParentEventLists(httpMock);

    expect(fixture.componentInstance.type()).toBe('SPRINT');
    expect(fixture.componentInstance.showParentPicker()).toBe(true);
  });

  it('hides the parent picker and clears any selection when switching to PI_PLANNING', async () => {
    await setup();
    const fixture = TestBed.createComponent(CapacityEventFormComponent);
    fixture.detectChanges();
    flushParentEventLists(httpMock, [{ id: 'pi-1', teamId: 42, type: 'PI_PLANNING', name: 'PI 2026.Q3', startDate: '2026-07-01', endDate: '2026-10-01' }]);

    fixture.componentInstance.parentEventId.set('pi-1');
    fixture.componentInstance.onTypeChange({ target: { value: 'PI_PLANNING' } } as unknown as Event);

    expect(fixture.componentInstance.showParentPicker()).toBe(false);
    expect(fixture.componentInstance.parentEventId()).toBeNull();
  });

  it('hides the parent picker and clears any selection when switching to INCREMENT', async () => {
    await setup();
    const fixture = TestBed.createComponent(CapacityEventFormComponent);
    fixture.detectChanges();
    flushParentEventLists(httpMock);

    fixture.componentInstance.parentEventId.set('inc-1');
    fixture.componentInstance.onTypeChange({ target: { value: 'INCREMENT' } } as unknown as Event);

    expect(fixture.componentInstance.showParentPicker()).toBe(false);
    expect(fixture.componentInstance.parentEventId()).toBeNull();
  });

  it('disables save until name/startDate/endDate are filled', async () => {
    await setup();
    const fixture = TestBed.createComponent(CapacityEventFormComponent);
    fixture.detectChanges();
    flushParentEventLists(httpMock);
    const component = fixture.componentInstance;

    expect(component.canSave()).toBe(false);
    component.name.set('Sprint 20');
    component.startDate.set('2026-08-01');
    expect(component.canSave()).toBe(false);
    component.endDate.set('2026-08-14');
    expect(component.canSave()).toBe(true);
  });

  it('creates an event and navigates to its detail on success', async () => {
    await setup();
    const fixture = TestBed.createComponent(CapacityEventFormComponent);
    fixture.detectChanges();
    flushParentEventLists(httpMock);

    const component = fixture.componentInstance;
    component.name.set('Sprint 20');
    component.startDate.set('2026-08-01');
    component.endDate.set('2026-08-14');
    component.save();

    const req = httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/events` && r.method === 'POST');
    expect(req.request.body).toEqual({
      type: 'SPRINT',
      name: 'Sprint 20',
      teamId: 42,
      startDate: '2026-08-01',
      endDate: '2026-08-14',
    });
    req.flush(event);

    expect(router.navigate).toHaveBeenCalledWith(['/capacity', 'e-1']);
  });

  it('surfaces a field error code from a 400 response without navigating', async () => {
    await setup();
    const fixture = TestBed.createComponent(CapacityEventFormComponent);
    fixture.detectChanges();
    flushParentEventLists(httpMock);

    const component = fixture.componentInstance;
    component.name.set('Sprint 20');
    component.startDate.set('2026-08-01');
    component.endDate.set('2026-08-14');
    component.save();

    const req = httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/events` && r.method === 'POST');
    req.flush({ code: 'INVALID_DATE_RANGE' }, { status: 400, statusText: 'Bad Request' });

    expect(component.fieldErrorCode()).toBe('INVALID_DATE_RANGE');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not save when no team is resolved from the query param', async () => {
    await setup(false);
    const fixture = TestBed.createComponent(CapacityEventFormComponent);
    fixture.detectChanges();
    // No teamId means the PI_PLANNING/INCREMENT-list preload in ngOnInit() is skipped entirely — no request to flush.

    const component = fixture.componentInstance;
    component.name.set('Sprint 20');
    component.startDate.set('2026-08-01');
    component.endDate.set('2026-08-14');
    component.save();
    httpMock.expectNone(r => r.url === `${environment.apiUrl}/capacity/events` && r.method === 'POST');
  });

  it('offers INCREMENT as a type option and hides the parent picker for it too (US11.5.1)', async () => {
    await setup();
    const fixture = TestBed.createComponent(CapacityEventFormComponent);
    fixture.detectChanges();
    flushParentEventLists(httpMock);

    expect(fixture.componentInstance.eventTypes).toContain('INCREMENT');
    fixture.componentInstance.onTypeChange({ target: { value: 'INCREMENT' } } as unknown as Event);
    expect(fixture.componentInstance.showParentPicker()).toBe(false);
  });

  it('includes an explicit focusFactorPercent in the create request when provided', async () => {
    await setup();
    const fixture = TestBed.createComponent(CapacityEventFormComponent);
    fixture.detectChanges();
    flushParentEventLists(httpMock);

    const component = fixture.componentInstance;
    component.name.set('Sprint 20');
    component.startDate.set('2026-08-01');
    component.endDate.set('2026-08-14');
    component.onFocusFactorInput({ target: { value: '80' } } as unknown as Event);
    component.save();

    const req = httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/events` && r.method === 'POST');
    expect(req.request.body).toEqual({
      type: 'SPRINT',
      name: 'Sprint 20',
      teamId: 42,
      startDate: '2026-08-01',
      endDate: '2026-08-14',
      focusFactorPercent: 80,
    });
    req.flush(event);
  });

  it('omits focusFactorPercent from the create request when left blank', async () => {
    await setup();
    const fixture = TestBed.createComponent(CapacityEventFormComponent);
    fixture.detectChanges();
    flushParentEventLists(httpMock);

    const component = fixture.componentInstance;
    component.name.set('Sprint 20');
    component.startDate.set('2026-08-01');
    component.endDate.set('2026-08-14');
    component.save();

    const req = httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/events` && r.method === 'POST');
    expect(req.request.body.focusFactorPercent).toBeUndefined();
    req.flush(event);
  });
});
