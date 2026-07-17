import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IconRegistry } from './icon-registry';

/**
 * `pivot-ds-icon` — icône SVG inline du design system PIVOT.
 *
 * EN17.13 (Vague 0). Rend une icône du {@link IconRegistry} en SVG inline
 * (`stroke="currentColor"` → hérite de la couleur du texte). Aucune font-icon,
 * aucune lib tierce (ADR-007).
 *
 * Accessibilité (WCAG 2.1 AA) :
 * - **décorative par défaut** (`aria-hidden`, `focusable="false"`) — le sens est porté
 *   par le texte adjacent ;
 * - passer `label` (chaîne déjà traduite) la rend **signifiante** (`role="img"` + `aria-label`).
 *
 * @example
 * ```html
 * <pivot-ds-icon name="circle-check" />                    <!-- décorative -->
 * <button class="btn btn-primary"><pivot-ds-icon name="plus"/> {{ 'common.add' | transloco }}</button>
 * <pivot-ds-icon name="loader" [spin]="true" [label]="'common.loading' | transloco" />
 * ```
 */
@Component({
  selector: 'pivot-ds-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="pv-icon"
    [class.pv-icon--spin]="spin"
    [attr.role]="label ? 'img' : null"
    [attr.aria-label]="label || null"
    [attr.aria-hidden]="label ? null : 'true'"
    [innerHTML]="svg"
  ></span>`,
  styleUrl: './icon.component.scss',
})
export class IconComponent {
  private readonly registry = inject(IconRegistry);
  private readonly sanitizer = inject(DomSanitizer);

  private _name = '';
  private _size = 20;

  /** SVG sanitisé prêt à l'injection (recalculé à chaque changement de `name`/`size`). */
  protected svg: SafeHtml = '';

  /** Nom d'une icône enregistrée dans {@link IconRegistry} (ex. `circle-check`). */
  @Input({ required: true })
  set name(value: string) {
    this._name = value;
    this.render();
  }
  get name(): string {
    return this._name;
  }

  /** Taille en pixels (largeur = hauteur). Défaut 20. */
  @Input()
  set size(value: number) {
    this._size = value;
    this.render();
  }
  get size(): number {
    return this._size;
  }

  /**
   * Nom accessible **déjà traduit**. Absent → icône décorative (`aria-hidden`).
   * Présent → `role="img"` + `aria-label`.
   */
  @Input() label = '';

  /** Rotation continue (loaders). Neutralisée sous `prefers-reduced-motion` (SCSS). */
  @Input() spin = false;

  private render(): void {
    const body = this.registry.get(this._name);
    if (!body) {
      this.svg = '';
      return;
    }
    const markup =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this._size}" height="${this._size}" ` +
      `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
      `stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${body}</svg>`;
    this.svg = this.sanitizer.bypassSecurityTrustHtml(markup);
  }
}
