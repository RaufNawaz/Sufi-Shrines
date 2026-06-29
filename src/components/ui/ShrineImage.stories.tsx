import type { Meta, StoryObj } from '@storybook/react-vite';
import { ShrineImage } from './ShrineImage';

const meta: Meta<typeof ShrineImage> = {
  title: 'UI/ShrineImage',
  component: ShrineImage,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Lazy-loaded shrine image with a category-coloured gradient placeholder when the URL is absent or broken.',
      },
    },
  },
  argTypes: {
    category: {
      control: 'select',
      options: ['Muslim Shrine', 'Hindu Shrine', 'Sikh Shrine', 'Other'],
    },
    loading: { control: 'radio', options: ['lazy', 'eager'] },
  },
};

export default meta;
type Story = StoryObj<typeof ShrineImage>;

const REAL_IMAGE =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Data_Darbar_front_view.jpg/640px-Data_Darbar_front_view.jpg';

export const WithImage: Story = {
  args: {
    src: REAL_IMAGE,
    alt: 'Data Darbar, Lahore',
    category: 'Muslim Shrine',
    className: 'shrine-hero-img',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 480, height: 220, overflow: 'hidden', borderRadius: 8 }}>
        <Story />
      </div>
    ),
  ],
};

export const NoImage: Story = {
  name: 'Placeholder — no src',
  args: {
    src: null,
    alt: 'Shrine',
    category: 'Muslim Shrine',
    placeholderClassName: 'shrine-hero-placeholder',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 480 }}>
        <Story />
      </div>
    ),
  ],
};

export const BrokenUrl: Story = {
  name: 'Placeholder — broken URL',
  args: {
    src: 'https://example.com/does-not-exist.jpg',
    alt: 'Shrine',
    category: 'Muslim Shrine',
    placeholderClassName: 'shrine-hero-placeholder',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 480 }}>
        <Story />
      </div>
    ),
  ],
};

export const CategoryMuslim: Story = {
  name: 'Category — Muslim',
  args: { src: null, alt: 'Shrine', category: 'Muslim Shrine', placeholderClassName: 'shrine-hero-placeholder' },
  decorators: [(Story) => <div style={{ width: 280 }}><Story /></div>],
};

export const CategoryHindu: Story = {
  name: 'Category — Hindu',
  args: { src: null, alt: 'Shrine', category: 'Hindu Shrine', placeholderClassName: 'shrine-hero-placeholder' },
  decorators: [(Story) => <div style={{ width: 280 }}><Story /></div>],
};

export const CategorySikh: Story = {
  name: 'Category — Sikh',
  args: { src: null, alt: 'Shrine', category: 'Sikh Shrine', placeholderClassName: 'shrine-hero-placeholder' },
  decorators: [(Story) => <div style={{ width: 280 }}><Story /></div>],
};

export const CategoryDefault: Story = {
  name: 'Category — Default',
  args: { src: null, alt: 'Shrine', category: '', placeholderClassName: 'shrine-hero-placeholder' },
  decorators: [(Story) => <div style={{ width: 280 }}><Story /></div>],
};

export const RelatedCardSize: Story = {
  name: 'Related card size',
  args: {
    src: null,
    alt: 'Shrine',
    category: 'Sikh Shrine',
    className: 'related-card-img',
    placeholderClassName: 'related-card-img-placeholder',
  },
  decorators: [(Story) => <div style={{ width: 200 }}><Story /></div>],
};
