import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/service/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'piv-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  loading = signal(false);
  error = signal<string | null>(null);
  showPassword = signal(false);
  requiresDeviceVerification = signal(false);
  pendingFingerprint = signal<string | null>(null);

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

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
    // Google Sign-In SDK must be loaded; handled by google-login.service (to be added)
    this.error.set('Google Sign-In non configuré dans cet environnement.');
  }

  private mapError(err: HttpErrorResponse): string {
    if (err.status === 401) return 'Email ou mot de passe incorrect.';
    if (err.status === 403) {
      const msg = err.error?.message || '';
      if (msg.includes('vérifié')) return 'Votre email n\'est pas encore vérifié. Vérifiez votre boîte email.';
      return 'Compte désactivé. Contactez le support.';
    }
    if (err.status === 429) return 'Trop de tentatives. Réessayez dans quelques minutes.';
    return 'Une erreur est survenue. Réessayez.';
  }
}
