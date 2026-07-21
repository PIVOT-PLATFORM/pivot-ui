import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { KpiResponse } from '../models/capacity.model';
import { CapacityApiService } from '../services/capacity-api.service';

/** One of the five team-aggregate capacity KPIs, mapping the backend's snake_case key to its i18n label key. */
interface KpiCardDef {
  readonly backendKey: string;
  readonly i18nKey: string;
}

/**
 * The five E11 capacity KPIs (F11.6 — team-aggregate only, never member-scoped, RGPD posture),
 * as returned in {@link KpiResponse.kpis}.
 */
const KPI_DEFS: readonly KpiCardDef[] = [
  { backendKey: 'taux_utilisation', i18nKey: 'tauxUtilisation' },
  { backendKey: 'capacite_nette', i18nKey: 'capaciteNette' },
  { backendKey: 'velocite_moyenne', i18nKey: 'velociteMoyenne' },
  { backendKey: 'taux_absence', i18nKey: 'tauxAbsence' },
  { backendKey: 'depassements', i18nKey: 'depassements' },
];

/**
 * Renders the five team-aggregate capacity KPIs (F11.6) as cards, anchored on one capacity event
 * of the team (`GET /kpi?eventId=...` reports the whole team, any of its events works as anchor).
 *
 * Embedded in {@link CapacityListComponent}; reloads whenever `eventId` changes.
 */
@Component({
  selector: 'app-capacity-kpi',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslocoPipe],
  template: `
    @if (eventId() !== null) {
      <section class="capacity-kpi">
        <h2>{{ 'capacity.kpi.title' | transloco }}</h2>

        @if (loadError()) {
          <div role="alert">
            <p>{{ 'capacity.kpi.loadError' | transloco }}</p>
            <button type="button" (click)="load()">{{ 'capacity.list.retry' | transloco }}</button>
          </div>
        } @else if (kpis() === null) {
          <p>{{ 'capacity.common.loading' | transloco }}</p>
        } @else if (kpiEntries().length === 0) {
          <p>{{ 'capacity.kpi.empty' | transloco }}</p>
        } @else {
          <ul class="capacity-kpi__cards">
            @for (entry of kpiEntries(); track entry.def.backendKey) {
              <li class="capacity-kpi__card">
                <span class="capacity-kpi__label">{{ 'capacity.kpi.' + entry.def.i18nKey | transloco }}</span>
                <span class="capacity-kpi__value">{{ entry.value }}</span>
              </li>
            }
          </ul>
        }
      </section>
    }
  `,
  styleUrl: './capacity-kpi.component.scss',
})
export class CapacityKpiComponent {
  private readonly capacityApi = inject(CapacityApiService);

  /** The anchor event id whose team's KPIs are reported, or `null` while none is selected. */
  readonly eventId = input<string | null>(null);

  /** The last successfully loaded KPI response, or `null` before the first load completes. */
  readonly kpis = signal<KpiResponse | null>(null);

  /** `true` if the last KPI fetch failed. */
  readonly loadError = signal(false);

  /** The KPI defs paired with their loaded value, in display order, skipping any missing key. */
  readonly kpiEntries = signal<{ def: KpiCardDef; value: number }[]>([]);

  constructor() {
    effect(() => {
      const id = this.eventId();
      this.kpis.set(null);
      this.loadError.set(false);
      this.kpiEntries.set([]);
      if (id !== null) {
        this.load();
      }
    });
  }

  /** (Re)loads the KPIs for the current {@link eventId}. */
  load(): void {
    const id = this.eventId();
    if (id === null) {
      return;
    }
    this.loadError.set(false);
    this.capacityApi.getKpis(id).subscribe({
      next: (response) => {
        this.kpis.set(response);
        this.kpiEntries.set(
          KPI_DEFS.filter((def) => response.kpis[def.backendKey] !== undefined).map((def) => ({
            def,
            value: response.kpis[def.backendKey],
          })),
        );
      },
      error: () => this.loadError.set(true),
    });
  }
}
