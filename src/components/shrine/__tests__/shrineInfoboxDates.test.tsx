import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { ShrineInfobox } from '../ShrineInfobox';
import { buildShrine } from '../../../lib/data/shrineModel';
import { renderWithProviders, makeShrineRow } from '../../../test/utils';

beforeEach(() => {
  localStorage.clear();
});

/* The founded row's precision qualifier and source note are team-facing since
   11 September 2026 (project head: "remove the notes in the founded" and "the
   approximate etc badges" from the public view). The data is unchanged and the
   team view — `?team=1`, persisted as this flag — shows every word, so the
   tests that hold the note to the page run as the team. One test below holds
   the other half: the public reads the year and nothing else. */
function asTeam() {
  localStorage.setItem('shrines_team_access', '1');
}

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

  it('renders the year_built precision qualifier and does not hide the note (team view)', () => {
    asTeam();
    const shrine = buildShrine(rowWithDates, 0)!;
    const { container } = renderWithProviders(<ShrineInfobox shrine={shrine} />);
    expect(screen.getByText(/1416 AH \(uncertain \/ referent disputed\)/)).toBeInTheDocument();
    // The note must be visible text, not a title/tooltip attribute.
    expect(container.querySelector('.infobox-note')?.textContent).toContain(
      'most probably the year of death, not construction',
    );
  });

  it('shows the public the year alone — no qualifier, no founded note', () => {
    const shrine = buildShrine(rowWithDates, 0)!;
    const { container } = renderWithProviders(<ShrineInfobox shrine={shrine} />);
    const founded = [...container.querySelectorAll('.infobox-row')].find(
      (row) => row.querySelector('.infobox-label')?.textContent === 'Founded',
    )!;
    expect(founded).toBeTruthy();
    expect(founded.querySelector('.infobox-value')?.textContent?.trim()).toBe('1416 AH');
    expect(founded.querySelector('.infobox-note')).toBeNull();
    /* The event note is not part of the ruling and stays. */
    expect(container.textContent).toContain('Auqaf takeover, per the survey.');
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
    asTeam();
    const shrine = buildShrine(rowWithDates, 0)!;
    renderWithProviders(<ShrineInfobox shrine={shrine} />, { lang: 'ur' });
    // The values convert to Eastern digits — the (unreviewed, English) source
    // notes are left untranslated by design and keep Western digits.
    expect(screen.getByText(/^۱۴۱۶ AH \(uncertain/)).toBeInTheDocument();
    /* Born and died read their month and calendar in Urdu too since 29 October
       2026 (localizeRecordedDate, as on the saint pages), so the era is ہجری. */
    expect(screen.getByText('۱۳۴۱ ہجری')).toBeInTheDocument();
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
    asTeam();
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
    asTeam();
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

/**
 * A figure date is recorded with its qualification (RULE 2), and the infobox
 * used to print the whole cell. Shah Inayat Qadiri's birth put three lines of
 * English into the Urdu fact panel (Rauf, 29 October 2026: "there is english
 * leakage"). The founded row's rule now holds here: the public reads the date,
 * the team reads the date and every word after it.
 */
describe('ShrineInfobox — a figure date and its qualification', () => {
  const inayat = makeShrineRow({
    figure_born:
      'c. 1643 (existing sourcing); a 2026 field survey separately gives 1056 AH (~1646 CE) -- the two are consistent within the normal margin of approximate dating',
    figure_died: 'c. 1728',
  });
  const bornRow = (container: HTMLElement, label: string) =>
    [...container.querySelectorAll('.infobox-row')].find(
      (row) => row.querySelector('.infobox-label')?.textContent === label,
    );

  it('shows the public the date alone', () => {
    const { container } = renderWithProviders(<ShrineInfobox shrine={buildShrine(inayat, 0)!} />);
    const born = bornRow(container, 'Born')!;
    expect(born.querySelector('.infobox-value')?.textContent?.trim()).toBe('c. 1643');
    expect(container.textContent).not.toContain('field survey');
  });

  it('shows the team the date and, beneath it, every word that followed', () => {
    asTeam();
    const { container } = renderWithProviders(<ShrineInfobox shrine={buildShrine(inayat, 0)!} />);
    const born = bornRow(container, 'Born')!;
    expect(born.querySelector('.infobox-note')?.textContent).toContain(
      'a 2026 field survey separately gives 1056 AH',
    );
  });

  it('puts no Latin letter in the Urdu public panel for it', () => {
    const { container } = renderWithProviders(<ShrineInfobox shrine={buildShrine(inayat, 0)!} />, {
      lang: 'ur',
    });
    const born =
      bornRow(container, 'پیدائش') ?? container.querySelector('.infobox-dates .infobox-row');
    expect(born?.textContent).toContain('۱۶۴۳');
    expect(container.querySelector('.infobox-dates')?.textContent ?? '').not.toMatch(/[A-Za-z]/);
  });

  it('shows the public nothing for a cell with no date in it, and the team the sentence', () => {
    const noDate = makeShrineRow({
      figure_born: 'Not given. The only early date is "educated in Georgia in 993 AD" (Q9).',
    });
    const pub = renderWithProviders(<ShrineInfobox shrine={buildShrine(noDate, 0)!} />);
    expect(pub.container.textContent).not.toContain('Not given');
    pub.unmount();
    asTeam();
    const team = renderWithProviders(<ShrineInfobox shrine={buildShrine(noDate, 0)!} />);
    expect(team.container.textContent).toContain('Not given. The only early date');
  });
});

/* Five founded cells are sentences, and three had no Urdu, so the Urdu
   founded row showed them as an English note (Rauf, 30 October 2026: "Just
   write the sentence in urdu"). The cell is read through the dictionary now,
   as the legacy Founded/Opened always was. */
describe('ShrineInfobox — a founded sentence in Urdu', () => {
  it('reads Bibi Pak Daman’s founded sentence in Urdu, every Latin letter gone', async () => {
    const { loadUrduSeed } = await import('../../../lib/i18n/urduFallback');
    await loadUrduSeed();
    const shrine = buildShrine(
      makeShrineRow({
        year_built:
          '681 CE / c. 63 AH (popular tradition) — see note; second tradition dates the events to the early 13th century CE',
      }),
      0,
    )!;
    const { container } = renderWithProviders(<ShrineInfobox shrine={shrine} />, { lang: 'ur' });
    const dates = container.querySelector('.infobox-dates')?.textContent ?? '';
    expect(dates).toContain('عوامی روایت');
    expect(dates).not.toMatch(/[A-Za-z]/);
  });
});
