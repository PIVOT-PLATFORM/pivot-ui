import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { SelectComponent, SelectOption } from '../components/select/select.component';
import { FormFieldComponent } from '../components/form-field/form-field.component';

const OPTIONS: SelectOption[] = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'manager', label: 'Chef de projet' },
  { value: 'member', label: 'Membre' },
  { value: 'observer', label: 'Observateur' },
  { value: 'guest', label: 'Invité', disabled: true },
];

const meta: Meta<SelectComponent> = {
  title: 'Formulaires/Select',
  component: SelectComponent,
  decorators: [
    moduleMetadata({ imports: [SelectComponent, FormFieldComponent, ReactiveFormsModule] }),
  ],
};
export default meta;

type Story = StoryObj<SelectComponent>;

/** Sélection simple dans un form-field. */
export const Single: Story = {
  render: () => ({
    props: { ctrl: new FormControl('member'), options: OPTIONS },
    template: `<div style="max-width:320px;font-family:var(--font-sans)">
      <pivot-ds-form-field label="Rôle" #f>
        <pivot-ds-select [formControl]="ctrl" [options]="options" placeholder="Choisir un rôle"
          [ariaDescribedby]="f.describedBy || ''" />
      </pivot-ds-form-field>
    </div>`,
  }),
};

/** Avec recherche par filtre. */
export const Searchable: Story = {
  render: () => ({
    props: { ctrl: new FormControl(''), options: OPTIONS },
    template: `<div style="max-width:320px;font-family:var(--font-sans)">
      <pivot-ds-form-field label="Rôle" #f>
        <pivot-ds-select [formControl]="ctrl" [options]="options" [searchable]="true"
          placeholder="Choisir un rôle" searchPlaceholder="Rechercher…" emptyLabel="Aucun résultat"
          [ariaDescribedby]="f.describedBy || ''" />
      </pivot-ds-form-field>
    </div>`,
  }),
};

/** Sélection multiple. */
export const Multiple: Story = {
  render: () => ({
    props: { ctrl: new FormControl<string[]>(['admin', 'member']), options: OPTIONS },
    template: `<div style="max-width:320px;font-family:var(--font-sans)">
      <pivot-ds-form-field label="Rôles" #f>
        <pivot-ds-select [formControl]="ctrl" [options]="options" [multiple]="true"
          placeholder="Choisir des rôles" [ariaDescribedby]="f.describedBy || ''" />
      </pivot-ds-form-field>
    </div>`,
  }),
};
