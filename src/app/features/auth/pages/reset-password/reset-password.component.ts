import { ChangeDetectionStrategy, Component, OnInit, signal, inject } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, TranslocoPipe],
  template: `
    <div class="auth-page">
      <div class="card auth-card">
        <div class="auth-brand">
          <picture>
            <source srcset="assets/brand/pivot-icon.webp?v=4" type="image/webp" />
            <img src="assets/brand/pivot-icon.png?v=4" alt="PIVOT" class="auth-brand-icon" />
          </picture>
        </div>

        @switch (tokenState()) {
          @case ('checking') {
            <div style="text-align:center;padding:16px 0">
              <div class="spinner" style="margin:0 auto 12px"></div>
              <p style="font-size:var(--text-sm);color:var(--color-gray-500)">{{ 'auth.reset_password.checking' | transloco }}</p>
            </div>
          }
          @case ('invalid') {
            <div style="text-align:center;padding:8px 0">
              <div style="margin-bottom:16px;display:flex;justify-content:center">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </div>
              <h2 class="auth-title">{{ 'auth.reset_password.expired_title' | transloco }}</h2>
              <p class="auth-subtitle">{{ 'auth.reset_password.expired_body' | transloco }}</p>
              <a routerLink="/auth/forgot-password" class="btn btn-primary btn-full" style="margin-top:16px">
                {{ 'auth.reset_password.request_new' | transloco }}
              </a>
            </div>
          }
          @case ('success') {
            <div style="text-align:center;padding:8px 0">
              <div style="margin-bottom:12px;display:flex;justify-content:center">
                <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
              </div>
              <h2 class="auth-title">{{ 'auth.reset_password.success_title' | transloco }}</h2>
              <p style="font-size:var(--text-sm);color:var(--color-gray-500);margin:8px 0 20px">
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
  tokenState = signal<'checking' | 'valid' | 'invalid' | 'success'>('checking');
  private rawToken: string | null = null;
  loading = signal(false);
  error = signal<string | null>(null);

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
