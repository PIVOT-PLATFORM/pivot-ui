import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../../../core/auth/service/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'piv-resend-verification',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-page">
      <div class="card auth-card">
        <div class="auth-brand">
          <picture>
            <source srcset="assets/brand/pivot-icon.webp?v=4" type="image/webp" />
            <img src="assets/brand/pivot-icon.png?v=4" alt="PIVOT" class="auth-brand-icon" />
          </picture>
        </div>

        @if (sent()) {
          <div class="success-block">
            <div style="margin-bottom:16px;display:flex;justify-content:center" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2 4 12 13 22 4"/></svg>
            </div>
            <h1 class="auth-title">{{ 'auth.resend.sent_title' | transloco }}</h1>
            <p class="auth-subtitle">{{ 'auth.resend.sent_body' | transloco }}</p>
            <a routerLink="/auth/login" class="btn btn-primary btn-full" style="margin-top:24px">
              {{ 'auth.resend.back_login' | transloco }}
            </a>
          </div>
        } @else {
          <h1 class="auth-title">{{ 'auth.resend.title' | transloco }}</h1>
          <p class="auth-subtitle">{{ 'auth.resend.subtitle' | transloco }}</p>

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="form-group" style="margin-bottom:20px">
              <label class="form-label" for="email">{{ 'auth.resend.email' | transloco }}</label>
              <input id="email" type="email" formControlName="email" class="form-control"
                     [class.is-invalid]="form.controls.email.invalid && form.controls.email.touched"
                     [placeholder]="'auth.resend.email_placeholder' | transloco"
                     autocomplete="email" />
            </div>

            <button type="submit" class="btn btn-primary btn-full btn-lg" [disabled]="loading()" [attr.aria-busy]="loading()">
              @if (loading()) { <span class="spinner"></span> }
              {{ 'auth.resend.submit' | transloco }}
            </button>
          </form>

          <p class="auth-footer" style="margin-top:24px">
            <a routerLink="/auth/login">{{ 'auth.resend.back_login' | transloco }}</a>
          </p>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: contents; }
    .auth-page { flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px; position: relative; z-index: 1; }
    .auth-card { width: 100%; max-width: 440px; padding: 20px 40px 28px; box-shadow: 0 20px 60px rgba(0,0,0,.35); border-radius: 20px; @media (max-width: 480px) { padding: 16px 20px 24px; } }
    .auth-brand { display: flex; justify-content: center; margin-bottom: 8px; }
    .auth-brand-icon { height: 100px; width: 100px; object-fit: contain; }
    .auth-title { font-size: var(--text-xl); font-weight: 700; color: var(--color-navy-900); margin-bottom: 6px; text-align: center; }
    .auth-subtitle { font-size: var(--text-sm); color: var(--color-gray-500); margin-bottom: 14px; text-align: center; }
    .auth-footer { text-align: center; font-size: var(--text-sm); color: var(--color-gray-500); margin-top: 14px; }
    .success-block { text-align: center; }
    .success-icon { font-size: 3rem; margin-bottom: 16px; }
  `]
})
export class ResendVerificationComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  loading = signal(false);
  sent = signal(false);

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);

    this.auth.resendVerification(this.form.value.email!).subscribe({
      next: () => { this.sent.set(true); this.loading.set(false); },
      error: (_err: HttpErrorResponse) => {
        // Toujours succès côté UI pour éviter l'énumération (RGPD)
        this.sent.set(true);
        this.loading.set(false);
      },
    });
  }
}
