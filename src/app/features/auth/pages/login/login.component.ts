import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../../../core/auth/service/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'piv-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslocoPipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
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

    const fingerprint = this.auth.getDeviceFingerprint();
    const deviceName = this.auth.getDeviceName();

    this.auth.login({
      email: this.form.value.email!,
      password: this.form.value.password!,
      deviceFingerprint: fingerprint,
      deviceName,
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
