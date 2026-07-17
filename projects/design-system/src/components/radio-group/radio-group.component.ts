import { ChangeDetectionStrategy, Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** Une option d'un `pivot-ds-radio-group`. */
export interface RadioOption {
  /** Valeur émise quand l'option est sélectionnée. */
  value: string;
  /** Libellé affiché (chaîne déjà traduite). */
  label: string;
  /** Désactive cette option précise. */
  disabled?: boolean;
}

let radioGroupSeq = 0;

/**
 * `pivot-ds-radio-group` — groupe de boutons radio du design system PIVOT.
 *
 * EN17.14 (Vague 1). Boutons radio natifs partageant un même `name` : la navigation clavier
 * (flèches, roving focus) et la sémantique sont fournies par le navigateur. Enveloppé dans un
 * `role="radiogroup"` étiquetable, intégré aux Reactive Forms via `ControlValueAccessor`.
 *
 * @example
 * ```html
 * <pivot-ds-radio-group formControlName="role" [options]="roleOptions"
 *   [ariaLabel]="'admin.role' | transloco" />
 * ```
 */
@Component({
  selector: 'pivot-ds-radio-group',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="pv-radio-group"
      role="radiogroup"
      [attr.aria-label]="ariaLabel || null"
      [attr.aria-describedby]="ariaDescribedby || null"
    >
      @for (opt of options; track opt.value) {
        <label class="pv-radio" [class.pv-radio--disabled]="disabled || opt.disabled">
          <input
            type="radio"
            class="pv-radio__input"
            [name]="name"
            [value]="opt.value"
            [checked]="opt.value === value"
            [disabled]="disabled || opt.disabled"
            (change)="select(opt.value)"
            (blur)="onTouched()"
          />
          <span class="pv-radio__label">{{ opt.label }}</span>
        </label>
      }
    </div>
  `,
  styleUrl: './radio-group.component.scss',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RadioGroupComponent), multi: true },
  ],
})
export class RadioGroupComponent implements ControlValueAccessor {
  /** Options du groupe. */
  @Input() options: RadioOption[] = [];

  /** Nom partagé des radios (groupe d'exclusion). Généré si non fourni. */
  @Input() name = `pv-radio-group-${++radioGroupSeq}`;

  /** Nom accessible du groupe. */
  @Input() ariaLabel = '';

  /** `aria-describedby` (aide/erreur d'un `form-field`). */
  @Input() ariaDescribedby = '';

  /** Désactive tout le groupe (surchargé par `setDisabledState`). */
  @Input() disabled = false;

  protected value: string | null = null;

  private onChange: (value: string) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  protected select(value: string): void {
    this.value = value;
    this.onChange(value);
  }

  // ─── ControlValueAccessor ─────────────────────────────────────────────────
  writeValue(value: string | null): void {
    this.value = value;
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
