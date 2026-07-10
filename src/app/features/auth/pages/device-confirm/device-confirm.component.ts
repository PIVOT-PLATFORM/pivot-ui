import { ChangeDetectionStrategy, Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../../../core/auth/service/auth.service';
import { DeviceService } from '../../../../core/auth/service/device.service';
import { PostLoginRedirectService } from '../../../../core/auth/service/post-login-redirect.service';
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
          <img src="assets/brand/pivot-mark-gradient.svg?v=5" alt="PIVOT" class="auth-brand-icon" />
        </div>
        <h1 class="auth-title">{{ 'auth.device_confirm.title' | transloco }}</h1>
        <p class="auth-subtitle">{{ 'auth.device_confirm.subtitle' | transloco }}</p>

        @if (error()) {
          <div class="alert alert-error auth-page__error" role="alert" aria-live="assertive">{{ error() | transloco }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="form-group form-group--spaced">
            <label class="form-label" for="otp">{{ 'auth.device_confirm.otp_label' | transloco }}</label>
            <input id="otp" type="text" formControlName="otp" class="form-control form-control--otp"
                   [class.is-invalid]="form.controls.otp.invalid && form.controls.otp.touched"
                   [placeholder]="'auth.device_confirm.otp_placeholder' | transloco"
                   autocomplete="one-time-code"
                   maxlength="6"/>
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
  styleUrl: './device-confirm.component.scss',
})
export class DeviceConfirmComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly postLoginRedirect = inject(PostLoginRedirectService);
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
      // US01.1.4 — fin du flux MFA : redirection vers l'URL d'origine
      // (returnUrl mémorisé en session Angular par la page de login), sinon /home.
      next: () => void this.postLoginRedirect.redirectAfterLogin(
        this.route.snapshot.queryParamMap.get('returnUrl')
      ),
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
