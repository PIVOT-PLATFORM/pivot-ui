import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  ViewChild,
  computed,
  forwardRef,
  signal,
} from '@angular/core';
import { OverlayModule, ConnectedPosition } from '@angular/cdk/overlay';
import { CdkListbox, CdkOption, ListboxValueChangeEvent } from '@angular/cdk/listbox';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from '../icon/icon.component';

/** Une option d'un `pivot-ds-select`. */
export interface SelectOption {
  /** Valeur émise quand l'option est sélectionnée. */
  value: string;
  /** Libellé affiché (chaîne déjà traduite). */
  label: string;
  /** Désactive cette option. */
  disabled?: boolean;
}

/**
 * `pivot-ds-select` — liste déroulante du design system PIVOT.
 *
 * EN17.14 (Vague 1). Combobox CDK : déclencheur `role="combobox"` + panneau en overlay
 * (`cdkConnectedOverlay`) contenant un `cdkListbox` (rôle listbox, navigation clavier, typeahead,
 * `aria-activedescendant`, sélection). Prend en charge la **mono/multi-sélection** et une
 * **recherche par filtre** optionnelle. Intégré aux Reactive Forms via `ControlValueAccessor`
 * (valeur `string | null` en mono, `string[]` en multi).
 *
 * Modèle de focus : à l'ouverture le focus va au champ de recherche (si `searchable`) ou au
 * listbox ; `ArrowDown` depuis la recherche entre dans la liste ; `Escape` ferme et rend le focus
 * au déclencheur.
 *
 * @example
 * ```html
 * <pivot-ds-form-field [label]="'admin.role' | transloco" #f>
 *   <pivot-ds-select formControlName="role" [options]="roles" [searchable]="true"
 *     [placeholder]="'common.choose' | transloco" [ariaDescribedby]="f.describedBy || ''" />
 * </pivot-ds-form-field>
 * ```
 */
@Component({
  selector: 'pivot-ds-select',
  standalone: true,
  imports: [OverlayModule, CdkListbox, CdkOption, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectComponent), multi: true },
  ],
})
export class SelectComponent implements ControlValueAccessor {
  private static seq = 0;

  /** id du panneau listbox (lien `aria-controls`). */
  protected readonly listboxId = `pv-select-listbox-${++SelectComponent.seq}`;

  private readonly _options = signal<SelectOption[]>([]);

  /** Options de la liste. */
  @Input() set options(value: SelectOption[]) {
    this._options.set(value ?? []);
  }
  get options(): SelectOption[] {
    return this._options();
  }

  /** Sélection multiple. */
  @Input() multiple = false;

  /** Affiche un champ de recherche qui filtre les options. */
  @Input() searchable = false;

  /** Texte du déclencheur quand rien n'est sélectionné (déjà traduit). */
  @Input() placeholder = '';

  /** Texte indicatif du champ de recherche (déjà traduit). */
  @Input() searchPlaceholder = '';

  /** Texte affiché quand aucune option ne correspond au filtre (déjà traduit). */
  @Input() emptyLabel = '';

  /** Nom accessible du listbox. */
  @Input() ariaLabel = '';

  /** `aria-describedby` (aide/erreur d'un `form-field`). */
  @Input() ariaDescribedby = '';

  /** Applique l'état d'erreur visuel + `aria-invalid`. */
  @Input() invalid = false;

  /** Désactive le contrôle (surchargé par `setDisabledState`). */
  @Input() disabled = false;

  protected readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly selected = signal<string[]>([]);

  /** Positions de l'overlay : sous le déclencheur, repli au-dessus. */
  protected readonly positions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
  ];

  @ViewChild('trigger') private trigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('listboxEl') private listboxEl?: ElementRef<HTMLElement>;

  /** Options visibles après filtrage par la recherche. */
  protected readonly filteredOptions = computed(() => {
    const q = this.query().trim().toLowerCase();
    const all = this._options();
    return q ? all.filter((o) => o.label.toLowerCase().includes(q)) : all;
  });

  /**
   * Valeur transmise au `cdkListbox` — restreinte aux valeurs réellement présentes dans les
   * options (CdkListbox lève une erreur si une valeur sélectionnée ne correspond à aucune option,
   * ex. valeur écrite avant le chargement des options).
   */
  protected readonly listboxValue = computed(() => {
    const valid = new Set(this._options().map((o) => o.value));
    return this.selected().filter((v) => valid.has(v));
  });

  /** Libellé affiché dans le déclencheur (labels sélectionnés, ou placeholder). */
  protected readonly triggerLabel = computed(() => {
    const sel = this.selected();
    if (sel.length === 0) {
      return this.placeholder;
    }
    return this._options()
      .filter((o) => sel.includes(o.value))
      .map((o) => o.label)
      .join(', ');
  });

  protected hasSelection(): boolean {
    return this.selected().length > 0;
  }

  private onChange: (value: string | string[] | null) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  protected toggle(): void {
    if (this.open()) {
      this.close();
    } else {
      this.openPanel();
    }
  }

  private openPanel(): void {
    if (this.disabled) {
      return;
    }
    this.open.set(true);
    // Le panneau est rendu par cdkConnectedOverlay au cycle suivant : focus différé.
    setTimeout(() => {
      const target = this.searchable
        ? this.searchInput?.nativeElement
        : this.listboxEl?.nativeElement;
      target?.focus();
    });
  }

  protected close(): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    this.query.set('');
    this.onTouched();
    this.trigger?.nativeElement.focus();
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  /** ArrowDown depuis la recherche : entre dans la liste. */
  protected focusListbox(): void {
    this.listboxEl?.nativeElement.focus();
  }

  protected onListboxChange(event: ListboxValueChangeEvent<string>): void {
    const value = [...event.value];
    this.selected.set(value);
    this.onChange(this.multiple ? value : (value[0] ?? null));
    if (!this.multiple) {
      this.close();
    }
  }

  // ─── ControlValueAccessor ─────────────────────────────────────────────────
  writeValue(value: string | string[] | null): void {
    if (value == null || value === '') {
      this.selected.set([]);
    } else if (Array.isArray(value)) {
      this.selected.set(value.filter((v) => v !== ''));
    } else {
      this.selected.set([value]);
    }
  }

  registerOnChange(fn: (value: string | string[] | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.open.set(false);
    }
  }
}
