import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/service/auth.service';

@Component({
  selector: 'piv-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dashboard">
      <h1 class="dashboard__greeting">Bonjour, {{ user()?.firstName }} !</h1>
      <p class="dashboard__subtitle">Bienvenue sur votre tableau de bord PIVOT.</p>
      <div class="dashboard__cards">
        <div class="card dashboard__card">
          <p class="dashboard__card-label">Rôle</p>
          <p class="dashboard__card-value">{{ user()?.role }}</p>
        </div>
        <div class="card dashboard__card">
          <p class="dashboard__card-label">Organisation</p>
          <p class="dashboard__card-value">{{ user()?.tenantSlug }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard { max-width: 1200px; }
    .dashboard__greeting { font-size: var(--text-2xl); font-weight: 700; color: var(--color-navy-900); margin: 0 0 6px; }
    .dashboard__subtitle { font-size: var(--text-sm); color: var(--color-gray-500); margin: 0 0 32px; }
    .dashboard__cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .dashboard__card { padding: 24px; }
    .dashboard__card-label { font-size: var(--text-sm); color: var(--color-gray-500); margin: 0 0 4px; }
    .dashboard__card-value { font-size: var(--text-lg); font-weight: 600; color: var(--color-navy-900); margin: 0; }
  `],
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  readonly user = this.auth.currentUser;
}
