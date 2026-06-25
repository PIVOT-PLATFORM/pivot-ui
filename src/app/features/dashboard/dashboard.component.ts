import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/service/auth.service';

@Component({
  selector: 'piv-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <h1 style="font-size:var(--text-2xl);font-weight:700;color:var(--color-navy-900);margin-bottom:8px">
        Bonjour, {{ user()?.firstName }} !
      </h1>
      <p style="color:var(--color-gray-500);font-size:var(--text-sm)">
        Bienvenue sur votre tableau de bord PIVOT.
      </p>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;margin-top:28px">
        <div class="card" style="padding:24px">
          <p style="font-size:var(--text-sm);color:var(--color-gray-500);margin-bottom:4px">Rôle</p>
          <p style="font-size:var(--text-lg);font-weight:600;color:var(--color-navy-900)">{{ user()?.role }}</p>
        </div>
        <div class="card" style="padding:24px">
          <p style="font-size:var(--text-sm);color:var(--color-gray-500);margin-bottom:4px">Organisation</p>
          <p style="font-size:var(--text-lg);font-weight:600;color:var(--color-navy-900)">{{ user()?.tenantSlug }}</p>
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  user = this.auth.currentUser;
}
