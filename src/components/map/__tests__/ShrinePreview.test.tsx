import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { ShrinePreview } from '../ShrinePreview';
import { getSavedSlugs } from '../../../lib/savedShrines';
import { buildShrine } from '../../../lib/data/shrineModel';
import { getFieldValue } from '../../../lib/data/fieldAliasing';
import { renderWithProviders, makeShrineRow } from '../../../test/utils';
import type { ShrineRow } from '../../../types/shrine';
import { loadUrduContent, resetUrduContentForTests } from '../../../lib/data/urduContentOverride';
import type { Lang } from '../../../types/shrine';

const noop = () => {};
const localizeField = (row: ShrineRow, field: string) => getFieldValue(row, field);

function renderPreview(row: ShrineRow, lang: Lang = 'en') {
  return renderWithProviders(
    <ShrinePreview
      shrine={buildShrine(row, 0)!}
      lang={lang}
      localizeField={localizeField}
      toursEnabled={false}
      onStartTour={noop}
    />,
    { route: '/' },
  );
}

describe('ShrinePreview — new columns', () => {
  it('shows the info-level badge and a plain non-Active status note', () => {
    const { container } = renderPreview(
      makeShrineRow({
        category: 'Hindu Temple',
        info_level: 'Moderate',
        status: 'Heritage',
      }),
    );

    const badge = container.querySelector('.info-level-badge--moderate')!;
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe('Documented from sources');

    expect(container.querySelector('.preview-status-note')!.textContent).toBe(
      'Heritage site — worship discontinued',
    );
  });

  it('renders no status note for Active sites', () => {
    const { container } = renderPreview(makeShrineRow({ status: 'Active' }));
    expect(container.querySelector('.preview-status-note')).not.toBeInTheDocument();
  });

  it('renders a legacy row with blank new fields cleanly — no badge, no note, no "undefined"', () => {
    const { container } = renderPreview(makeShrineRow({ Name: 'Legacy Shrine' }));

    expect(container.textContent).toContain('Legacy Shrine');
    expect(container.textContent).not.toContain('undefined');
    expect(container.querySelector('.info-level-badge')).not.toBeInTheDocument();
    expect(container.querySelector('.preview-status-note')).not.toBeInTheDocument();
  });

  it('labels a Nanakpanthi site exactly "Nanakpanthi (Hindu–Sikh)"', () => {
    const { container } = renderPreview(makeShrineRow({ category: 'Nanakpanthi / Udasi Darbar' }));
    expect(container.textContent).toContain('Nanakpanthi (Hindu–Sikh)');
  });
});

describe('ShrinePreview — save toggle', () => {
  beforeEach(() => {
    localStorage.clear();
    // Nudge the module cache past its raw-string memo of the cleared key.
    window.dispatchEvent(new Event('storage'));
  });

  it('saves and unsaves the shrine from the card, mirroring the shrine page', () => {
    const { container } = renderPreview(makeShrineRow({ Name: 'Data Darbar' }));
    const btn = container.querySelector<HTMLButtonElement>('.preview-save-btn')!;
    expect(btn).toBeInTheDocument();
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(btn.textContent).toContain('Save');

    fireEvent.click(btn);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(btn.className).toContain('is-saved');
    expect(btn.textContent).toContain('Saved');
    expect(getSavedSlugs()).toContain('data-darbar');

    fireEvent.click(btn);
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(getSavedSlugs()).not.toContain('data-darbar');
  });
});

/**
 * The seconds after a language switch, when every entry looks like one of the
 * two that have no Urdu article at all.
 *
 * `src/data/urdu-content.json` is language-gated and 253 KB: `LanguageContext`
 * requests it when the reader switches to Urdu, and until it lands
 * `getUrduFieldValue(row, 'Description')` is empty for all 169 rows. The
 * English fallback beneath it is *right* for the two entries with no Urdu
 * article and *wrong* for that window, and the row cannot tell the two apart.
 *
 * Measured on the dev server, 28 August 2026, with only that chunk delayed:
 * the whole English lead — "Allo Mahar Sharif is a village in the Daska
 * *tehsil* of Sialkot District…" — sat under an Urdu name and an Urdu category
 * for **4.7 seconds**. The e2e no-leak guard cannot see it, because it opens
 * `?lang=ur` directly and on that path `fetchShrines` awaits the payload before
 * building a row, so the window does not exist. The window belongs to the
 * switch, which no spec walked.
 */
describe('ShrinePreview — the Urdu article payload has not arrived yet', () => {
  beforeEach(() => {
    resetUrduContentForTests();
  });

  const urduRow = () =>
    makeShrineRow({
      Name: 'Allo Mahar',
      Description: 'Allo Mahar Sharif is a village in the Daska tehsil of Sialkot District.',
    });

  it('shows no lead at all rather than the English one', () => {
    const { container } = renderPreview(urduRow(), 'ur');
    expect(container.textContent).not.toContain('Sialkot District');
  });

  it('shows the English lead again once the payload is in memory, for an entry that has no Urdu article', async () => {
    await loadUrduContent();
    const { container } = renderPreview(
      makeShrineRow({
        // A name with no row in urdu-content.json, so the fallback is the real
        // answer and not a symptom of the gap above.
        Name: 'Nowhere Sharif',
        Description: 'Nowhere Sharif stands on a plain.',
      }),
      'ur',
    );
    expect(container.textContent).toContain('Nowhere Sharif stands on a plain');
  });

  it('leaves the English view untouched — the gate is about the Urdu edition only', () => {
    const { container } = renderPreview(urduRow(), 'en');
    expect(container.textContent).toContain('Sialkot District');
  });
});
