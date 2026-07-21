import { ChangeDetectionStrategy, Component, EventEmitter, Output, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * One facilitation activity offered by the Klaxoon-style picker. `name`/`desc` are not carried
 * here: they are looked up by {@link id} under the `whiteboard.activities.items.*` Transloco
 * namespace, so the catalogue stays fully localised.
 */
export interface WbActivity {
  readonly id: string;
  readonly glyph: string;
  /** Nom de TON du design system (`.pv-tone-*`). */
  readonly kind: 'brand' | 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  /**
   * False while the activity has no working implementation — the entry renders disabled with a
   * "coming soon" hint instead of silently doing nothing on click.
   */
  readonly available: boolean;
}

/**
 * The catalogue. An activity is `available` once it either owns a backend (`timer` via Redis,
 * `dotvote` via `V4__vote.sql`, `quiz` via `V9__quiz.sql`) or is expressible as a pure canvas
 * template (see `activity-templates.ts`).
 *
 * `poll` is the only one left unavailable: it needs per-participant answers aggregated live, so it
 * requires a `collaboratif` schema entity that does not exist yet (F30.3, phase-3).
 */
const ACTIVITIES: readonly WbActivity[] = [
  { id: 'brainstorming', glyph: 'B', kind: 'brand', available: true },
  { id: 'poll', glyph: 'S', kind: 'info', available: false },
  { id: 'dotvote', glyph: 'V', kind: 'success', available: true },
  { id: 'icebreaker', glyph: 'I', kind: 'warning', available: true },
  { id: 'quiz', glyph: 'Q', kind: 'brand', available: true },
  { id: 'timer', glyph: 'M', kind: 'neutral', available: true },
  { id: 'retro', glyph: 'R', kind: 'danger', available: true },
];

/**
 * Klaxoon-style facilitation-activity picker (Whiteboard design "Activités" panel). Slide-in
 * panel listing the workshop activities that can be launched on a board — brainstorming, poll,
 * dot-vote, icebreaker, quiz, timer, retro — plus a "recently used" shortcut row.
 *
 * Purely presentational: it emits {@link launch} with the chosen activity id and {@link close};
 * the host decides what each id does (see `BoardPageComponent.onLaunchActivity`). Entries whose
 * implementation does not exist yet are rendered disabled and never emit {@link launch}, so no
 * affordance in this panel is a no-op.
 *
 * All labels are externalised under the `whiteboard.activities.*` Transloco namespace.
 */
@Component({
  selector: 'wb-activities-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './activities-panel.component.html',
  styleUrl: './activities-panel.component.scss',
})
export class ActivitiesPanelComponent {
  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly launch = new EventEmitter<string>();

  /**
   * True on a board the viewer cannot edit. Every activity mutates the board, so a read-only
   * participant gets the same disabled treatment as an unimplemented activity rather than
   * affordances that would silently do nothing.
   */
  readonly readOnly = input(false);

  protected readonly activities = ACTIVITIES;
  protected readonly recent: readonly WbActivity[] = [ACTIVITIES[0], ACTIVITIES[6]];

  /** Whether an activity can be launched right now. */
  protected launchable(activity: WbActivity): boolean {
    return activity.available && !this.readOnly();
  }
}
