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
    <div class="token-showcase">
      <h1 class="token-showcase__title">
        Design Tokens — @pivot/design-system
      </h1>

      <section class="token-showcase__section">
        <h2 class="token-showcase__section-title">
          Brand colors (violet)
        </h2>
        <div class="token-showcase__grid token-showcase__grid--tight">
          @for (token of brandTokens; track token) {
            <div class="token-showcase__swatch">
              <div class="token-showcase__swatch-box token-showcase__swatch-box--square" [style.background]="'var(' + token + ')'"></div>
              <p class="token-showcase__swatch-label">{{ token }}</p>
            </div>
          }
        </div>
      </section>

      <section class="token-showcase__section">
        <h2 class="token-showcase__section-title">
          Semantic colors
        </h2>
        <div class="token-showcase__grid token-showcase__grid--loose">
          @for (s of semanticTokens; track s.token) {
            <div>
              <div class="token-showcase__swatch-box token-showcase__swatch-box--rect" [style.background]="'var(' + s.token + ')'"></div>
              <p class="token-showcase__swatch-label">{{ s.label }}</p>
            </div>
          }
        </div>
      </section>

      <section class="token-showcase__section">
        <h2 class="token-showcase__section-title">
          Typography scale
        </h2>
        <div class="token-showcase__type-scale">
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
  styles: [`
    .token-showcase { padding: 24px; font-family: var(--font-sans); }
    .token-showcase__title { font-size: var(--text-2xl); margin-bottom: 16px; color: var(--color-gray-900); }
    .token-showcase__section { margin-bottom: 32px; }
    .token-showcase__section-title { font-size: var(--text-lg); margin-bottom: 12px; color: var(--color-gray-700); }
    .token-showcase__grid { display: flex; flex-wrap: wrap; }
    .token-showcase__grid--tight { gap: 8px; }
    .token-showcase__grid--loose { gap: 16px; }
    .token-showcase__swatch { text-align: center; }
    .token-showcase__swatch-box { border-radius: 8px; }
    .token-showcase__swatch-box--square { width: 64px; height: 64px; border: 1px solid rgba(0,0,0,.1); }
    .token-showcase__swatch-box--rect { width: 80px; height: 40px; border-radius: 4px; }
    .token-showcase__swatch-label { font-size: 10px; margin-top: 4px; color: var(--color-gray-600); }
    .token-showcase__type-scale { display: flex; flex-direction: column; gap: 4px; }
  `],
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
        component: 'Aperçu des design tokens CSS custom properties du design system PIVOT (EN17.8). Source : `projects/design-system/src/scss/tokens.scss`.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<TokenShowcaseComponent>;

export const AllTokens: Story = {
  name: 'Tous les tokens',
};
