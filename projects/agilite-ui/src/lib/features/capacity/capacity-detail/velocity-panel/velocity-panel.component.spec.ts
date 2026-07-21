import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { environment } from '../../../../../environments/environment';
import { CapacityHistoryResponse } from '../../models/capacity.model';
import { VelocityPanelComponent } from './velocity-panel.component';

const historyResponse: CapacityHistoryResponse = {
  history: [
    { sprintEventId: 'sprint-1', name: 'Sprint 1', startDate: '2026-06-01', pointsEngages: 20, pointsLivres: 18 },
  ],
  forecast: {
    sampleSize: 3,
    mean: 19,
    stdDev: 2,
    coefficientOfVariation: 0.1,
    lowerBound: 15,
    upperBound: 23,
    widened: false,
  },
};

describe('VelocityPanelComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VelocityPanelComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function createFixture() {
    const fixture = TestBed.createComponent(VelocityPanelComponent);
    fixture.componentRef.setInput('eventId', 'sprint-1');
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/sprint-1/history`).flush(historyResponse);
    fixture.detectChanges();
    return fixture;
  }

  it('loads and renders the velocity history and forecast', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.history()).toEqual(historyResponse.history);
    expect(fixture.componentInstance.forecast()).toEqual(historyResponse.forecast);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Sprint 1');
  });

  it('shows the empty message when the history load fails', () => {
    const fixture = TestBed.createComponent(VelocityPanelComponent);
    fixture.componentRef.setInput('eventId', 'sprint-1');
    fixture.detectChanges();
    httpMock
      .expectOne(`${environment.apiUrl}/capacity/events/sprint-1/history`)
      .flush(null, { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.historyLoadError()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('capacity.velocity.history.empty');
  });

  it('upserts velocity, shows success, refreshes history and emits changed', () => {
    const fixture = createFixture();
    const changedSpy = vi.fn();
    fixture.componentInstance.changed.subscribe(changedSpy);

    fixture.componentInstance.form.setValue({ pointsEngages: 20, pointsLivres: 18 });
    fixture.componentInstance.onSubmit();

    const req = httpMock.expectOne(`${environment.apiUrl}/capacity/events/sprint-1/velocity`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ pointsEngages: 20, pointsLivres: 18 });
    req.flush({ id: 'v-1', sprintEventId: 'sprint-1', pointsEngages: 20, pointsLivres: 18, createdAt: '2026-07-21T00:00:00Z' });

    httpMock.expectOne(`${environment.apiUrl}/capacity/events/sprint-1/history`).flush(historyResponse);
    fixture.detectChanges();

    expect(fixture.componentInstance.saveSuccess()).toBe(true);
    expect(changedSpy).toHaveBeenCalledTimes(1);
  });

  it('shows a save error banner when the upsert fails', () => {
    const fixture = createFixture();
    fixture.componentInstance.form.setValue({ pointsEngages: 20, pointsLivres: 18 });
    fixture.componentInstance.onSubmit();

    httpMock
      .expectOne(`${environment.apiUrl}/capacity/events/sprint-1/velocity`)
      .flush(null, { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.saveError()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('capacity.velocity.saveError');
  });
});
