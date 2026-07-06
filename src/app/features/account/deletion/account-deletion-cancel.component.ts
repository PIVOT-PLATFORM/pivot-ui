/**
 * AccountDeletionCancelComponent — public landing page for the emailed
 * "Annuler la suppression" link (US02.2.4).
 *
 * Reachable unauthenticated: per the AC, deletion revokes every session up
 * front, so by the time this email link is clicked there is no valid session
 * left to gate this route behind — it is registered as a top-level public
 * route (see `app.routes.ts`), never nested under the authenticated shell.
 *
 * Deliberately requires an explicit button click to fire
 * `POST /account/deletion/cancel` — never on `ngOnInit()` — so that an
 * email-scanning bot prefetching the link cannot trigger cancellation by
 * itself (this is exactly why pivot-core exposes this as a POST instead of a
 * plain `<a href>` GET link).
 */
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslocoPipe } from '@jsverse/transloco';
import { AccountDeletionService } from './account-deletion.service';
import { AccountDeletionStateService } from './account-deletion-state.service';

type CancelPageState = 'idle' | 'missing-token' | 'loading' | 'success' | 'error-invalid' | 'error-expired';

@Component({
  selector: 'piv-account-deletion-cancel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './account-deletion-cancel.component.html',
  styleUrl: './account-deletion-cancel.component.scss',
})
export class AccountDeletionCancelComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly accountDeletion = inject(AccountDeletionService);
  private readonly deletionState = inject(AccountDeletionStateService);

  protected readonly pageState = signal<CancelPageState>('idle');
  private token: string | null = null;

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    this.pageState.set(this.token ? 'idle' : 'missing-token');
  }

  protected confirmCancel(): void {
    if (!this.token || this.pageState() === 'loading') {
      return;
    }
    this.pageState.set('loading');
    this.accountDeletion.cancelDeletion(this.token).subscribe({
      next: () => {
        // This browser may hold the persistent grace-period banner (same tab
        // that requested deletion, or one that restored it from localStorage) —
        // clear it now that the deletion is actually cancelled server-side.
        this.deletionState.clear();
        this.pageState.set('success');
      },
      error: (err: HttpErrorResponse) => {
        this.pageState.set(err.status === 410 ? 'error-expired' : 'error-invalid');
      },
    });
  }
}
