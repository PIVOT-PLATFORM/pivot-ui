import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { CapacityEventSummaryResponse, TeamResponse } from '../models/capacity.model';
import { CapacityEventListComponent } from './capacity-event-list.component';

const teams: TeamResponse[] = [{ id: 1, name: 'Squad Phoenix' }];

const event: CapacityEventSummaryResponse = {
  id: 'e-1',
  teamId: 1,
  type: 'SPRINT',
  name: 'Sprint 20',
  startDate: '2026-08-01',
  endDate: '2026-08-14',
};

describe('CapacityEventListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CapacityEventListComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function createFixture() {
    const fixture = TestBed.createComponent(CapacityEventListComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/teams`).flush(teams);
    fixture.detectChanges();
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/events`).flush([event]);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the caller teams then the first team events', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.teams()).toEqual(teams);
    expect(fixture.componentInstance.events()).toEqual([event]);
  });

  it('shows the empty-team message when the caller belongs to no team', () => {
    const fixture = TestBed.createComponent(CapacityEventListComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/teams`).flush([]);
    fixture.detectChanges();
    expect(fixture.componentInstance.teams()).toEqual([]);
    expect(fixture.componentInstance.events()).toEqual([]);
  });

  it('flags loadError when the teams request fails', () => {
    const fixture = TestBed.createComponent(CapacityEventListComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/teams`).flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(fixture.componentInstance.loadError()).toBe(true);
  });

  it('reloads with the type query param when the filter changes', () => {
    const fixture = createFixture();
    fixture.componentInstance.onTypeFilterChange({ target: { value: 'PI_PLANNING' } } as unknown as Event);
    const req = httpMock.expectOne(r => r.url === `${environment.apiUrl}/capacity/events`);
    expect(req.request.params.get('type')).toBe('PI_PLANNING');
    req.flush([]);
  });

  it('deletes an event after confirmation and removes it from the list', () => {
    const fixture = createFixture();
    fixture.componentInstance.requestDelete('e-1');
    expect(fixture.componentInstance.pendingDeleteId()).toBe('e-1');
    fixture.componentInstance.confirmDelete();
    httpMock.expectOne(`${environment.apiUrl}/capacity/events/e-1`).flush(null, { status: 204, statusText: 'No Content' });
    expect(fixture.componentInstance.events()).toEqual([]);
    expect(fixture.componentInstance.pendingDeleteId()).toBeNull();
  });

  it('surfaces an inline error and keeps the confirmation open when deleting an event with children (409)', () => {
    const fixture = createFixture();
    fixture.componentInstance.requestDelete('e-1');
    fixture.componentInstance.confirmDelete();
    httpMock
      .expectOne(`${environment.apiUrl}/capacity/events/e-1`)
      .flush({ code: 'HAS_CHILDREN' }, { status: 409, statusText: 'Conflict' });
    expect(fixture.componentInstance.deleteError()).toBe('capacityPlanning.list.deleteError');
    expect(fixture.componentInstance.pendingDeleteId()).toBe('e-1');
  });

  it('cancels a pending delete confirmation without calling the API', () => {
    const fixture = createFixture();
    fixture.componentInstance.requestDelete('e-1');
    fixture.componentInstance.cancelDelete();
    expect(fixture.componentInstance.pendingDeleteId()).toBeNull();
  });
});
