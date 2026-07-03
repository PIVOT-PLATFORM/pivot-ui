import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  PasswordCriteria,
  PasswordPolicyService,
} from '../../../core/auth/service/password-policy.service';

/** Clés des critères affichés dans la checklist — ordre d'affichage. */
interface CriterionView {
  /** Clé Transloco sous `auth.password.strength.criteria.*`. */
  labelKey: string;
  /** Paramètre `count` injecté dans le libellé (valeur issue de la politique). */
  count: number;
  /** Critère satisfait pour la saisie courante. */
  met: boolean;
}

/**
 * Indicateur de robustesse du mot de passe (US01.2.4).
 *
 * - Barre de force + **texte du niveau visible** (« Faible » / « Moyen » / « Fort ») —
 *   jamais différencié par la couleur seule (WCAG 1.4.1).
 * - Checklist des critères de la politique backend, cochés en temps réel —
 *   `role="listitem"`, icônes ✓/✗ avec texte lecteur d'écran « validé » / « non validé ».
 * - Niveau annoncé via `aria-live="polite"` ; le champ mot de passe parent doit pointer
 *   `aria-describedby` vers `{idPrefix}-meter` et `{idPrefix}-criteria`.
 *
 * La politique est chargée une seule fois via {@link PasswordPolicyService} —
 * aucune requête API pendant la frappe.
 */
@Component({
  selector: 'piv-password-strength',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  templateUrl: './password-strength.component.html',
  styleUrl: './password-strength.component.scss',
})
export class PasswordStrengthComponent {
  private readonly policyService = inject(PasswordPolicyService);

  /** Mot de passe saisi (lié en temps réel par le formulaire parent). */
  readonly password = input<string>('');

  /** Préfixe des ids DOM exposés pour `aria-describedby` (meter + criteria). */
  readonly idPrefix = input<string>('password-strength');

  /** Politique courante (signal service — défauts avant réponse backend). */
  readonly policy = this.policyService.policy;

  /** Niveau de force courant (`null` quand le champ est vide). */
  readonly level = computed(() => this.policyService.strengthLevel(this.password(), this.policy()));

  /** État individuel des critères pour la saisie courante. */
  readonly criteria = computed<PasswordCriteria>(() =>
    this.policyService.evaluate(this.password(), this.policy()),
  );

  /** id DOM de la zone niveau de force (cible `aria-describedby`). */
  readonly meterId = computed(() => `${this.idPrefix()}-meter`);

  /** id DOM de la checklist de critères (cible `aria-describedby`). */
  readonly criteriaId = computed(() => `${this.idPrefix()}-criteria`);

  /** Vue ordonnée des critères pour le template. */
  readonly criteriaView = computed<CriterionView[]>(() => {
    const p = this.policy();
    const c = this.criteria();
    return [
      { labelKey: 'auth.password.strength.criteria.min_length', count: p.minLength, met: c.minLength },
      { labelKey: 'auth.password.strength.criteria.uppercase', count: p.minUppercase, met: c.uppercase },
      { labelKey: 'auth.password.strength.criteria.digit', count: p.minDigits, met: c.digit },
      { labelKey: 'auth.password.strength.criteria.special', count: p.minSpecial, met: c.special },
    ];
  });

  constructor() {
    this.policyService.load();
  }
}
