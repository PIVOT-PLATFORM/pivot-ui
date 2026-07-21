import { ChangeDetectionStrategy, Component, ElementRef, OnInit, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { CapacityEventChildResponse, CapacityEventResponse, CapacitySummaryResponse } from '../models/capacity.model';
import { CapacityApiService } from '../services/capacity-api.service';
import { ToastService } from '../../wheels/services/toast.service';
import { BurndownPanelComponent } from './burndown-panel/burndown-panel.component';
import { MembersPanelComponent } from './members-panel/members-panel.component';
import { SummaryPanelComponent } from './summary-panel/summary-panel.component';
import { VelocityPanelComponent } from './velocity-panel/velocity-panel.component';

/** The detail page's tabs (`capacity.detail.tabs.*`). */
type CapacityDetailTab = 'overview' | 'members' | 'velocity' | 'burndown' | 'summary';

/**
 * Full capacity event detail page (F11 — capacity planning): event overview + children, member
 * roster with per-member absences, sprint velocity + rolling forecast, burndown, and the
 * synthesis (per-member breakdown, PI consolidation, engagement gauge).
 *
 * Loads the event by the `:eventId` route param (mirrors `WheelDetailComponent`'s `wheelId`
 * pattern) and, once loaded, its direct children (if any — only meaningful for a `PI_PLANNING`
 * event) and its `CapacitySummaryResponse` (shared by the Members tab, for its member listing —
 * see {@link MembersPanelComponent}'s doc — and the Summary tab). Member/absence/velocity
 * mutations, handled by the respective tab panels, re-fetch the summary so both tabs stay in
 * sync with the latest computed figures.
 */
@Component({
  selector: 'app-capacity-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslocoPipe,
    MembersPanelComponent,
    VelocityPanelComponent,
    BurndownPanelComponent,
    SummaryPanelComponent,
  ],
  templateUrl: './capacity-detail.component.html',
  styleUrl: './capacity-detail.component.scss',
})
export class CapacityDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly capacityApi = inject(CapacityApiService);
  private readonly toastService = inject(ToastService);

  private readonly cancelDeleteButton = viewChild<ElementRef<HTMLButtonElement>>('cancelDeleteButton');

  readonly eventId: string;

  /** The event being viewed, or `null` until loaded. */
  readonly event = signal<CapacityEventResponse | null>(null);

  /** `true` if the event failed to load. */
  readonly loadError = signal(false);

  /** The event's direct children (only populated/relevant for a `PI_PLANNING` event). */
  readonly children = signal<readonly CapacityEventChildResponse[]>([]);

  /** The event's full capacity summary — shared by the Members and Summary tabs. */
  readonly summary = signal<CapacitySummaryResponse | null>(null);

  /** `true` if the summary failed to load. */
  readonly summaryLoadError = signal(false);

  /** The currently active tab. */
  readonly activeTab = signal<CapacityDetailTab>('overview');

  /** `true` when the delete-event confirmation dialog is open. */
  readonly pendingDelete = signal(false);

  /** The toasts to display, forwarded from {@link ToastService}. */
  readonly toasts = this.toastService.toasts;

  constructor() {
    this.eventId = this.route.snapshot.paramMap.get('eventId') ?? '';

    effect(() => {
      if (this.pendingDelete()) {
        this.cancelDeleteButton()?.nativeElement.focus();
      }
    });
  }

  ngOnInit(): void {
    this.loadEvent();
    this.loadChildren();
    this.loadSummary();
  }

  /** (Re)loads the capacity event. */
  loadEvent(): void {
    this.loadError.set(false);
    this.capacityApi.getEvent(this.eventId).subscribe({
      next: (event) => this.event.set(event),
      error: () => this.loadError.set(true),
    });
  }

  /**
   * (Re)loads the event's direct children. Secondary to the event itself — a failed load here
   * leaves {@link children} empty rather than blocking the whole page (mirrors
   * `WheelDetailComponent.loadDraws`).
   */
  loadChildren(): void {
    this.capacityApi.listChildren(this.eventId).subscribe({
      next: (children) => this.children.set(children),
      error: () => {
        // Non-PI events (or a backend that 404s the children lookup) simply show no children.
      },
    });
  }

  /** (Re)loads the full capacity summary — feeds both the Members and Summary tabs. */
  loadSummary(): void {
    this.summaryLoadError.set(false);
    this.capacityApi.getSummary(this.eventId).subscribe({
      next: (summary) => this.summary.set(summary),
      error: () => this.summaryLoadError.set(true),
    });
  }

  /** Switches the active tab. */
  selectTab(tab: CapacityDetailTab): void {
    this.activeTab.set(tab);
  }

  /** Dismisses the given toast. */
  dismissToast(id: number): void {
    this.toastService.dismiss(id);
  }

  /** Opens the delete-event confirmation dialog. */
  requestDelete(): void {
    this.pendingDelete.set(true);
  }

  /** Cancels the pending delete. */
  cancelDelete(): void {
    this.pendingDelete.set(false);
  }

  /** Confirms deletion of the event and navigates back to the capacity list on success. */
  confirmDelete(): void {
    this.capacityApi.deleteEvent(this.eventId).subscribe({
      next: () => {
        this.pendingDelete.set(false);
        this.toastService.show('capacity.list.deleteSuccess', 'success');
        this.router.navigate(['/capacity']);
      },
      error: () => {
        this.pendingDelete.set(false);
        this.toastService.show('capacity.list.deleteError', 'error');
      },
    });
  }
}
