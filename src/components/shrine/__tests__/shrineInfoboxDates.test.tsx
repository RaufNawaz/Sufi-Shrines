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

/**
 * A qualifying note is not a footnote to a year — it is often the only thing
 * the archive knows about a date, and it used to be withheld exactly when it
 * mattered most.
 *
 * `year_built_note` rendered only inside `{shrine.yearBuilt && …}`, and
 * `event_note` only inside `{shrine.eventYear && …}`. Measured against the
 * shipped snapshot on 30 August 2026: **158 entries carry a `year_built_note`
 * and 40 of them have no `year_built`.** Of those 40, 36 still showed the
 * legacy `Founded/Opened` row — which repeats the note verbatim on 6 and is
 * richer on 2, so **28 lost something real** — and **4 showed nothing about
 * their date at all**, the note being the only thing there was to show. Two
 * more entries lose an `event_note` the same way.
 *
 * Ten of the 28 are the sharp case: a bare year on the page with the sentence
 * disputing it hidden. *Mazar of Bulleh Shah* displayed **1757** and withheld
 * "Shrine developed after the saint's death". The rest hide something else
 * again — Shah Jamal's "Tomb enclosed within a modern single-domed mosque" —
 * so `year_built_note` is not reliably a date-only field, which is worth
 * knowing before anyone narrows it.
 *
 * This is a RULE 2 failure in the direction the project cares about most: the
 * archive held the qualification, `/about` counted it in "entries whose date
 * carries a written qualification", and the page did not show it.
 */
describe('ShrineInfobox — a qualifying note survives a missing year', () => {
  it('shows the note beside a legacy year, and does not duplicate the Founded row', () => {
    /* The 28-entry case, in the shape of Mazar of Bulleh Shah: a legacy year,
       no `year_built`, and a note that disputes what the year implies. */
    const shrine = buildShrine(
      makeShrineRow({
        'Founded/Opened': '1757',
        year_built_note: "Shrine developed after the saint's death",
      }),
      0,
    )!;
    const { container } = renderWithProviders(<ShrineInfobox shrine={shrine} />);

    expect(screen.getByText(/1757/)).toBeInTheDocument();
    expect(container.querySelector('.infobox-note')?.textContent).toContain(
      "Shrine developed after the saint's death",
    );
    /* The dates block takes the row over from the legacy list rather than
       rendering beside it — otherwise fixing the note prints Founded twice. */
    const foundedLabels = [...container.querySelectorAll('.infobox-label')].filter(
      (el) => el.textContent === 'Founded',
    );
    expect(foundedLabels).toHaveLength(1);
  });

  it('shows the note when there is no year of any kind — the 4-entry case', () => {
    /* Jhollay Lal Mandir, Sant Baba Bhagat Ram Darbar Mandir, Shrine of Lakhi
       Shah Saddar, Valmik Mandir. Nothing rendered at all before: `hasDates`
       was false, so the whole block was skipped. */
    const shrine = buildShrine(
      makeShrineRow({ year_built_note: 'Founding date undocumented' }),
      0,
    )!;
    const { container } = renderWithProviders(<ShrineInfobox shrine={shrine} />);
    expect(container.querySelector('.infobox-note')?.textContent).toContain(
      'Founding date undocumented',
    );
  });

  it('shows an event note with no event year — the same defect, twice over', () => {
    /* Darbar Hazrat Khawaja Feroz-ud-Din and Darbar Hazrat Tahir Bandagi
       Qadri. `event_note` sits inside `{shrine.eventYear && …}` exactly as the
       year note sat inside `{shrine.yearBuilt && …}`. */
    const shrine = buildShrine(
      makeShrineRow({ event_note: 'Annual Urs held 7th-9th Muharram; no single founding year' }),
      0,
    )!;
    const { container } = renderWithProviders(<ShrineInfobox shrine={shrine} />);
    const notes = [...container.querySelectorAll('.infobox-note')].map((n) => n.textContent ?? '');
    expect(notes.some((n) => n.includes('7th-9th Muharram'))).toBe(true);
  });
});
