import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { CapacityBurndownResponse } from '../models/capacity.model';
import { CapacityBurndownChartComponent } from './capacity-burndown-chart.component';

const burndown: CapacityBurndownResponse = {
  ideal: [
    { date: '2026-08-01', pointsRemaining: 30 },
    { date: '2026-08-02', pointsRemaining: 20 },
    { date: '2026-08-03', pointsRemaining: 10 },
    { date: '2026-08-04', pointsRemaining: 0 },
  ],
  actual: [
    { date: '2026-08-01', pointsRemaining: 30 },
    { date: '2026-08-02', pointsRemaining: 25 },
  ],
  atRisk: true,
  stale: false,
};

describe('CapacityBurndownChartComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CapacityBurndownChartComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ eventId: 'e-1' }) } } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads the burndown payload and exposes atRisk/stale flags', () => {
    const fixture = TestBed.createComponent(CapacityBurndownChartComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/burndown`).flush(burndown);
    fixture.detectChanges();

    expect(fixture.componentInstance.burndown()).toEqual(burndown);
    expect(fixture.componentInstance.isEmpty()).toBe(false);
  });

  it('flags isEmpty when there are no actual entries yet, even with an ideal curve', () => {
    const fixture = TestBed.createComponent(CapacityBurndownChartComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/burndown`).flush({ ...burndown, actual: [] });
    fixture.detectChanges();

    expect(fixture.componentInstance.isEmpty()).toBe(true);
  });

  it('computes a non-empty SVG polyline point string for both curves', () => {
    const fixture = TestBed.createComponent(CapacityBurndownChartComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/burndown`).flush(burndown);
    fixture.detectChanges();

    const ideal = fixture.componentInstance.idealPolyline();
    const actual = fixture.componentInstance.actualPolyline();
    expect(ideal.split(' ')).toHaveLength(4);
    expect(actual.split(' ')).toHaveLength(2);
    // First point of the ideal curve starts at the left padding edge.
    expect(ideal.startsWith('10.0,')).toBe(true);
  });

  it('submits a burndown entry and reloads', () => {
    const fixture = TestBed.createComponent(CapacityBurndownChartComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/burndown`).flush(burndown);
    fixture.detectChanges();

    fixture.componentInstance.onEntryDateInput({ target: { value: '2026-08-03' } } as unknown as Event);
    fixture.componentInstance.onEntryPointsInput({ target: { value: '18' } } as unknown as Event);
    fixture.componentInstance.submitEntry();

    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/burndown/2026-08-03`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ pointsRemaining: 18 });
    req.flush(null);

    httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/burndown`).flush(burndown);
  });

  it('does not submit when the date is missing', () => {
    const fixture = TestBed.createComponent(CapacityBurndownChartComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/burndown`).flush(burndown);
    fixture.detectChanges();

    fixture.componentInstance.onEntryPointsInput({ target: { value: '18' } } as unknown as Event);
    fixture.componentInstance.submitEntry();
    httpMock.expectNone(r => r.url.includes('/burndown/'));
  });

  it('flags loadError on a failed fetch', () => {
    const fixture = TestBed.createComponent(CapacityBurndownChartComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1/burndown`).flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(fixture.componentInstance.loadError()).toBe(true);
  });
});
