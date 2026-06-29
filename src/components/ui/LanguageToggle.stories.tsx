import type { Meta, StoryObj } from '@storybook/react-vite';
import { LanguageToggle } from './LanguageToggle';

const meta: Meta<typeof LanguageToggle> = {
  title: 'UI/LanguageToggle',
  component: LanguageToggle,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Segmented EN / اردو toggle. Persists selection to localStorage and URL param `?lang=`.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof LanguageToggle>;

export const Default: Story = {};
