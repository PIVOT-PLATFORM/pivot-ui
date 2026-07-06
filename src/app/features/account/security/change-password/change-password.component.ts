import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../../../core/auth/service/auth.service';
import { PasswordPolicyService } from '../../../../core/auth/service/password-policy.service';
import { PasswordStrengthComponent } from '../../../../shared/components/password-strength/password-strength.component';
import { ToastService } from '../../../../shared/toast/toast.service';

/**
 * Validateur de groupe : `newPassword` et `confirmPassword` doivent être identiques.
 * Miroir du validateur utilisé par `RegisterComponent` — dupliqué volontairement (fonction
 * pure de 4 lignes) plutôt que de créer une dépendance croisée entre les deux features.
 */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get('newPassword')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return newPassword && confirmPassword && newPassword !== confirmPassword
    ? { passwordMismatch: true }
    : null;
}

/**
 * Formulaire "Changer mon mot de passe" (US02.2.1) — espace compte, accessible aux
 * utilisateurs authentifiés depuis le menu utilisateur (Sécurité).
 *
 * Sécurité / UX :
 * - Le mot de passe actuel incorrect (401 backend) est affiché en ligne sur le champ
 *   concerné via `role="alert"` — jamais un toast générique (AC explicite).
 * - Anti-énumération (AC) : un 429 (rate limit) affiche EXACTEMENT le même message,
 *   au même endroit, que le 401 — aucun compte à rebours n'est montré, ce qui rendrait
 *   les deux cas distinguables pour un attaquant.
 * - Au succès, le backend révoque toutes les sessions (y compris le token courant) et
 *   renvoie un nouveau token dans la réponse 200 — `AuthService.changePassword()`
 *   remplace immédiatement le token en mémoire, la session courante reste donc active
 *   de façon transparente pour l'utilisateur.
 */
@Component({
  selector: 'piv-change-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslocoPipe, PasswordStrengthComponent],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
})
export class ChangePasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly passwordPolicy = inject(PasswordPolicyService);
  private readonly toast = inject(ToastService);
  private readonly location = inject(Location);

  form = this.fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, this.passwordPolicy.validator()]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [passwordsMatch] },
  );

  loading = signal(false);
  /** Erreur générique (panne réseau / 5xx) — bandeau au-dessus du formulaire. */
  error = signal<string | null>(null);
  /**
   * Mot de passe actuel incorrect — affiché en ligne sur le champ concerné (role="alert").
   * Porte aussi le cas 429 (rate limit), volontairement, pour l'anti-énumération (AC).
   */
  currentPasswordError = signal<string | null>(null);

  showCurrentPassword = signal(false);
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  /** Mot de passe courant saisi — alimente PasswordStrengthComponent en temps réel. */
  passwordValue = signal('');

  constructor() {
    // Politique chargée une seule fois (aucun appel API à la frappe).
    this.passwordPolicy.load();
    this.form.controls.newPassword.valueChanges.subscribe((v) => this.passwordValue.set(v ?? ''));
    // Si la politique arrive après une saisie, revalider le champ avec les vraies règles.
    effect(() => {
      this.passwordPolicy.policy();
      this.form.controls.newPassword.updateValueAndValidity({ emitEvent: false });
    });
    // Toute nouvelle saisie du mot de passe actuel efface l'erreur inline précédente.
    this.form.controls.currentPassword.valueChanges.subscribe(() => this.currentPasswordError.set(null));
  }

  goBack(): void {
    this.location.back();
  }

  /** Erreur « mots de passe différents » — visible uniquement après blur du champ Confirmer. */
  showMismatchError(): boolean {
    return this.form.controls.confirmPassword.touched && this.form.errors?.['passwordMismatch'] === true;
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    this.currentPasswordError.set(null);

    const { currentPassword, newPassword } = this.form.value;
    this.auth.changePassword(currentPassword!, newPassword!).subscribe({
      next: () => {
        this.loading.set(false);
        this.form.reset();
        this.toast.show('account.security.password.success', 'info');
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 401 || err.status === 429) {
          // Champ ciblé + role="alert" dans le template — jamais un toast générique.
          // Même clé pour 401 et 429 : anti-énumération (AC), le rate limit ne doit
          // pas être distinguable d'un simple mot de passe actuel incorrect.
          this.currentPasswordError.set('account.security.password.error_current_incorrect');
        } else {
          this.error.set('account.security.password.error_generic');
        }
      },
    });
  }
}
