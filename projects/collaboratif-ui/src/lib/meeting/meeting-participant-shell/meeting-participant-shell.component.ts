import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Subscription } from 'rxjs';
import { AgendaItemState, MeetingEvent, MeetingLiveState } from '../models/meeting.model';
import { MeetingApiService } from '../services/meeting-api.service';
import { MeetingWsService } from '../services/meeting-ws.service';
import { MeetingTimerDisplay } from '../meeting-timer.util';

/**
 * Read-only participant view of a live meeting (US12.2.1 AC-07) — current point, timer, and
 * agenda progression, with no animation controls (mirrors {@link MeetingRunnerComponent} minus
 * the owner-or-admin-only actions). Any caller visible to the meeting (owner or team member) may
 * open this view; a cross-tenant or non-visible meeting 404s (anti-enumeration, AC-S1), surfaced
 * here as a generic `participant.loadError`.
 *
 * Resynchronizes purely via `GET .../live` (never depends on replaying missed STOMP history, per
 * this US's own "hors-périmètre" note) — on initial load and again on every animation event other
 * than `TIMER_TICK`, which instead feeds {@link MeetingTimerDisplay} directly so the once-a-second
 * countdown stays smooth.
 */
@Component({
  selector: 'app-meeting-participant-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './meeting-participant-shell.component.html',
  styleUrl: './meeting-participant-shell.component.scss',
})
export class MeetingParticipantShellComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly meetingApi = inject(MeetingApiService);
  protected readonly meetingWs = inject(MeetingWsService);

  readonly liveState = signal<MeetingLiveState | null>(null);
  readonly loadError = signal(false);

  /** Local per-second countdown, anchored on the latest server value (AC-02/AC-S4). */
  readonly timer = new MeetingTimerDisplay();

  /** Announced once per overtime transition (false → true) — never repeated every tick (AC-A1). */
  readonly overtimeAnnouncement = signal<string | null>(null);
  private wasOvertime = false;

  /** Announced once per current-item change — never on the very first load (AC-A1). */
  readonly currentItemAnnouncement = signal<string | null>(null);
  /** Announced once the meeting transitions to ENDED (AC-A1). */
  readonly endedAnnouncement = signal(false);
  private previousAgendaItemId: string | null = null;
  private hasLoadedOnce = false;
  private wasEnded = false;

  readonly currentItem = computed<AgendaItemState | null>(() => {
    const state = this.liveState();
    if (!state || state.currentIndex === undefined) {
      return null;
    }
    return state.agendaItems[state.currentIndex] ?? null;
  });

  readonly hasStarted = computed(() => {
    const status = this.liveState()?.status;
    return status === 'IN_PROGRESS' || status === 'ENDED';
  });
  readonly hasEnded = computed(() => this.liveState()?.status === 'ENDED');

  private messagesSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.load();
    this.connectWs();
    this.messagesSubscription = this.meetingWs.messages$.subscribe(raw => this.onMessage(raw));
  }

  ngOnDestroy(): void {
    this.messagesSubscription?.unsubscribe();
    this.meetingWs.disconnect();
    this.timer.stop();
  }

  private meetingId(): string | null {
    return this.route.snapshot.paramMap.get('meetingId');
  }

  private connectWs(): void {
    const id = this.meetingId();
    if (!id) {
      return;
    }
    this.meetingWs.connect(`/topic/collaboratif/meeting/${id}`);
  }

  private load(): void {
    const id = this.meetingId();
    if (!id) {
      this.loadError.set(true);
      return;
    }
    this.meetingApi.live(id).subscribe({
      next: state => this.applyState(state),
      error: () => this.loadError.set(true),
    });
  }

  private applyState(state: MeetingLiveState): void {
    this.liveState.set(state);
    if (state.currentIndex !== undefined) {
      this.timer.update({ elapsedSeconds: state.elapsedSeconds, remainingSeconds: state.remainingSeconds });
    } else {
      this.timer.reset();
    }
    this.checkOvertimeTransition(state.overtime, state.overtimeSeconds);
    this.checkCurrentItemTransition(state);
    this.checkEndedTransition(state.status);
    this.hasLoadedOnce = true;
  }

  private checkOvertimeTransition(overtime: boolean, overtimeSeconds: number): void {
    if (overtime && !this.wasOvertime) {
      this.overtimeAnnouncement.set(String(overtimeSeconds));
    } else if (!overtime) {
      this.overtimeAnnouncement.set(null);
    }
    this.wasOvertime = overtime;
  }

  /**
   * Announces "Point courant : {titre}" (AC-A1) once per current-item change — never on the very
   * first load/join, only on a genuine transition a participant should be alerted to.
   */
  private checkCurrentItemTransition(state: MeetingLiveState): void {
    const newItemId = state.currentAgendaItemId ?? null;
    if (this.hasLoadedOnce && newItemId !== null && newItemId !== this.previousAgendaItemId) {
      const title =
        state.currentIndex !== undefined ? (state.agendaItems[state.currentIndex]?.title ?? null) : null;
      this.currentItemAnnouncement.set(title);
    } else {
      this.currentItemAnnouncement.set(null);
    }
    this.previousAgendaItemId = newItemId;
  }

  /** Announces "Réunion terminée" (AC-A1) once, on the transition into ENDED. */
  private checkEndedTransition(status: string): void {
    const ended = status === 'ENDED';
    this.endedAnnouncement.set(ended && !this.wasEnded);
    this.wasEnded = ended;
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
    if (event.type === 'TIMER_TICK') {
      this.timer.update({ elapsedSeconds: event.elapsedSeconds, remainingSeconds: event.remainingSeconds });
      this.checkOvertimeTransition(event.overtimeSeconds > 0, event.overtimeSeconds);
      return;
    }
    this.load();
  }
}
