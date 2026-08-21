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
      activeCategories={[]}
      onCategoriesChange={noop}
      verifiedOnly={false}
      onVerifiedOnlyChange={noop}
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

/**
 * The filters moved into the command palette.
 *
 * They used to be five chip rows under the sidebar's search field; they are now
 * behind the button at the trailing end of the palette's input (see
 * CommandPalette.tsx). The chips themselves are unchanged — same component
 * (ShrineFilters), same class names, same behaviour — so these tests only need
 * to walk the two extra clicks a reader now walks. That is the point of moving
 * the JSX rather than rewriting it.
 */
function openFilters() {
  fireEvent.click(document.querySelector('.list-toggle-btn')!);
  fireEvent.click(document.querySelector('.palette-trigger')!);
  fireEvent.click(document.querySelector('.palette-filters-btn')!);
}

/** Opens the palette without its filters drawer — for search itself. */
function openPalette() {
  fireEvent.click(document.querySelector('.list-toggle-btn')!);
  fireEvent.click(document.querySelector('.palette-trigger')!);
}

describe('MapSidebar — More filters disclosure', () => {
  it('hides saint chips and the era slider by default, revealing them via the toggle', () => {
    renderSidebar();
    openFilters();

    expect(document.querySelector('.time-slider')).not.toBeInTheDocument();
    expect(document.querySelector('[aria-label="Filter by Sufi saint"]')).not.toBeInTheDocument();

    fireEvent.click(document.querySelector('.more-filters-toggle')!);

    expect(document.querySelector('.time-slider')).toBeInTheDocument();
    expect(document.querySelector('[aria-label="Filter by Sufi saint"]')).toBeInTheDocument();
  });

  it('shows the active-filter dot on the collapsed toggle when a saint filter is set', () => {
    renderSidebar({ activeSaint: 'Saint One' });
    openFilters();

    const toggle = document.querySelector('.more-filters-toggle')!;
    expect(toggle.querySelector('.filter-active-dot')).toBeInTheDocument();
    // Still collapsed — the dot is visible without expanding the section.
    expect(document.querySelector('.time-slider')).not.toBeInTheDocument();
  });

  it('shows no active-filter dot on the toggle when neither saint nor era is set', () => {
    renderSidebar();
    openFilters();

    const toggle = document.querySelector('.more-filters-toggle')!;
    expect(toggle.querySelector('.filter-active-dot')).not.toBeInTheDocument();
  });
});

describe('MapSidebar — six-category filters', () => {
  const SIX_CATEGORIES = [
    'Muslim Shrine',
    'Hindu Temple',
    'Sikh Gurdwara',
    'Nanakpanthi / Udasi Darbar',
    'Jain Temple',
    'Secular / Memorial',
  ];

  // One shrine per new-column `category` value; the legacy `Category` column
  // stays present (makeShrineRow default) to prove the new column drives.
  function makeSixCategoryShrines(): Shrine[] {
    return SIX_CATEGORIES.map((category, i) =>
      buildShrine(makeShrineRow({ Name: `Shrine ${i}`, category }), i)!,
    );
  }

  function chipButtons(): HTMLButtonElement[] {
    return [
      ...document.querySelectorAll<HTMLButtonElement>(
        '[aria-label="Filter by category"] .filter-chip',
      ),
    ];
  }

  it('renders a chip for each of the six categories, driven by the `category` column', () => {
    renderSidebar({ shrines: makeSixCategoryShrines() });
    openFilters();

    const labels = chipButtons().map((b) => b.textContent);
    expect(labels).toEqual([
      'All',
      'Muslim Shrine',
      'Hindu Temple',
      'Sikh Gurdwara',
      'Nanakpanthi (Hindu–Sikh)',
      'Jain Temple',
      'Secular / Memorial',
    ]);
  });

  it('toggles categories additively, keeping canonical order', () => {
    const onCategoriesChange = vi.fn();
    renderSidebar({
      shrines: makeSixCategoryShrines(),
      activeCategories: ['jain'],
      onCategoriesChange,
    });
    openFilters();

    // Adding Muslim to an existing Jain selection accumulates both.
    fireEvent.click(chipButtons().find((b) => b.textContent === 'Muslim Shrine')!);
    expect(onCategoriesChange).toHaveBeenLastCalledWith(['muslim', 'jain']);

    // Clicking an already-active chip removes only that category.
    fireEvent.click(chipButtons().find((b) => b.textContent === 'Jain Temple')!);
    expect(onCategoriesChange).toHaveBeenLastCalledWith([]);
  });

  it('defaults to all-on: with no selection every category is listed and "All" is active', () => {
    renderSidebar({ shrines: makeSixCategoryShrines() });
    openFilters();

    const allChip = chipButtons().find((b) => b.textContent === 'All')!;
    expect(allChip.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelectorAll('.shrine-list-item')).toHaveLength(6);
  });

  it('filters the list to the selected categories only', () => {
    renderSidebar({
      shrines: makeSixCategoryShrines(),
      activeCategories: ['nanakpanthi', 'secular'],
    });
    fireEvent.click(document.querySelector('.list-toggle-btn')!);

    expect(document.querySelectorAll('.shrine-list-item')).toHaveLength(2);
  });

  it('renders a row whose new columns are all blank without badges or "undefined"', () => {
    // Legacy-only row: no `category`, `info_level`, or `status` columns.
    renderSidebar({ shrines: [buildShrine(makeShrineRow({ Name: 'Legacy Row' }), 0)!] });
    fireEvent.click(document.querySelector('.list-toggle-btn')!);

    const item = document.querySelector('.shrine-list-item')!;
    expect(item.textContent).toContain('Legacy Row');
    expect(item.textContent).not.toContain('undefined');
    expect(document.querySelector('.info-level-badge')).not.toBeInTheDocument();
  });

  it('shows the info-level badge on list rows when info_level is set', () => {
    renderSidebar({
      shrines: [buildShrine(makeShrineRow({ Name: 'Verified Row', info_level: 'Full' }), 0)!],
    });
    fireEvent.click(document.querySelector('.list-toggle-btn')!);

    const badge = document.querySelector('.info-level-badge--full')!;
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe('Fully documented');
    expect(badge.getAttribute('title')).toBeTruthy();
  });

  it('shows the support-level badge on list rows when support_level is set', () => {
    renderSidebar({
      shrines: [
        buildShrine(makeShrineRow({ Name: 'Verified Row', support_level: 'Field-verified' }), 0)!,
      ],
    });
    fireEvent.click(document.querySelector('.list-toggle-btn')!);

    const badge = document.querySelector('.support-level-badge--field-verified')!;
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe('Field-verified');
    expect(badge.getAttribute('title')).toBeTruthy();
  });
});

describe('MapSidebar — provenance (support-level) filter (More filters)', () => {
  it('keeps the verified-only toggle inside the More filters disclosure and filters to Field-verified', () => {
    const onVerifiedOnlyChange = vi.fn();
    renderSidebar({
      shrines: [
        buildShrine(makeShrineRow({ Name: 'Documented', support_level: 'Field-verified' }), 0)!,
        buildShrine(makeShrineRow({ Name: 'Sparse' }), 1)!,
      ],
      onVerifiedOnlyChange,
    });
    fireEvent.click(document.querySelector('.list-toggle-btn')!);
    fireEvent.click(document.querySelector('.palette-trigger')!);
    fireEvent.click(document.querySelector('.palette-filters-btn')!);

    // Collapsed by default — no top-level clutter.
    expect(document.querySelector('[aria-label="Filter by provenance"]')).not.toBeInTheDocument();

    fireEvent.click(document.querySelector('.more-filters-toggle')!);
    const toggle = document.querySelector<HTMLButtonElement>(
      '[aria-label="Filter by provenance"] .filter-chip',
    )!;
    expect(toggle.textContent).toBe('Field-verified only');
    fireEvent.click(toggle);
    expect(onVerifiedOnlyChange).toHaveBeenCalledWith(true);
  });

  it('shows only field-verified sites when active (blank support_level is excluded)', () => {
    renderSidebar({
      shrines: [
        buildShrine(makeShrineRow({ Name: 'Documented', support_level: 'Field-verified' }), 0)!,
        buildShrine(makeShrineRow({ Name: 'Sparse', info_level: 'Full' }), 1)!,
      ],
      verifiedOnly: true,
    });
    fireEvent.click(document.querySelector('.list-toggle-btn')!);

    const names = [...document.querySelectorAll('.shrine-list-name')].map((el) => el.textContent);
    expect(names).toEqual(['Documented']);
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
      // `.search-input` is the palette's field now; it carries that class
      // precisely so selectors like this one still describe the archive's
      // search box.
      openPalette();
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
