/**
 * AccountDeletionBannerComponent — US02.2.4 persistent grace-period reminder.
 *
 * AC: "Bannière persistante pendant le délai de grâce rappelle la date de
 * suppression effective et propose 'Annuler la suppression'". Mounted once at
 * the app root (`App`), like `ToastComponent` and `RouteLoadingComponent`, so
 * it is visible on every route regardless of auth state — required here
 * because the AC also states tokens are revoked and the account answers 401
 * to any login attempt for the whole grace period, so the user will most
 * likely see this banner from the (now logged-out) `/auth/login` screen, not
 * from inside the authenticated shell.
 *
 * State comes from {@link AccountDeletionStateService} (localStorage-backed),
 * not a live API call — see that service's doc for why no authenticated
 * "status" endpoint exists to poll during the grace period.
 *
 * The "Annuler la suppression" action links to the public cancel-link landing
 * page rather than calling the cancel endpoint directly: cancellation always
 * requires the single-use token emailed to the user (this banner/browser has
 * no way to know it), so the honest affordance is to point at where that flow
 * lives, not to fake a one-click cancel here.
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AccountDeletionStateService } from './account-deletion-state.service';

@Component({
  selector: 'piv-account-deletion-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, TranslocoPipe],
  template: `
    @if (pending(); as deletion) {
      <div class="account-deletion-banner" role="status" data-testid="account-deletion-banner">
        <span class="account-deletion-banner__text">
          {{
            'account.deletion.banner_message'
              | transloco: { date: (deletion.effectiveDeletionDate | date: 'mediumDate') }
          }}
        </span>
        <a
          routerLink="/account/deletion/cancel"
          class="account-deletion-banner__cta"
          data-testid="account-deletion-banner-cancel"
        >
          {{ 'account.deletion.banner_cancel_cta' | transloco }}
        </a>
      </div>
    }
  `,
  styles: [`
    .account-deletion-banner {
      position: sticky;
      top: 0;
      z-index: 1500;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 10px 16px;
      background: #FFFBEB;
      color: #92400E;
      border-bottom: 1px solid #FDE68A;
      font-size: var(--text-sm);
      text-align: center;
    }
    .account-deletion-banner__cta {
      font-weight: 600;
      text-decoration: underline;
      color: inherit;
      white-space: nowrap;
    }
  `],
})
export class AccountDeletionBannerComponent {
  private readonly deletionState = inject(AccountDeletionStateService);

  readonly pending = this.deletionState.pending;
}
