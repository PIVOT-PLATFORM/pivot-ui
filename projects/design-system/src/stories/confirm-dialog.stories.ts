import type { Meta, StoryObj } from '@storybook/angular';
import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog.component';

/**
 * ConfirmDialogComponent — modale de confirmation accessible.
 *
 * Migrée sur CDK Overlay + FocusTrap (@angular/cdk) dans EN17.8.
 * Première brique comportement/a11y de la librairie.
 */
const meta: Meta<ConfirmDialogComponent> = {
  title: 'Design System/Components/ConfirmDialog',
  component: ConfirmDialogComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
Modale de confirmation accessible, utilisant **@angular/cdk FocusTrap** pour piéger le focus.

- \`role="alertdialog"\` (défaut, actions destructives) ou \`role="dialog"\` (non destructif, US02.2.3)
- \`aria-modal="true"\` + \`aria-labelledby\` + \`aria-describedby\`
- Echap ferme la modale, le focus revient à l'élément déclencheur
- EN17.8 — première brique CDK dans la lib @pivot/design-system
        `,
      },
    },
  },
  argTypes: {
    open: { control: 'boolean' },
    role: { control: 'radio', options: ['alertdialog', 'dialog'] },
    title: { control: 'text' },
    message: { control: 'text' },
    confirmLabel: { control: 'text' },
    cancelLabel: { control: 'text' },
    confirmDisabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<ConfirmDialogComponent>;

export const Default: Story = {
  name: 'Défaut (alertdialog)',
  args: {
    open: true,
    role: 'alertdialog',
    title: 'Désactiver le module Whiteboard ?',
    message: 'Les utilisateurs connectés seront déconnectés du module. Cette action est réversible.',
    confirmLabel: 'Désactiver',
    cancelLabel: 'Annuler',
    confirmDisabled: false,
  },
};

export const Dialog: Story = {
  name: 'Non destructif (dialog)',
  args: {
    open: true,
    role: 'dialog',
    title: 'Révoquer toutes les sessions ?',
    message: 'Toutes vos sessions actives seront fermées. Vous devrez vous reconnecter.',
    confirmLabel: 'Révoquer',
    cancelLabel: 'Annuler',
    confirmDisabled: false,
  },
};

export const DisabledConfirm: Story = {
  name: 'Confirmation désactivée (formulaire invalide)',
  args: {
    open: true,
    role: 'alertdialog',
    title: 'Supprimer le compte',
    message: 'Cette action est irréversible. Saisissez votre mot de passe pour confirmer.',
    confirmLabel: 'Supprimer définitivement',
    cancelLabel: 'Annuler',
    confirmDisabled: true,
  },
};

export const Closed: Story = {
  name: 'Fermé (open=false)',
  args: {
    open: false,
    title: 'Dialog fermé',
    message: 'Ce dialog est fermé, rien ne s\'affiche.',
    confirmLabel: 'Confirmer',
    cancelLabel: 'Annuler',
  },
};
