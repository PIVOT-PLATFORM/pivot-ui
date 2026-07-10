import { ChangeDetectionStrategy, Component, OnInit, effect, signal, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../../../core/auth/service/auth.service';
import { PasswordPolicyService } from '../../../../core/auth/service/password-policy.service';
import { PasswordStrengthComponent } from '../../../../shared/components/password-strength/password-strength.component';

@Component({
  selector: 'piv-reset-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, TranslocoPipe, PasswordStrengthComponent],
  template: `
    <div class="auth-page">
      <div class="card auth-card">
        <div class="auth-brand">
          <img src="assets/brand/pivot-mark-gradient.svg?v=5" alt="PIVOT" class="auth-brand-icon" />
        </div>

        @switch (tokenState()) {
          @case ('checking') {
            <div class="auth-page__banner auth-page__banner--loading">
              <div class="spinner spinner--centered"></div>
              <p class="auth-page__hint">{{ 'auth.reset_password.checking' | transloco }}</p>
            </div>
          }
          @case ('invalid') {
            <div class="auth-page__banner">
              <div class="auth-page__banner-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </div>
              <h2 class="auth-title">{{ 'auth.reset_password.expired_title' | transloco }}</h2>
              <p class="auth-subtitle">{{ 'auth.reset_password.expired_body' | transloco }}</p>
              <a routerLink="/auth/forgot-password" class="btn btn-primary btn-full auth-page__banner-cta">
                {{ 'auth.reset_password.request_new' | transloco }}
              </a>
            </div>
          }
          @case ('success') {
            <div class="auth-page__banner">
              <div class="auth-page__banner-icon auth-page__banner-icon--tight">
                <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
              </div>
              <h2 class="auth-title">{{ 'auth.reset_password.success_title' | transloco }}</h2>
              <p class="auth-page__banner-body">
                {{ 'auth.reset_password.success_body' | transloco }}
              </p>
              <a routerLink="/auth/login" class="btn btn-primary btn-full btn-lg">
                {{ 'auth.reset_password.success_cta' | transloco }}
              </a>
            </div>
          }
          @default {
            <h1 class="auth-title">{{ 'auth.reset_password.title' | transloco }}</h1>
            <p class="auth-subtitle">{{ 'auth.reset_password.subtitle' | transloco }}</p>

            @if (error()) {
              <div class="alert alert-error auth-page__error" role="alert" aria-live="assertive">{{ error() | transloco }}</div>
            }

            <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
              <div class="form-group form-group--spaced">
                <label class="form-label" for="newPassword">{{ 'auth.reset_password.new_password' | transloco }}</label>
                <input id="newPassword" type="password" formControlName="newPassword" class="form-control"
                       [class.is-invalid]="form.controls.newPassword.invalid && form.controls.newPassword.touched"
                       placeholder="••••••••••••" autocomplete="new-password"
                       aria-describedby="reset-password-meter reset-password-criteria"/>
                <piv-password-strength [password]="passwordValue()" idPrefix="reset-password" />
              </div>

              <button type="submit" class="btn btn-primary btn-full btn-lg" [disabled]="form.invalid || loading()">
                @if (loading()) { <span class="spinner" aria-hidden="true"></span> }
                {{ 'auth.reset_password.submit' | transloco }}
              </button>
              <span role="status" aria-live="polite" aria-atomic="true" class="sr-only">
                @if (loading()) { {{ 'common.loading' | transloco }} }
              </span>
            </form>
          }
        }
      </div>
    </div>
  `,
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly passwordPolicy = inject(PasswordPolicyService);

  form = this.fb.group({ newPassword: ['', [Validators.required, this.passwordPolicy.validator()]] });
  tokenState = signal<'checking' | 'valid' | 'invalid' | 'success'>('checking');
  private rawToken: string | null = null;
  loading = signal(false);
  error = signal<string | null>(null);

  /** Mot de passe courant — alimente PasswordStrengthComponent en temps réel. */
  passwordValue = signal('');

  constructor() {
    // Politique chargée une seule fois (aucun appel API à la frappe).
    this.passwordPolicy.load();
    this.form.controls.newPassword.valueChanges.subscribe((v) => this.passwordValue.set(v ?? ''));
    // Si la politique arrive après une saisie, revalider le champ avec les vraies règles.
    effect(() => {
      this.passwordPolicy.policy();
      this.form.controls.newPassword.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngOnInit(): void {
    this.rawToken = this.route.snapshot.queryParamMap.get('token');
    if (!this.rawToken) { this.tokenState.set('invalid'); return; }

    this.auth.checkResetToken(this.rawToken).subscribe({
      next: () => this.tokenState.set('valid'),
      error: () => this.tokenState.set('invalid'),
    });
  }

  submit(): void {
    if (this.form.invalid || this.loading() || this.tokenState() !== 'valid') return;
    this.loading.set(true);
    this.error.set(null);

    this.auth.resetPassword(this.rawToken!, this.form.value.newPassword!).subscribe({
      next: () => { this.loading.set(false); this.tokenState.set('success'); },
      error: (err) => { this.loading.set(false); if (err?.status === 400) { this.tokenState.set('invalid'); } else { this.error.set('common.error_generic'); } },
    });
  }
}
