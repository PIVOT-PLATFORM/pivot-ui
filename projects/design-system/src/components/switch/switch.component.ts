import { ChangeDetectionStrategy, Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * `pivot-ds-switch` — interrupteur (toggle) du design system PIVOT.
 *
 * EN17.14 (Vague 1). Bouton `role="switch"` avec `aria-checked`, activable clavier (Espace/Entrée
 * — comportement natif du `<button>`), intégré aux Reactive Forms via `ControlValueAccessor`
 * (valeur booléenne). Le libellé est projeté (`<ng-content>`).
 *
 * @example
 * ```html
 * <pivot-ds-switch formControlName="notifications">{{ 'account.notifications' | transloco }}</pivot-ds-switch>
 * ```
 */
@Component({
  selector: 'pivot-ds-switch',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      role="switch"
      class="pv-switch"
      [class.pv-switch--on]="checked"
      [attr.aria-checked]="checked"
      [attr.aria-describedby]="ariaDescribedby || null"
      [disabled]="disabled"
      (click)="toggle()"
      (blur)="onTouched()"
    >
      <span class="pv-switch__track" aria-hidden="true">
        <span class="pv-switch__thumb"></span>
      </span>
      <span class="pv-switch__label"><ng-content></ng-content></span>
    </button>
  `,
  styleUrl: './switch.component.scss',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SwitchComponent), multi: true },
  ],
})
export class SwitchComponent implements ControlValueAccessor {
  /** `aria-describedby` (aide/erreur d'un `form-field`). */
  @Input() ariaDescribedby = '';

  /** Désactive l'interrupteur (surchargé par `setDisabledState`). */
  @Input() disabled = false;

  protected checked = false;

  private onChange: (value: boolean) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  protected toggle(): void {
    this.checked = !this.checked;
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
