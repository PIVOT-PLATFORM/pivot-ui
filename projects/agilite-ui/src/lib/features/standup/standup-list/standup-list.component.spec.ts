import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { StandupSessionResponse, TeamResponse } from '../models/standup.model';
import { StandupListComponent } from './standup-list.component';

const teams: TeamResponse[] = [{ id: 1, name: 'Squad Phoenix' }];

const session: StandupSessionResponse = {
  id: 's-1',
  teamId: 1,
  tenantId: 1,
  name: 'Daily du 22/07',
  status: 'PENDING',
  currentIndex: 0,
  timePerPersonSeconds: 120,
  participants: [],
  startedAt: null,
  endedAt: null,
  createdAt: '2026-07-22T08:00:00Z',
  updatedAt: '2026-07-22T08:00:00Z',
};

describe('StandupListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StandupListComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function createFixture() {
    const fixture = TestBed.createComponent(StandupListComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/teams`).flush(teams);
    fixture.detectChanges();
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/standup/sessions`).flush([session]);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the caller teams then the first team sessions', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.teams()).toEqual(teams);
    expect(fixture.componentInstance.sessions()).toEqual([session]);
  });

  it('shows the empty-team message when the caller belongs to no team', () => {
    const fixture = TestBed.createComponent(StandupListComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/teams`).flush([]);
    fixture.detectChanges();
    expect(fixture.componentInstance.teams()).toEqual([]);
    expect(fixture.componentInstance.sessions()).toEqual([]);
  });

  it('flags loadError when the teams request fails', () => {
    const fixture = TestBed.createComponent(StandupListComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/teams`).flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(fixture.componentInstance.loadError()).toBe(true);
  });

  it('reloads with the status query param when the filter changes', () => {
    const fixture = createFixture();
    fixture.componentInstance.onStatusFilterChange({ target: { value: 'DONE' } } as unknown as Event);
    const req = httpMock.expectOne(r => r.url === `${environment.apiUrl}/standup/sessions`);
    expect(req.request.params.get('status')).toBe('DONE');
    req.flush([]);
  });

  it('deletes a session after confirmation and removes it from the list', () => {
    const fixture = createFixture();
    fixture.componentInstance.requestDelete('s-1');
    expect(fixture.componentInstance.pendingDeleteId()).toBe('s-1');
    fixture.componentInstance.confirmDelete();
    httpMock.expectOne(`${environment.apiUrl}/standup/sessions/s-1`).flush(null, { status: 204, statusText: 'No Content' });
    expect(fixture.componentInstance.sessions()).toEqual([]);
    expect(fixture.componentInstance.pendingDeleteId()).toBeNull();
  });

  it('surfaces an inline error and keeps the confirmation open when deleting a RUNNING session (409)', () => {
    const fixture = createFixture();
    fixture.componentInstance.requestDelete('s-1');
    fixture.componentInstance.confirmDelete();
    httpMock
      .expectOne(`${environment.apiUrl}/standup/sessions/s-1`)
      .flush({ code: 'SESSION_RUNNING' }, { status: 409, statusText: 'Conflict' });
    expect(fixture.componentInstance.deleteError()).toBe('standup.list.deleteError');
    expect(fixture.componentInstance.pendingDeleteId()).toBe('s-1');
  });

  it('cancels a pending delete confirmation without calling the API', () => {
    const fixture = createFixture();
    fixture.componentInstance.requestDelete('s-1');
    fixture.componentInstance.cancelDelete();
    expect(fixture.componentInstance.pendingDeleteId()).toBeNull();
  });
});
