import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../../../core/auth/service/auth.service';

@Component({
  selector: 'piv-forgot-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslocoPipe],
  template: `
    <div class="auth-page">
      <div class="card auth-card">
        <div class="auth-brand">
          <img src="assets/brand/pivot-mark-gradient.svg?v=5" alt="PIVOT" class="auth-brand-icon" />
        </div>

        @if (sent()) {
          <div class="sent-block">
            <div class="sent-block__icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-600)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2 4 12 13 22 4"/></svg>
            </div>
            <h2 class="auth-title">{{ 'auth.forgot_password.sent_title' | transloco }}</h2>
            <p class="sent-block__body">
              {{ 'auth.forgot_password.sent_body' | transloco }}
            </p>
            <a routerLink="/auth/login" class="btn btn-secondary btn-full btn-submit">
              {{ 'auth.forgot_password.sent_back' | transloco }}
            </a>
          </div>
        } @else {
          <h1 class="auth-title">{{ 'auth.forgot_password.title' | transloco }}</h1>
          <p class="auth-subtitle">{{ 'auth.forgot_password.subtitle' | transloco }}</p>

          @if (error()) {
            <div class="alert alert-error auth-page__error" role="alert" aria-live="assertive">{{ error() | transloco }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="form-group form-group--spaced">
              <label class="form-label" for="email">{{ 'auth.forgot_password.email' | transloco }}</label>
              <input id="email" type="email" formControlName="email" class="form-control"
                     [class.is-invalid]="form.controls.email.invalid && form.controls.email.touched"
                     [placeholder]="'auth.forgot_password.email_placeholder' | transloco"
                     autocomplete="email"/>
            </div>

            <button type="submit" class="btn btn-primary btn-full btn-lg" [disabled]="loading()">
              @if (loading()) { <span class="spinner"></span> }
              {{ 'auth.forgot_password.submit' | transloco }}
            </button>
          </form>

          <p class="auth-footer">
            <a routerLink="/auth/login">{{ 'auth.forgot_password.back_login' | transloco }}</a>
          </p>
        }
      </div>
    </div>
  `,
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

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
