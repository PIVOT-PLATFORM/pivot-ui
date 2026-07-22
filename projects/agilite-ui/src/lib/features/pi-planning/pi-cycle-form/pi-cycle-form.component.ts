import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { CreatePiCycleRequest } from '../models/pi-planning.model';
import { extractErrorCode } from '../services/pi-error.util';
import { PiCycleApiService } from '../services/pi-cycle-api.service';

/** Defaults applied server-side when omitted (US50.1.1 AC) — mirrored here for the form's initial values. */
const DEFAULT_ITERATION_COUNT = 5;
const DEFAULT_ITERATION_WEEKS = 2;

const MIN_ITERATION_COUNT = 1;
const MAX_ITERATION_COUNT = 12;
const MIN_ITERATION_WEEKS = 1;
const MAX_ITERATION_WEEKS = 6;

/**
 * Creates a new PI cycle (US50.1.1) — name, optional ART name, start date, and the two
 * iteration-generation parameters. Iterations themselves (`IT1`…`ITn` + `"IP Sprint"`) are
 * generated entirely server-side, purely from these parameters (Gate 1 architecture decision:
 * decoupled from Capacity Planning, not delivered until Sprint 21 — see US50.1.1 AC).
 */
@Component({
  selector: 'app-pi-cycle-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './pi-cycle-form.component.html',
  styleUrl: './pi-cycle-form.component.scss',
})
export class PiCycleFormComponent {
  private readonly router = inject(Router);
  private readonly piCycleApi = inject(PiCycleApiService);

  readonly name = signal('');
  readonly artName = signal('');
  readonly startDate = signal('');
  readonly iterationCount = signal(DEFAULT_ITERATION_COUNT);
  readonly iterationWeeks = signal(DEFAULT_ITERATION_WEEKS);
  readonly saving = signal(false);
  readonly saveNetworkError = signal(false);
  readonly fieldErrorCode = signal<string | null>(null);

  readonly canSave = computed(
    () => this.name().trim().length > 0 && this.startDate().trim().length > 0 && !this.saving(),
  );

  /** Updates the cycle name from the name input. */
  onNameInput(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
  }

  /** Updates the ART name from the ART name input. */
  onArtNameInput(event: Event): void {
    this.artName.set((event.target as HTMLInputElement).value);
  }

  /** Updates the start date from the date input. */
  onStartDateInput(event: Event): void {
    this.startDate.set((event.target as HTMLInputElement).value);
  }

  /** Updates the iteration count, clamped to [1, 12]. */
  onIterationCountInput(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    const clamped = Math.min(MAX_ITERATION_COUNT, Math.max(MIN_ITERATION_COUNT, Math.round(raw) || DEFAULT_ITERATION_COUNT));
    this.iterationCount.set(clamped);
  }

  /** Updates the iteration length in weeks, clamped to [1, 6]. */
  onIterationWeeksInput(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    const clamped = Math.min(MAX_ITERATION_WEEKS, Math.max(MIN_ITERATION_WEEKS, Math.round(raw) || DEFAULT_ITERATION_WEEKS));
    this.iterationWeeks.set(clamped);
  }

  /** Submits the cycle creation request. */
  save(): void {
    if (!this.canSave()) {
      return;
    }
    this.saving.set(true);
    this.fieldErrorCode.set(null);
    this.saveNetworkError.set(false);

    const request: CreatePiCycleRequest = {
      name: this.name().trim(),
      startDate: this.startDate(),
      iterationCount: this.iterationCount(),
      iterationWeeks: this.iterationWeeks(),
    };
    const trimmedArtName = this.artName().trim();
    if (trimmedArtName.length > 0) {
      request.artName = trimmedArtName;
    }

    this.piCycleApi.createCycle(request).subscribe({
      next: created => {
        this.saving.set(false);
        this.router.navigate(['/pi', created.id]);
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
