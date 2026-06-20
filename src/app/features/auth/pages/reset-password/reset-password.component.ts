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
  if (!/[0-9]/.test(v)) return { weak: 'auth.register.password.need_number' };
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
        <span class="auth-logo">{{ 'common.logo' | transloco }}</span>

        @if (!token()) {
          <div class="alert alert-error">
            {{ 'auth.reset_password.invalid_link' | transloco }}
            <a routerLink="/auth/forgot-password">{{ 'auth.reset_password.request_new' | transloco }}</a>
          </div>
        } @else if (success()) {
          <div style="text-align:center;padding:16px 0">
            <div style="font-size:48px;margin-bottom:16px">🔒</div>
            <h2 class="auth-title">{{ 'auth.reset_password.success_title' | transloco }}</h2>
            <p style="font-size:var(--text-sm);color:var(--color-gray-500);margin:8px 0 24px">
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
            <div class="alert alert-error" style="margin-bottom:16px">{{ error() | transloco }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="form-group" style="margin-bottom:20px">
              <label class="form-label" for="newPassword">{{ 'auth.reset_password.new_password' | transloco }}</label>
              <input id="newPassword" type="password" formControlName="newPassword" class="form-control"
                     [class.is-invalid]="form.controls.newPassword.invalid && form.controls.newPassword.touched"
                     placeholder="••••••••••••" autocomplete="new-password"/>
              @if (form.controls.newPassword.errors?.['weak'] && form.controls.newPassword.touched) {
                <span class="form-error">{{ form.controls.newPassword.errors?.['weak'] | transloco }}</span>
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
  styles: [`:host{display:contents}.auth-page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--surface-bg)}.auth-card{max-width:440px;width:100%;padding:40px}.auth-logo{display:block;font-size:var(--text-2xl);font-weight:700;color:var(--color-navy-900);margin-bottom:28px}.auth-title{font-size:var(--text-xl);font-weight:700;color:var(--color-navy-900);margin-bottom:6px}.auth-subtitle{font-size:var(--text-sm);color:var(--color-gray-500);margin-bottom:24px}`]
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);

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
