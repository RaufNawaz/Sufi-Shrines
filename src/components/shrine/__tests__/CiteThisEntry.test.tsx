import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import type { Shrine } from '../../../types/shrine';
import { CiteThisEntry } from '../CiteThisEntry';
import { buildBibtex, buildPlainCitation, citeKey, escapeBibtex } from '../../../lib/cite';
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
    kind: 'shrine' as const,
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

  it('keys the four non-shrine families by kind, because three slugs collide', () => {
    /* `bari-imam`, `lal-shahbaz-qalandar` and `shah-yousuf` are each both a
       shrine and a saint in this archive (measured against the prerendered
       route list, 30 August 2026). Unqualified, the two entries would share a
       BibTeX key and silently merge in a reader's bibliography. */
    expect(citeKey('shrine', 'bari-imam')).toBe('shrines-bari-imam');
    expect(citeKey('saint', 'bari-imam')).toBe('shrines-saint-bari-imam');
    expect(citeKey('shrine', 'bari-imam')).not.toBe(citeKey('saint', 'bari-imam'));
    for (const kind of ['saint', 'order', 'place', 'tradition'] as const) {
      expect(buildBibtex({ ...input, kind })).toMatch(
        new RegExp(`^@misc\\{shrines-${kind}-data-darbar,`),
      );
    }
  });

  it('leaves the shrine key unqualified — it is an identifier already in the wild', () => {
    /* A BibTeX key may already sit in someone's .bib file. Renaming every
       existing one for symmetry would be churn with no reader on the other
       side of it, so only the four new families take the qualified form. */
    expect(buildBibtex(input)).toMatch(/^@misc\{shrines-data-darbar,/);
  });

  it('escapes LaTeX specials so a production-sheet edit cannot break the entry', () => {
    // The slug schema itself anticipates '&' in names (SLUG_REPLACEMENTS);
    // the sheet has no review step, so any of these can arrive any day.
    expect(escapeBibtex('Shah & Sons 100% #1 _test_')).toBe('Shah \\& Sons 100\\% \\#1 \\_test\\_');
    // Single-pass: the braces of \textbackslash{} must not get re-escaped
    expect(escapeBibtex('a\\b')).toBe('a\\textbackslash{}b');
    expect(escapeBibtex('{lone')).toBe('\\{lone');
    const bib = buildBibtex({
      kind: 'shrine' as const,
      slug: 's',
      englishName: 'A & B {broken',
      url: 'https://example.test/s',
      supportLevelLabel: '',
      retrieved: '2026-08-21',
      year: 2026,
    });
    expect(bib).toContain('title = {A \\& B \\{broken}');
  });
});

function shrineProps(shrine = makeShrine()) {
  return {
    kind: 'shrine' as const,
    slug: shrine.slug,
    englishName: shrine.name,
    localizedName: shrine.name,
    supportLevel: shrine.supportLevel,
  };
}

describe('<CiteThisEntry>', () => {
  it('renders both formats behind a quiet disclosure', () => {
    renderWithProviders(<CiteThisEntry {...shrineProps()} />);
    expect(screen.getByText('Cite this entry')).toBeInTheDocument();
    expect(screen.getByText('BibTeX')).toBeInTheDocument();
  });

  it('an entity with no support level cites without asserting a blank one', () => {
    /* Support level is a property of a surveyed site. A saint, an order, a
       place and a tradition have none, and the citation must omit the clause
       rather than print an empty one — RULE 2 in the smallest possible form. */
    renderWithProviders(
      <CiteThisEntry
        kind="saint"
        slug="data-ganj-bakhsh"
        englishName="Data Ganj Bakhsh"
        localizedName="Data Ganj Bakhsh"
      />,
    );
    const text = screen.getAllByText(/Data Ganj Bakhsh/).map((n) => n.textContent ?? '');
    expect(text.some((t) => t.includes('shrines-saint-data-ganj-bakhsh'))).toBe(true);
    expect(text.every((t) => !t.includes('Support level'))).toBe(true);
  });

  it('leaks no Latin outside <bdi> in the Urdu view', () => {
    const { container } = renderWithProviders(<CiteThisEntry {...shrineProps()} />, {
      lang: 'ur',
    });
    // The citation strings (URL, BibTeX) are Latin by nature — the guard
    // passes only because the component isolates every one of them in <bdi>.
    expect(findLatinLeaks(container)).toEqual([]);
  });
});
