import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { environment } from '../../../../../environments/environment';
import { CapacityBurndownResponse } from '../../models/capacity.model';
import { BurndownPanelComponent } from './burndown-panel.component';

const burndown: CapacityBurndownResponse = {
  real: [
    { date: '2026-07-01', pointsRestants: 20 },
    { date: '2026-07-02', pointsRestants: 15 },
    { date: '2026-07-03', pointsRestants: 10 },
  ],
  ideal: [
    { date: '2026-07-01', pointsRestants: 20 },
    { date: '2026-07-02', pointsRestants: 10 },
    { date: '2026-07-03', pointsRestants: 0 },
  ],
};

describe('BurndownPanelComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BurndownPanelComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads the burndown and renders both polylines and the data table', () => {
    const fixture = TestBed.createComponent(BurndownPanelComponent);
    fixture.componentRef.setInput('eventId', 'sprint-1');
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/sprint-1/burndown`).flush(burndown);
    fixture.detectChanges();

    expect(fixture.componentInstance.real()).toEqual(burndown.real);
    expect(fixture.componentInstance.ideal()).toEqual(burndown.ideal);

    const el: HTMLElement = fixture.nativeElement;
    const lines = el.querySelectorAll('polyline');
    expect(lines.length).toBe(2);
    expect(lines[0].getAttribute('points')).toBeTruthy();
    expect(lines[1].getAttribute('points')).toBeTruthy();

    const rows = el.querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain('2026-07-01');
  });

  it('scales the real polyline points within the SVG viewport', () => {
    const fixture = TestBed.createComponent(BurndownPanelComponent);
    fixture.componentRef.setInput('eventId', 'sprint-1');
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/sprint-1/burndown`).flush(burndown);
    fixture.detectChanges();

    const points = fixture.componentInstance.realPolylinePoints();
    const coords = points.split(' ').map((pair) => pair.split(',').map(Number));
    expect(coords.length).toBe(3);
    for (const [x, y] of coords) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(fixture.componentInstance.chartWidth);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(fixture.componentInstance.chartHeight);
    }
    // Points trend downward (burning down) — later x -> higher y (closer to the baseline).
    expect(coords[2][1]).toBeGreaterThan(coords[0][1]);
  });

  it('shows the empty message when both lines are empty', () => {
    const fixture = TestBed.createComponent(BurndownPanelComponent);
    fixture.componentRef.setInput('eventId', 'sprint-1');
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/sprint-1/burndown`).flush({ real: [], ideal: [] });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('capacity.burndown.empty');
  });

  it('shows the load-error banner and retries on click', () => {
    const fixture = TestBed.createComponent(BurndownPanelComponent);
    fixture.componentRef.setInput('eventId', 'sprint-1');
    fixture.detectChanges();
    httpMock
      .expectOne(`${environment.apiUrl}/capacity/events/sprint-1/burndown`)
      .flush(null, { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toBe(true);
    const retryButton = fixture.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement;
    retryButton.click();
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/sprint-1/burndown`).flush(burndown);
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toBe(false);
  });
});
