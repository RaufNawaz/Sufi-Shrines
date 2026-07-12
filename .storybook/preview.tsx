import React from 'react';
import type { Preview, Decorator } from '@storybook/react-vite';
import { LanguageProvider } from '../src/lib/i18n/LanguageContext';
import { ThemeProvider } from '../src/lib/i18n/ThemeContext';
// Mirror src/main.tsx's stylesheet order (vendor CSS first, then app styles)
import 'leaflet/dist/leaflet.css';
import '../src/styles/tokens.css';
import '../src/styles/global.css';
import '../src/styles/map.css';
import '../src/styles/tours.css';
import '../src/styles/components.css';
import '../src/styles/shrine.css';

const withProviders: Decorator = (Story) => (
  <ThemeProvider>
    <LanguageProvider>
      <Story />
    </LanguageProvider>
  </ThemeProvider>
);

const preview: Preview = {
  decorators: [withProviders],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'error',
    },
  },
};

export default preview;
