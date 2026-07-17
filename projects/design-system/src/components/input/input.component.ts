import { ChangeDetectionStrategy, Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * `pivot-ds-input` — champ texte du design system PIVOT.
 *
 * EN17.14 (Vague 1). Fin wrapper de la classe globale `.form-control` (état `.is-invalid`),
 * intégré aux Reactive Forms via `ControlValueAccessor` (`formControlName`). À placer dans un
 * `pivot-ds-form-field` qui fournit label, aide et message d'erreur ; lier `id`/`ariaDescribedby`
 * depuis le champ.
 *
 * @example
 * ```html
 * <pivot-ds-form-field [label]="'account.email' | transloco" [error]="emailError()" #f>
 *   <pivot-ds-input formControlName="email" type="email"
 *     [id]="f.controlId" [ariaDescribedby]="f.describedBy" [invalid]="!!f.error" />
 * </pivot-ds-form-field>
 * ```
 */
@Component({
  selector: 'pivot-ds-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      class="form-control"
      [class.is-invalid]="invalid"
      [type]="type"
      [id]="id || null"
      [attr.placeholder]="placeholder || null"
      [attr.autocomplete]="autocomplete || null"
      [attr.aria-describedby]="ariaDescribedby || null"
      [attr.aria-invalid]="invalid ? 'true' : null"
      [disabled]="disabled"
      [value]="value"
      (input)="onInput($event)"
      (blur)="onTouched()"
    />
  `,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => InputComponent), multi: true },
  ],
})
export class InputComponent implements ControlValueAccessor {
  /** Type HTML natif (`text`, `email`, `password`, `search`, `tel`, `url`, `number`). */
  @Input() type = 'text';

  /** id du contrôle — cible du `<label for>` du `form-field`. */
  @Input() id = '';

  /** Texte indicatif. */
  @Input() placeholder = '';

  /** Valeur d'`autocomplete`. */
  @Input() autocomplete = '';

  /** `aria-describedby` (aide/erreur du `form-field`). */
  @Input() ariaDescribedby = '';

  /** Applique l'état d'erreur visuel (`.is-invalid`) + `aria-invalid`. */
  @Input() invalid = false;

  /** Désactive le champ (surchargé par `setDisabledState` en Reactive Forms). */
  @Input() disabled = false;

  protected value = '';

  private onChange: (value: string) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  protected onInput(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
    this.onChange(this.value);
  }

  // ─── ControlValueAccessor ─────────────────────────────────────────────────
  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
