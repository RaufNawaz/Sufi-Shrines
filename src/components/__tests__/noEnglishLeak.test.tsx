import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../lib/i18n/LanguageContext';
import { ThemeProvider } from '../../lib/i18n/ThemeContext';
import { MapSidebar } from '../map/MapSidebar';
import { ShrineArticle } from '../shrine/ShrineArticle';
import { buildShrine } from '../../lib/data/shrineModel';
import shrinesFixture from '../../data/shrines-fallback.json';
import type { ShrineRow } from '../../types/shrine';

// The search worker isn't available in jsdom; "no query yet" (ids: null)
// is exactly its real behavior before the worker has indexed anything.
vi.mock('../../lib/search/useSearch', () => ({
  useSearch: () => ({ ids: null, query: '' }),
}));
vi.mock('../shrine/ShrineGallery', () => ({ ShrineGallery: () => null }));

function renderInUrdu(children: React.ReactNode) {
  localStorage.setItem('shrines_language', 'ur');
  return render(
    <ThemeProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </ThemeProvider>,
  );
}

/**
 * Walks every text node in `root` and flags any that contain a Latin letter,
 * skipping the sanctioned exceptions: coordinates, links, and explicitly
 * bidi-isolated Latin (<bdi>). Mirrors URDU_IMPLEMENTATION_PLAN.md §9's
 * "no English leaks" guard.
 */
function findLatinLeaks(root: HTMLElement): string[] {
  const leaks: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = (node.textContent || '').trim();
    if (!text || !/[A-Za-z]/.test(text)) continue;
    const el = node.parentElement;
    if (el?.closest('.coords, a, bdi, [data-latin]')) continue;
    leaks.push(text);
  }
  return leaks;
}

beforeEach(() => {
  localStorage.clear();
});

describe('no English leaks in ?lang=ur', () => {
  it('shrine article: Data Darbar renders fully in Urdu', () => {
    const row = (shrinesFixture.rows as ShrineRow[]).find((r) => r.Name === 'Data Darbar')!;
    expect(row).toBeDefined();
    expect(row['Description Urdu']).toBeTruthy(); // sanity: fixture actually has Urdu content to test

    const shrine = buildShrine(row, 0)!;
    const { container } = renderInUrdu(<ShrineArticle shrine={shrine} />);

    const leaks = findLatinLeaks(container);
    expect(leaks, `Latin text leaked into the Urdu article: ${JSON.stringify(leaks)}`).toEqual([]);
  });

  it('sidebar: default view (welcome card + guided tours) renders fully in Urdu', () => {
    const row = (shrinesFixture.rows as ShrineRow[]).find((r) => r.Name === 'Data Darbar')!;
    const shrine = buildShrine(row, 0)!;
    const noop = () => {};

    const { container } = renderInUrdu(
      <MemoryRouter>
        <MapSidebar
          shrines={[shrine]}
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
        />
      </MemoryRouter>,
    );

    const leaks = findLatinLeaks(container);
    expect(leaks, `Latin text leaked into the Urdu sidebar: ${JSON.stringify(leaks)}`).toEqual([]);
  });
});
