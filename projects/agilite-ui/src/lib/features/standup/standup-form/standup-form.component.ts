import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { CreateStandupSessionRequest, TeamMemberResponse } from '../models/standup.model';
import { extractErrorCode } from '../services/standup-error.util';
import { StandupApiService } from '../services/standup-api.service';

/** Default speaking time per participant when the field is left untouched (US10.1.1 AC). */
const DEFAULT_TIME_PER_PERSON_SECONDS = 120;

const MIN_TIME_PER_PERSON_SECONDS = 30;
const MAX_TIME_PER_PERSON_SECONDS = 1800;

/**
 * A team member selected for the new session's speaking rotation, kept in submission order.
 * `selectedOrder` is the index used for up/down reordering — the array position itself already
 * encodes the order, this field exists only for a stable `track` key across reorders.
 */
interface SelectedParticipant {
  readonly teamMemberId: number;
  readonly displayName: string;
}

/**
 * Creates a new daily standup session (US10.1.1). No edit mode — per the AC's "Hors périmètre",
 * an existing session cannot be modified; delete and recreate instead.
 *
 * The participant order shown in the picker is the exact speaking rotation order sent to the
 * backend — never randomized server-side (US10.1.1 AC). This form lets the caller shuffle or
 * manually reorder the picked participants client-side before submitting.
 */
@Component({
  selector: 'app-standup-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './standup-form.component.html',
  styleUrl: './standup-form.component.scss',
})
export class StandupFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly standupApi = inject(StandupApiService);

  private readonly teamId: number | null;

  readonly name = signal('');
  readonly timePerPersonSeconds = signal(DEFAULT_TIME_PER_PERSON_SECONDS);
  readonly teamMembers = signal<TeamMemberResponse[]>([]);
  readonly selected = signal<SelectedParticipant[]>([]);
  readonly saving = signal(false);
  readonly loadError = signal(false);
  readonly saveNetworkError = signal(false);
  readonly fieldErrorCode = signal<string | null>(null);

  /** Members not yet added to the speaking rotation — feeds the checklist's unchecked state. */
  readonly availableMembers = computed(() => {
    const selectedIds = new Set(this.selected().map(p => p.teamMemberId));
    return this.teamMembers().filter(member => !selectedIds.has(member.id));
  });

  readonly canSave = computed(
    () => this.name().trim().length > 0 && this.selected().length > 0 && !this.saving(),
  );

  constructor() {
    const teamIdParam = this.route.snapshot.queryParamMap.get('teamId');
    this.teamId = teamIdParam !== null ? Number(teamIdParam) : null;
  }

  ngOnInit(): void {
    if (this.teamId === null) {
      this.loadError.set(true);
      return;
    }
    this.standupApi.listTeamMembers(this.teamId).subscribe({
      next: members => this.teamMembers.set(members),
      error: () => this.loadError.set(true),
    });
  }

  /** Updates the session name from the name input. */
  onNameInput(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
  }

  /** Updates the per-person time, clamped to [30, 1800] seconds. */
  onTimeInput(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    const clamped = Math.min(MAX_TIME_PER_PERSON_SECONDS, Math.max(MIN_TIME_PER_PERSON_SECONDS, Math.round(raw) || DEFAULT_TIME_PER_PERSON_SECONDS));
    this.timePerPersonSeconds.set(clamped);
  }

  /** Toggles a team member's participation — checked adds at the end of the rotation, unchecked removes. */
  onMemberToggle(member: TeamMemberResponse, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selected.update(list => [...list, { teamMemberId: member.id, displayName: member.displayName }]);
    } else {
      this.selected.update(list => list.filter(p => p.teamMemberId !== member.id));
    }
  }

  /** Moves a selected participant one position earlier in the speaking order. */
  moveUp(index: number): void {
    if (index <= 0) {
      return;
    }
    this.selected.update(list => {
      const next = [...list];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  /** Moves a selected participant one position later in the speaking order. */
  moveDown(index: number): void {
    this.selected.update(list => {
      if (index >= list.length - 1) {
        return list;
      }
      const next = [...list];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  /** Randomizes the speaking order of the currently selected participants (client-side only). */
  shuffle(): void {
    this.selected.update(list => {
      const shuffled = [...list];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }

  /** Submits the session creation request. */
  save(): void {
    if (!this.canSave() || this.teamId === null) {
      return;
    }
    this.saving.set(true);
    this.fieldErrorCode.set(null);
    this.saveNetworkError.set(false);

    const request: CreateStandupSessionRequest = {
      teamId: this.teamId,
      name: this.name().trim(),
      timePerPersonSeconds: this.timePerPersonSeconds(),
      participantTeamMemberIds: this.selected().map(p => p.teamMemberId),
    };

    this.standupApi.createSession(request).subscribe({
      next: created => {
        this.saving.set(false);
        this.router.navigate(['/standup/sessions', created.id]);
      },
      error: error => {
        this.saving.set(false);
        const code = extractErrorCode(error);
        if (code) {
          this.fieldErrorCode.set(code);
        } else {
          this.saveNetworkError.set(true);
        }
      },
    });
  }
}
