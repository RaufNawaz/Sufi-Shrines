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
  it('sets a quoted couplet as a verse block, one line per hemistich', () => {
    const shrine = makeShrine({
      Description:
        'Lead prose about the saint.\n\n' +
        'کاگا سب تن کھائیو، چُن چُن کھائیو ماس\nدوے نیناں مت کھائیو، مینوں پِیا ملن دی آس\n\n' +
        'More prose after the verse.',
    });
    const { container } = renderWithProviders(<ShrineArticle shrine={shrine} />);
    const verse = container.querySelector('blockquote.article-verse');
    expect(verse).not.toBeNull();
    // Each hemistich is its own line — the failure mode was both collapsing
    // into one run-on prose line.
    expect(verse!.querySelectorAll('.article-verse-line')).toHaveLength(2);
    expect(verse).toHaveAttribute('dir', 'rtl');
    // The prose around it stays ordinary paragraphs.
    expect(screen.getByText('More prose after the verse.').tagName).toBe('P');
  });

  it('never mistakes a multi-line list or Latin paragraph for verse', () => {
    const shrine = makeShrine({
      Description: 'Lead.\n\n- point one\n- point two\n\nPlain line one\nPlain line two.',
    });
    const { container } = renderWithProviders(<ShrineArticle shrine={shrine} />);
    expect(container.querySelector('blockquote.article-verse')).toBeNull();
  });

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

  it('renders **bold** markdown as <strong>, not literal asterisks', () => {
    const shrine = makeShrine({
      Description: 'Lead text.\n\n## History\n\nSee **The Great Book** for details.',
    });
    renderWithProviders(<ShrineArticle shrine={shrine} />);
    const strong = screen.getByText('The Great Book');
    expect(strong.tagName).toBe('STRONG');
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
  });

  it('renders the Sources section as a bulleted list, one <li> per line', () => {
    const shrine = makeShrine({
      Description: '',
      Sources: '**Book One**, Author A, 1990\n**Book Two**, Author B, 2001',
    });
    const { container } = renderWithProviders(<ShrineArticle shrine={shrine} />);
    const items = container.querySelectorAll('#sources li');
    expect(items).toHaveLength(2);
    expect(items[0].querySelector('strong')?.textContent).toBe('Book One');
    expect(items[1].querySelector('strong')?.textContent).toBe('Book Two');
  });

  it('strips a hand-authored leading "- " marker from Sources lines', () => {
    // Real shrine prose often already types its own "- " per line — without
    // stripping it, the browser's real <li> bullet doubles up with it.
    const shrine = makeShrine({
      Description: '',
      Sources: '- **Book One**, Author A, 1990\n- Book Two, Author B, 2001',
    });
    const { container } = renderWithProviders(<ShrineArticle shrine={shrine} />);
    const items = [...container.querySelectorAll('#sources li')].map((li) => li.textContent);
    expect(items).toEqual(['Book One, Author A, 1990', 'Book Two, Author B, 2001']);
  });

  it('renders an inline "## Bibliography" heading as a bulleted list too', () => {
    // This is the shape real shrine prose actually uses today (no dedicated
    // Sources column exists yet) — confirmed against the live sheet, which
    // has ~111 "## Bibliography" headings and zero "## Sources" ones.
    const shrine = makeShrine({
      Description:
        'Lead text.\n\n## Bibliography\n\n**Book One**, Author A, 1990\n**Book Two**, Author B, 2001',
    });
    const { container } = renderWithProviders(<ShrineArticle shrine={shrine} />);
    const items = container.querySelectorAll('#bibliography li');
    expect(items).toHaveLength(2);
    expect(items[0].querySelector('strong')?.textContent).toBe('Book One');
  });

  it('keeps non-sources sections rendered as paragraphs, not lists', () => {
    const shrine = makeShrine({
      Description: '',
      History: 'Line one of the history.\nLine two of the history.',
    });
    const { container } = renderWithProviders(<ShrineArticle shrine={shrine} />);
    expect(container.querySelector('#history ul')).not.toBeInTheDocument();
    expect(container.querySelector('#history p')).toBeInTheDocument();
  });
});
