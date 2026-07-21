import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { vi } from 'vitest';
import { environment } from '../../../../environments/environment';
import { CadenceSprintResponse, CapacityEventResponse } from '../models/capacity.model';
import { CapacityFormComponent } from './capacity-form.component';

const API = `${environment.apiUrl}/capacity`;

const event: CapacityEventResponse = {
  id: 'e-1',
  tenantId: 1,
  teamId: 1,
  type: 'PI_PLANNING',
  status: 'PLANNING',
  name: 'PI 2026.3',
  startDate: '2026-07-01',
  endDate: '2026-09-30',
  parentId: null,
  maturityLevel: 'NORMING',
  focusFactor: 0.7,
  margeSecurite: 0.1,
  pointsPerDay: 1.2,
  committedPoints: 100,
  completedPoints: null,
  workingDays: [1, 2, 3, 4, 5],
  notes: 'Some notes',
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
};

describe('CapacityFormComponent — create mode', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CapacityFormComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({}),
              queryParamMap: convertToParamMap({ teamId: '1' }),
            },
          },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => httpMock.verify());

  function createFixture() {
    const fixture = TestBed.createComponent(CapacityFormComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === `${API}/events` && r.params.get('teamId') === '1').flush([]);
    fixture.detectChanges();
    return fixture;
  }

  it('is not in edit mode and prefills teamId from the query param', () => {
    const fixture = createFixture();
    const cmp = fixture.componentInstance;
    expect(cmp.isEdit).toBe(false);
    expect(cmp.form.controls.teamId.value).toBe(1);
  });

  it('does not submit an invalid form (required fields missing)', () => {
    const fixture = createFixture();
    const cmp = fixture.componentInstance;

    cmp.submit();

    expect(cmp.form.controls.type.touched).toBe(true);
    expect(cmp.saving()).toBe(false);
    httpMock.expectNone(`${API}/events`);
  });

  it('flags an invalid date range client-side without calling the server', () => {
    const fixture = createFixture();
    const cmp = fixture.componentInstance;
    cmp.form.patchValue({
      type: 'SPRINT',
      name: 'Sprint 1',
      startDate: '2026-07-14',
      endDate: '2026-07-01',
    });

    cmp.submit();

    expect(cmp.errorKey()).toBe('capacity.form.errors.INVALID_END_DATE');
    expect(cmp.saving()).toBe(false);
    httpMock.expectNone(`${API}/events`);
  });

  it('submits the event and navigates to the detail route on success', () => {
    const fixture = createFixture();
    const cmp = fixture.componentInstance;
    cmp.form.patchValue({
      type: 'SPRINT',
      name: 'Sprint 1',
      startDate: '2026-07-01',
      endDate: '2026-07-14',
    });
    cmp.toggleWorkingDay(1, true);
    cmp.toggleWorkingDay(2, true);

    cmp.submit();

    const req = httpMock.expectOne(`${API}/events`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      teamId: 1,
      type: 'SPRINT',
      name: 'Sprint 1',
      startDate: '2026-07-01',
      endDate: '2026-07-14',
      parentId: null,
      maturityLevel: null,
      focusFactor: null,
      margeSecurite: null,
      pointsPerDay: null,
      committedPoints: null,
      workingDays: [1, 2],
      notes: null,
      status: null,
    });
    req.flush({ ...event, id: 'e-2', type: 'SPRINT' });

    expect(router.navigate).toHaveBeenCalledWith(['/capacity', 'e-2']);
  });

  it('maps a known server error code to the matching translation key', () => {
    const fixture = createFixture();
    const cmp = fixture.componentInstance;
    cmp.form.patchValue({ type: 'SPRINT', name: 'Sprint 1', startDate: '2026-07-01', endDate: '2026-07-14' });

    cmp.submit();

    const req = httpMock.expectOne(`${API}/events`);
    req.flush({ title: 'Validation failed', code: 'INVALID_FOCUS_FACTOR' }, { status: 400, statusText: 'Bad Request' });

    expect(cmp.errorKey()).toBe('capacity.form.errors.INVALID_FOCUS_FACTOR');
    expect(cmp.saveNetworkError()).toBe(false);
    expect(cmp.saving()).toBe(false);
  });

  it('maps an aliased server error code (not an exact i18n key) to the closest existing key', () => {
    const fixture = createFixture();
    const cmp = fixture.componentInstance;
    cmp.form.patchValue({ type: 'SPRINT', name: 'Sprint 1', startDate: '2026-07-01', endDate: '2026-07-14' });

    cmp.submit();

    const req = httpMock.expectOne(`${API}/events`);
    req.flush({ code: 'HIERARCHY_TOO_DEEP' }, { status: 400, statusText: 'Bad Request' });

    expect(cmp.errorKey()).toBe('capacity.form.errors.INVALID_HIERARCHY');
  });

  it('falls back to a network-error banner when the response has no code', () => {
    const fixture = createFixture();
    const cmp = fixture.componentInstance;
    cmp.form.patchValue({ type: 'SPRINT', name: 'Sprint 1', startDate: '2026-07-01', endDate: '2026-07-14' });

    cmp.submit();

    const req = httpMock.expectOne(`${API}/events`);
    req.flush('boom', { status: 500, statusText: 'Server Error' });

    expect(cmp.saveNetworkError()).toBe(true);
    expect(cmp.errorKey()).toBeNull();
  });

  it('toggleWorkingDay adds and removes days, keeping the list sorted', () => {
    const fixture = createFixture();
    const cmp = fixture.componentInstance;

    cmp.toggleWorkingDay(5, true);
    cmp.toggleWorkingDay(1, true);
    expect(cmp.workingDays()).toEqual([1, 5]);

    cmp.toggleWorkingDay(1, false);
    expect(cmp.workingDays()).toEqual([5]);
  });

  it('the cadence section is not rendered outside edit mode', () => {
    const fixture = createFixture();
    fixture.componentInstance.form.patchValue({ type: 'PI_PLANNING' });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('#capacity-cadence-title')).toBeNull();
  });
});

describe('CapacityFormComponent — create mode without a teamId', () => {
  it('sets loadError when navigated to without a teamId query param', async () => {
    await TestBed.configureTestingModule({
      imports: [CapacityFormComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({}), queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CapacityFormComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toBe(true);
    TestBed.inject(HttpTestingController).verify();
  });
});

describe('CapacityFormComponent — edit mode', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CapacityFormComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ eventId: 'e-1' }),
              queryParamMap: convertToParamMap({}),
            },
          },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => httpMock.verify());

  function createFixture() {
    const fixture = TestBed.createComponent(CapacityFormComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${API}/events/e-1`).flush(event);
    httpMock.expectOne((r) => r.url === `${API}/events` && r.params.get('teamId') === '1').flush([
      { ...event, id: 'e-1', name: 'PI 2026.3' },
      { ...event, id: 'e-3', name: 'Other PI' },
    ]);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the existing event and prefills the form, excluding itself from parent candidates', () => {
    const fixture = createFixture();
    const cmp = fixture.componentInstance;

    expect(cmp.isEdit).toBe(true);
    expect(cmp.form.controls.name.value).toBe('PI 2026.3');
    expect(cmp.form.controls.type.value).toBe('PI_PLANNING');
    expect(cmp.form.controls.status.value).toBe('PLANNING');
    expect(cmp.form.controls.maturityLevel.value).toBe('NORMING');
    expect(cmp.workingDays()).toEqual([1, 2, 3, 4, 5]);
    expect(cmp.parentCandidates().map((c) => c.id)).toEqual(['e-3']);
  });

  it('sets loadError when the event cannot be loaded', () => {
    const fixture = TestBed.createComponent(CapacityFormComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${API}/events/e-1`).flush('not found', { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toBe(true);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[role="alert"]')).toBeTruthy();
  });

  it('submits an update (PUT) and navigates to the detail route on success', () => {
    const fixture = createFixture();
    const cmp = fixture.componentInstance;

    cmp.submit();

    const req = httpMock.expectOne(`${API}/events/e-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.status).toBe('PLANNING');
    req.flush(event);

    expect(router.navigate).toHaveBeenCalledWith(['/capacity', 'e-1']);
  });

  it('shows the cadence section for a PI_PLANNING event and generates sprints on success', () => {
    const fixture = createFixture();
    const cmp = fixture.componentInstance;
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('#capacity-cadence-title')).toBeTruthy();

    cmp.generateCadence();

    const req = httpMock.expectOne(`${API}/events/e-1/cadence`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      sprintLengthDays: null,
      sprintLengthWeeks: 2,
      sprintCount: 4,
      includeIpSprint: false,
      namePrefix: null,
    });

    const sprints: CadenceSprintResponse[] = [
      { id: 's-1', status: 'PLANNING', name: 'Sprint 1', startDate: '2026-07-01', endDate: '2026-07-14', ipSprint: false },
    ];
    req.flush(sprints);

    expect(cmp.cadenceResult()).toEqual(sprints);
    expect(cmp.cadenceGenerating()).toBe(false);
  });

  it('maps a cadence server error code to the matching translation key', () => {
    const fixture = createFixture();
    const cmp = fixture.componentInstance;

    cmp.generateCadence();

    const req = httpMock.expectOne(`${API}/events/e-1/cadence`);
    req.flush({ code: 'CADENCE_OVERFLOW' }, { status: 400, statusText: 'Bad Request' });

    expect(cmp.cadenceErrorKey()).toBe('capacity.form.errors.CADENCE_OVERFLOW');
    expect(cmp.cadenceGenerating()).toBe(false);
  });

  it('does not call generateCadence when the cadence form is invalid', () => {
    const fixture = createFixture();
    const cmp = fixture.componentInstance;
    cmp.cadenceForm.patchValue({ sprintCount: null });

    cmp.generateCadence();

    expect(cmp.cadenceGenerating()).toBe(false);
    httpMock.expectNone(`${API}/events/e-1/cadence`);
  });
});
