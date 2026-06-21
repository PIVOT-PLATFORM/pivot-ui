import { Component, signal, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../../../core/auth/service/auth.service';
import { DeviceService } from '../../../../core/auth/service/device.service';
import { HttpErrorResponse } from '@angular/common/http';
import { GOOGLE_CLIENT_ID } from '../../../../app.config';

@Component({
  selector: 'piv-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslocoPipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly deviceService = inject(DeviceService);
  private readonly router = inject(Router);
  private readonly googleClientId = inject(GOOGLE_CLIENT_ID);

  readonly googleEnabled = computed(() => !!this.googleClientId);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    rememberMe: [false],
  });

  loading = signal(false);
  error = signal<string | null>(null);
  showPassword = signal(false);
  requiresDeviceVerification = signal(false);
  pendingFingerprint = signal<string | null>(null);

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);

    const fingerprint = this.deviceService.getDeviceFingerprint();
    const deviceName = this.deviceService.getDeviceName();

    this.auth.login({
      email: this.form.value.email!,
      password: this.form.value.password!,
      deviceFingerprint: fingerprint,
      deviceName,
      rememberMe: this.form.value.rememberMe ?? false,
    }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 202 && err.headers.get('X-Device-Verification-Required')) {
          this.pendingFingerprint.set(fingerprint);
          this.requiresDeviceVerification.set(true);
        } else {
          this.error.set(this.mapError(err));
        }
      },
    });
  }

  onGoogleLogin(): void {
    this.error.set('auth.login.error_google_not_configured');
  }

  private mapError(err: HttpErrorResponse): string {
    if (err.status === 401) return 'auth.login.error_invalid_credentials';
    if (err.status === 403) {
      const msg = err.error?.message || '';
      if (msg.includes('verif') || msg.includes('vérifié')) return 'auth.login.error_not_verified';
      return 'auth.login.error_disabled';
    }
    if (err.status === 429) return 'auth.login.error_rate_limit';
    return 'auth.login.error_generic';
  }
}
