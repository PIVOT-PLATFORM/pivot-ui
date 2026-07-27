import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { RxStompState } from '@stomp/rx-stomp';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { COLLABORATIF_API_URL } from '../../core/whiteboard/config/tokens';
import { MeetingReport } from '../models/meeting.model';
import { MEETING_STOMP_CLIENT_FACTORY, MeetingStompClient } from '../services/meeting-ws.service';
import { MeetingReportComponent } from './meeting-report.component';

/** Mirrors `meeting-runner.component.spec.ts`'s `FakeRxStomp` — see that file's TSDoc for why. */
class FakeRxStomp implements MeetingStompClient {
  readonly connectionState$ = new Subject<RxStompState>();
  readonly stompErrors$ = new Subject<unknown>();
  private readonly watchers = new Map<string, Subject<{ body: string }>>();

  configure(): void {
    // no-op for these tests
  }

  activate(): void {
    // no-op for these tests
  }

  deactivate(): Promise<void> {
    return Promise.resolve();
  }

  watch(destination: string) {
    return this.watcher(destination).asObservable();
  }

  emit(destination: string, body: string): void {
    this.watcher(destination).next({ body });
  }

  private watcher(destination: string): Subject<{ body: string }> {
    let subject = this.watchers.get(destination);
    if (!subject) {
      subject = new Subject<{ body: string }>();
      this.watchers.set(destination, subject);
    }
    return subject;
  }
}

const TEST_API_URL = 'http://localhost:8083/api/collaboratif';
const REPORT_URL = `${TEST_API_URL}/meetings/m-1/report`;
const EXPORT_URL = `${TEST_API_URL}/meetings/m-1/report/export`;
const TOPIC = '/topic/collaboratif/meeting/m-1';

function report(overrides: Partial<MeetingReport> = {}): MeetingReport {
  return {
    meetingId: 'm-1',
    title: 'Sprint Review',
    status: 'IN_PROGRESS',
    draft: true,
    participants: [{ userId: 1, organizer: true }],
    agendaItems: [{ id: 'ai-1', title: 'Point A', plannedDurationMinutes: 5, actualDurationSeconds: 320, overtime: true }],
    decisions: [],
    actions: [],
    generatedAt: '2026-08-01T10:30:00Z',
    ...overrides,
  };
}

describe('MeetingReportComponent', () => {
  let httpMock: HttpTestingController;
  let fake: FakeRxStomp;

  beforeEach(async () => {
    fake = new FakeRxStomp();
    await TestBed.configureTestingModule({
      imports: [MeetingReportComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: COLLABORATIF_API_URL, useValue: TEST_API_URL },
        { provide: MEETING_STOMP_CLIENT_FACTORY, useValue: () => fake },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ meetingId: 'm-1' }) } } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function createFixture(initial = report()) {
    const fixture = TestBed.createComponent(MeetingReportComponent);
    fixture.detectChanges();
    httpMock.expectOne(REPORT_URL).flush(initial);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the report and exposes it', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.report()).toEqual(report());
  });

  it('flags loadError when the initial load fails (e.g. cross-tenant 404)', () => {
    const fixture = TestBed.createComponent(MeetingReportComponent);
    fixture.detectChanges();
    httpMock.expectOne(REPORT_URL).flush(null, { status: 404, statusText: 'Not Found' });
    expect(fixture.componentInstance.loadError()).toBe(true);
  });

  it('exportMarkdown() requests the markdown export and clears the exporting flag', () => {
    const fixture = createFixture();
    fixture.componentInstance.exportMarkdown();
    expect(fixture.componentInstance.exportingMarkdown()).toBe(true);

    const req = httpMock.expectOne(r => r.url === EXPORT_URL && r.params.get('format') === 'markdown');
    expect(req.request.responseType).toBe('text');
    req.flush('# Sprint Review\n');

    expect(fixture.componentInstance.exportingMarkdown()).toBe(false);
    expect(fixture.componentInstance.exportError()).toBe(false);
  });

  it('exportJson() requests the json export and clears the exporting flag', () => {
    const fixture = createFixture();
    fixture.componentInstance.exportJson();
    expect(fixture.componentInstance.exportingJson()).toBe(true);

    const req = httpMock.expectOne(r => r.url === EXPORT_URL && r.params.get('format') === 'json');
    req.flush(report());

    expect(fixture.componentInstance.exportingJson()).toBe(false);
    expect(fixture.componentInstance.exportError()).toBe(false);
  });

  it('surfaces exportError when an export fails', () => {
    const fixture = createFixture();
    fixture.componentInstance.exportMarkdown();
    httpMock
      .expectOne(r => r.url === EXPORT_URL && r.params.get('format') === 'markdown')
      .flush(null, { status: 400, statusText: 'Bad Request' });

    expect(fixture.componentInstance.exportError()).toBe(true);
    expect(fixture.componentInstance.exportingMarkdown()).toBe(false);
  });

  it('a WS MEETING_REPORT_READY message triggers a fresh GET .../report', () => {
    const fixture = createFixture();

    fake.emit(TOPIC, JSON.stringify({ type: 'MEETING_REPORT_READY', meetingId: 'm-1', generatedAt: '2026-08-01T10:31:00Z', draft: false }));

    httpMock.expectOne(REPORT_URL).flush(report({ draft: false, status: 'ENDED' }));
    expect(fixture.componentInstance.report()?.draft).toBe(false);
  });

  it('ignores WS messages of a different type without reloading', () => {
    createFixture();

    fake.emit(TOPIC, JSON.stringify({ type: 'TIMER_TICK', meetingId: 'm-1', agendaItemId: 'ai-1', elapsedSeconds: 1, remainingSeconds: 299, overtimeSeconds: 0 }));

    httpMock.expectNone(REPORT_URL);
  });

  it('ignores malformed WS payloads without throwing', () => {
    createFixture();
    expect(() => fake.emit(TOPIC, 'not json')).not.toThrow();
    httpMock.expectNone(REPORT_URL);
  });

  it('disconnects the WS on destroy', () => {
    const fixture = createFixture();
    fixture.destroy();
    expect(() => fake.emit(TOPIC, '{}')).not.toThrow();
  });

  // -----------------------------------------------------------------------------------------
  // Template branches — draft/final badge, overtime, empty sections (AC-A3 coverage)
  // -----------------------------------------------------------------------------------------

  it('renders the draft badge and no actual-duration line while draft with no duration yet', () => {
    const fixture = createFixture(report({ draft: true, actualDurationSeconds: undefined }));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('meeting.report.draftBadge');
    expect(text).not.toContain('meeting.report.finalBadge');
  });

  it('renders the final badge and the actual-duration line for a frozen report', () => {
    const fixture = createFixture(
      report({ draft: false, status: 'ENDED', actualDurationSeconds: 900 }),
    );
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('meeting.report.finalBadge');
    expect(text).not.toContain('meeting.report.draftBadge');
  });

  it('renders empty-state text for participants/agenda/decisions/actions when all are empty', () => {
    const fixture = createFixture(
      report({ participants: [], agendaItems: [], decisions: [], actions: [] }),
    );
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('meeting.report.participantsEmpty');
    expect(text).toContain('meeting.report.agendaEmpty');
    expect(text).toContain('meeting.report.decisionsEmpty');
    expect(text).toContain('meeting.report.actionsEmpty');
  });

  it('renders on-time (non-overtime) agenda rows and a placeholder when actualDurationSeconds is absent', () => {
    const fixture = createFixture(
      report({
        agendaItems: [{ id: 'ai-2', title: 'Point B', plannedDurationMinutes: 5, overtime: false }],
      }),
    );
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('meeting.report.onTimeBadge');
    expect(text).not.toContain('meeting.report.overtimeBadge');
  });

  it('renders decisions and an actions table with owner/due-date placeholders when unassigned', () => {
    const fixture = createFixture(
      report({
        decisions: [{ id: 'd-1', label: 'Adopter le nouveau format', decidedAt: '2026-08-01T10:05:00Z' }],
        actions: [{ id: 'a-1', label: 'Unassigned follow-up' }],
      }),
    );
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Adopter le nouveau format');
    expect(text).toContain('Unassigned follow-up');
  });

  it('renders an action row with an assigned owner and a due date', () => {
    const fixture = createFixture(
      report({ actions: [{ id: 'a-2', label: 'Follow up', ownerUserId: 7, dueDate: '2026-08-10' }] }),
    );
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('meeting.report.participantLabel');
    expect(text).toContain('2026-08-10');
  });

  it('shows the export error alert when exportError is set', () => {
    const fixture = createFixture();
    fixture.componentInstance.exportMarkdown();
    httpMock
      .expectOne(r => r.url === EXPORT_URL && r.params.get('format') === 'markdown')
      .flush(null, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('meeting.report.exportError');
  });

  it('renders the notFound alert when loadError is set', () => {
    const fixture = TestBed.createComponent(MeetingReportComponent);
    fixture.detectChanges();
    httpMock.expectOne(REPORT_URL).flush(null, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('meeting.report.notFound');
  });
});
