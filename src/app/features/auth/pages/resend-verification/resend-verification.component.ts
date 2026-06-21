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
            <source srcset="assets/brand/pivot-icon.webp?v=3" type="image/webp" />
            <img src="assets/brand/pivot-icon.png?v=3" alt="PIVOT" class="auth-brand-icon" />
          </picture>
        </div>

        @if (sent()) {
          <div class="success-block">
            <div class="success-icon" aria-hidden="true">✉️</div>
            <h1 class="auth-title">{{ 'auth.resend.sent_title' | transloco }}</h1>
            <p class="auth-subtitle">{{ 'auth.resend.sent_body' | transloco }}</p>
            <a routerLink="/auth/login" class="btn btn-primary btn-full" style="margin-top:24px">
              {{ 'auth.resend.back_login' | transloco }}
            </a>
          </div>
        } @else {
          <h1 class="auth-title">{{ 'auth.resend.title' | transloco }}</h1>
          <p class="auth-subtitle">{{ 'auth.resend.subtitle' | transloco }}</p>

          @if (error()) {
            <div class="alert alert-error" style="margin-bottom:16px">{{ error() }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="form-group" style="margin-bottom:20px">
              <label class="form-label" for="email">{{ 'auth.resend.email' | transloco }}</label>
              <input id="email" type="email" formControlName="email" class="form-control"
                     [class.is-invalid]="form.controls.email.invalid && form.controls.email.touched"
                     [placeholder]="'auth.resend.email_placeholder' | transloco"
                     autocomplete="email" />
            </div>

            <button type="submit" class="btn btn-primary btn-full btn-lg" [disabled]="loading()">
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
    .auth-page { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; position: relative; z-index: 1; }
    .auth-card { width: 100%; max-width: 440px; padding: 40px; box-shadow: 0 20px 60px rgba(0,0,0,.35); border-radius: 20px; @media (max-width: 480px) { padding: 28px 20px; } }
    .auth-brand { display: flex; justify-content: center; margin-bottom: 28px; }
    .auth-brand-icon { height: 120px; width: 120px; object-fit: contain; }
    .auth-title { font-size: var(--text-xl); font-weight: 700; color: var(--color-navy-900); margin-bottom: 6px; text-align: center; }
    .auth-subtitle { font-size: var(--text-sm); color: var(--color-gray-500); margin-bottom: 28px; text-align: center; }
    .auth-footer { text-align: center; font-size: var(--text-sm); color: var(--color-gray-500); }
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
  error = signal<string | null>(null);
  sent = signal(false);

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);

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
