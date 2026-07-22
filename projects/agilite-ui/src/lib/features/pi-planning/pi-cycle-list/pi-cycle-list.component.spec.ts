import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { PiCycleSummaryResponse } from '../models/pi-planning.model';
import { PiCycleListComponent } from './pi-cycle-list.component';

const cycles: PiCycleSummaryResponse[] = [
  {
    id: 'c-1',
    name: 'PI 2026.Q3',
    artName: 'ART Phoenix',
    status: 'PREPARATION',
    startDate: '2026-08-01',
    endDate: '2026-10-10',
    iterationCount: 6,
    teamCount: 3,
  },
];

describe('PiCycleListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PiCycleListComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists accessible cycles', () => {
    const fixture = TestBed.createComponent(PiCycleListComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/pi/cycles`).flush(cycles);
    fixture.detectChanges();

    expect(fixture.componentInstance.cycles()).toEqual(cycles);
    expect(fixture.componentInstance.loadError()).toBe(false);
  });

  it('sets loadError on a failed fetch and clears it on retry', () => {
    const fixture = TestBed.createComponent(PiCycleListComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/pi/cycles`).flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toBe(true);

    fixture.componentInstance.loadCycles();
    httpMock.expectOne(`${environment.apiUrl}/pi/cycles`).flush(cycles);

    expect(fixture.componentInstance.loadError()).toBe(false);
    expect(fixture.componentInstance.cycles()).toEqual(cycles);
  });

  it('renders an empty state when there are no accessible cycles', () => {
    const fixture = TestBed.createComponent(PiCycleListComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/pi/cycles`).flush([]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('piPlanning.list.empty');
  });
});
