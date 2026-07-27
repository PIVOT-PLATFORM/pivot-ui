import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  AgendaItemType,
  CreateMeetingRequest,
  MeetingProblemDetailResponse,
  MeetingResponse,
} from '../models/meeting.model';
import { MeetingApiService } from '../services/meeting-api.service';

const MAX_TITLE_LENGTH = 200;
const MAX_FACILITATOR_LENGTH = 200;
const MIN_TOTAL_DURATION_MINUTES = 1;
const MAX_TOTAL_DURATION_MINUTES = 1440;

/** The three selectable agenda item types, in display order (US12.1.1 AC2). */
const AGENDA_ITEM_TYPES: AgendaItemType[] = ['INFO', 'DISCUSSION', 'DECISION'];

let nextDraftKey = 0;

/**
 * A single agenda item row being edited client-side, before submission. `key` is a stable,
 * client-only identity (never sent to the backend) used as the `@for` track expression so
 * reordering (`moveUp`/`moveDown`) moves the right DOM node/input state rather than relying on
 * array index, which would otherwise shift focus unpredictably across a reorder.
 */
interface AgendaItemDraft {
  readonly key: number;
  title: string;
  durationMinutes: number | null;
  type: AgendaItemType;
  facilitator: string;
}

function newDraft(): AgendaItemDraft {
  return { key: nextDraftKey++, title: '', durationMinutes: null, type: 'INFO', facilitator: '' };
}

/**
 * Creates a new MeetOps meeting with a structured agenda (US12.1.1 AC1/AC2). No edit mode and no
 * detail/view route — per the AC's "Hors périmètre", this US only covers creation; a successful
 * creation is confirmed inline on this same page (including the AC3 duration-mismatch warning,
 * AC10) rather than navigating to a non-existent detail view.
 *
 * `teamId` is intentionally not exposed as a form field — AC10's explicit list of fields
 * requiring a `<label>` (title, date/time, total duration; per item: title, duration, type,
 * facilitator) does not include it, and no team-listing endpoint exists yet for this module.
 */
@Component({
  selector: 'app-meeting-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './meeting-form.component.html',
  styleUrl: './meeting-form.component.scss',
})
export class MeetingFormComponent {
  private readonly meetingApi = inject(MeetingApiService);

  readonly types = AGENDA_ITEM_TYPES;

  readonly title = signal('');
  readonly scheduledAt = signal('');
  readonly totalDurationMinutes = signal<number | null>(null);
  readonly agendaItems = signal<AgendaItemDraft[]>([]);

  readonly saving = signal(false);
  readonly fieldErrorCode = signal<string | null>(null);
  readonly saveNetworkError = signal(false);
  readonly moduleDisabled = signal(false);
  readonly created = signal<MeetingResponse | null>(null);

  private readonly titleValid = computed(() => {
    const trimmed = this.title().trim();
    return trimmed.length > 0 && trimmed.length <= MAX_TITLE_LENGTH;
  });

  private readonly scheduledAtValid = computed(() => this.scheduledAt().trim().length > 0);

  private readonly totalDurationValid = computed(() => {
    const value = this.totalDurationMinutes();
    return value !== null && value >= MIN_TOTAL_DURATION_MINUTES && value <= MAX_TOTAL_DURATION_MINUTES;
  });

  private readonly agendaItemsValid = computed(() =>
    this.agendaItems().every(
      item =>
        item.title.trim().length > 0 &&
        item.title.trim().length <= MAX_TITLE_LENGTH &&
        item.durationMinutes !== null &&
        item.durationMinutes > 0 &&
        item.facilitator.trim().length <= MAX_FACILITATOR_LENGTH,
    ),
  );

  readonly canSave = computed(
    () =>
      this.titleValid() &&
      this.scheduledAtValid() &&
      this.totalDurationValid() &&
      this.agendaItemsValid() &&
      !this.saving(),
  );

  /** Updates the title from the title input. */
  onTitleInput(event: Event): void {
    this.title.set((event.target as HTMLInputElement).value);
  }

  /** Updates the scheduled date/time from the `datetime-local` input's raw value. */
  onScheduledAtInput(event: Event): void {
    this.scheduledAt.set((event.target as HTMLInputElement).value);
  }

  /** Updates the total planned duration from the number input. */
  onTotalDurationInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.totalDurationMinutes.set(raw === '' ? null : Number(raw));
  }

  /** Appends a new, empty agenda item row at the end of the agenda. */
  addAgendaItem(): void {
    this.agendaItems.update(items => [...items, newDraft()]);
  }

  /** Removes an agenda item row by its client-side key. */
  removeAgendaItem(key: number): void {
    this.agendaItems.update(items => items.filter(item => item.key !== key));
  }

  /** Updates an agenda item's title. */
  updateItemTitle(key: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.agendaItems.update(items => items.map(item => (item.key === key ? { ...item, title: value } : item)));
  }

  /** Updates an agenda item's duration in minutes. */
  updateItemDuration(key: number, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const value = raw === '' ? null : Number(raw);
    this.agendaItems.update(items =>
      items.map(item => (item.key === key ? { ...item, durationMinutes: value } : item)),
    );
  }

  /** Updates an agenda item's category. */
  updateItemType(key: number, event: Event): void {
    const value = (event.target as HTMLSelectElement).value as AgendaItemType;
    this.agendaItems.update(items => items.map(item => (item.key === key ? { ...item, type: value } : item)));
  }

  /** Updates an agenda item's optional facilitator display name. */
  updateItemFacilitator(key: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.agendaItems.update(items =>
      items.map(item => (item.key === key ? { ...item, facilitator: value } : item)),
    );
  }

  /** Moves an agenda item one position earlier in the display order (keyboard-accessible, AC10). */
  moveUp(index: number): void {
    if (index <= 0) {
      return;
    }
    this.agendaItems.update(items => {
      const next = [...items];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  /** Moves an agenda item one position later in the display order (keyboard-accessible, AC10). */
  moveDown(index: number): void {
    this.agendaItems.update(items => {
      if (index >= items.length - 1) {
        return items;
      }
      const next = [...items];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  /** Submits the meeting creation request. */
  save(): void {
    if (!this.canSave()) {
      return;
    }
    this.saving.set(true);
    this.fieldErrorCode.set(null);
    this.saveNetworkError.set(false);
    this.moduleDisabled.set(false);

    const request: CreateMeetingRequest = {
      title: this.title().trim(),
      scheduledAt: new Date(this.scheduledAt()).toISOString(),
      totalDurationMinutes: this.totalDurationMinutes() as number,
      agendaItems: this.agendaItems().map(item => ({
        title: item.title.trim(),
        durationMinutes: item.durationMinutes as number,
        type: item.type,
        ...(item.facilitator.trim().length > 0 ? { facilitator: item.facilitator.trim() } : {}),
      })),
    };

    this.meetingApi.createMeeting(request).subscribe({
      next: response => {
        this.saving.set(false);
        this.created.set(response);
        this.title.set('');
        this.scheduledAt.set('');
        this.totalDurationMinutes.set(null);
        this.agendaItems.set([]);
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        if (error.status === 403) {
          this.moduleDisabled.set(true);
          return;
        }
        const body = error.error as MeetingProblemDetailResponse | null;
        if (body?.code) {
          this.fieldErrorCode.set(body.code);
        } else {
          this.saveNetworkError.set(true);
        }
      },
    });
  }

  /** Dismisses the post-creation confirmation banner, returning to a blank form. */
  dismissConfirmation(): void {
    this.created.set(null);
  }
}
