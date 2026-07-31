import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Subscription } from 'rxjs';
import { MeetingEvent, MeetingReport } from '../models/meeting.model';
import { MeetingReportService } from '../services/meeting-report.service';
import { MeetingWsService } from '../services/meeting-ws.service';

/**
 * Read-only compte-rendu view for a meeting (US12.3.1) — draft (live-derived) while the meeting
 * is not yet closed, frozen (immutable) once it is. Any caller with visibility into the meeting
 * may open this view (same `resolveMeetingForCaller` visibility as `MeetingParticipantShellComponent`);
 * a cross-tenant or inaccessible meeting 404s server-side (anti-enumeration), surfaced here as the
 * same generic {@link loadError}.
 *
 * Subscribes to the meeting's STOMP room purely to know *when* to refetch: on `MEETING_REPORT_READY`
 * (broadcast once, at closure) it reloads via {@link MeetingReportService.getReport} rather than
 * trusting any bus payload — the event deliberately carries no report content (AC Security).
 *
 * A11y (WCAG 2.1 AA): `h1` = meeting title, `h2` per section (Participants/Agenda/Décisions/Actions,
 * AC 1.3.1); the actions list is a `<table>` with `scope="col"` headers; export buttons carry an
 * explicit `aria-label`, are native `<button>` elements (keyboard-operable and focus-visible by
 * construction) and the draft/overtime badges pair an icon+text with `aria-live`/`role="status"`
 * rather than relying on color alone (AC 1.4.1/2.1.1/2.4.7).
 */
@Component({
  selector: 'app-meeting-report',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './meeting-report.component.html',
  styleUrl: './meeting-report.component.scss',
})
export class MeetingReportComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly reportApi = inject(MeetingReportService);
  protected readonly meetingWs = inject(MeetingWsService);

  readonly report = signal<MeetingReport | null>(null);
  readonly loadError = signal(false);
  readonly exportError = signal(false);
  readonly exportingMarkdown = signal(false);
  readonly exportingJson = signal(false);
  readonly sharing = signal(false);
  readonly shareError = signal(false);
  /** Announced via `aria-live="polite"` once the share request succeeds (AC A11y). */
  readonly shareConfirmation = signal(false);

  private messagesSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.load();
    this.connectWs();
    this.messagesSubscription = this.meetingWs.messages$.subscribe(raw => this.onMessage(raw));
  }

  ngOnDestroy(): void {
    this.messagesSubscription?.unsubscribe();
    this.meetingWs.disconnect();
  }

  /** Exports and downloads the compte-rendu as Markdown (AC nominal). */
  exportMarkdown(): void {
    const id = this.meetingId();
    if (!id || this.exportingMarkdown()) {
      return;
    }
    this.exportingMarkdown.set(true);
    this.exportError.set(false);
    this.reportApi.exportMarkdown(id).subscribe({
      next: markdown => {
        this.exportingMarkdown.set(false);
        this.saveBlob(new Blob([markdown], { type: 'text/markdown' }), this.fileName('md'));
      },
      error: () => {
        this.exportingMarkdown.set(false);
        this.exportError.set(true);
      },
    });
  }

  /** Exports and downloads the compte-rendu as native JSON (AC nominal). */
  exportJson(): void {
    const id = this.meetingId();
    if (!id || this.exportingJson()) {
      return;
    }
    this.exportingJson.set(true);
    this.exportError.set(false);
    this.reportApi.exportJson(id).subscribe({
      next: report => {
        this.exportingJson.set(false);
        this.saveBlob(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }), this.fileName('json'));
      },
      error: () => {
        this.exportingJson.set(false);
        this.exportError.set(true);
      },
    });
  }

  /** Explicitly shares the compte-rendu with the team (AC7/AC8) — organizer or `ROLE_ADMIN` only
   *  server-side; a non-organizer caller gets a generic {@link shareError} (the button itself is
   *  not hidden from non-organizers, per AC nominal, but the server enforcement is authoritative,
   *  never bypassed or duplicated client-side). */
  share(): void {
    const id = this.meetingId();
    if (!id || this.sharing()) {
      return;
    }
    this.sharing.set(true);
    this.shareError.set(false);
    this.shareConfirmation.set(false);
    this.reportApi.share(id).subscribe({
      next: () => {
        this.sharing.set(false);
        this.shareConfirmation.set(true);
      },
      error: () => {
        this.sharing.set(false);
        this.shareError.set(true);
      },
    });
  }

  private meetingId(): string | null {
    return this.route.snapshot.paramMap.get('meetingId');
  }

  private connectWs(): void {
    const id = this.meetingId();
    if (!id) {
      return;
    }
    this.meetingWs.connect(id);
  }

  private load(): void {
    const id = this.meetingId();
    if (!id) {
      this.loadError.set(true);
      return;
    }
    this.loadError.set(false);
    this.reportApi.getReport(id).subscribe({
      next: report => this.report.set(report),
      error: () => this.loadError.set(true),
    });
  }

  private onMessage(raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (typeof parsed !== 'object' || parsed === null || !('type' in parsed)) {
      return;
    }
    const event = parsed as MeetingEvent;
    if (event.type === 'MEETING_REPORT_READY') {
      this.load();
    }
  }

  private fileName(extension: string): string {
    const title = this.report()?.title ?? 'compte-rendu';
    return `${title}.${extension}`;
  }

  /** Triggers a browser download of `blob` as `filename` (no-op where the Blob URL API is absent). */
  private saveBlob(blob: Blob, filename: string): void {
    if (typeof URL.createObjectURL !== 'function') {
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
