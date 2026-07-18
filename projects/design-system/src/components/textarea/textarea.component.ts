import { ChangeDetectionStrategy, Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * `pivot-ds-textarea` — zone de texte multiligne du design system PIVOT.
 *
 * EN17.14 (Vague 1). Fin wrapper de `.form-control` (état `.is-invalid`), intégré aux
 * Reactive Forms via `ControlValueAccessor`. À placer dans un `pivot-ds-form-field`.
 */
@Component({
  selector: 'pivot-ds-textarea',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <textarea
      class="form-control"
      [class.is-invalid]="invalid"
      [id]="id || null"
      [rows]="rows"
      [attr.placeholder]="placeholder || null"
      [attr.aria-describedby]="ariaDescribedby || null"
      [attr.aria-invalid]="invalid ? 'true' : null"
      [disabled]="disabled"
      [value]="value"
      (input)="onInput($event)"
      (blur)="onTouched()"
    ></textarea>
  `,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TextareaComponent), multi: true },
  ],
})
export class TextareaComponent implements ControlValueAccessor {
  /** id du contrôle — cible du `<label for>` du `form-field`. */
  @Input() id = '';

  /** Nombre de lignes visibles. */
  @Input() rows = 4;

  /** Texte indicatif. */
  @Input() placeholder = '';

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
    this.value = (event.target as HTMLTextAreaElement).value;
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
