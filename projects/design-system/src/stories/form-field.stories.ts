import type { Meta, StoryObj } from '@storybook/angular';
import { FormFieldComponent } from '../components/form-field/form-field.component';

const meta: Meta<FormFieldComponent> = {
  title: 'Fondations/FormField',
  component: FormFieldComponent,
  args: {
    label: 'Adresse e-mail',
    hint: '',
    error: '',
    required: false,
  },
};
export default meta;

type Story = StoryObj<FormFieldComponent>;

const render = (args: Partial<FormFieldComponent>) => ({
  props: args,
  template: `
    <div style="max-width:360px;font-family:var(--font-sans);">
      <pivot-ds-form-field [label]="label" [hint]="hint" [error]="error" [required]="required" #field>
        <input class="form-control" type="email"
               [id]="field.controlId"
               [attr.aria-describedby]="field.describedBy"
               [attr.aria-invalid]="!!error"
               placeholder="jane@exemple.fr" />
      </pivot-ds-form-field>
    </div>
  `,
  moduleMetadata: { imports: [FormFieldComponent] },
});

/** Champ avec libellé seul. */
export const Default: Story = { render };

/** Champ requis avec aide contextuelle. */
export const WithHint: Story = {
  args: { required: true, hint: 'Nous ne la partagerons jamais.' },
  render,
};

/** Champ en erreur — l'erreur remplace l'aide et pilote `aria-describedby`. */
export const WithError: Story = {
  args: { hint: 'Nous ne la partagerons jamais.', error: 'Adresse e-mail invalide.' },
  render,
};
