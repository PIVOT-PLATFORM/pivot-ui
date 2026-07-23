import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SessionType } from '../models/session.model';

/**
 * Placeholder activity view for a {@link SessionType} not yet implemented in this PR
 * (QUIZ/BRAINSTORM/QA/VOTE — PR2/2 of E19, see `pivot-docs` sprint-22 §État réel). Mounted by
 * {@link SessionParticipantShellComponent}'s type-routing switch so the generic shell contract
 * (US19.2.2) never crashes on a type this PR doesn't yet cover; PR2 replaces each usage with the
 * real `session-activity-{type}` component.
 */
@Component({
  selector: 'app-session-activity-placeholder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './session-activity-placeholder.component.html',
  styleUrl: './session-activity-placeholder.component.scss',
})
export class SessionActivityPlaceholderComponent {
  readonly type = input.required<SessionType>();
}
