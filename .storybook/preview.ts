import type { Preview } from '@storybook/angular';

// Import design system tokens and styles globally for all stories
import '../projects/design-system/src/scss/tokens.scss';
import '../projects/design-system/src/scss/reset.scss';
import '../projects/design-system/src/scss/components.scss';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
