import { ChangeDetectionStrategy, Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * `pivot-ds-checkbox` — case à cocher du design system PIVOT.
 *
 * EN17.14 (Vague 1). Case native (a11y clavier/lecteur d'écran gratuite) colorée par le token
 * de marque (`accent-color`), intégrée aux Reactive Forms via `ControlValueAccessor` (valeur
 * booléenne). Le libellé est projeté (`<ng-content>`) — chaîne déjà traduite côté appelant.
 *
 * @example
 * ```html
 * <pivot-ds-checkbox formControlName="acceptCgu">{{ 'auth.acceptCgu' | transloco }}</pivot-ds-checkbox>
 * ```
 */
@Component({
  selector: 'pivot-ds-checkbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="pv-checkbox" [class.pv-checkbox--disabled]="disabled">
      <input
        type="checkbox"
        class="pv-checkbox__input"
        [id]="id || null"
        [checked]="checked"
        [indeterminate]="indeterminate"
        [disabled]="disabled"
        [attr.aria-describedby]="ariaDescribedby || null"
        (change)="onToggle($event)"
        (blur)="onTouched()"
      />
      <span class="pv-checkbox__label"><ng-content></ng-content></span>
    </label>
  `,
  styleUrl: './checkbox.component.scss',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CheckboxComponent), multi: true },
  ],
})
export class CheckboxComponent implements ControlValueAccessor {
  /** id du contrôle (liaison label/aria externe éventuelle). */
  @Input() id = '';

  /** État indéterminé (visuel uniquement — n'affecte pas la valeur). */
  @Input() indeterminate = false;

  /** `aria-describedby` (aide/erreur d'un `form-field`). */
  @Input() ariaDescribedby = '';

  /** Désactive la case (surchargé par `setDisabledState` en Reactive Forms). */
  @Input() disabled = false;

  protected checked = false;

  private onChange: (value: boolean) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  protected onToggle(event: Event): void {
    this.checked = (event.target as HTMLInputElement).checked;
    this.indeterminate = false;
    this.onChange(this.checked);
  }

  // ─── ControlValueAccessor ─────────────────────────────────────────────────
  writeValue(value: boolean | null): void {
    this.checked = !!value;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
