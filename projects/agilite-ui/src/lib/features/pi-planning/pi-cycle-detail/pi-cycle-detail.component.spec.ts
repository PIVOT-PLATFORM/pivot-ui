import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { PiCycleResponse, TeamResponse } from '../models/pi-planning.model';
import { PiCycleDetailComponent } from './pi-cycle-detail.component';

const cycle: PiCycleResponse = {
  id: 'c-1',
  tenantId: 1,
  name: 'PI 2026.Q3',
  artName: 'ART Phoenix',
  status: 'PREPARATION',
  startDate: '2026-08-01',
  endDate: '2026-10-10',
  eventDay1: null,
  eventDay2: null,
  eventLocation: null,
  createdBy: 1,
  iterations: [
    { id: 'i-1', number: 1, label: 'IT1', startDate: '2026-08-01', endDate: '2026-08-14' },
  ],
  teams: [{ id: 't-1', name: 'Squad Phoenix', color: '#3b82f6', order: 0, sourceTeamId: 1 }],
  createdAt: '2026-07-22T08:00:00Z',
  updatedAt: '2026-07-22T08:00:00Z',
};

const myTeams: TeamResponse[] = [
  { id: 1, name: 'Squad Phoenix' },
  { id: 2, name: 'Squad Griffin' },
];

describe('PiCycleDetailComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PiCycleDetailComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ cycleId: 'c-1' }) } },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function createFixture() {
    const fixture = TestBed.createComponent(PiCycleDetailComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1`).flush(cycle);
    httpMock.expectOne(`${environment.apiUrl}/teams`).flush(myTeams);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the cycle and exposes only not-yet-imported teams as import candidates', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.cycle()).toEqual(cycle);
    // Squad Phoenix (id 1) is already imported (sourceTeamId 1) — only Griffin remains.
    expect(fixture.componentInstance.importableTeams()).toEqual([{ id: 2, name: 'Squad Griffin' }]);
  });

  it('sets loadError on a failed fetch', () => {
    const fixture = TestBed.createComponent(PiCycleDetailComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1`).flush(null, { status: 404, statusText: 'Not Found' });
    httpMock.expectOne(`${environment.apiUrl}/teams`).flush([]);
    fixture.detectChanges();
    expect(fixture.componentInstance.loadError()).toBe(true);
  });

  it('imports selected teams and reloads the cycle', () => {
    const fixture = createFixture();
    fixture.componentInstance.onImportToggle(2, { target: { checked: true } } as unknown as Event);
    expect(fixture.componentInstance.selectedImportIds()).toEqual([2]);

    fixture.componentInstance.importSelected();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/teams/import`);
    expect(req.request.body).toEqual({ teamIds: [2] });
    req.flush({ importedCount: 1, teams: [] });

    httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1`).flush(cycle);
    expect(fixture.componentInstance.selectedImportIds()).toEqual([]);
  });

  it('adds a manually-entered Train team and reloads the cycle', () => {
    const fixture = createFixture();
    fixture.componentInstance.manualTeamName.set('Partenaire externe');

    fixture.componentInstance.addManualTeam();
    const req = httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/teams`);
    expect(req.request.body).toEqual({ name: 'Partenaire externe' });
    req.flush({ id: 't-2', name: 'Partenaire externe', color: null, order: 1, sourceTeamId: null });

    httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1`).flush(cycle);
    expect(fixture.componentInstance.manualTeamName()).toBe('');
  });

  it('does not submit a whitespace-only manual team name', () => {
    const fixture = createFixture();
    fixture.componentInstance.manualTeamName.set('   ');
    fixture.componentInstance.addManualTeam();
    httpMock.expectNone(`${environment.apiUrl}/pi/cycles/c-1/teams`);
  });

  it('removes a Train team and reloads the cycle', () => {
    const fixture = createFixture();
    fixture.componentInstance.removeTeam('t-1');
    httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1/teams/t-1`).flush(null);
    httpMock.expectOne(`${environment.apiUrl}/pi/cycles/c-1`).flush(cycle);
  });
});
