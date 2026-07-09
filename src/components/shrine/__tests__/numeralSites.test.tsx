import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../../lib/i18n/LanguageContext';
import { ShrineInfobox } from '../ShrineInfobox';
import { ContentsNav } from '../ContentsNav';
import { RelatedShrines } from '../RelatedShrines';
import { buildShrine } from '../../../lib/data/shrineModel';

function renderInUrdu(children: React.ReactNode) {
  localStorage.setItem('shrines_language', 'ur');
  return render(<LanguageProvider>{children}</LanguageProvider>);
}

beforeEach(() => {
  localStorage.clear();
});

describe('Eastern numerals reach ShrineInfobox / ContentsNav / RelatedShrines (0.2)', () => {
  it('ShrineInfobox: founded year renders in Eastern digits in Urdu', () => {
    const shrine = buildShrine(
      {
        Name: 'Data Darbar',
        Latitude: '31.57',
        Longitude: '74.30',
        Category: 'Muslim Shrine',
        'Founded/Opened': '1039',
      },
      0,
    )!;
    renderInUrdu(<ShrineInfobox shrine={shrine} />);
    expect(screen.getByText('۱۰۳۹')).toBeInTheDocument();
    expect(screen.queryByText('1039')).not.toBeInTheDocument();
  });

  it('ContentsNav: item numbering renders in Eastern digits in Urdu', () => {
    renderInUrdu(
      <ContentsNav
        items={[
          { id: 'a', label: 'خلاصہ' },
          { id: 'b', label: 'تاریخ' },
        ]}
      />,
    );
    expect(screen.getByText(/^۱\./)).toBeInTheDocument();
    expect(screen.getByText(/^۲\./)).toBeInTheDocument();
  });

  it('RelatedShrines: distance renders in Eastern digits in Urdu', () => {
    const shrine = buildShrine(
      { Name: 'Shrine A', Latitude: '31.5', Longitude: '74.3', Category: 'Muslim Shrine' },
      0,
    )!;
    const other = buildShrine(
      { Name: 'Shrine B', Latitude: '32.5', Longitude: '75.3', Category: 'Muslim Shrine' },
      1,
    )!;
    const { container } = renderInUrdu(
      <MemoryRouter>
        <RelatedShrines shrine={shrine} all={[shrine, other]} />
      </MemoryRouter>,
    );
    const meta = container.querySelector('.related-card-meta');
    expect(meta?.textContent).toMatch(/[۰-۹]/);
    expect(meta?.textContent).not.toMatch(/[0-9]/);
  });
});
