import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/service/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'piv-device-confirm',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="card auth-card">
        <span class="auth-logo">PIVOT</span>
        <h1 class="auth-title">Vérification de l'appareil</h1>
        <p class="auth-subtitle">
          Un code à 6 chiffres a été envoyé à votre email. Entrez-le pour confirmer cette connexion.
        </p>

        @if (error()) {
          <div class="alert alert-error" style="margin-bottom:16px">{{ error() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="form-group" style="margin-bottom:24px">
            <label class="form-label" for="otp">Code de vérification</label>
            <input id="otp" type="text" formControlName="otp" class="form-control"
                   [class.is-invalid]="form.controls.otp.invalid && form.controls.otp.touched"
                   placeholder="000000" autocomplete="one-time-code"
                   maxlength="6" style="font-size:1.5rem;letter-spacing:8px;text-align:center"/>
          </div>

          <button type="submit" class="btn btn-primary btn-full btn-lg" [disabled]="loading()">
            @if (loading()) { <span class="spinner"></span> }
            Confirmer
          </button>
        </form>

        <p style="margin-top:16px;text-align:center;font-size:var(--text-sm);color:var(--color-gray-500)">
          <a routerLink="/auth/login">← Annuler et retourner à la connexion</a>
        </p>
      </div>
    </div>
  `,
  styles: [`:host{display:contents}.auth-page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--surface-bg)}.auth-card{max-width:440px;width:100%;padding:40px}.auth-logo{display:block;font-size:var(--text-2xl);font-weight:700;color:var(--color-navy-900);margin-bottom:28px}.auth-title{font-size:var(--text-xl);font-weight:700;color:var(--color-navy-900);margin-bottom:6px}.auth-subtitle{font-size:var(--text-sm);color:var(--color-gray-500);margin-bottom:24px}`]
})
export class DeviceConfirmComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);

  form = this.fb.group({
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
  });

  fingerprint = signal<string | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.fingerprint.set(this.route.snapshot.queryParamMap.get('fingerprint'));
    if (!this.fingerprint()) {
      this.fingerprint.set(this.auth.getDeviceFingerprint());
    }
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);

    this.auth.verifyDeviceOtp(
      this.fingerprint()!,
      this.form.value.otp!,
      this.auth.getDeviceName()
    ).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 429) {
          this.error.set('Trop de tentatives. Retournez à la connexion.');
        } else {
          this.error.set('Code incorrect ou expiré. Vérifiez votre email.');
        }
      },
    });
  }
}
