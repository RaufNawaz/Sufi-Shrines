import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { ShrineArticle } from '../ShrineArticle';
import type { Shrine, ShrineRow } from '../../../types/shrine';
import { buildShrine } from '../../../lib/data/shrineModel';
import { renderWithProviders, makeShrineRow } from '../../../test/utils';

// ShrineGallery uses an IntersectionObserver that jsdom doesn't provide
vi.mock('../ShrineGallery', async () =>
  (await import('../../../test/utils')).shrineGalleryMockFactory(),
);
// ContentsNav renders a nav — works in jsdom without mocking
// Leaflet is not used in ShrineArticle, so no Leaflet mock needed

function makeShrine(overrides: Partial<ShrineRow> = {}): Shrine {
  return buildShrine(
    makeShrineRow({
      Location: 'Lahore',
      'Sufi Saint': 'Hazrat Data Ganj Bakhsh',
      Description: 'A great shrine in Lahore.\n\n## History\n\nBuilt in the 11th century.',
      ...overrides,
    }),
    0,
  )!;
}

describe('ShrineArticle', () => {
  it('renders lead text when Description starts with prose', () => {
    const shrine = makeShrine({
      Description: 'This is the overview paragraph.\n\n## History\n\nOld stuff.',
    });
    renderWithProviders(<ShrineArticle shrine={shrine} />);
    expect(screen.getByText('This is the overview paragraph.')).toBeInTheDocument();
  });

  it('renders inline section headings from Description', () => {
    const shrine = makeShrine({
      Description:
        'Lead text here.\n\n## History\n\nHistorical content.\n\n## Architecture\n\nGrand domes.',
    });
    renderWithProviders(<ShrineArticle shrine={shrine} />);
    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Architecture' })).toBeInTheDocument();
    expect(screen.getByText('Historical content.')).toBeInTheDocument();
  });

  it('renders section content when Description starts with a heading (no lead paragraph)', () => {
    const shrine = makeShrine({
      Description: '## History\n\nThis shrine was founded in the 11th century.',
    });
    renderWithProviders(<ShrineArticle shrine={shrine} />);
    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
    expect(screen.getByText('This shrine was founded in the 11th century.')).toBeInTheDocument();
  });

  it('renders raw description as fallback when no structured content found', () => {
    const shrine = makeShrine({ Description: 'Plain prose with no headings at all.' });
    renderWithProviders(<ShrineArticle shrine={shrine} />);
    // Should appear as either lead text or raw fallback
    expect(screen.getByText('Plain prose with no headings at all.')).toBeInTheDocument();
  });

  it('renders column sections (History, Architecture, etc.) from dedicated columns', () => {
    const shrine = makeShrine({
      Description: '',
      History: 'Founded in the 11th century by a Sufi saint.',
      Architecture: 'Large central dome with four minarets.',
    });
    renderWithProviders(<ShrineArticle shrine={shrine} />);
    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
    expect(screen.getByText('Founded in the 11th century by a Sufi saint.')).toBeInTheDocument();
  });

  it('does not crash when shrine has no description or sections', () => {
    const shrine = makeShrine({ Description: '' });
    renderWithProviders(<ShrineArticle shrine={shrine} />);
    // Should render without throwing — just empty article
  });
});
