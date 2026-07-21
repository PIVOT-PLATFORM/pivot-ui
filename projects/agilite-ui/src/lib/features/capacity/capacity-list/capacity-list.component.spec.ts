import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { environment } from '../../../../environments/environment';
import { CapacityEventResponse, KpiResponse } from '../models/capacity.model';
import { CapacityListComponent } from './capacity-list.component';

describe('CapacityListComponent', () => {
  let httpMock: HttpTestingController;

  const event: CapacityEventResponse = {
    id: 'event-1',
    tenantId: 1,
    teamId: 1,
    type: 'SPRINT',
    status: 'ACTIVE',
    name: 'Sprint 12',
    startDate: '2026-07-01',
    endDate: '2026-07-14',
    parentId: null,
    maturityLevel: null,
    focusFactor: null,
    margeSecurite: null,
    pointsPerDay: null,
    committedPoints: null,
    completedPoints: null,
    workingDays: [1, 2, 3, 4, 5],
    notes: null,
    createdAt: '2026-06-20T00:00:00Z',
    updatedAt: '2026-06-20T00:00:00Z',
  };

  const emptyKpis: KpiResponse = { teamId: 1, eventSampleSize: 0, sprintSampleSize: 0, kpis: {} };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CapacityListComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function flushTeamsAndEvents(
    fixture: ReturnType<typeof TestBed.createComponent<CapacityListComponent>>,
    teams: { id: number; name: string }[],
    events: CapacityEventResponse[],
  ): void {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/teams`).flush(teams);
    if (teams.length > 0) {
      httpMock.expectOne((r) => r.url === `${environment.apiUrl}/capacity/events`).flush(events);
    }
    fixture.detectChanges();
    if (events.length > 0) {
      httpMock.expectOne((r) => r.url === `${environment.apiUrl}/kpi`).flush(emptyKpis);
      fixture.detectChanges();
    }
  }

  it('should create and show "no teams" when the caller has none', () => {
    const fixture = TestBed.createComponent(CapacityListComponent);
    flushTeamsAndEvents(fixture, [], []);

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance.teams()).toEqual([]);
    expect(fixture.componentInstance.selectedTeamId()).toBeNull();
  });

  it('selects the first team and loads its capacity events', () => {
    const fixture = TestBed.createComponent(CapacityListComponent);
    flushTeamsAndEvents(fixture, [{ id: 1, name: 'Team A' }], [event]);

    expect(fixture.componentInstance.selectedTeamId()).toBe(1);
    expect(fixture.componentInstance.events()).toEqual([event]);
    expect(fixture.componentInstance.kpiAnchorEventId()).toBe('event-1');
  });

  it('sets loadError when the teams request fails', () => {
    const fixture = TestBed.createComponent(CapacityListComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/teams`).flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toBe(true);
  });

  it('onTeamChange() switches the active team and reloads its events', () => {
    const fixture = TestBed.createComponent(CapacityListComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/teams`).flush([
      { id: 1, name: 'Team A' },
      { id: 2, name: 'Team B' },
    ]);
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/capacity/events` && r.params.get('teamId') === '1')
      .flush([event]);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/kpi`).flush(emptyKpis);
    fixture.detectChanges();

    fixture.componentInstance.onTeamChange({ target: { value: '2' } } as unknown as Event);
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/capacity/events` && r.params.get('teamId') === '2')
      .flush([]);
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedTeamId()).toBe(2);
    expect(fixture.componentInstance.events()).toEqual([]);
    expect(fixture.componentInstance.kpiAnchorEventId()).toBeNull();
  });

  it('onTypeChange() and onStatusChange() re-issue the events request with filters', () => {
    const fixture = TestBed.createComponent(CapacityListComponent);
    flushTeamsAndEvents(fixture, [{ id: 1, name: 'Team A' }], [event]);

    // The anchor event's id is unchanged by these filters ('event-1' both times), so the
    // embedded KPI card's input signal doesn't change and it issues no new request.
    fixture.componentInstance.onTypeChange({ target: { value: 'SPRINT' } } as unknown as Event);
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/capacity/events` && r.params.get('type') === 'SPRINT')
      .flush([event]);
    fixture.detectChanges();

    fixture.componentInstance.onStatusChange({ target: { value: 'ACTIVE' } } as unknown as Event);
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/capacity/events` && r.params.get('status') === 'ACTIVE')
      .flush([event]);
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedType()).toBe('SPRINT');
    expect(fixture.componentInstance.selectedStatus()).toBe('ACTIVE');
  });

  it('sets loadError when the events request fails', () => {
    const fixture = TestBed.createComponent(CapacityListComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/teams`).flush([{ id: 1, name: 'Team A' }]);
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/capacity/events`)
      .flush('error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toBe(true);
  });

  it('requestDelete() opens the confirmation dialog, cancelDelete() closes it without deleting', () => {
    const fixture = TestBed.createComponent(CapacityListComponent);
    flushTeamsAndEvents(fixture, [{ id: 1, name: 'Team A' }], [event]);

    const button = document.createElement('button');
    fixture.componentInstance.requestDelete(event, { currentTarget: button } as unknown as Event);
    expect(fixture.componentInstance.pendingDelete()).toEqual(event);

    fixture.componentInstance.cancelDelete();
    expect(fixture.componentInstance.pendingDelete()).toBeNull();
    httpMock.expectNone(`${environment.apiUrl}/capacity/events/${event.id}`);
  });

  it('confirmDelete() deletes the event, shows a success toast, and refreshes the list', () => {
    const fixture = TestBed.createComponent(CapacityListComponent);
    flushTeamsAndEvents(fixture, [{ id: 1, name: 'Team A' }], [event]);

    fixture.componentInstance.requestDelete(event, { currentTarget: document.createElement('button') } as unknown as Event);
    fixture.componentInstance.confirmDelete(event);
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/${event.id}`).flush(null);
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/capacity/events`).flush([]);
    fixture.detectChanges();

    expect(fixture.componentInstance.pendingDelete()).toBeNull();
    expect(fixture.componentInstance.toasts()[0]?.type).toBe('success');
  });

  it('confirmDelete() shows an error toast when the delete request fails', () => {
    const fixture = TestBed.createComponent(CapacityListComponent);
    flushTeamsAndEvents(fixture, [{ id: 1, name: 'Team A' }], [event]);

    fixture.componentInstance.requestDelete(event, { currentTarget: document.createElement('button') } as unknown as Event);
    fixture.componentInstance.confirmDelete(event);
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/${event.id}`).flush('boom', {
      status: 500,
      statusText: 'Server Error',
    });

    expect(fixture.componentInstance.pendingDelete()).toBeNull();
    expect(fixture.componentInstance.toasts()[0]?.type).toBe('error');
  });

  it('dismissToast() clears the current toast', () => {
    const fixture = TestBed.createComponent(CapacityListComponent);
    flushTeamsAndEvents(fixture, [{ id: 1, name: 'Team A' }], [event]);

    fixture.componentInstance.requestDelete(event, { currentTarget: document.createElement('button') } as unknown as Event);
    fixture.componentInstance.confirmDelete(event);
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/${event.id}`).flush(null);
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/capacity/events`).flush([]);

    const toastId = fixture.componentInstance.toasts()[0].id;
    fixture.componentInstance.dismissToast(toastId);
    expect(fixture.componentInstance.toasts()).toEqual([]);
  });

  it('loadEvents() is a no-op while no team is selected', () => {
    const fixture = TestBed.createComponent(CapacityListComponent);
    flushTeamsAndEvents(fixture, [], []);

    expect(fixture.componentInstance.selectedTeamId()).toBeNull();
    fixture.componentInstance.loadEvents();
    httpMock.expectNone((r) => r.url === `${environment.apiUrl}/capacity/events`);
  });

  it('renders the events list, the load-error retry action, and the delete dialog in the DOM', () => {
    const fixture = TestBed.createComponent(CapacityListComponent);
    flushTeamsAndEvents(fixture, [{ id: 1, name: 'Team A' }], [event]);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain(event.name);

    // Translation keys don't resolve to real text under TranslocoTestingModule's empty stub
    // langs, so target the delete action structurally: each event `<li>` renders exactly one
    // edit `<a>` and one delete `<button>` outside the KPI cards.
    const deleteButtons = el.querySelectorAll('.capacity-list__events li button');
    expect(deleteButtons.length).toBeGreaterThan(0);
    deleteButtons[0].dispatchEvent(new Event('click'));
    fixture.detectChanges();
    expect(el.querySelector('[role="alertdialog"]')).toBeTruthy();
  });
});
