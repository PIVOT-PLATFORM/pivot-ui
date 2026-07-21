import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { environment } from '../../../../environments/environment';
import { KpiResponse } from '../models/capacity.model';
import { CapacityKpiComponent } from './capacity-kpi.component';

describe('CapacityKpiComponent', () => {
  let httpMock: HttpTestingController;

  const kpiResponse: KpiResponse = {
    teamId: 1,
    eventSampleSize: 3,
    sprintSampleSize: 2,
    kpis: {
      taux_utilisation: 0.82,
      capacite_nette: 45.5,
      velocite_moyenne: 32,
      taux_absence: 0.05,
      depassements: 1,
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CapacityKpiComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('renders nothing and issues no request while eventId is null', () => {
    const fixture = TestBed.createComponent(CapacityKpiComponent);
    fixture.detectChanges();

    httpMock.expectNone((r) => r.url === `${environment.apiUrl}/kpi`);
    expect((fixture.nativeElement as HTMLElement).querySelector('.capacity-kpi')).toBeNull();
  });

  it('loads and renders the five KPI cards for the given eventId', () => {
    const fixture = TestBed.createComponent(CapacityKpiComponent);
    fixture.componentRef.setInput('eventId', 'event-1');
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/kpi` && r.params.get('eventId') === 'event-1').flush(kpiResponse);
    fixture.detectChanges();

    expect(fixture.componentInstance.kpis()).toEqual(kpiResponse);
    expect(fixture.componentInstance.kpiEntries().length).toBe(5);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.capacity-kpi__card').length).toBe(5);
  });

  it('reloads when eventId changes', () => {
    const fixture = TestBed.createComponent(CapacityKpiComponent);
    fixture.componentRef.setInput('eventId', 'event-1');
    fixture.detectChanges();
    httpMock.expectOne((r) => r.params.get('eventId') === 'event-1').flush(kpiResponse);

    fixture.componentRef.setInput('eventId', 'event-2');
    fixture.detectChanges();
    httpMock.expectOne((r) => r.params.get('eventId') === 'event-2').flush(kpiResponse);

    expect(fixture.componentInstance.kpis()).toEqual(kpiResponse);
  });

  it('sets loadError when the KPI request fails, and retry re-issues it', () => {
    const fixture = TestBed.createComponent(CapacityKpiComponent);
    fixture.componentRef.setInput('eventId', 'event-1');
    fixture.detectChanges();

    httpMock.expectOne((r) => r.params.get('eventId') === 'event-1').flush('boom', {
      status: 500,
      statusText: 'Server Error',
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toBe(true);

    fixture.componentInstance.load();
    httpMock.expectOne((r) => r.params.get('eventId') === 'event-1').flush(kpiResponse);
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toBe(false);
    expect(fixture.componentInstance.kpis()).toEqual(kpiResponse);
  });

  it('shows the empty state when the backend returns no kpi entries', () => {
    const fixture = TestBed.createComponent(CapacityKpiComponent);
    fixture.componentRef.setInput('eventId', 'event-1');
    fixture.detectChanges();

    httpMock
      .expectOne((r) => r.params.get('eventId') === 'event-1')
      .flush({ teamId: 1, eventSampleSize: 0, sprintSampleSize: 0, kpis: {} });
    fixture.detectChanges();

    expect(fixture.componentInstance.kpiEntries()).toEqual([]);
  });
});
