import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Placeholder for the results/export view (US19.4.1/US19.4.2 — PR2/2 of E19, not built in this
 * PR). {@link SessionParticipantShellComponent} navigates here on `SESSION_ENDED` so that
 * transition always has a real route to land on rather than a broken link; PR2 replaces this
 * with the actual results view.
 */
@Component({
  selector: 'app-session-results-placeholder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './session-results-placeholder.component.html',
  styleUrl: './session-results-placeholder.component.scss',
})
export class SessionResultsPlaceholderComponent {}
