import type { Meta, StoryObj } from '@storybook/react-vite';
import { TimeSlider } from './TimeSlider';
import { ERA_MIN, ERA_MAX } from '../../lib/data/era';

const meta: Meta<typeof TimeSlider> = {
  title: 'Map/TimeSlider',
  component: TimeSlider,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Dual-range century slider for filtering shrines by founding era. Persists to URL params `?eraMin=&eraMax=`.',
      },
    },
  },
  argTypes: {
    lang: { control: 'radio', options: ['en', 'ur'] },
    value: { control: false },
    onChange: { action: 'onChange' },
  },
};

export default meta;
type Story = StoryObj<typeof TimeSlider>;

export const AllEras: Story = {
  name: 'All eras (default)',
  args: { value: [ERA_MIN, ERA_MAX], lang: 'en' },
  decorators: [
    (Story) => (
      <div style={{ width: 340 }}>
        <Story />
      </div>
    ),
  ],
};

export const Filtered: Story = {
  name: 'Filtered range (10th–15th c.)',
  args: { value: [10, 15], lang: 'en' },
  decorators: [
    (Story) => (
      <div style={{ width: 340 }}>
        <Story />
      </div>
    ),
  ],
};

export const SingleCentury: Story = {
  name: 'Single century (12th)',
  args: { value: [12, 12], lang: 'en' },
  decorators: [
    (Story) => (
      <div style={{ width: 340 }}>
        <Story />
      </div>
    ),
  ],
};

export const Urdu: Story = {
  name: 'Urdu / RTL',
  args: { value: [ERA_MIN, ERA_MAX], lang: 'ur' },
  decorators: [
    (Story) => (
      <div style={{ width: 340 }} dir="rtl">
        <Story />
      </div>
    ),
  ],
};
