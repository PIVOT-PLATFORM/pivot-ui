import { ChangeDetectionStrategy, Component, effect, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../../../core/auth/service/auth.service';
import { PasswordPolicyService } from '../../../../core/auth/service/password-policy.service';
import { PasswordStrengthComponent } from '../../../../shared/components/password-strength/password-strength.component';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Validateur de groupe : les champs `password` et `confirmPassword` doivent être égaux.
 * L'erreur est portée par le groupe (`passwordMismatch`) — affichée sous le champ
 * « Confirmer » uniquement après blur (US01.2.4).
 */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'piv-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslocoPipe, PasswordStrengthComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly passwordPolicy = inject(PasswordPolicyService);

  form = this.fb.group(
    {
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, this.passwordPolicy.validator()]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [passwordsMatch] },
  );

  loading = signal(false);
  error = signal<string | null>(null);
  errorParams = signal<Record<string, string>>({});
  success = signal(false);
  showPassword = signal(false);

  /** Mot de passe courant — alimente PasswordStrengthComponent en temps réel. */
  passwordValue = signal('');

  constructor() {
    // Politique chargée une seule fois (aucun appel API à la frappe).
    this.passwordPolicy.load();
    this.form.controls.password.valueChanges.subscribe((v) => this.passwordValue.set(v ?? ''));
    // Si la politique arrive après une saisie, revalider le champ avec les vraies règles.
    effect(() => {
      this.passwordPolicy.policy();
      this.form.controls.password.updateValueAndValidity({ emitEvent: false });
    });
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);

    this.auth.register({
      firstName: this.form.value.firstName!,
      lastName: this.form.value.lastName!,
      email: this.form.value.email!,
      password: this.form.value.password!,
    }).subscribe({
      next: () => { this.loading.set(false); this.success.set(true); },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        // RGPD: 409 (email already exists) returns neutral success — anti-enumeration
        // 400 is a real validation error from @Valid — show generic error, account not created
        if (err.status === 409) {
          this.success.set(true);
        } else if (err.status === 429) {
          const seconds: number = err.error?.retryAfterSeconds ?? 0;
          this.error.set('auth.register.error_rate_limit');
          this.errorParams.set({ time: this.formatRetryAfter(seconds) });
        } else {
          this.error.set('common.error_generic');
        }
      },
    });
  }

  /** Erreur « mots de passe différents » — visible uniquement après blur du champ Confirmer. */
  showMismatchError(): boolean {
    return this.form.controls.confirmPassword.touched && this.form.errors?.['passwordMismatch'] === true;
  }

  private formatRetryAfter(seconds: number): string {
    if (seconds <= 0) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0 && s > 0) return `${m}m ${s}s`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  }
}
