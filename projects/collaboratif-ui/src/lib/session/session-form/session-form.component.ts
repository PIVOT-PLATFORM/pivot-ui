import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { SessionType } from '../models/session.model';
import { SessionApiService } from '../services/session-api.service';

/** The six selectable activity types, in display order (US19.1.1). */
const SESSION_TYPES: SessionType[] = ['QUIZ', 'POLL', 'WORDCLOUD', 'BRAINSTORM', 'QA', 'VOTE'];

const MAX_TITLE_LENGTH = 120;

/**
 * Creates a new live session — title + activity-type selector (US19.1.1). Detailed per-type
 * `config` (quiz questions, poll options, etc.) is completed afterward from the session detail
 * view before `start`, per the AC's explicit "config content can be completed after creation"
 * allowance — this form only sends an empty, non-null `config` object at creation time.
 */
@Component({
  selector: 'app-session-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './session-form.component.html',
  styleUrl: './session-form.component.scss',
})
export class SessionFormComponent {
  private readonly sessionApi = inject(SessionApiService);
  private readonly router = inject(Router);

  readonly types = SESSION_TYPES;
  readonly title = signal('');
  readonly selectedType = signal<SessionType | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal(false);

  readonly canSave = computed(
    () =>
      this.title().trim().length > 0 &&
      this.title().trim().length <= MAX_TITLE_LENGTH &&
      this.selectedType() !== null &&
      !this.saving(),
  );

  selectType(type: SessionType): void {
    this.selectedType.set(type);
  }

  onSubmit(): void {
    const type = this.selectedType();
    if (!this.canSave() || type === null) {
      return;
    }
    this.saving.set(true);
    this.saveError.set(false);
    this.sessionApi
      .createSession({ title: this.title().trim(), type, config: {} })
      .subscribe({
        next: session => {
          this.saving.set(false);
          void this.router.navigate(['/session', session.id]);
        },
        error: () => {
          this.saving.set(false);
          this.saveError.set(true);
        },
      });
  }
}
