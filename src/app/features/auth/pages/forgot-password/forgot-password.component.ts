import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/service/auth.service';

@Component({
  selector: 'piv-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="card auth-card">
        <span class="auth-logo">PIVOT</span>

        @if (sent()) {
          <div style="text-align:center;padding:16px 0">
            <div style="font-size:48px;margin-bottom:16px">✉️</div>
            <h2 class="auth-title">Vérifiez votre email</h2>
            <p style="font-size:var(--text-sm);color:var(--color-gray-500);margin-top:8px;line-height:1.6">
              Si cet email correspond à un compte PIVOT, vous recevrez un lien de réinitialisation dans quelques minutes.
            </p>
            <a routerLink="/auth/login" class="btn btn-secondary btn-full" style="margin-top:24px">Retour à la connexion</a>
          </div>
        } @else {
          <h1 class="auth-title">Mot de passe oublié</h1>
          <p class="auth-subtitle">Renseignez votre email pour recevoir un lien de réinitialisation.</p>

          @if (error()) {
            <div class="alert alert-error" style="margin-bottom:16px">{{ error() }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="form-group" style="margin-bottom:20px">
              <label class="form-label" for="email">Email</label>
              <input id="email" type="email" formControlName="email" class="form-control"
                     placeholder="vous@entreprise.com" autocomplete="email"/>
            </div>

            <button type="submit" class="btn btn-primary btn-full btn-lg" [disabled]="loading()">
              @if (loading()) { <span class="spinner"></span> }
              Envoyer le lien
            </button>
          </form>

          <p style="margin-top:20px;text-align:center;font-size:var(--text-sm);color:var(--color-gray-500)">
            <a routerLink="/auth/login">← Retour à la connexion</a>
          </p>
        }
      </div>
    </div>
  `,
  styles: [`:host{display:contents}.auth-page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--surface-bg)}.auth-card{max-width:440px;width:100%;padding:40px}.auth-logo{display:block;font-size:var(--text-2xl);font-weight:700;color:var(--color-navy-900);margin-bottom:28px}.auth-title{font-size:var(--text-xl);font-weight:700;color:var(--color-navy-900);margin-bottom:6px}.auth-subtitle{font-size:var(--text-sm);color:var(--color-gray-500);margin-bottom:24px}`]
})
export class ForgotPasswordComponent {
  form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  loading = signal(false);
  sent = signal(false);
  error = signal<string | null>(null);

  constructor(private fb: FormBuilder, private auth: AuthService) {}

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.auth.forgotPassword(this.form.value.email!).subscribe({
      next: () => { this.loading.set(false); this.sent.set(true); },
      error: () => { this.loading.set(false); this.sent.set(true); }, // Always show success (no enumeration)
    });
  }
}
