import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent } from '@testing-library/react';
import { MapSidebar } from '../MapSidebar';
import { buildShrine } from '../../../lib/data/shrineModel';
import { renderWithProviders, makeShrineRow } from '../../../test/utils';
import type { Shrine } from '../../../types/shrine';

vi.mock('../../../lib/search/useSearch', () => ({
  useSearch: (_shrines: unknown, query: string) => {
    if (!query.trim()) return { ids: null, query };
    // Fixed rank for the search-ordering test below: shrine id 0 ("Best
    // Match") ranks ahead of id 1 ("Weak Match") regardless of category —
    // real MiniSearch ranking isn't under test here, only that MapSidebar
    // renders in whatever order useSearch returns.
    return { ids: [0, 1], query };
  },
}));

const noop = () => {};

function makeShrines(): Shrine[] {
  return [
    buildShrine(makeShrineRow({ Name: 'Shrine A', 'Sufi Saint': 'Saint One' }), 0)!,
    buildShrine(makeShrineRow({ Name: 'Shrine B', 'Sufi Saint': 'Saint Two' }), 1)!,
  ];
}

function renderSidebar(overrides: Partial<React.ComponentProps<typeof MapSidebar>> = {}) {
  return renderWithProviders(
    <MapSidebar
      shrines={makeShrines()}
      selectedId={null}
      loading={false}
      error={null}
      onSelect={noop}
      onRetry={noop}
      isOpen={true}
      activeCategory=""
      onCategoryChange={noop}
      activeRegion=""
      onRegionChange={noop}
      activeSaint=""
      onSaintChange={noop}
      eraMin={5}
      eraMax={21}
      onEraChange={noop}
      toursEnabled={true}
      onToursToggle={noop}
      activeTour={null}
      activeTourStop={0}
      activeTourShrine={null}
      onStartTour={noop}
      onResumeTour={noop}
      onTourNext={noop}
      onTourPrev={noop}
      onTourExit={noop}
      {...overrides}
    />,
    { route: '/' },
  );
}

describe('MapSidebar — More filters disclosure', () => {
  it('hides saint chips and the era slider by default, revealing them via the toggle', () => {
    renderSidebar();
    fireEvent.click(document.querySelector('.list-toggle-btn')!);

    expect(document.querySelector('.time-slider')).not.toBeInTheDocument();
    expect(document.querySelector('[aria-label="Filter by Sufi saint"]')).not.toBeInTheDocument();

    fireEvent.click(document.querySelector('.more-filters-toggle')!);

    expect(document.querySelector('.time-slider')).toBeInTheDocument();
    expect(document.querySelector('[aria-label="Filter by Sufi saint"]')).toBeInTheDocument();
  });

  it('shows the active-filter dot on the collapsed toggle when a saint filter is set', () => {
    renderSidebar({ activeSaint: 'Saint One' });
    fireEvent.click(document.querySelector('.list-toggle-btn')!);

    const toggle = document.querySelector('.more-filters-toggle')!;
    expect(toggle.querySelector('.filter-active-dot')).toBeInTheDocument();
    // Still collapsed — the dot is visible without expanding the section.
    expect(document.querySelector('.time-slider')).not.toBeInTheDocument();
  });

  it('shows no active-filter dot on the toggle when neither saint nor era is set', () => {
    renderSidebar();
    fireEvent.click(document.querySelector('.list-toggle-btn')!);

    const toggle = document.querySelector('.more-filters-toggle')!;
    expect(toggle.querySelector('.filter-active-dot')).not.toBeInTheDocument();
  });
});

describe('MapSidebar — search result ordering', () => {
  it('shows the strongest match first as one flat list, even across category boundaries', async () => {
    // Regression test for the real bug: grouping matches by category and
    // sorting those groups alphabetically buries a strong match in a
    // later-sorting category under a weak match in an earlier-sorting one
    // ("Aardvark Category" < "Zoo Category"), no matter how the individual
    // items are ranked. Searching must show one rank-ordered list instead.
    vi.useFakeTimers();
    try {
      const shrines: Shrine[] = [
        buildShrine(makeShrineRow({ Name: 'Best Match', Category: 'Zoo Category' }), 0)!,
        buildShrine(makeShrineRow({ Name: 'Weak Match', Category: 'Aardvark Category' }), 1)!,
      ];
      renderSidebar({ shrines });
      fireEvent.click(document.querySelector('.list-toggle-btn')!);
      fireEvent.change(document.querySelector('.search-input')!, { target: { value: 'match' } });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(250);
      });

      expect(document.querySelectorAll('.shrine-list-group-heading')).toHaveLength(0);
      const names = [...document.querySelectorAll('.shrine-list-name')].map((el) => el.textContent);
      expect(names).toEqual(['Best Match', 'Weak Match']);
    } finally {
      vi.useRealTimers();
    }
  });
});
