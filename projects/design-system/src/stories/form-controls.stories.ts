import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { InputComponent } from '../components/input/input.component';
import { TextareaComponent } from '../components/textarea/textarea.component';
import { CheckboxComponent } from '../components/checkbox/checkbox.component';
import { RadioGroupComponent } from '../components/radio-group/radio-group.component';
import { SwitchComponent } from '../components/switch/switch.component';
import { FormFieldComponent } from '../components/form-field/form-field.component';

const meta: Meta = {
  title: 'Formulaires/Contrôles',
  decorators: [
    moduleMetadata({
      imports: [
        ReactiveFormsModule,
        InputComponent,
        TextareaComponent,
        CheckboxComponent,
        RadioGroupComponent,
        SwitchComponent,
        FormFieldComponent,
      ],
    }),
  ],
};
export default meta;

type Story = StoryObj;

/** Input texte dans un form-field (label + aide + erreur). */
export const Input: Story = {
  render: () => ({
    props: { ctrl: new FormControl('') },
    template: `<div style="max-width:360px;font-family:var(--font-sans)">
      <pivot-ds-form-field label="Adresse e-mail" hint="Nous ne la partagerons jamais." #f>
        <pivot-ds-input [formControl]="ctrl" type="email" [id]="f.controlId" [ariaDescribedby]="f.describedBy || ''" />
      </pivot-ds-form-field>
    </div>`,
  }),
};

/** Textarea. */
export const Textarea: Story = {
  render: () => ({
    props: { ctrl: new FormControl('') },
    template: `<div style="max-width:360px;font-family:var(--font-sans)">
      <pivot-ds-form-field label="Commentaire" #f>
        <pivot-ds-textarea [formControl]="ctrl" [id]="f.controlId" [ariaDescribedby]="f.describedBy || ''" />
      </pivot-ds-form-field>
    </div>`,
  }),
};

/** Checkbox. */
export const Checkbox: Story = {
  render: () => ({
    props: { ctrl: new FormControl(true) },
    template: `<div style="font-family:var(--font-sans)"><pivot-ds-checkbox [formControl]="ctrl">J'accepte les conditions</pivot-ds-checkbox></div>`,
  }),
};

/** Groupe radio. */
export const RadioGroup: Story = {
  render: () => ({
    props: {
      ctrl: new FormControl('admin'),
      options: [
        { value: 'admin', label: 'Administrateur' },
        { value: 'member', label: 'Membre' },
        { value: 'guest', label: 'Invité', disabled: true },
      ],
    },
    template: `<div style="font-family:var(--font-sans)"><pivot-ds-radio-group [formControl]="ctrl" [options]="options" ariaLabel="Rôle" /></div>`,
  }),
};

/** Interrupteur (switch). */
export const Switch: Story = {
  render: () => ({
    props: { ctrl: new FormControl(true) },
    template: `<div style="font-family:var(--font-sans)"><pivot-ds-switch [formControl]="ctrl">Activer les notifications</pivot-ds-switch></div>`,
  }),
};
