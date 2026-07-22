import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CapacityHolidayResponse } from '../models/capacity.model';
import { extractErrorCode } from '../services/capacity-error.util';
import { CapacityApiService } from '../services/capacity-api.service';

/**
 * Tenant-admin screen for the tenant's holiday list (US11.6.1) — a minimal, manually-maintained
 * substitute for `EN22.3` (E22 Roadmap's multi-locale calendar sync), which was permanently
 * extracted to the separate Pilotage product and can never be delivered inside PIVOT (see
 * US11.6.1 §Architecture). Holidays listed here are excluded from working-day counts alongside
 * weekends, tenant-wide — no per-member/per-locale calendar.
 *
 * Tenant-admin only: the backend returns 403 (not the team-scoped 404 anti-enumeration convention
 * used everywhere else in this module) for a non-admin caller — this component surfaces that
 * gracefully rather than gating navigation with a client-side route guard, consistent with this
 * repo's security rule that authorization is exclusively the backend's responsibility.
 */
@Component({
  selector: 'app-capacity-holidays',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './capacity-holidays.component.html',
  styleUrl: './capacity-holidays.component.scss',
})
export class CapacityHolidaysComponent implements OnInit {
  private readonly capacityApi = inject(CapacityApiService);

  readonly holidays = signal<CapacityHolidayResponse[]>([]);
  readonly loadError = signal(false);
  readonly forbidden = signal(false);

  readonly dateDraft = signal('');
  readonly labelDraft = signal('');
  readonly saving = signal(false);
  readonly fieldErrorCode = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  /** (Re)loads the tenant's holidays. */
  load(): void {
    this.loadError.set(false);
    this.forbidden.set(false);
    this.capacityApi.listHolidays().subscribe({
      next: holidays => this.holidays.set(holidays),
      error: (error: HttpErrorResponse) => {
        if (error.status === 403) {
          this.forbidden.set(true);
        } else {
          this.loadError.set(true);
        }
      },
    });
  }

  /** Updates the new-holiday date draft. */
  onDateInput(event: Event): void {
    this.dateDraft.set((event.target as HTMLInputElement).value);
  }

  /** Updates the new-holiday label draft. */
  onLabelInput(event: Event): void {
    this.labelDraft.set((event.target as HTMLInputElement).value);
  }

  /** Submits the new-holiday form. */
  addHoliday(): void {
    const date = this.dateDraft();
    const label = this.labelDraft().trim();
    if (!date || label === '') {
      return;
    }
    this.saving.set(true);
    this.fieldErrorCode.set(null);
    this.capacityApi.createHoliday({ date, label }).subscribe({
      next: () => {
        this.saving.set(false);
        this.dateDraft.set('');
        this.labelDraft.set('');
        this.load();
      },
      error: error => {
        this.saving.set(false);
        const code = extractErrorCode(error);
        this.fieldErrorCode.set(code ?? 'GENERIC');
      },
    });
  }

  /** Deletes a holiday. */
  deleteHoliday(holidayId: string): void {
    this.capacityApi.deleteHoliday(holidayId).subscribe({
      next: () => this.load(),
      error: () => undefined,
    });
  }
}
