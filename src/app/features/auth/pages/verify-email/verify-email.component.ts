import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../../../core/auth/service/auth.service';

@Component({
  selector: 'piv-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslocoPipe],
  template: `
    <div class="auth-page">
      <div class="card auth-card" style="text-align:center;padding:48px 40px">
        <span class="auth-logo" style="display:block;margin-bottom:24px">{{ 'common.logo' | transloco }}</span>

        @switch (state()) {
          @case ('loading') {
            <div class="spinner" style="margin:0 auto 16px"></div>
            <p style="color:var(--color-gray-500);font-size:var(--text-sm)">{{ 'auth.verify_email.loading' | transloco }}</p>
          }
          @case ('success') {
            <div style="font-size:48px;margin-bottom:16px">✅</div>
            <h2 style="font-size:var(--text-xl);font-weight:700;color:var(--color-navy-900);margin-bottom:8px">{{ 'auth.verify_email.success_title' | transloco }}</h2>
            <p style="color:var(--color-gray-500);font-size:var(--text-sm);margin-bottom:24px">{{ 'auth.verify_email.success_body' | transloco }}</p>
            <a routerLink="/auth/login" class="btn btn-primary btn-lg">{{ 'auth.verify_email.success_cta' | transloco }}</a>
          }
          @case ('error') {
            <div style="font-size:48px;margin-bottom:16px">❌</div>
            <h2 style="font-size:var(--text-xl);font-weight:700;color:var(--color-navy-900);margin-bottom:8px">{{ 'auth.verify_email.error_title' | transloco }}</h2>
            <p style="color:var(--color-gray-500);font-size:var(--text-sm);margin-bottom:24px">{{ 'auth.verify_email.error_body' | transloco }}</p>
            <a routerLink="/auth/login" class="btn btn-secondary">{{ 'auth.verify_email.error_cta' | transloco }}</a>
          }
        }
      </div>
    </div>
  `,
  styles: [`:host{display:contents}.auth-page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--surface-bg)}.auth-card{max-width:440px;width:100%}.auth-logo{font-size:var(--text-2xl);font-weight:700;color:var(--color-navy-900)}`]
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);

  state = signal<'loading' | 'success' | 'error'>('loading');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) { this.state.set('error'); return; }

    this.auth.verifyEmail(token).subscribe({
      next: () => this.state.set('success'),
      error: () => this.state.set('error'),
    });
  }
}
