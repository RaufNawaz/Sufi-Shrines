import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import type { Shrine } from '../../../types/shrine';
import { CiteThisEntry } from '../CiteThisEntry';
import { buildBibtex, buildPlainCitation } from '../../../lib/cite';
import { renderWithProviders, findLatinLeaks, makeShrineRow } from '../../../test/utils';

function makeShrine(overrides: Partial<Shrine> = {}): Shrine {
  return {
    id: 1,
    slug: 'data-darbar',
    name: 'Data Darbar',
    supportLevel: 'Field-verified',
    raw: makeShrineRow(),
    ...overrides,
  } as Shrine;
}

describe('citation builders', () => {
  const input = {
    slug: 'data-darbar',
    name: 'Data Darbar',
    englishName: 'Data Darbar',
    url: 'https://example.test/shrine/data-darbar',
    supportLevelLabel: 'Field-verified',
    retrieved: '2026-08-21',
    year: 2026,
  };

  it('plain citation carries the support level — the honesty travels with the footnote', () => {
    const cite = buildPlainCitation('en', input);
    expect(cite).toContain('Support level: Field-verified');
    expect(cite).toContain('"Data Darbar."');
    expect(cite).toContain(input.url);
  });

  it('omits the support clause when the entry has none, instead of asserting a blank', () => {
    const cite = buildPlainCitation('en', { ...input, supportLevelLabel: '' });
    expect(cite).not.toContain('Support level');
  });

  it('Urdu plain citation is Urdu prose around the URL', () => {
    const cite = buildPlainCitation('ur', {
      ...input,
      name: 'داتا دربار',
      supportLevelLabel: 'میدان میں تصدیق شدہ',
    });
    expect(cite).toContain('داتا دربار');
    expect(cite).toContain(input.url);
    // No Latin outside the URL itself
    expect(cite.replace(input.url, '')).not.toMatch(/[A-Za-z]/);
  });

  it('BibTeX is valid-shaped, keyed by slug, and always Latin', () => {
    const bib = buildBibtex(input);
    expect(bib).toMatch(/^@misc\{shrines-data-darbar,/);
    expect(bib).toContain('title = {Data Darbar}');
    expect(bib).toContain('year = {2026}');
    expect(bib).toContain('note = {Support level: Field-verified. Retrieved 2026-08-21}');
    // Balanced braces — an unbalanced BibTeX entry breaks the consuming tool
    expect(bib.split('{').length).toBe(bib.split('}').length);
  });
});

describe('<CiteThisEntry>', () => {
  it('renders both formats behind a quiet disclosure', () => {
    renderWithProviders(<CiteThisEntry shrine={makeShrine()} />);
    expect(screen.getByText('Cite this entry')).toBeInTheDocument();
    expect(screen.getByText('BibTeX')).toBeInTheDocument();
  });

  it('leaks no Latin outside <bdi> in the Urdu view', () => {
    const { container } = renderWithProviders(<CiteThisEntry shrine={makeShrine()} />, {
      lang: 'ur',
    });
    // The citation strings (URL, BibTeX) are Latin by nature — the guard
    // passes only because the component isolates every one of them in <bdi>.
    expect(findLatinLeaks(container)).toEqual([]);
  });
});
