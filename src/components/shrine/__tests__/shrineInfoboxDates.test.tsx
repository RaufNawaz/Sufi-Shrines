import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { ShrineInfobox } from '../ShrineInfobox';
import { buildShrine } from '../../../lib/data/shrineModel';
import { renderWithProviders, makeShrineRow } from '../../../test/utils';

beforeEach(() => {
  localStorage.clear();
});

describe('ShrineInfobox — split date fields (year_built/figure_born/figure_died/event_year)', () => {
  const rowWithDates = makeShrineRow({
    'Founded/Opened': '1416 AH', // legacy value — must not also render once year_built exists
    year_built: '1416 AH',
    year_built_precision: 'uncertain / referent disputed',
    year_built_note:
      '1416 AH is the survey’s answer to the founding-year question, and is most probably the year of death, not construction.',
    figure_born: '1341 AH',
    figure_died: '25 Rabī‘ al-Thānī',
    event_year: '2005',
    event_note: 'Auqaf takeover, per the survey.',
  });

  it('renders the year_built precision qualifier and does not hide the note', () => {
    const shrine = buildShrine(rowWithDates, 0)!;
    const { container } = renderWithProviders(<ShrineInfobox shrine={shrine} />);
    expect(screen.getByText(/1416 AH \(uncertain \/ referent disputed\)/)).toBeInTheDocument();
    // The note must be visible text, not a title/tooltip attribute.
    expect(container.querySelector('.infobox-note')?.textContent).toContain(
      'most probably the year of death, not construction',
    );
  });

  it('renders Born, Died, and Event year with the event note visible', () => {
    const shrine = buildShrine(rowWithDates, 0)!;
    renderWithProviders(<ShrineInfobox shrine={shrine} />);
    expect(screen.getByText('1341 AH')).toBeInTheDocument();
    expect(screen.getByText('25 Rabī‘ al-Thānī')).toBeInTheDocument();
    expect(screen.getByText(/2005/)).toBeInTheDocument();
    expect(screen.getByText(/Auqaf takeover/)).toBeInTheDocument();
  });

  it('does not render a duplicate legacy Founded row once year_built is present', () => {
    const shrine = buildShrine(rowWithDates, 0)!;
    const { container } = renderWithProviders(<ShrineInfobox shrine={shrine} />);
    const foundedLabels = [...container.querySelectorAll('.infobox-label')].filter(
      (el) => el.textContent === 'Founded',
    );
    expect(foundedLabels).toHaveLength(1);
  });

  it('applies Eastern numerals to the year_built/born/died/event_year values in Urdu', () => {
    const shrine = buildShrine(rowWithDates, 0)!;
    renderWithProviders(<ShrineInfobox shrine={shrine} />, { lang: 'ur' });
    // The values convert to Eastern digits — the (unreviewed, English) source
    // notes are left untranslated by design and keep Western digits.
    expect(screen.getByText(/^۱۴۱۶ AH \(uncertain/)).toBeInTheDocument();
    expect(screen.getByText('۱۳۴۱ AH')).toBeInTheDocument();
    expect(screen.getByText(/^۲۰۰۵$/)).toBeInTheDocument();
  });

  it('falls back to the legacy Founded row when year_built is absent, unchanged', () => {
    const legacyOnly = buildShrine(
      makeShrineRow({ 'Founded/Opened': '1039', Latitude: '31.57', Longitude: '74.3' }),
      0,
    )!;
    const { container } = renderWithProviders(<ShrineInfobox shrine={legacyOnly} />);
    expect(screen.getByText('1039')).toBeInTheDocument();
    expect(container.querySelector('.infobox-dates')).not.toBeInTheDocument();
  });
});

describe('ShrineInfobox — internal pipeline columns never reach a visitor', () => {
  it('does not render id/flags/needs_review/qa_note as generic facts rows', () => {
    const shrine = buildShrine(
      makeShrineRow({
        id: 'allo-mahar',
        flags: 'FIGURE_MISMATCH;DESC_REWRITE',
        needs_review: 'figure_unresolved',
        qa_note: 'Internal QA scratch text that must never reach a visitor.',
      }),
      0,
    )!;
    const { container } = renderWithProviders(<ShrineInfobox shrine={shrine} />);
    const text = container.querySelector('.shrine-infobox')?.textContent ?? '';
    expect(text).not.toContain('FIGURE_MISMATCH');
    expect(text).not.toContain('figure_unresolved');
    expect(text).not.toContain('Internal QA scratch text');
    expect(text).not.toContain('allo-mahar');
  });
});
