import React from 'react';
import { describe, it, expect } from 'vitest';
import { ShrineInfobox } from '../ShrineInfobox';
import { buildShrine } from '../../../lib/data/shrineModel';
import { renderWithProviders, makeShrineRow } from '../../../test/utils';

/* Each observance starts with a capital on the page; the sheet keeps its casing (Rauf, 21 Nov 2026). */
describe('ShrineInfobox — Events casing', () => {
  it('capitalises every bullet', () => {
    const shrine = buildShrine(
      makeShrineRow({ Events: 'Annual urs; qawwali and naat; daily langar' }),
      0,
    )!;
    const { container } = renderWithProviders(<ShrineInfobox shrine={shrine} />, { route: '/' });
    const items = [...container.querySelectorAll('.infobox-bullets li')].map(
      (li) => li.textContent,
    );
    expect(items).toEqual(['Annual urs', 'Qawwali and naat', 'Daily langar']);
  });

  it('capitalises a single-item value', () => {
    const shrine = buildShrine(makeShrineRow({ Events: 'daily langar' }), 0)!;
    const { container } = renderWithProviders(<ShrineInfobox shrine={shrine} />, { route: '/' });
    expect(container.textContent).toContain('Daily langar');
    expect(container.textContent).not.toContain('daily langar');
  });
});
