import type { Meta, StoryObj } from '@storybook/angular';
import { ButtonComponent } from '../components/button/button.component';

const meta: Meta<ButtonComponent> = {
  title: 'Formulaires/Button',
  component: ButtonComponent,
  args: { variant: 'primary', disabled: false, loading: false, full: false, size: 'md', icon: '' },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'inline-radio', options: ['md', 'lg'] },
  },
};
export default meta;

type Story = StoryObj<ButtonComponent>;

const render = (args: Partial<ButtonComponent>) => ({
  props: args,
  template: `<div style="font-family:var(--font-sans)">
    <pivot-ds-button [variant]="variant" [disabled]="disabled" [loading]="loading" [full]="full" [size]="size" [icon]="icon">Enregistrer</pivot-ds-button>
  </div>`,
  moduleMetadata: { imports: [ButtonComponent] },
});

export const Primary: Story = { render };
export const Secondary: Story = { args: { variant: 'secondary' }, render };
export const Ghost: Story = { args: { variant: 'ghost' }, render };
export const Danger: Story = { args: { variant: 'danger' }, render };
export const Loading: Story = { args: { loading: true }, render };
export const WithIcon: Story = { args: { icon: 'plus' }, render };
