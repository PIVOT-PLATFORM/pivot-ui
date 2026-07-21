import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { CapacityHistoryPoint, VelocityForecast } from '../../models/capacity.model';
import { CapacityApiService } from '../../services/capacity-api.service';

/**
 * Velocity tab (F11 capacity detail) — upserts this sprint's velocity snapshot
 * (`upsertVelocity`) and shows the team's recent history + rolling forecast (`getHistory`).
 */
@Component({
  selector: 'app-capacity-velocity-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslocoPipe],
  templateUrl: './velocity-panel.component.html',
  styleUrl: './velocity-panel.component.scss',
})
export class VelocityPanelComponent implements OnInit {
  private readonly capacityApi = inject(CapacityApiService);
  private readonly formBuilder = inject(FormBuilder);

  /** The sprint event's id whose velocity is being recorded. */
  readonly eventId = input.required<string>();

  /** Emits after a successful upsert so the parent can refresh the summary. */
  readonly changed = output<void>();

  /** The team's recent velocity history for this sprint's context. */
  readonly history = signal<readonly CapacityHistoryPoint[]>([]);

  /** The rolling-window forecast derived from {@link history}, or `null`. */
  readonly forecast = signal<VelocityForecast | null>(null);

  /** `true` if the history/forecast failed to load. */
  readonly historyLoadError = signal(false);

  /** `true` while the upsert request is in flight. */
  readonly submitting = signal(false);

  /** `true` after a successful upsert, until the next submission starts. */
  readonly saveSuccess = signal(false);

  /** `true` if the last upsert attempt failed. */
  readonly saveError = signal(false);

  readonly form = this.formBuilder.nonNullable.group({
    pointsEngages: [0, [Validators.required, Validators.min(0)]],
    pointsLivres: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.loadHistory();
  }

  /** (Re)loads the velocity history and forecast. */
  loadHistory(): void {
    this.historyLoadError.set(false);
    this.capacityApi.getHistory(this.eventId()).subscribe({
      next: (response) => {
        this.history.set(response.history);
        this.forecast.set(response.forecast);
      },
      error: () => this.historyLoadError.set(true),
    });
  }

  /** Submits the velocity form, then refreshes the history so the new snapshot is reflected. */
  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.saveSuccess.set(false);
    this.saveError.set(false);

    this.capacityApi.upsertVelocity(this.eventId(), this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.saveSuccess.set(true);
        this.loadHistory();
        this.changed.emit();
      },
      error: () => {
        this.submitting.set(false);
        this.saveError.set(true);
      },
    });
  }
}
