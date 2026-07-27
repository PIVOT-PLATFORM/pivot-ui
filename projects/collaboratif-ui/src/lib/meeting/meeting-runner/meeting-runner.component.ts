import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Observable, Subscription } from 'rxjs';
import { AddMeetingActionRequest, AgendaItemState, MeetingEvent, MeetingLiveState } from '../models/meeting.model';
import { MeetingApiService } from '../services/meeting-api.service';
import { MeetingWsService } from '../services/meeting-ws.service';
import { MeetingTimerDisplay } from '../meeting-timer.util';

/**
 * Animator's control view for a live meeting (US12.2.1) — Démarrer / Point suivant / Terminer +
 * in-meeting action capture. Only the meeting's owner (or a `ROLE_ADMIN`) is authorized
 * server-side; a cross-tenant meeting 404s (anti-enumeration, AC-S1) and a same-tenant
 * non-owner/non-admin caller 403s (AC-S2) — both surfaced here as the same generic
 * `runner.notFound` message rather than a distinguishable error (mirrors `SessionRunnerComponent`'s
 * equivalent "not allowed" posture).
 *
 * Owns the STOMP connection: `GET .../live` (AC-07) hydrates on load and on every reconnect-worthy
 * event; `TIMER_TICK` feeds {@link MeetingTimerDisplay} directly (no round trip) so the once-a-
 * second countdown stays smooth, while every other event type (`MEETING_STARTED`/
 * `AGENDA_ITEM_CHANGED`/`MEETING_ENDED`/`MEETING_ACTION_ADDED`) simply triggers a fresh
 * `GET .../live` — the simplest way to guarantee this view is never out of sync with the
 * server-authoritative state (AC-07's own resync contract), rather than hand-patching local state
 * per event type.
 */
@Component({
  selector: 'app-meeting-runner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './meeting-runner.component.html',
  styleUrl: './meeting-runner.component.scss',
})
export class MeetingRunnerComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly meetingApi = inject(MeetingApiService);
  protected readonly meetingWs = inject(MeetingWsService);

  readonly liveState = signal<MeetingLiveState | null>(null);
  readonly loadError = signal(false);
  readonly actionError = signal(false);
  readonly actionInFlight = signal(false);

  /** In-meeting action capture form fields (AC-08). */
  readonly actionLabel = signal('');
  readonly actionOwnerUserId = signal('');
  readonly actionDueDate = signal('');
  readonly actionSaveError = signal(false);
  readonly actionAddedAnnouncement = signal<string | null>(null);

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

  readonly canStart = computed(() => {
    const status = this.liveState()?.status;
    return status === 'DRAFT' || status === 'CONFIRMED';
  });
  readonly canAnimate = computed(() => this.liveState()?.status === 'IN_PROGRESS');
  readonly hasEnded = computed(() => this.liveState()?.status === 'ENDED');

  private messagesSubscription: Subscription | null = null;
  private hasConnectedOnce = false;

  /**
   * AC-FE6: on STOMP reconnection (not the very first connect), re-call `GET .../live` to
   * resynchronise — a client resumes from whatever it locally rendered while disconnected, and a
   * missed event during the outage (e.g. an `AGENDA_ITEM_CHANGED`) would otherwise never self-heal.
   */
  private readonly reconnectEffect = effect(() => {
    const status = this.meetingWs.status();
    if (status === 'connected') {
      if (this.hasConnectedOnce) {
        this.load();
      }
      this.hasConnectedOnce = true;
    }
  });

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

  start(): void {
    this.runAction(id => this.meetingApi.start(id));
  }

  next(): void {
    this.runAction(id => this.meetingApi.next(id));
  }

  end(): void {
    this.runAction(id => this.meetingApi.end(id));
  }

  submitAction(): void {
    const id = this.meetingId();
    const request = this.buildActionRequest();
    if (!id || !request || this.actionInFlight()) {
      return;
    }
    this.actionInFlight.set(true);
    this.actionSaveError.set(false);
    this.meetingApi.addAction(id, request).subscribe({
      next: action => {
        this.actionInFlight.set(false);
        this.actionAddedAnnouncement.set(action.label);
        this.actionLabel.set('');
        this.actionOwnerUserId.set('');
        this.actionDueDate.set('');
      },
      error: () => {
        this.actionInFlight.set(false);
        this.actionSaveError.set(true);
      },
    });
  }

  private buildActionRequest(): AddMeetingActionRequest | null {
    const label = this.actionLabel().trim();
    if (!label) {
      return null;
    }
    const ownerRaw = this.actionOwnerUserId().trim();
    const ownerUserId = ownerRaw ? Number(ownerRaw) : undefined;
    const dueDate = this.actionDueDate().trim();
    return {
      label,
      ...(ownerUserId !== undefined && !Number.isNaN(ownerUserId) ? { ownerUserId } : {}),
      ...(dueDate ? { dueDate } : {}),
    };
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

  private runAction(call: (meetingId: string) => Observable<void>): void {
    const id = this.meetingId();
    if (!id || this.actionInFlight()) {
      return;
    }
    this.actionInFlight.set(true);
    this.actionError.set(false);
    call(id).subscribe({
      next: () => {
        this.actionInFlight.set(false);
        this.load();
      },
      error: () => {
        this.actionInFlight.set(false);
        this.actionError.set(true);
      },
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
    if (event.type === 'TIMER_TICK') {
      this.timer.update({ elapsedSeconds: event.elapsedSeconds, remainingSeconds: event.remainingSeconds });
      this.checkOvertimeTransition(event.overtimeSeconds > 0, event.overtimeSeconds);
      return;
    }
    this.load();
  }
}
