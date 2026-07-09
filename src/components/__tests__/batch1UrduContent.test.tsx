import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LanguageProvider } from '../../lib/i18n/LanguageContext';
import { ShrineArticle } from '../shrine/ShrineArticle';
import { useArticleContent } from '../shrine/useArticleContent';
import { buildShrine } from '../../lib/data/shrineModel';
import { applyUrduContentOverrides } from '../../lib/data/urduContentOverride';
import shrinesFixture from '../../data/shrines-fallback.json';
import type { ShrineRow } from '../../types/shrine';

vi.mock('../shrine/ShrineGallery', () => ({ ShrineGallery: () => null }));

function renderInUrdu(children: React.ReactNode) {
  localStorage.setItem('shrines_language', 'ur');
  return render(<LanguageProvider>{children}</LanguageProvider>);
}

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

// One hand-translated (long, shrine_entries-sourced) and one adapted-from-
// tour (short) batch-1 entry — representative of the two content sources
// used for URDU_IMPLEMENTATION_PLAN.md batch 1 (the ~18 tour-featured
// shrines).
const BATCH_1_SAMPLE = ['Shrine of Abdullah Shah Ghazi', 'Gurdwara Darbar Sahib Kartarpur'];

describe('batch-1 Urdu content (18 tour-featured shrines)', () => {
  it.each(BATCH_1_SAMPLE)('%s: renders a fully-Urdu article via the content override, no leaks', (name) => {
    const rows = applyUrduContentOverrides(shrinesFixture.rows as ShrineRow[]);
    const row = rows.find((r) => r.Name === name);
    expect(row, `fixture row for "${name}"`).toBeDefined();
    expect(row!['Description Urdu'], 'override should have filled Description Urdu').toBeTruthy();

    const shrine = buildShrine(row!, 0)!;
    const { container } = renderInUrdu(<ShrineArticle shrine={shrine} />);

    expect(container.textContent).toContain('خلاصہ');
    const leaks = findLatinLeaks(container);
    expect(leaks, `Latin text leaked into "${name}"'s Urdu article: ${JSON.stringify(leaks)}`).toEqual([]);
  });
});

function NavItemsProbe({ shrine }: { shrine: ReturnType<typeof buildShrine> }) {
  const { navItems } = useArticleContent(shrine!);
  return (
    <ul>
      {navItems.map((item) => (
        <li key={item.id}>{item.label}</li>
      ))}
    </ul>
  );
}

describe('batch-1 Table of Contents', () => {
  it('lists Urdu section labels (not raw English headings) for a translated shrine', () => {
    const rows = applyUrduContentOverrides(shrinesFixture.rows as ShrineRow[]);
    const row = rows.find((r) => r.Name === 'Shrine of Abdullah Shah Ghazi')!;
    const shrine = buildShrine(row, 0)!;
    const { container } = renderInUrdu(<NavItemsProbe shrine={shrine} />);

    expect(container.textContent).toContain('خلاصہ');
    expect(container.textContent).toContain('ورثہ');
    const leaks = findLatinLeaks(container);
    expect(leaks).toEqual([]);
  });
});
