import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { MeetingReport } from '../models/meeting.model';
import { MeetingReportService } from './meeting-report.service';

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';
const BASE = `${TEST_API_URL}/meetings/m-1`;

const REPORT: MeetingReport = {
  meetingId: 'm-1',
  title: 'Sprint Review',
  status: 'ENDED',
  draft: false,
  participants: [{ userId: 1, organizer: true }],
  agendaItems: [{ id: 'ai-1', title: 'Point A', plannedDurationMinutes: 5, actualDurationSeconds: 320, overtime: true }],
  decisions: [{ id: 'd-1', label: 'Adopter le nouveau format', decidedAt: '2026-08-01T10:05:00Z' }],
  actions: [{ id: 'a-1', label: 'Follow up', ownerUserId: 7, dueDate: '2026-08-10' }],
  actualDurationSeconds: 900,
  generatedAt: '2026-08-01T10:30:00Z',
};

describe('MeetingReportService', () => {
  let service: MeetingReportService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
      ],
    });
    service = TestBed.inject(MeetingReportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getReport() GETs /meetings/{id}/report', () => {
    let received: MeetingReport | undefined;
    service.getReport('m-1').subscribe(r => (received = r));
    const req = httpMock.expectOne(`${BASE}/report`);
    expect(req.request.method).toBe('GET');
    req.flush(REPORT);
    expect(received).toEqual(REPORT);
  });

  it('exportJson() GETs /report/export?format=json', () => {
    service.exportJson('m-1').subscribe();
    const req = httpMock.expectOne(r => r.url === `${BASE}/report/export` && r.params.get('format') === 'json');
    expect(req.request.method).toBe('GET');
    req.flush(REPORT);
  });

  it('exportMarkdown() GETs /report/export?format=markdown as text', () => {
    let received: string | undefined;
    service.exportMarkdown('m-1').subscribe(text => (received = text));
    const req = httpMock.expectOne(r => r.url === `${BASE}/report/export` && r.params.get('format') === 'markdown');
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('text');
    req.flush('# Sprint Review\n\n## Participants\n');
    expect(received).toBe('# Sprint Review\n\n## Participants\n');
  });
});
