import React from 'react';
import { describe, it, expect } from 'vitest';
import { ZiyaratPrintPack } from '../ZiyaratPrintPack';
import { buildShrine } from '../../../lib/data/shrineModel';
import { renderWithProviders, makeShrineRow } from '../../../test/utils';

const DATA_DARBAR = buildShrine(
  makeShrineRow({
    Name: 'Data Darbar',
    Latitude: '31.5789',
    Longitude: '74.3046',
    category: 'Muslim Shrine',
    // A fixed Gregorian date the almanac can always project.
    Events: 'Annual urs on 20 February.',
  }),
  0,
)!;

const NO_DATE = buildShrine(
  makeShrineRow({ Name: 'Quiet Place', Latitude: '30.1', Longitude: '71.2' }),
  1,
)!;

describe('ZiyaratPrintPack', () => {
  it('lists every saved shrine with place, category, and Western coordinates', () => {
    const { container } = renderWithProviders(
      <ZiyaratPrintPack shrines={[DATA_DARBAR, NO_DATE]} />,
    );
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.textContent).toContain('Data Darbar');
    expect(container.textContent).toContain('Muslim Shrine');
    expect(container.textContent).toContain('31.5789, 74.3046');
  });

  it('carries the next observance window only where one can be computed', () => {
    const { container } = renderWithProviders(
      <ZiyaratPrintPack shrines={[DATA_DARBAR, NO_DATE]} />,
    );
    const [withUrs, without] = Array.from(container.querySelectorAll('li'));
    expect(withUrs!.textContent).toContain('Urs & observances');
    expect(withUrs!.textContent).toMatch(/February|فروری/);
    // No invented dates for the shrine the archive records nothing for.
    expect(without!.textContent).not.toContain('Urs & observances');
  });

  it('keeps coordinates in Western digits in the Urdu view', () => {
    const { container } = renderWithProviders(<ZiyaratPrintPack shrines={[DATA_DARBAR]} />, {
      lang: 'ur',
    });
    expect(container.querySelector('.ziyarat-print-coords')!.textContent).toContain(
      '31.5789, 74.3046',
    );
    expect(container.textContent).toContain('میری زیارت کی فہرست');
  });
});
