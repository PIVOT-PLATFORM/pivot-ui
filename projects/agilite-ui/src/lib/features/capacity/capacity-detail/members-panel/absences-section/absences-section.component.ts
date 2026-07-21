import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { CapacityAbsenceResponse } from '../../../models/capacity.model';
import { CapacityApiService } from '../../../services/capacity-api.service';
import { resolveCapacityErrorKey } from '../../capacity-error.util';

/** Backend `code` values this section has a dedicated translation for (`capacity.absences.errors`). */
const KNOWN_ABSENCE_ERROR_CODES = ['INVALID_DATE_RANGE', 'ABSENCE_OUT_OF_RANGE', 'INVALID_FRACTION'] as const;

/**
 * Absence management for one selected capacity event member (F11 tab "Membres" sub-section) —
 * add/remove absences (`addAbsence`/`deleteAbsence`).
 *
 * **Known API gap:** the foundation exposes no "list absences" endpoint, only add/delete. This
 * section therefore keeps absences it has itself added/removed **for the lifetime of this
 * component instance**, keyed by member id so switching between members doesn't lose what was
 * just entered — it cannot recover absences that already existed server-side before this page
 * was opened. See the task report for this gap.
 */
@Component({
  selector: 'app-capacity-absences-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslocoPipe],
  templateUrl: './absences-section.component.html',
  styleUrl: './absences-section.component.scss',
})
export class AbsencesSectionComponent {
  private readonly capacityApi = inject(CapacityApiService);
  private readonly formBuilder = inject(FormBuilder);

  /** The member these absences belong to. `null` when no member is selected. */
  readonly memberId = input<string | null>(null);

  /** Display name of the selected member, for the section heading. */
  readonly memberName = input<string | null>(null);

  /** Emits after a successful add/remove so the parent can refresh the summary. */
  readonly changed = output<void>();

  /** Absences known for each member seen so far this session (see class doc — no list endpoint). */
  private readonly absencesByMember = new Map<string, CapacityAbsenceResponse[]>();

  /** The currently selected member's absences (session-local). */
  readonly absences = signal<CapacityAbsenceResponse[]>([]);

  /** `true` while an add request is in flight. */
  readonly submitting = signal(false);

  /** i18n key of the current add-form error, or `null`. */
  readonly errorMessageKey = signal<string | null>(null);

  /** The absence pending remove confirmation, or `null`. */
  readonly pendingRemove = signal<CapacityAbsenceResponse | null>(null);

  /** i18n key of the last remove failure, or `null`. */
  readonly removeErrorKey = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    fraction: [1],
    source: [''],
  });

  constructor() {
    effect(() => {
      const memberId = this.memberId();
      this.pendingRemove.set(null);
      this.errorMessageKey.set(null);
      this.removeErrorKey.set(null);
      this.form.reset({ startDate: '', endDate: '', fraction: 1, source: '' });
      this.absences.set(memberId ? (this.absencesByMember.get(memberId) ?? []) : []);
    });
  }

  /** Submits the add-absence form for the currently selected member. */
  onSubmit(): void {
    const memberId = this.memberId();
    if (!memberId || this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessageKey.set(null);
    const { startDate, endDate, fraction, source } = this.form.getRawValue();
    const trimmedSource = source.trim();

    this.capacityApi
      .addAbsence(memberId, {
        startDate,
        endDate,
        fraction,
        ...(trimmedSource ? { source: trimmedSource } : {}),
      })
      .subscribe({
        next: (absence) => {
          this.submitting.set(false);
          this.addAbsenceLocally(memberId, absence);
          this.form.reset({ startDate: '', endDate: '', fraction: 1, source: '' });
          this.changed.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          this.errorMessageKey.set(
            resolveCapacityErrorKey(
              error,
              'capacity.absences.errors',
              KNOWN_ABSENCE_ERROR_CODES,
              'capacity.absences.saveError',
            ),
          );
        },
      });
  }

  /** Opens the remove-confirmation for an absence. */
  requestRemove(absence: CapacityAbsenceResponse): void {
    this.removeErrorKey.set(null);
    this.pendingRemove.set(absence);
  }

  /** Cancels the pending remove. */
  cancelRemove(): void {
    this.pendingRemove.set(null);
  }

  /** Confirms removal of the pending absence. */
  confirmRemove(): void {
    const memberId = this.memberId();
    const absence = this.pendingRemove();
    if (!memberId || !absence) {
      return;
    }
    this.capacityApi.deleteAbsence(absence.id).subscribe({
      next: () => {
        this.pendingRemove.set(null);
        this.removeAbsenceLocally(memberId, absence.id);
        this.changed.emit();
      },
      error: () => {
        this.pendingRemove.set(null);
        this.removeErrorKey.set('capacity.absences.removeError');
      },
    });
  }

  private addAbsenceLocally(memberId: string, absence: CapacityAbsenceResponse): void {
    const current = this.absencesByMember.get(memberId) ?? [];
    const updated = [...current, absence];
    this.absencesByMember.set(memberId, updated);
    this.absences.set(updated);
  }

  private removeAbsenceLocally(memberId: string, absenceId: string): void {
    const updated = (this.absencesByMember.get(memberId) ?? []).filter((a) => a.id !== absenceId);
    this.absencesByMember.set(memberId, updated);
    this.absences.set(updated);
  }
}
