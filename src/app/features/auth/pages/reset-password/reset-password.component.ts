import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/service/auth.service';

function strongPassword(c: AbstractControl): ValidationErrors | null {
  const v: string = c.value || '';
  if (v.length < 12) return { weak: 'Minimum 12 caractères.' };
  if (!/[A-Z]/.test(v)) return { weak: 'Au moins une majuscule.' };
  if (!/[0-9]/.test(v)) return { weak: 'Au moins un chiffre.' };
  if (!/[^A-Za-z0-9]/.test(v)) return { weak: 'Au moins un caractère spécial.' };
  return null;
}

@Component({
  selector: 'piv-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="card auth-card">
        <span class="auth-logo">PIVOT</span>

        @if (!token()) {
          <div class="alert alert-error">Lien invalide ou expiré. <a routerLink="/auth/forgot-password">Demander un nouveau lien.</a></div>
        } @else if (success()) {
          <div style="text-align:center;padding:16px 0">
            <div style="font-size:48px;margin-bottom:16px">🔒</div>
            <h2 class="auth-title">Mot de passe réinitialisé</h2>
            <p style="font-size:var(--text-sm);color:var(--color-gray-500);margin:8px 0 24px">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
            <a routerLink="/auth/login" class="btn btn-primary btn-full btn-lg">Se connecter</a>
          </div>
        } @else {
          <h1 class="auth-title">Nouveau mot de passe</h1>
          <p class="auth-subtitle">Choisissez un mot de passe sécurisé.</p>

          @if (error()) {
            <div class="alert alert-error" style="margin-bottom:16px">{{ error() }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="form-group" style="margin-bottom:20px">
              <label class="form-label" for="newPassword">Nouveau mot de passe</label>
              <input id="newPassword" type="password" formControlName="newPassword" class="form-control"
                     [class.is-invalid]="form.controls.newPassword.invalid && form.controls.newPassword.touched"
                     placeholder="••••••••••••" autocomplete="new-password"/>
              @if (form.controls.newPassword.errors?.['weak'] && form.controls.newPassword.touched) {
                <span class="form-error">{{ form.controls.newPassword.errors?.['weak'] }}</span>
              }
            </div>

            <button type="submit" class="btn btn-primary btn-full btn-lg" [disabled]="loading()">
              @if (loading()) { <span class="spinner"></span> }
              Réinitialiser
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
    if (this.form.invalid || this.loading() || !this.token()) return;
    this.loading.set(true);
    this.auth.resetPassword(this.token()!, this.form.value.newPassword!).subscribe({
      next: () => { this.loading.set(false); this.success.set(true); },
      error: () => { this.loading.set(false); this.error.set('Lien invalide ou expiré. Demandez un nouveau lien.'); },
    });
  }
}
