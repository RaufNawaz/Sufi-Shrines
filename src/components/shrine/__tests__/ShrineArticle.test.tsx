import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShrineArticle } from '../ShrineArticle';
import { LanguageProvider } from '../../../lib/i18n/LanguageContext';
import type { Shrine } from '../../../types/shrine';
import { buildShrine } from '../../../lib/data/shrineModel';

// ShrineGallery uses an IntersectionObserver that jsdom doesn't provide
vi.mock('../ShrineGallery', () => ({
  ShrineGallery: () => null,
}));
// ContentsNav renders a nav — works in jsdom without mocking
// Leaflet is not used in ShrineArticle, so no Leaflet mock needed

function Wrapper({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

function makeShrine(overrides: Partial<Parameters<typeof buildShrine>[0]> = {}): Shrine {
  const row = {
    Name: 'Data Darbar',
    Latitude: '31.57',
    Longitude: '74.30',
    Category: 'Muslim Shrine',
    Location: 'Lahore',
    'Sufi Saint': 'Hazrat Data Ganj Bakhsh',
    Description: 'A great shrine in Lahore.\n\n## History\n\nBuilt in the 11th century.',
    ...overrides,
  };
  return buildShrine(row, 0)!;
}

describe('ShrineArticle', () => {
  it('renders lead text when Description starts with prose', () => {
    const shrine = makeShrine({ Description: 'This is the overview paragraph.\n\n## History\n\nOld stuff.' });
    render(<ShrineArticle shrine={shrine} />, { wrapper: Wrapper });
    expect(screen.getByText('This is the overview paragraph.')).toBeInTheDocument();
  });

  it('renders inline section headings from Description', () => {
    const shrine = makeShrine({
      Description: 'Lead text here.\n\n## History\n\nHistorical content.\n\n## Architecture\n\nGrand domes.',
    });
    render(<ShrineArticle shrine={shrine} />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Architecture' })).toBeInTheDocument();
    expect(screen.getByText('Historical content.')).toBeInTheDocument();
  });

  it('renders section content when Description starts with a heading (no lead paragraph)', () => {
    const shrine = makeShrine({ Description: '## History\n\nThis shrine was founded in the 11th century.' });
    render(<ShrineArticle shrine={shrine} />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
    expect(screen.getByText('This shrine was founded in the 11th century.')).toBeInTheDocument();
  });

  it('renders raw description as fallback when no structured content found', () => {
    const shrine = makeShrine({ Description: 'Plain prose with no headings at all.' });
    render(<ShrineArticle shrine={shrine} />, { wrapper: Wrapper });
    // Should appear as either lead text or raw fallback
    expect(screen.getByText('Plain prose with no headings at all.')).toBeInTheDocument();
  });

  it('renders column sections (History, Architecture, etc.) from dedicated columns', () => {
    const shrine = makeShrine({
      Description: '',
      History: 'Founded in the 11th century by a Sufi saint.',
      Architecture: 'Large central dome with four minarets.',
    });
    render(<ShrineArticle shrine={shrine} />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
    expect(screen.getByText('Founded in the 11th century by a Sufi saint.')).toBeInTheDocument();
  });

  it('does not crash when shrine has no description or sections', () => {
    const shrine = makeShrine({ Description: '' });
    render(<ShrineArticle shrine={shrine} />, { wrapper: Wrapper });
    // Should render without throwing — just empty article
  });
});
