import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * `pivot-ds-form-field` — enveloppe accessible d'un champ de formulaire.
 *
 * EN17.13 (Vague 0) — fondation des composants de saisie (Vague 1 : input, select,
 * textarea…). Pose les classes globales `.form-group` / `.form-label` / `.form-hint` /
 * `.form-error` (aucun style redéclaré) et câble la sémantique label ↔ contrôle ↔
 * message.
 *
 * Le contrôle est **projeté** (`<ng-content>`). L'appelant lie sur son contrôle :
 * - `[id]="controlId"` — cible du `<label for>` ;
 * - `[attr.aria-describedby]="describedBy"` — hint ou erreur courante ;
 * - `[attr.aria-invalid]="!!error"`.
 *
 * Libellés (`label`/`hint`/`error`) : chaînes **déjà traduites** fournies par l'appelant —
 * le composant ne code aucun texte en dur.
 *
 * @example
 * ```html
 * <pivot-ds-form-field
 *   [label]="'account.email' | transloco"
 *   [error]="form.controls.email.touched && form.controls.email.invalid
 *            ? ('account.emailInvalid' | transloco) : ''"
 *   [required]="true"
 *   #field>
 *   <input class="form-control" formControlName="email"
 *          [id]="field.controlId" [attr.aria-describedby]="field.describedBy"
 *          [attr.aria-invalid]="!!field.error" />
 * </pivot-ds-form-field>
 * ```
 */
@Component({
  selector: 'pivot-ds-form-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="form-group">
      @if (label) {
        <label class="form-label" [attr.for]="controlId">
          {{ label }}
          @if (required) {
            <span aria-hidden="true"> *</span>
          }
        </label>
      }
      <ng-content></ng-content>
      @if (hint && !error) {
        <p class="form-hint" [id]="hintId">{{ hint }}</p>
      }
      @if (error) {
        <p class="form-error" [id]="errorId" role="alert">{{ error }}</p>
      }
    </div>
  `,
})
export class FormFieldComponent {
  private static seq = 0;
  private readonly uid = ++FormFieldComponent.seq;

  /** Libellé du champ (déjà traduit). Vide → pas de `<label>` rendu. */
  @Input() label = '';

  /** Aide contextuelle (déjà traduite). Masquée quand une `error` est présente. */
  @Input() hint = '';

  /** Message d'erreur (déjà traduit). Non vide → rendu en `.form-error` avec `role="alert"`. */
  @Input() error = '';

  /** Marque le champ requis (astérisque visuel, masqué aux lecteurs d'écran). */
  @Input() required = false;

  /** id du contrôle projeté — sert au `<label for>` et à dériver les ids de description. */
  @Input() controlId = `pivot-ds-field-${this.uid}`;

  /** id du paragraphe d'aide. */
  get hintId(): string {
    return `${this.controlId}-hint`;
  }

  /** id du paragraphe d'erreur. */
  get errorId(): string {
    return `${this.controlId}-error`;
  }

  /** Valeur à poser sur `aria-describedby` du contrôle (erreur prioritaire sur hint). */
  get describedBy(): string | null {
    if (this.error) {
      return this.errorId;
    }
    if (this.hint) {
      return this.hintId;
    }
    return null;
  }
}
