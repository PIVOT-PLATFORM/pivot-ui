import { ChangeDetectionStrategy, Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../../../core/auth/service/auth.service';

@Component({
  selector: 'piv-verify-email',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslocoPipe],
  template: `
    <div class="verify-page">
      <div class="verify-card">
        <div class="verify-brand">
          <picture>
            <source srcset="assets/brand/pivot-icon.webp?v=4" type="image/webp" />
            <img src="assets/brand/pivot-icon.png?v=4" alt="PIVOT" class="verify-brand-icon" />
          </picture>
        </div>

        @switch (state()) {
          @case ('loading') {
            <div class="verify-spinner" aria-label="{{ 'auth.verify_email.loading' | transloco }}"></div>
            <p class="verify-hint">{{ 'auth.verify_email.loading' | transloco }}</p>
          }
          @case ('success') {
            <div class="verify-icon verify-icon--success" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 class="verify-title">{{ 'auth.verify_email.success_title' | transloco }}</h2>
            <p class="verify-body">{{ 'auth.verify_email.success_body' | transloco }}</p>
            <a routerLink="/auth/login" class="btn btn-primary btn-lg verify-cta">{{ 'auth.verify_email.success_cta' | transloco }}</a>
          }
          @case ('error') {
            <div class="verify-icon verify-icon--error" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </div>
            <h2 class="verify-title">{{ 'auth.verify_email.error_title' | transloco }}</h2>
            <p class="verify-body">{{ 'auth.verify_email.error_body' | transloco }}</p>
            <a routerLink="/auth/login" class="btn btn-primary verify-cta">{{ 'auth.verify_email.error_cta' | transloco }}</a>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: contents; }

    .verify-page {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      position: relative;
      z-index: 1;
    }

    .verify-card {
      max-width: 400px;
      width: 100%;
      padding: 36px 40px 40px;
      background: var(--surface-card);
      border: 1px solid var(--color-gray-200);
      border-radius: var(--radius-xl);
      box-shadow: 0 20px 60px rgba(0, 0, 0, .35);
      text-align: center;
    }

    .verify-brand {
      display: flex;
      justify-content: center;
      margin-bottom: 28px;
    }
    .verify-brand-icon {
      height: 56px;
      width: 56px;
      object-fit: contain;
    }

    .verify-icon {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }
    .verify-icon--success {
      background: color-mix(in srgb, var(--color-success) 18%, transparent);
      color: var(--color-success-400);
      border: 1.5px solid color-mix(in srgb, var(--color-success) 35%, transparent);
    }
    .verify-icon--error {
      background: color-mix(in srgb, var(--color-error) 15%, transparent);
      color: var(--color-error-400);
      border: 1.5px solid color-mix(in srgb, var(--color-error) 30%, transparent);
    }

    .verify-title {
      font-size: var(--text-xl);
      font-weight: 700;
      color: var(--color-navy-900);
      margin-bottom: 10px;
      letter-spacing: -0.02em;
    }

    .verify-body {
      font-size: var(--text-sm);
      color: var(--color-gray-500);
      line-height: 1.6;
      margin-bottom: 28px;
    }

    .verify-hint {
      font-size: var(--text-sm);
      color: var(--color-gray-500);
      margin-top: 12px;
    }

    .verify-spinner {
      width: 36px;
      height: 36px;
      border: 3px solid var(--color-gray-200);
      border-top-color: var(--color-brand-600);
      border-radius: 50%;
      animation: spin .7s linear infinite;
      margin: 8px auto;
    }

    .verify-cta { width: 100%; }

    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

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
