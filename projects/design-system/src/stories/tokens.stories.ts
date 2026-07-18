import type { Meta, StoryObj } from '@storybook/angular';
import { Component } from '@angular/core';

/**
 * Token Showcase — affiche les tokens CSS custom properties du design system PIVOT.
 * Source : projects/design-system/src/scss/tokens.scss
 */
@Component({
  selector: 'pivot-ds-token-showcase',
  standalone: true,
  template: `
    <div style="padding: 24px; font-family: var(--font-sans);">
      <h1 style="font-size: var(--text-2xl); margin-bottom: 16px; color: var(--color-gray-900);">
        Design Tokens — @pivot/design-system
      </h1>

      <section style="margin-bottom: 32px;">
        <h2 style="font-size: var(--text-lg); margin-bottom: 12px; color: var(--color-gray-700);">
          Brand colors (violet)
        </h2>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          @for (token of brandTokens; track token) {
            <div style="text-align: center;">
              <div
                [style.background]="'var(' + token + ')'"
                style="width: 64px; height: 64px; border-radius: 8px; border: 1px solid rgba(0,0,0,.1);"
              ></div>
              <p style="font-size: 10px; margin-top: 4px; color: var(--color-gray-600);">
                {{ token }}
              </p>
            </div>
          }
        </div>
      </section>

      <section style="margin-bottom: 32px;">
        <h2 style="font-size: var(--text-lg); margin-bottom: 12px; color: var(--color-gray-700);">
          Semantic colors
        </h2>
        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
          @for (s of semanticTokens; track s.token) {
            <div>
              <div
                [style.background]="'var(' + s.token + ')'"
                style="width: 80px; height: 40px; border-radius: 4px;"
              ></div>
              <p style="font-size: 10px; margin-top: 4px; color: var(--color-gray-600);">
                {{ s.label }}
              </p>
            </div>
          }
        </div>
      </section>

      <section style="margin-bottom: 32px;">
        <h2 style="font-size: var(--text-lg); margin-bottom: 12px; color: var(--color-gray-700);">
          Typography scale
        </h2>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <p [style.fontSize]="'var(--text-xs)'">--text-xs (0.75rem) — Légende</p>
          <p [style.fontSize]="'var(--text-sm)'">--text-sm (0.875rem) — Corps</p>
          <p [style.fontSize]="'var(--text-base)'">--text-base (1rem) — Base</p>
          <p [style.fontSize]="'var(--text-lg)'">--text-lg (1.125rem) — Sous-titre</p>
          <p [style.fontSize]="'var(--text-xl)'">--text-xl (1.25rem) — Titre section</p>
          <p [style.fontSize]="'var(--text-2xl)'">--text-2xl (1.5rem) — Titre page</p>
        </div>
      </section>
    </div>
  `,
})
class TokenShowcaseComponent {
  brandTokens = [
    '--color-brand-50',
    '--color-brand-100',
    '--color-brand-200',
    '--color-brand-500',
    '--color-brand-600',
    '--color-brand-700',
    '--color-brand-900',
  ];

  semanticTokens = [
    { token: '--color-success', label: 'success' },
    { token: '--color-error', label: 'error' },
    { token: '--color-warning', label: 'warning' },
    { token: '--color-info', label: 'info' },
    { token: '--color-accent', label: 'accent' },
  ];
}

const meta: Meta<TokenShowcaseComponent> = {
  title: 'Design System/Tokens',
  component: TokenShowcaseComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Aperçu des design tokens CSS custom properties du design system PIVOT (EN17.8). Source : `projects/design-system/src/scss/tokens.scss`.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<TokenShowcaseComponent>;

export const AllTokens: Story = {
  name: 'Tous les tokens',
};
