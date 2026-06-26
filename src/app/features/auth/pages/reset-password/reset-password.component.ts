import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../../../core/auth/service/auth.service';

function strongPassword(c: AbstractControl): ValidationErrors | null {
  const v: string = c.value || '';
  if (v.length < 12) return { weak: 'auth.register.password.min_length' };
  if (!/[A-Z]/.test(v)) return { weak: 'auth.register.password.need_uppercase' };
  if (!/\d/.test(v)) return { weak: 'auth.register.password.need_number' };
  if (!/[^A-Za-z0-9]/.test(v)) return { weak: 'auth.register.password.need_special' };
  return null;
}

@Component({
  selector: 'piv-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslocoPipe],
  template: `
    <div class="auth-page">
      <div class="card auth-card">
        <div class="auth-brand">
          <picture>
            <source srcset="assets/brand/pivot-icon.webp?v=4" type="image/webp" />
            <img src="assets/brand/pivot-icon.png?v=4" alt="PIVOT" class="auth-brand-icon" />
          </picture>
        </div>

        @if (!token()) {
          <div class="alert alert-error" style="margin-bottom:16px">
            {{ 'auth.reset_password.invalid_link' | transloco }}
            <a routerLink="/auth/forgot-password">{{ 'auth.reset_password.request_new' | transloco }}</a>
          </div>
        } @else if (success()) {
          <div class="success-block" style="text-align:center;padding:8px 0">
            <div style="font-size:48px;margin-bottom:12px">🔒</div>
            <h2 class="auth-title">{{ 'auth.reset_password.success_title' | transloco }}</h2>
            <p style="font-size:var(--text-sm);color:var(--color-gray-500);margin:8px 0 20px">
              {{ 'auth.reset_password.success_body' | transloco }}
            </p>
            <a routerLink="/auth/login" class="btn btn-primary btn-full btn-lg">
              {{ 'auth.reset_password.success_cta' | transloco }}
            </a>
          </div>
        } @else {
          <h1 class="auth-title">{{ 'auth.reset_password.title' | transloco }}</h1>
          <p class="auth-subtitle">{{ 'auth.reset_password.subtitle' | transloco }}</p>

          @if (error()) {
            <div class="alert alert-error" style="margin-bottom:12px">{{ error() | transloco }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="form-group" style="margin-bottom:16px">
              <label class="form-label" for="newPassword">{{ 'auth.reset_password.new_password' | transloco }}</label>
              <input id="newPassword" type="password" formControlName="newPassword" class="form-control"
                     [class.is-invalid]="form.controls.newPassword.invalid && form.controls.newPassword.touched"
                     placeholder="••••••••••••" autocomplete="new-password"/>
              @if (form.controls.newPassword.touched && form.controls.newPassword.errors?.['weak']; as weakErr) {
                <span class="form-error">{{ weakErr | transloco }}</span>
              }
            </div>

            <button type="submit" class="btn btn-primary btn-full btn-lg" [disabled]="loading()">
              @if (loading()) { <span class="spinner"></span> }
              {{ 'auth.reset_password.submit' | transloco }}
            </button>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`:host{display:contents}.auth-page{flex:1;display:flex;align-items:center;justify-content:center;padding:16px;position:relative;z-index:1}.auth-card{max-width:440px;width:100%;padding:20px 36px 28px;box-shadow:0 20px 60px rgba(0,0,0,.35)}.auth-brand{display:flex;justify-content:center;margin-bottom:6px}.auth-brand-icon{height:100px;width:100px;object-fit:contain}.auth-title{font-size:var(--text-xl);font-weight:700;color:var(--color-navy-900);margin-bottom:6px;text-align:center}.auth-subtitle{font-size:var(--text-sm);color:var(--color-gray-500);margin-bottom:16px;text-align:center}`]
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  form = this.fb.group({ newPassword: ['', [Validators.required, strongPassword]] });
  token = signal<string | null>(null);
  loading = signal(false);
  success = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.token.set(this.route.snapshot.queryParamMap.get('token'));
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);

    this.auth.resetPassword(this.token()!, this.form.value.newPassword!).subscribe({
      next: () => { this.loading.set(false); this.success.set(true); },
      error: () => { this.loading.set(false); this.error.set('common.error_generic'); },
    });
  }
}
