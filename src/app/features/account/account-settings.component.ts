/**
 * AccountSettingsComponent — US02.2.4 entry point ("Zone dangereuse").
 *
 * Minimal by design: this PR only ships the account-deletion slice. A fuller
 * "Mon compte" settings hub (profile, security, preferences — see the
 * still-disabled items in `NavbarComponent`'s user dropdown) is future scope
 * for other USs and intentionally not built ahead of need here.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../core/auth/service/auth.service';
import { AccountDeletionDialogComponent } from './deletion/account-deletion-dialog.component';
import { AccountDeletionStateService } from './deletion/account-deletion-state.service';

@Component({
  selector: 'piv-account-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, AccountDeletionDialogComponent],
  templateUrl: './account-settings.component.html',
  styleUrl: './account-settings.component.scss',
})
export class AccountSettingsComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly deletionState = inject(AccountDeletionStateService);

  protected readonly dialogOpen = signal(false);

  protected openDialog(): void {
    this.dialogOpen.set(true);
  }

  protected onDialogClosed(): void {
    this.dialogOpen.set(false);
  }

  /**
   * Deletion confirmed server-side. All sessions (including this one) were
   * revoked the instant the request was accepted — `clearSession()` just
   * purges the now-dead in-memory token locally (same reasoning as
   * `SessionExpiryService` on a 401: no network call is valid anymore).
   */
  protected onDeleted(effectiveDeletionDate: string): void {
    this.dialogOpen.set(false);
    this.deletionState.record(effectiveDeletionDate);
    this.auth.clearSession();
    void this.router.navigate(['/auth/login']);
  }
}
