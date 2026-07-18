import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * `pivot-ds-button` — bouton du design system PIVOT.
 *
 * EN17.14 (Vague 1). Fin wrapper des classes globales `.btn`/`.btn-*` (aucun style
 * redéclaré). Gère les états `disabled`/`loading` (spinner via `pivot-ds-icon`) et une
 * icône de tête optionnelle.
 *
 * L'élément interactif reste un `<button>` natif (soumission de formulaire, focus, clavier
 * conservés) — l'hôte est en `display: contents` pour ne pas perturber la mise en page.
 *
 * @example
 * ```html
 * <pivot-ds-button variant="primary" [loading]="saving()" (click)="save()">
 *   {{ 'common.save' | transloco }}
 * </pivot-ds-button>
 * ```
 */
@Component({
  selector: 'pivot-ds-button',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [type]="type"
      class="btn"
      [class.btn-primary]="variant === 'primary'"
      [class.btn-secondary]="variant === 'secondary'"
      [class.btn-ghost]="variant === 'ghost'"
      [class.btn-danger]="variant === 'danger'"
      [class.btn-full]="full"
      [class.btn-lg]="size === 'lg'"
      [disabled]="disabled || loading"
      [attr.aria-busy]="loading ? 'true' : null"
    >
      @if (loading) {
        <pivot-ds-icon name="loader" [spin]="true" [size]="18" />
      } @else if (icon) {
        <pivot-ds-icon [name]="icon" [size]="18" />
      }
      <ng-content></ng-content>
    </button>
  `,
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  /** Variante visuelle (classe `.btn-*`). */
  @Input() variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'primary';

  /** Type HTML natif du bouton (soumission de formulaire avec `submit`). */
  @Input() type: 'button' | 'submit' | 'reset' = 'button';

  /** Désactive le bouton. */
  @Input() disabled = false;

  /** Affiche un spinner, désactive le bouton et pose `aria-busy`. */
  @Input() loading = false;

  /** Pleine largeur (`.btn-full`). */
  @Input() full = false;

  /** Taille — `lg` applique `.btn-lg`. */
  @Input() size: 'md' | 'lg' = 'md';

  /** Nom d'une icône de tête (enregistrée dans `IconRegistry`), masquée pendant `loading`. */
  @Input() icon = '';
}
