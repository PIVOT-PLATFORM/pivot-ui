import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Subscription } from 'rxjs';
import { MeetingBookingResponse, MeetingProblemDetailResponse } from '../models/meeting.model';
import { MeetingApiService } from '../services/meeting-api.service';
import { MeetingWsService } from '../services/meeting-ws.service';

/**
 * Organizer-facing screen to validate a booking-flow meeting's best-slot proposal (US12.4.1
 * "Validation humaine" / "A11y validation").
 *
 * The proposed slots are exposed as an ARIA `listbox`/`option` single-selection widget (US12.4.1
 * A11y AC — "rôle radiogroup ou listbox" with `aria-selected`): arrow-key navigation moves both
 * focus and selection (roving tabindex, standard single-select listbox pattern), the recommended
 * (`rank === 1`) slot is pre-selected on load, and the **Validate** button confirms whichever slot
 * is currently selected — a proposed one as-is, or the organizer's own manual adjustment (a
 * synthetic candidate injected into the same listbox). Real-time pushes on `/topic/collaboratif/
 * meeting/{id}` are announced through a polite `aria-live` region rather than silently
 * re-rendering the list from under a keyboard user's focus.
 *
 * Read-only once `CONFIRMED`: the listbox/adjustment form are replaced by a confirmation message,
 * matching the backend's own guard (a second confirm attempt is rejected `409`).
 */
@Component({
  selector: 'app-meeting-validation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './meeting-validation.component.html',
  styleUrl: './meeting-validation.component.scss',
})
export class MeetingValidationComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(MeetingApiService);
  private readonly ws = inject(MeetingWsService);
  private readonly transloco = inject(TranslocoService);

  readonly meeting = signal<MeetingBookingResponse | null>(null);
  readonly loadError = signal(false);
  readonly selectedSlotId = signal<string | null>(null);

  readonly confirming = signal(false);
  readonly confirmError = signal<string | null>(null);

  readonly adjusting = signal(false);
  readonly adjustStart = signal('');
  readonly adjustEnd = signal('');
  readonly adjustSaving = signal(false);
  readonly adjustError = signal<string | null>(null);

  /** Polite announcement for real-time pushes and action outcomes (US12.4.1 A11y AC). */
  readonly liveMessage = signal('');

  private wsSub: Subscription | null = null;
  private wsConnected = false;
  private meetingId: string | null = null;

  readonly slots = computed(() => this.meeting()?.proposedSlots ?? []);
  readonly isPreReserved = computed(() => this.meeting()?.status === 'PRE_RESERVED');
  readonly isConfirmed = computed(() => this.meeting()?.status === 'CONFIRMED');
  readonly connectionStatus = computed(() => this.ws.status());

  constructor() {
    // Announce connection-state changes so a screen-reader user knows the live feed is degraded,
    // rather than silently going stale (US12.4.1 A11y AC — aria-live for real-time changes).
    effect(() => {
      const status = this.connectionStatus();
      if (!this.wsConnected) {
        return;
      }
      if (status === 'error') {
        this.liveMessage.set(this.transloco.translate('meeting.validation.connectionStatus.error'));
      } else if (status === 'connected') {
        this.liveMessage.set(this.transloco.translate('meeting.validation.connectionStatus.connected'));
      }
    });
  }

  ngOnInit(): void {
    const meetingId = this.route.snapshot.paramMap.get('meetingId');
    if (!meetingId) {
      this.loadError.set(true);
      return;
    }
    this.meetingId = meetingId;
    this.api.getMeeting(meetingId).subscribe({
      next: meeting => {
        this.meeting.set(meeting);
        this.selectedSlotId.set(this.recommendedSlotId(meeting));
        if (meeting.status === 'PRE_RESERVED') {
          this.ws.connect(meetingId);
          this.wsConnected = true;
          this.wsSub = this.ws.messages$.subscribe(body => this.onMessage(body));
        }
      },
      error: () => this.loadError.set(true),
    });
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    if (this.wsConnected) {
      this.ws.disconnect();
    }
  }

  /** Handles arrow-key/Home/End navigation within the proposed-slots listbox (roving tabindex). */
  onListboxKeydown(event: KeyboardEvent): void {
    const slots = this.slots();
    if (slots.length === 0) {
      return;
    }
    const currentIndex = Math.max(
      0,
      slots.findIndex(slot => slot.id === this.selectedSlotId()),
    );
    let nextIndex: number | null = null;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        nextIndex = Math.min(currentIndex + 1, slots.length - 1);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        nextIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = slots.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.selectSlot(slots[nextIndex].id);
    this.focusOption(slots[nextIndex].id);
  }

  /** Selects a proposed slot by id (click or keyboard navigation). */
  selectSlot(slotId: string): void {
    this.selectedSlotId.set(slotId);
  }

  /** Whether a given slot id is the roving-tabindex focus stop (`tabindex="0"`). */
  isTabStop(slotId: string): boolean {
    const selected = this.selectedSlotId();
    if (selected) {
      return selected === slotId;
    }
    return this.slots()[0]?.id === slotId;
  }

  /** Confirms the currently selected slot (US12.4.1 "Confirmation → CONFIRMED + bus"). */
  confirm(): void {
    const meeting = this.meeting();
    const slotId = this.selectedSlotId();
    if (!meeting || !slotId || this.confirming()) {
      return;
    }
    this.confirming.set(true);
    this.confirmError.set(null);

    this.api.confirmSlot(meeting.id, { slotId }).subscribe({
      next: updated => {
        this.confirming.set(false);
        this.meeting.set(updated);
        this.liveMessage.set(this.transloco.translate('meeting.validation.confirmed'));
        this.wsSub?.unsubscribe();
        if (this.wsConnected) {
          this.ws.disconnect();
          this.wsConnected = false;
        }
      },
      error: (error: HttpErrorResponse) => {
        this.confirming.set(false);
        this.confirmError.set(this.mapErrorCode(error));
      },
    });
  }

  /** Opens the manual-adjustment form, seeded from the currently selected slot's boundaries. */
  openAdjust(): void {
    const slot = this.slots().find(s => s.id === this.selectedSlotId());
    if (!slot) {
      return;
    }
    this.adjustStart.set(toDatetimeLocal(slot.start));
    this.adjustEnd.set(toDatetimeLocal(slot.end));
    this.adjustError.set(null);
    this.adjusting.set(true);
  }

  /** Cancels the manual-adjustment form without saving. */
  cancelAdjust(): void {
    this.adjusting.set(false);
    this.adjustError.set(null);
  }

  /** Updates the manual-adjustment start field. */
  onAdjustStartInput(event: Event): void {
    this.adjustStart.set((event.target as HTMLInputElement).value);
  }

  /** Updates the manual-adjustment end field. */
  onAdjustEndInput(event: Event): void {
    this.adjustEnd.set((event.target as HTMLInputElement).value);
  }

  /** Saves the manual adjustment for the currently selected slot. */
  saveAdjust(): void {
    const meeting = this.meeting();
    const slotId = this.selectedSlotId();
    if (!meeting || !slotId || this.adjustSaving()) {
      return;
    }
    const start = this.adjustStart();
    const end = this.adjustEnd();
    if (!start || !end) {
      return;
    }
    this.adjustSaving.set(true);
    this.adjustError.set(null);

    this.api
      .adjustSlot(meeting.id, { slotId, start: new Date(start).toISOString(), end: new Date(end).toISOString() })
      .subscribe({
        next: updated => {
          this.adjustSaving.set(false);
          this.adjusting.set(false);
          this.meeting.set(updated);
          this.selectedSlotId.set(slotId);
          this.liveMessage.set(this.transloco.translate('meeting.validation.adjusted'));
        },
        error: (error: HttpErrorResponse) => {
          this.adjustSaving.set(false);
          this.adjustError.set(this.mapErrorCode(error));
        },
      });
  }

  /**
   * Maps an HTTP error to a translation-key-safe error code. Only {@link
   * MeetingConflictException}-backed responses (409, double confirmation) carry a machine-readable
   * `code` in the problem-detail body — 403/404/422 (organizer/tenant/slot-validity guards) do
   * not, so this falls back to the HTTP status for those (US12.4.1 security ACs).
   */
  private mapErrorCode(error: HttpErrorResponse): string {
    const body = error.error as MeetingProblemDetailResponse | null;
    if (body?.code) {
      return body.code;
    }
    switch (error.status) {
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 422:
        return 'SLOT_INVALID';
      default:
        return 'NETWORK_ERROR';
    }
  }

  private recommendedSlotId(meeting: MeetingBookingResponse): string | null {
    const recommended = meeting.proposedSlots.find(slot => slot.recommended);
    return recommended?.id ?? meeting.proposedSlots[0]?.id ?? null;
  }

  private onMessage(body: string): void {
    let updated: MeetingBookingResponse;
    try {
      updated = JSON.parse(body) as MeetingBookingResponse;
    } catch {
      return;
    }
    const previousSelection = this.selectedSlotId();
    this.meeting.set(updated);
    // Keep the organizer's current selection if that slot still exists after the push; otherwise
    // fall back to the (possibly new) recommended slot — never silently drop the selection.
    const stillExists = updated.proposedSlots.some(slot => slot.id === previousSelection);
    this.selectedSlotId.set(stillExists ? previousSelection : this.recommendedSlotId(updated));
    this.liveMessage.set(this.transloco.translate('meeting.validation.liveUpdate'));
  }

  private focusOption(slotId: string): void {
    queueMicrotask(() => {
      document.getElementById(`meeting-slot-${slotId}`)?.focus();
    });
  }
}

/** Converts an ISO-8601 instant to the `datetime-local` input's local-time value shape. */
function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
