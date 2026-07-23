import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Shared "session paused" overlay (US19.2.2) — shown above whichever activity component is
 * currently mounted, once by {@link SessionParticipantShellComponent}, never duplicated per
 * activity type. Purely presentational: the parent shell owns the `SESSION_PAUSED`/
 * `SESSION_RESUMED` state and toggles this component's presence.
 */
@Component({
  selector: 'app-session-paused-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './session-paused-overlay.component.html',
  styleUrl: './session-paused-overlay.component.scss',
})
export class SessionPausedOverlayComponent {}
