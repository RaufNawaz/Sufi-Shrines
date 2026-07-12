import type { Meta, StoryObj } from '@storybook/react-vite';
import { DarkModeToggle } from './DarkModeToggle';

const meta: Meta<typeof DarkModeToggle> = {
  title: 'UI/DarkModeToggle',
  component: DarkModeToggle,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Icon button that cycles between light and dark theme. Persists to localStorage.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof DarkModeToggle>;

export const Default: Story = {};
