import { ChangeDetectionStrategy, Component, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslocoPipe } from '@jsverse/transloco';
import { EmailChangeService } from '../change-email/email-change.service';
import type { EmailChangeConfirmErrorBody, EmailConfirmState } from '../change-email/email-change.model';

/**
 * Page publique de confirmation de changement d'e-mail (US02.2.2) — route
 * `/account/email/confirm?token=...`, ouverte depuis le lien envoyé par email à la
 * NOUVELLE adresse. Idiome aligné sur `VerifyEmailComponent` (`/auth/verify-email`) et
 * `ResetPasswordComponent` : `@switch` sur un état, appel XHR unique au chargement.
 *
 * Route déclarée en dehors du groupe `canMatch: [authMatchGuard]` dans `app.routes.ts`
 * (avant celui-ci dans l'ordre du tableau) : cette page doit fonctionner que
 * l'utilisateur ait ou non une session active sur cet appareil — le backend l'expose
 * en `permitAll` (voir contrat pivot-core PR #131), aucune identité n'est nécessaire,
 * elle est entièrement portée par le token de la query string.
 *
 * Lien expiré/déjà utilisé/adresse prise entre-temps → page d'erreur dédiée avec un
 * bouton "Refaire la demande" pointant vers le formulaire authentifié
 * (`/account/security/email`) — AC explicite pour le cas "expiré", étendu ici aux
 * autres échecs de confirmation pour la même raison (il faut recommencer la demande).
 */
@Component({
  selector: 'piv-email-confirm',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TranslocoPipe],
  templateUrl: './email-confirm.component.html',
  styleUrl: './email-confirm.component.scss',
})
export class EmailConfirmComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly emailChange = inject(EmailChangeService);

  state = signal<EmailConfirmState>('loading');

  /**
   * `true` pour les échecs où recommencer la demande a du sens (token mort ou adresse
   * prise). `false` pour `rate_limited`, où relancer immédiatement une demande se
   * heurterait au même 429 — le CTA renvoie alors simplement à l'accueil.
   */
  readonly showRetryCta = computed(() =>
    (['invalid', 'expired', 'already_used', 'target_taken'] as EmailConfirmState[]).includes(this.state()),
  );

  /**
   * Clés i18n (titre + corps) du bloc d'échec affiché par le `@default` du template.
   * Un `switch` avec des clés littérales par état plutôt qu'une concaténation
   * dynamique (`'…confirm.' + state() + '_title'`) dans le HTML : chaque clé reste
   * grep-able telle quelle dans le code (traçabilité vers `fr.json`/`en.json`), et une
   * clé absente/renommée casse la compilation du `switch` plutôt qu'un rendu silencieux.
   */
  readonly errorMessageKeys = computed<{ title: string; body: string }>(() => {
    switch (this.state()) {
      case 'expired':
        return {
          title: 'account.security.email.confirm.expired_title',
          body: 'account.security.email.confirm.expired_body',
        };
      case 'already_used':
        return {
          title: 'account.security.email.confirm.already_used_title',
          body: 'account.security.email.confirm.already_used_body',
        };
      case 'target_taken':
        return {
          title: 'account.security.email.confirm.target_taken_title',
          body: 'account.security.email.confirm.target_taken_body',
        };
      case 'rate_limited':
        return {
          title: 'account.security.email.confirm.rate_limited_title',
          body: 'account.security.email.confirm.rate_limited_body',
        };
      case 'error':
        return {
          title: 'account.security.email.confirm.error_title',
          body: 'account.security.email.confirm.error_body',
        };
      // 'invalid' et le repli par défaut partagent le même message ; 'loading'/'success'
      // ne passent jamais par ce computed (branches dédiées dans le template).
      case 'invalid':
      default:
        return {
          title: 'account.security.email.confirm.invalid_title',
          body: 'account.security.email.confirm.invalid_body',
        };
    }
  });

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state.set('invalid');
      return;
    }

    this.emailChange.confirm(token).subscribe({
      next: () => this.state.set('success'),
      error: (err: HttpErrorResponse) => this.state.set(this.mapError(err)),
    });
  }

  private mapError(err: HttpErrorResponse): EmailConfirmState {
    if (err.status === 429) return 'rate_limited';
    if (err.status === 409) return 'target_taken';
    if (err.status === 410) return 'already_used';

    const code = (err.error as EmailChangeConfirmErrorBody | null)?.code;
    if (code === 'EMAIL_CHANGE_TOKEN_EXPIRED') return 'expired';
    if (code === 'EMAIL_CHANGE_TOKEN_ALREADY_USED') return 'already_used';
    if (code === 'EMAIL_CHANGE_TARGET_TAKEN') return 'target_taken';
    if (code === 'EMAIL_CHANGE_TOKEN_INVALID') return 'invalid';

    // Corps absent/imprévu sur un 400 : traité comme un token invalide plutôt que
    // comme une panne générique — c'est la sémantique la plus sûre par défaut pour
    // un 400 sur cet endpoint (jamais de retry automatique sur le même lien).
    return err.status === 400 ? 'invalid' : 'error';
  }
}
