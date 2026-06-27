import { ChangeDetectionStrategy, Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../../../core/auth/service/auth.service';
import { DeviceService } from '../../../../core/auth/service/device.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'piv-device-confirm',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
        <h1 class="auth-title">{{ 'auth.device_confirm.title' | transloco }}</h1>
        <p class="auth-subtitle">{{ 'auth.device_confirm.subtitle' | transloco }}</p>

        @if (error()) {
          <div class="alert alert-error" style="margin-bottom:12px">{{ error() | transloco }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label" for="otp">{{ 'auth.device_confirm.otp_label' | transloco }}</label>
            <input id="otp" type="text" formControlName="otp" class="form-control"
                   [class.is-invalid]="form.controls.otp.invalid && form.controls.otp.touched"
                   [placeholder]="'auth.device_confirm.otp_placeholder' | transloco"
                   autocomplete="one-time-code"
                   maxlength="6" style="font-size:1.5rem;letter-spacing:8px;text-align:center"/>
          </div>

          <button type="submit" class="btn btn-primary btn-full btn-lg" [disabled]="loading()">
            @if (loading()) { <span class="spinner"></span> }
            {{ 'auth.device_confirm.submit' | transloco }}
          </button>
        </form>

        <p class="auth-footer">
          <a routerLink="/auth/login">{{ 'auth.device_confirm.cancel' | transloco }}</a>
        </p>
      </div>
    </div>
  `,
  styles: [`:host{display:contents}.auth-page{flex:1;display:flex;align-items:center;justify-content:center;padding:16px;position:relative;z-index:1}.auth-card{max-width:440px;width:100%;padding:20px 36px 28px;box-shadow:0 20px 60px rgba(0,0,0,.35)}.auth-brand{display:flex;justify-content:center;margin-bottom:6px}.auth-brand-icon{height:100px;width:100px;object-fit:contain}.auth-title{font-size:var(--text-xl);font-weight:700;color:var(--color-navy-900);margin-bottom:6px;text-align:center}.auth-subtitle{font-size:var(--text-sm);color:var(--color-gray-500);margin-bottom:16px;text-align:center}.auth-footer{margin-top:14px;text-align:center;font-size:var(--text-sm);color:var(--color-gray-500)}`]
})
export class DeviceConfirmComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly device = inject(DeviceService);

  form = this.fb.group({
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
  });

  fingerprint = signal<string | null>(null);
  rememberMe = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.fingerprint.set(this.route.snapshot.queryParamMap.get('fingerprint'));
    if (!this.fingerprint()) {
      this.fingerprint.set(this.device.getDeviceFingerprint());
    }
    this.rememberMe.set(this.route.snapshot.queryParamMap.get('rememberMe') === 'true');
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);

    this.auth.verifyDeviceOtp(
      this.fingerprint()!,
      this.form.value.otp!,
      this.device.getDeviceName(),
      this.rememberMe()
    ).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(err.status === 429
          ? 'auth.device_confirm.error_rate_limit'
          : 'auth.device_confirm.error_invalid'
        );
      },
    });
  }
}
