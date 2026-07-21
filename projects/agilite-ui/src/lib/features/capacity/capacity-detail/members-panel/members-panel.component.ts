import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { CapacityMemberBreakdownResponse, CapacityMemberRequest } from '../../models/capacity.model';
import { CapacityApiService } from '../../services/capacity-api.service';
import { resolveCapacityErrorKey } from '../capacity-error.util';
import { AbsencesSectionComponent } from './absences-section/absences-section.component';

/** Backend `code` values this panel has a dedicated translation for (`capacity.members.errors`). */
const KNOWN_MEMBER_ERROR_CODES = ['INVALID_NAME', 'INVALID_QUOTITE', 'FOCUS_OUT_OF_RANGE'] as const;

/**
 * Members tab (F11 capacity detail) — lists the event's members, lets the caller add/edit/remove
 * one, and manages the absences of whichever member is currently selected ({@link AbsencesSectionComponent}).
 *
 * **Known API gap:** the foundation exposes no "list members" endpoint — the listing comes from
 * `CapacitySummaryResponse.members` (`CapacityMemberBreakdownResponse[]`, `getSummary`), which
 * carries `name`/`role`/`quotite`/`excluded` but not `focusFactor`/`locality`/`position`/
 * `teamMemberRef` (those only ever come back on an `addMember`/`updateMember` response). Editing a
 * pre-existing member therefore prefills only the fields the summary carries; the others start
 * blank and, since `updateMember` is a full replace, submitting the edit form will reset them to
 * their defaults unless the caller re-enters them. See the task report for this gap.
 */
@Component({
  selector: 'app-capacity-members-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslocoPipe, AbsencesSectionComponent],
  templateUrl: './members-panel.component.html',
  styleUrl: './members-panel.component.scss',
})
export class MembersPanelComponent {
  private readonly capacityApi = inject(CapacityApiService);
  private readonly formBuilder = inject(FormBuilder);

  /** The owning capacity event's id. */
  readonly eventId = input.required<string>();

  /** The current members breakdown, sourced from the parent's `getSummary` call. */
  readonly members = input<readonly CapacityMemberBreakdownResponse[]>([]);

  /** Emits after a successful add/update/remove so the parent can refresh the summary. */
  readonly changed = output<void>();

  /** The member currently selected for the absences sub-section, or `null`. */
  readonly selectedMemberId = signal<string | null>(null);

  /** Display name of the selected member, derived from {@link members}. */
  readonly selectedMemberName = computed(
    () => this.members().find((m) => m.memberId === this.selectedMemberId())?.name ?? null,
  );

  /** `true` while the add form is showing; `false` shows the "add member" button instead. */
  readonly addFormOpen = signal(false);

  /** The member id currently being edited, or `null`. */
  readonly editingMemberId = signal<string | null>(null);

  /** `true` while an add/update request is in flight. */
  readonly submitting = signal(false);

  /** i18n key of the current add/edit-form error, or `null`. */
  readonly errorMessageKey = signal<string | null>(null);

  /** The member pending remove confirmation, or `null`. */
  readonly pendingRemove = signal<CapacityMemberBreakdownResponse | null>(null);

  /** i18n key of the last remove failure, or `null`. */
  readonly removeErrorKey = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    role: [''],
    quotite: [1, [Validators.required, Validators.min(0.01), Validators.max(1)]],
    focusFactor: [null as number | null],
    locality: [''],
    excluded: [false],
    position: [null as number | null],
  });

  /** Selects a member for the absences sub-section. */
  selectMember(memberId: string): void {
    this.selectedMemberId.set(this.selectedMemberId() === memberId ? null : memberId);
  }

  /** Opens the add-member form. */
  openAddForm(): void {
    this.editingMemberId.set(null);
    this.errorMessageKey.set(null);
    this.form.reset({ name: '', role: '', quotite: 1, focusFactor: null, locality: '', excluded: false, position: null });
    this.addFormOpen.set(true);
  }

  /** Opens the edit form for a member, prefilled with the fields the summary breakdown carries. */
  openEditForm(member: CapacityMemberBreakdownResponse): void {
    this.addFormOpen.set(false);
    this.editingMemberId.set(member.memberId);
    this.errorMessageKey.set(null);
    this.form.reset({
      name: member.name,
      role: member.role ?? '',
      quotite: member.quotite,
      focusFactor: null,
      locality: '',
      excluded: member.excluded,
      position: null,
    });
  }

  /** Closes whichever form (add or edit) is open, discarding unsaved changes. */
  closeForm(): void {
    this.addFormOpen.set(false);
    this.editingMemberId.set(null);
    this.errorMessageKey.set(null);
  }

  /** Submits the add or edit form, depending on which is open. */
  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, role, quotite, focusFactor, locality, excluded, position } = this.form.getRawValue();
    const trimmedName = name.trim();
    const trimmedRole = role.trim();
    const trimmedLocality = locality.trim();
    const request: CapacityMemberRequest = {
      name: trimmedName,
      role: trimmedRole || null,
      quotite,
      focusFactor,
      locality: trimmedLocality || null,
      excluded,
      position,
    };

    this.submitting.set(true);
    this.errorMessageKey.set(null);

    const editingId = this.editingMemberId();
    const request$ = editingId
      ? this.capacityApi.updateMember(editingId, request)
      : this.capacityApi.addMember(this.eventId(), request);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.addFormOpen.set(false);
        this.editingMemberId.set(null);
        this.changed.emit();
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.errorMessageKey.set(
          resolveCapacityErrorKey(
            error,
            'capacity.members.errors',
            KNOWN_MEMBER_ERROR_CODES,
            'capacity.members.saveError',
          ),
        );
      },
    });
  }

  /** Opens the remove-confirmation for a member. */
  requestRemove(member: CapacityMemberBreakdownResponse, event: Event): void {
    event.stopPropagation();
    this.removeErrorKey.set(null);
    this.pendingRemove.set(member);
  }

  /** Cancels the pending remove. */
  cancelRemove(): void {
    this.pendingRemove.set(null);
  }

  /** Confirms removal of the pending member, cascading its absences server-side. */
  confirmRemove(): void {
    const member = this.pendingRemove();
    if (!member) {
      return;
    }
    this.capacityApi.deleteMember(member.memberId).subscribe({
      next: () => {
        this.pendingRemove.set(null);
        if (this.selectedMemberId() === member.memberId) {
          this.selectedMemberId.set(null);
        }
        this.changed.emit();
      },
      error: () => {
        this.pendingRemove.set(null);
        this.removeErrorKey.set('capacity.members.removeError');
      },
    });
  }
}
