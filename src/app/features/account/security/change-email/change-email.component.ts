import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslocoPipe } from '@jsverse/transloco';
import { EmailChangeService } from './email-change.service';

/**
 * Formulaire "Changer mon adresse e-mail" (US02.2.2) — espace compte, accessible aux
 * utilisateurs authentifiés depuis le menu utilisateur (Sécurité). Idiome aligné sur
 * `ChangePasswordComponent` (US02.2.1, PR #70) : même layout `.account-page` /
 * `.account-layout`, même traitement inline du mot de passe actuel incorrect.
 *
 * Sécurité / UX — anti-énumération (AC explicite) :
 * - `POST /api/account/email` renvoie **toujours** 202, corps vide, que la nouvelle
 *   adresse soit déjà prise ou non (le backend envoie une notice à l'adresse candidate
 *   dans le cas doublon, jamais exposée au demandeur). Le frontend ne doit donc JAMAIS
 *   distinguer ces deux cas : `next()` bascule systématiquement vers l'état persistant
 *   "Email envoyé" (`sent`), quel que soit le résultat réel côté serveur. Il n'existe
 *   aucune branche de code ici capable de révéler le doublon.
 * - Le mot de passe actuel incorrect (401) est affiché en ligne sur le champ concerné
 *   via `role="alert"` — jamais un toast générique (AC explicite), même idiome que
 *   `ChangePasswordComponent`.
 * - Le rate limit (429, 3 tentatives/heure) est un signal légitime à afficher tel quel
 *   ici (contrairement au changement de mot de passe, il n'y a pas d'exigence
 *   d'indistinguabilité avec le 401 dans cette US — le 429 porte sur le débit de
 *   *cette* opération, pas sur l'existence d'un compte tiers).
 */
@Component({
  selector: 'piv-change-email',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslocoPipe],
  templateUrl: './change-email.component.html',
  styleUrl: './change-email.component.scss',
})
export class ChangeEmailComponent {
  private readonly fb = inject(FormBuilder);
  private readonly emailChange = inject(EmailChangeService);
  private readonly location = inject(Location);

  form = this.fb.group({
    newEmail: ['', [Validators.required, Validators.email]],
    currentPassword: ['', [Validators.required]],
  });

  loading = signal(false);
  /** `true` une fois la demande envoyée — état persistant "Email envoyé" (AC), jamais un toast. */
  sent = signal(false);
  /** Erreur générique (validation 400 / panne réseau / 5xx) — bandeau au-dessus du formulaire. */
  error = signal<string | null>(null);
  /** Mot de passe actuel incorrect (401) — affiché en ligne sur le champ concerné (role="alert"). */
  currentPasswordError = signal<string | null>(null);
  /** Rate limit dépassé (429) — bandeau dédié au-dessus du formulaire. */
  rateLimitError = signal<string | null>(null);

  constructor() {
    // Toute nouvelle saisie du mot de passe actuel efface l'erreur inline précédente.
    this.form.controls.currentPassword.valueChanges.subscribe(() => this.currentPasswordError.set(null));
  }

  goBack(): void {
    this.location.back();
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    this.currentPasswordError.set(null);
    this.rateLimitError.set(null);

    const { newEmail, currentPassword } = this.form.value;
    this.emailChange.requestChange(newEmail!, currentPassword!).subscribe({
      next: () => {
        this.loading.set(false);
        // 202 toujours — succès réel ou doublon anti-énumération : un seul état,
        // jamais de branche qui distinguerait les deux issues possibles côté serveur.
        this.sent.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 401) {
          this.currentPasswordError.set('account.security.email.error_current_incorrect');
        } else if (err.status === 429) {
          this.rateLimitError.set('account.security.email.error_rate_limit');
        } else {
          this.error.set('account.security.email.error_generic');
        }
      },
    });
  }
}
