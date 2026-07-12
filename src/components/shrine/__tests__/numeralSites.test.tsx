import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { ShrineInfobox } from '../ShrineInfobox';
import { ContentsNav } from '../ContentsNav';
import { RelatedShrines } from '../RelatedShrines';
import { buildShrine } from '../../../lib/data/shrineModel';
import { renderWithProviders, makeShrineRow } from '../../../test/utils';

beforeEach(() => {
  localStorage.clear();
});

describe('Eastern numerals reach ShrineInfobox / ContentsNav / RelatedShrines (0.2)', () => {
  it('ShrineInfobox: founded year renders in Eastern digits in Urdu', () => {
    const shrine = buildShrine(
      makeShrineRow({ Latitude: '31.57', Longitude: '74.30', 'Founded/Opened': '1039' }),
      0,
    )!;
    renderWithProviders(<ShrineInfobox shrine={shrine} />, { lang: 'ur' });
    expect(screen.getByText('۱۰۳۹')).toBeInTheDocument();
    expect(screen.queryByText('1039')).not.toBeInTheDocument();
  });

  it('ContentsNav: item numbering renders in Eastern digits in Urdu', () => {
    renderWithProviders(
      <ContentsNav
        items={[
          { id: 'a', label: 'خلاصہ' },
          { id: 'b', label: 'تاریخ' },
        ]}
      />,
      { lang: 'ur' },
    );
    expect(screen.getByText(/^۱\./)).toBeInTheDocument();
    expect(screen.getByText(/^۲\./)).toBeInTheDocument();
  });

  it('RelatedShrines: distance renders in Eastern digits in Urdu', () => {
    const shrine = buildShrine(
      makeShrineRow({ Name: 'Shrine A', Latitude: '31.5', Longitude: '74.3' }),
      0,
    )!;
    const other = buildShrine(
      makeShrineRow({ Name: 'Shrine B', Latitude: '32.5', Longitude: '75.3' }),
      1,
    )!;
    const { container } = renderWithProviders(
      <RelatedShrines shrine={shrine} all={[shrine, other]} />,
      {
        lang: 'ur',
        route: '/',
      },
    );
    const meta = container.querySelector('.related-card-meta');
    expect(meta?.textContent).toMatch(/[۰-۹]/);
    expect(meta?.textContent).not.toMatch(/[0-9]/);
  });
});
