import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { SessionSummaryResponse } from '../models/session.model';
import { SessionListComponent } from './session-list.component';

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';

const SESSION: SessionSummaryResponse = {
  id: 's-1',
  title: 'Sprint retro',
  type: 'POLL',
  status: 'DRAFT',
  joinCode: 'ABCDEF',
  config: {},
  teamId: null,
  participantCount: 0,
  createdBy: 1,
  createdAt: '2026-07-22T08:00:00Z',
  startedAt: null,
  endedAt: null,
};

describe('SessionListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionListComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function createFixture() {
    const fixture = TestBed.createComponent(SessionListComponent);
    fixture.detectChanges();
    httpMock.expectOne(r => r.url === `${TEST_API_URL}/sessions`).flush([SESSION]);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the caller accessible sessions on init', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.sessions()).toEqual([SESSION]);
    expect(fixture.componentInstance.loadError()).toBe(false);
  });

  it('flags loadError when the request fails', () => {
    const fixture = TestBed.createComponent(SessionListComponent);
    fixture.detectChanges();
    httpMock.expectOne(r => r.url === `${TEST_API_URL}/sessions`).flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(fixture.componentInstance.loadError()).toBe(true);
  });

  it('reloads with the status query param when the filter changes, omitting it for ALL', () => {
    const fixture = createFixture();

    fixture.componentInstance.onStatusFilterChange({ target: { value: 'LIVE' } } as unknown as Event);
    let req = httpMock.expectOne(r => r.url === `${TEST_API_URL}/sessions`);
    expect(req.request.params.get('status')).toBe('LIVE');
    req.flush([]);

    fixture.componentInstance.onStatusFilterChange({ target: { value: 'ALL' } } as unknown as Event);
    req = httpMock.expectOne(r => r.url === `${TEST_API_URL}/sessions`);
    expect(req.request.params.has('status')).toBe(false);
    req.flush([SESSION]);
  });
});
