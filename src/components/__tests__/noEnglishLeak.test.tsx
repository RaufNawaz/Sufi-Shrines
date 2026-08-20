import React from 'react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { MapSidebar } from '../map/MapSidebar';
import { ShrineArticle } from '../shrine/ShrineArticle';
import { ShrineInfobox } from '../shrine/ShrineInfobox';
import { SourcesProvenance } from '../shrine/SourcesProvenance';
import { buildShrine } from '../../lib/data/shrineModel';
import { applyUrduContentOverrides, loadUrduContent } from '../../lib/data/urduContentOverride';
import shrinesFixture from '../../data/shrines-fallback.json';
import { renderWithProviders, findLatinLeaks } from '../../test/utils';
import type { ShrineRow } from '../../types/shrine';

// Mirror the real data-load pipeline (useShrineData applies this over the
// raw CSV/fallback rows) so this test exercises actual production behavior
// instead of depending on the fixture carrying a hand-seeded "Description
// Urdu" column — the live sheet has no Urdu columns at all (see CLAUDE.md).
// The payload is language-gated in production, so it has to be requested
// first — exactly what LanguageProvider does for an Urdu reader.
let fixtureRows: ShrineRow[] = [];

// The search worker isn't available in jsdom; "no query yet" (ids: null)
// is exactly its real behavior before the worker has indexed anything.
vi.mock('../../lib/search/useSearch', () => ({
  useSearch: () => ({ ids: null, query: '' }),
}));
vi.mock('../shrine/ShrineGallery', async () =>
  (await import('../../test/utils')).shrineGalleryMockFactory(),
);

beforeAll(async () => {
  await loadUrduContent();
  fixtureRows = applyUrduContentOverrides(shrinesFixture.rows as ShrineRow[]);
});

beforeEach(() => {
  localStorage.clear();
});

describe('no English leaks in ?lang=ur', () => {
  it('shrine article: Data Darbar renders fully in Urdu', () => {
    const row = fixtureRows.find((r) => r.Name === 'Data Darbar')!;
    expect(row).toBeDefined();
    expect(row['Description Urdu']).toBeTruthy(); // sanity: fixture actually has Urdu content to test

    const shrine = buildShrine(row, 0)!;
    const { container } = renderWithProviders(<ShrineArticle shrine={shrine} />, { lang: 'ur' });

    const leaks = findLatinLeaks(container);
    expect(leaks, `Latin text leaked into the Urdu article: ${JSON.stringify(leaks)}`).toEqual([]);
  });

  it('shrine infobox: field labels (Category/Location/Founded/…) render in Urdu, not raw column names', () => {
    const row = fixtureRows.find((r) => r.Name === 'Data Darbar')!;
    const shrine = buildShrine(row, 0)!;
    const { container } = renderWithProviders(<ShrineInfobox shrine={shrine} />, { lang: 'ur' });

    const leaks = findLatinLeaks(container);
    expect(leaks, `Latin text leaked into the Urdu infobox: ${JSON.stringify(leaks)}`).toEqual([]);
  });

  it('sources & provenance: field names render in Urdu, not raw column names', () => {
    const { container } = renderWithProviders(
      <SourcesProvenance shrineSlug="data-darbar" lang="ur" />,
      {
        lang: 'ur',
      },
    );

    const leaks = findLatinLeaks(container);
    expect(
      leaks,
      `Latin text leaked into the Urdu provenance panel: ${JSON.stringify(leaks)}`,
    ).toEqual([]);
  });

  it('sidebar: default view (welcome card + guided tours) renders fully in Urdu', () => {
    const row = fixtureRows.find((r) => r.Name === 'Data Darbar')!;
    const shrine = buildShrine(row, 0)!;
    const noop = () => {};

    const { container } = renderWithProviders(
      <MapSidebar
        shrines={[shrine]}
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
      />,
      { lang: 'ur', route: '/' },
    );

    const leaks = findLatinLeaks(container);
    expect(leaks, `Latin text leaked into the Urdu sidebar: ${JSON.stringify(leaks)}`).toEqual([]);
  });
});
