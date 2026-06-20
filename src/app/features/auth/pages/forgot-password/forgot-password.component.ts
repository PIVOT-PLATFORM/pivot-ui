import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../../../core/auth/service/auth.service';

@Component({
  selector: 'piv-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslocoPipe],
  template: `
    <div class="auth-page">
      <div class="card auth-card">
        <span class="auth-logo">{{ 'common.logo' | transloco }}</span>

        @if (sent()) {
          <div style="text-align:center;padding:16px 0">
            <div style="font-size:48px;margin-bottom:16px">✉️</div>
            <h2 class="auth-title">{{ 'auth.forgot_password.sent_title' | transloco }}</h2>
            <p style="font-size:var(--text-sm);color:var(--color-gray-500);margin-top:8px;line-height:1.6">
              {{ 'auth.forgot_password.sent_body' | transloco }}
            </p>
            <a routerLink="/auth/login" class="btn btn-secondary btn-full" style="margin-top:24px">
              {{ 'auth.forgot_password.sent_back' | transloco }}
            </a>
          </div>
        } @else {
          <h1 class="auth-title">{{ 'auth.forgot_password.title' | transloco }}</h1>
          <p class="auth-subtitle">{{ 'auth.forgot_password.subtitle' | transloco }}</p>

          @if (error()) {
            <div class="alert alert-error" style="margin-bottom:16px">{{ error() | transloco }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="form-group" style="margin-bottom:20px">
              <label class="form-label" for="email">{{ 'auth.forgot_password.email' | transloco }}</label>
              <input id="email" type="email" formControlName="email" class="form-control"
                     [placeholder]="'auth.forgot_password.email_placeholder' | transloco"
                     autocomplete="email"/>
            </div>

            <button type="submit" class="btn btn-primary btn-full btn-lg" [disabled]="loading()">
              @if (loading()) { <span class="spinner"></span> }
              {{ 'auth.forgot_password.submit' | transloco }}
            </button>
          </form>

          <p style="margin-top:20px;text-align:center;font-size:var(--text-sm);color:var(--color-gray-500)">
            <a routerLink="/auth/login">{{ 'auth.forgot_password.back_login' | transloco }}</a>
          </p>
        }
      </div>
    </div>
  `,
  styles: [`:host{display:contents}.auth-page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--surface-bg)}.auth-card{max-width:440px;width:100%;padding:40px}.auth-logo{display:block;font-size:var(--text-2xl);font-weight:700;color:var(--color-navy-900);margin-bottom:28px}.auth-title{font-size:var(--text-xl);font-weight:700;color:var(--color-navy-900);margin-bottom:6px}.auth-subtitle{font-size:var(--text-sm);color:var(--color-gray-500);margin-bottom:24px}`]
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  loading = signal(false);
  sent = signal(false);
  error = signal<string | null>(null);

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.auth.forgotPassword(this.form.value.email!).subscribe({
      next: () => { this.loading.set(false); this.sent.set(true); },
      error: () => { this.loading.set(false); this.sent.set(true); },
    });
  }
}
