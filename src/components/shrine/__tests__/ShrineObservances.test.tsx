import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Shrine } from '../../../types/shrine';
import { ShrineObservances } from '../ShrineObservances';
import { renderWithProviders, findLatinLeaks, makeShrineRow } from '../../../test/utils';
import { UI_TEXT } from '../../../lib/i18n/uiStrings';

function makeShrine(events: string): Shrine {
  return {
    id: 1,
    slug: 'data-darbar',
    name: 'Data Darbar',
    raw: makeShrineRow({ Events: events }),
  } as Shrine;
}

function renderIt(events: string, lang: 'en' | 'ur' = 'en') {
  return renderWithProviders(
    <MemoryRouter>
      <ShrineObservances shrine={makeShrine(events)} />
    </MemoryRouter>,
    { lang },
  );
}

describe('<ShrineObservances>', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the next projected window for a Hijri urs, flagged approximate (team view)', () => {
    /* The per-date "approximate" pill is team-facing since 11 September 2026
       (project head); the public reads the dates and the calendar page's one
       moon-sighting caveat. `?team=1` persists as this flag. */
    localStorage.setItem('shrines_team_access', '1');
    renderIt('Annual urs (18-20 Safar); Thursday-evening qawwali');
    expect(screen.getByText(UI_TEXT.en.obsHeading)).toBeInTheDocument();
    // A Hijri projection is a forecast, and the team view must say so (RULE 2).
    expect(screen.getByText(UI_TEXT.en.almanacApproximate)).toBeInTheDocument();
    // The source date is always shown beside the projection.
    expect(screen.getByText(/18–20 Safar/)).toBeInTheDocument();
  });

  it('shows the public the projected window and the recorded date, without the pill', () => {
    renderIt('Annual urs (18-20 Safar); Thursday-evening qawwali');
    expect(screen.getByText(/18–20 Safar/)).toBeInTheDocument();
    expect(screen.queryByText(UI_TEXT.en.almanacApproximate)).not.toBeInTheDocument();
  });

  it('offers a calendar download for a dated observance', () => {
    renderIt('Annual urs (18-20 Safar)');
    expect(screen.getByRole('button', { name: UI_TEXT.en.almanacDownloadIcs })).toBeInTheDocument();
  });

  it('deep-links to the shrine anchor in the almanac', () => {
    renderIt('Annual urs (18-20 Safar)');
    const link = screen.getByText(UI_TEXT.en.obsViewAlmanac).closest('a');
    expect(link?.getAttribute('href')).toBe('/almanac#data-darbar');
  });

  it('renders nothing when no observance is recorded — a quiet absence, not an empty box', () => {
    const { container } = renderIt('');
    expect(container.querySelector('.shrine-observances')).toBeNull();
  });

  it('renders nothing for an undated observance (the infobox already shows the raw text)', () => {
    const { container } = renderIt('Annual urs; date not recorded');
    expect(container.querySelector('.shrine-observances')).toBeNull();
  });

  it('leaks no Latin outside <bdi>/links in the Urdu view', () => {
    const { container } = renderIt('Annual urs (18-20 Safar)', 'ur');
    expect(findLatinLeaks(container)).toEqual([]);
  });
});
