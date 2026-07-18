import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { TooltipDirective } from '../components/tooltip/tooltip.directive';

const meta: Meta = {
  title: 'Overlays/Tooltip',
  decorators: [moduleMetadata({ imports: [TooltipDirective] })],
  parameters: {
    docs: {
      description: {
        component:
          'Skin PIVOT du comportement headless Spartan brain (vendoré, MIT). ' +
          'Positionnement CDK Overlay, délais, RTL et a11y (`aria-describedby`) fournis par le brain ; ' +
          'habillage `pv-tooltip` (tokens) côté PIVOT.',
      },
    },
  },
};
export default meta;

type Story = StoryObj;

/** Positions autour du déclencheur (survol ou focus clavier). */
export const Positions: Story = {
  render: () => ({
    template: `
      <div style="display:flex;gap:32px;padding:64px;font-family:var(--font-sans)">
        <button class="btn btn-secondary" [pivotDsTooltip]="'En haut'" position="top">Top</button>
        <button class="btn btn-secondary" [pivotDsTooltip]="'À droite'" position="right">Right</button>
        <button class="btn btn-secondary" [pivotDsTooltip]="'En bas'" position="bottom">Bottom</button>
        <button class="btn btn-secondary" [pivotDsTooltip]="'À gauche'" position="left">Left</button>
      </div>
    `,
  }),
};
