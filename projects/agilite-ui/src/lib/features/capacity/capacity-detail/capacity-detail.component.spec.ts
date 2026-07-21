import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { environment } from '../../../../environments/environment';
import { CapacityEventChildResponse, CapacityEventResponse, CapacitySummaryResponse } from '../models/capacity.model';
import { CapacityDetailComponent } from './capacity-detail.component';

const event: CapacityEventResponse = {
  id: 'event-1',
  tenantId: 1,
  teamId: 1,
  type: 'PI_PLANNING',
  status: 'ACTIVE',
  name: 'PI 2026.3',
  startDate: '2026-07-01',
  endDate: '2026-09-30',
  parentId: null,
  maturityLevel: 'PERFORMING',
  focusFactor: 0.8,
  margeSecurite: 0.1,
  pointsPerDay: 1.2,
  committedPoints: 100,
  completedPoints: null,
  workingDays: [1, 2, 3, 4, 5],
  notes: null,
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

const children: CapacityEventChildResponse[] = [
  { id: 'sprint-1', type: 'SPRINT', status: 'ACTIVE', name: 'Sprint 1', startDate: '2026-07-01', endDate: '2026-07-14' },
];

const summary: CapacitySummaryResponse = {
  eventId: 'event-1',
  eventType: 'PI_PLANNING',
  eventName: 'PI 2026.3',
  totalWorkingDays: 60,
  members: [
    {
      memberId: 'member-1',
      name: 'Ada Lovelace',
      role: 'Dev',
      quotite: 1,
      excluded: false,
      effectiveFocus: 0.8,
      absentWorkingDays: 0,
      workedDays: 60,
      netCapacity: 48,
      points: null,
      recommendedEngagement: 48,
    },
  ],
  totalNetPersonDays: 60,
  totalNetCapacity: 48,
  totalPoints: 100,
  totalRecommendedEngagement: 90,
  loadRatio: 0.9,
  predictability: 0.8,
  consolidation: null,
  gauge: { engagedPoints: 90, referenceEngagement: 100, overflowThreshold: 110, engagementRatio: 0.9, overCommitted: false },
};

describe('CapacityDetailComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CapacityDetailComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ eventId: 'event-1' }) } },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => httpMock.verify());

  function createFixture() {
    const fixture = TestBed.createComponent(CapacityDetailComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/event-1`).flush(event);
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/event-1/children`).flush(children);
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/event-1/summary`).flush(summary);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the event, its children and its summary on init', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.event()).toEqual(event);
    expect(fixture.componentInstance.children()).toEqual(children);
    expect(fixture.componentInstance.summary()).toEqual(summary);
  });

  it('shows the load-error banner when the event fails to load', () => {
    const fixture = TestBed.createComponent(CapacityDetailComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/event-1`).flush(null, { status: 404, statusText: 'Not Found' });
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/event-1/children`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/event-1/summary`).flush(summary);
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
  });

  it('renders the overview tab by default with event fields and children links', () => {
    const fixture = createFixture();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('PI 2026.3');
    expect(el.textContent).toContain('Sprint 1');
    expect(el.querySelector('a[href="/capacity/sprint-1"]')).toBeTruthy();
  });

  it('shows the empty children message when the event has no children', () => {
    const fixture = TestBed.createComponent(CapacityDetailComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/event-1`).flush(event);
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/event-1/children`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/event-1/summary`).flush(summary);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('capacity.detail.children.empty');
  });

  it('switches tabs and mounts the members panel with the summary members', () => {
    const fixture = createFixture();
    fixture.componentInstance.selectTab('members');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-capacity-members-panel')).toBeTruthy();
    expect(el.textContent).toContain('Ada Lovelace');
  });

  it('refreshes the summary when the members panel emits changed', () => {
    const fixture = createFixture();
    fixture.componentInstance.selectTab('members');
    fixture.detectChanges();

    fixture.componentInstance.loadSummary();
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/event-1/summary`).flush(summary);
    fixture.detectChanges();

    expect(fixture.componentInstance.summary()).toEqual(summary);
  });

  it('mounts the velocity panel on the velocity tab, which loads its own history', () => {
    const fixture = createFixture();
    fixture.componentInstance.selectTab('velocity');
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/capacity/events/event-1/history`).flush({ history: [], forecast: null });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-capacity-velocity-panel')).toBeTruthy();
  });

  it('mounts the burndown panel on the burndown tab, which loads its own burndown data', () => {
    const fixture = createFixture();
    fixture.componentInstance.selectTab('burndown');
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/capacity/events/event-1/burndown`).flush({ real: [], ideal: [] });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-capacity-burndown-panel')).toBeTruthy();
  });

  it('mounts the summary panel on the summary tab with the gauge', () => {
    const fixture = createFixture();
    fixture.componentInstance.selectTab('summary');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-capacity-summary-panel')).toBeTruthy();
    expect(el.textContent).toContain('capacity.gauge.title');
  });

  it('opens the delete confirmation dialog, deletes the event and navigates back to the list', () => {
    const fixture = createFixture();
    fixture.componentInstance.requestDelete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeTruthy();

    fixture.componentInstance.confirmDelete();
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/event-1`).flush(null);
    fixture.detectChanges();

    expect(fixture.componentInstance.pendingDelete()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/capacity']);
  });

  it('cancels the pending delete without calling the API', () => {
    const fixture = createFixture();
    fixture.componentInstance.requestDelete();
    fixture.detectChanges();

    fixture.componentInstance.cancelDelete();
    fixture.detectChanges();

    expect(fixture.componentInstance.pendingDelete()).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeFalsy();
  });

  it('shows an error toast and keeps the dialog closed when delete fails', () => {
    const fixture = createFixture();
    fixture.componentInstance.requestDelete();
    fixture.componentInstance.confirmDelete();
    httpMock
      .expectOne(`${environment.apiUrl}/capacity/events/event-1`)
      .flush(null, { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.pendingDelete()).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('capacity.list.deleteError');
  });
});
