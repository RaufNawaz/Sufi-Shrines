import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { ShrinePreview } from '../ShrinePreview';
import { getSavedSlugs } from '../../../lib/savedShrines';
import { buildShrine } from '../../../lib/data/shrineModel';
import { getFieldValue } from '../../../lib/data/fieldAliasing';
import { renderWithProviders, makeShrineRow } from '../../../test/utils';
import type { ShrineRow } from '../../../types/shrine';

const noop = () => {};
const localizeField = (row: ShrineRow, field: string) => getFieldValue(row, field);

function renderPreview(row: ShrineRow) {
  return renderWithProviders(
    <ShrinePreview
      shrine={buildShrine(row, 0)!}
      lang="en"
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
