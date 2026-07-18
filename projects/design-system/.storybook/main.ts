import type { StorybookConfig } from '@storybook/angular';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.ts'],
  // Storybook 10 : addon-essentials est fusionné dans le core (controls/actions/
  // viewport/backgrounds/toolbars). Seul addon-docs reste un paquet séparé et fournit
  // le rendu autodocs (`tags: ['autodocs']`) + les blocs de doc utilisés par les stories.
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/angular',
    options: {},
  },
};

export default config;
