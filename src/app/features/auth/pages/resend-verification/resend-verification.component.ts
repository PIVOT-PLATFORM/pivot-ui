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
          <img src="assets/brand/pivot-mark-gradient.svg?v=5" alt="PIVOT" class="auth-brand-icon" />
        </div>

        @if (sent()) {
          <div class="success-block">
            <div class="success-block__icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-600)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2 4 12 13 22 4"/></svg>
            </div>
            <h1 class="auth-title">{{ 'auth.resend.sent_title' | transloco }}</h1>
            <p class="auth-subtitle">{{ 'auth.resend.sent_body' | transloco }}</p>
            <a routerLink="/auth/login" class="btn btn-primary btn-full btn-submit">
              {{ 'auth.resend.back_login' | transloco }}
            </a>
          </div>
        } @else {
          <h1 class="auth-title">{{ 'auth.resend.title' | transloco }}</h1>
          <p class="auth-subtitle">{{ 'auth.resend.subtitle' | transloco }}</p>

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="form-group form-group--spaced">
              <label class="form-label" for="email">{{ 'auth.resend.email' | transloco }}</label>
              <input id="email" type="email" formControlName="email" class="form-control"
                     [class.is-invalid]="form.controls.email.invalid && form.controls.email.touched"
                     [placeholder]="'auth.resend.email_placeholder' | transloco"
                     autocomplete="email" />
            </div>

            <button type="submit" class="btn btn-primary btn-full btn-lg" [disabled]="loading()">
              @if (loading()) { <span class="spinner" aria-hidden="true"></span> }
              {{ 'auth.resend.submit' | transloco }}
            </button>
            <span role="status" aria-live="polite" aria-atomic="true" class="sr-only">
              @if (loading()) { {{ 'common.loading' | transloco }} }
            </span>
          </form>

          <p class="auth-footer auth-footer--spaced">
            <a routerLink="/auth/login">{{ 'auth.resend.back_login' | transloco }}</a>
          </p>
        }
      </div>
    </div>
  `,
  styleUrl: './resend-verification.component.scss',
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
