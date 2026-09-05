import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as articleParsing from '../../../lib/data/articleParsing';
import { useArticleContent } from '../useArticleContent';
import { buildShrine } from '../../../lib/data/shrineModel';
import { renderWithProviders, makeShrineRow } from '../../../test/utils';
import type { Shrine } from '../../../types/shrine';

/**
 * One parse per (entry, language), however many components ask for it.
 *
 * A shrine page mounts `useArticleContent` **twice** — `ShrinePage` for the
 * contents-nav rail, `ShrineArticle` for the sections. `useMemo` is per
 * component instance, so the two shared nothing and every navigation parsed the
 * article twice: `getLeadText`, `parseInlineSections` and `buildArticleSections`
 * over a Description whose longest is 22,885 characters. Two council seats found
 * it independently on 4 September 2026 and profiled it at ~31 ms per navigation,
 * about half duplicate.
 *
 * This asserts the property by counting calls, which is the only way to see it:
 * the rendered output was always correct, and stayed correct while the work was
 * being done twice. A test on the markup cannot fail when this regresses.
 */
function TwoConsumers({ shrine }: { shrine: Shrine }) {
  // Two independent hook instances, exactly as ShrinePage + ShrineArticle do.
  const a = useArticleContent(shrine);
  const b = useArticleContent(shrine);
  return <div data-nav={`${a.navItems.length}-${b.navItems.length}`} />;
}

const DESCRIPTION =
  'Lead prose about the saint.\n\n## History\n\nBuilt in the 11th century.\n\n' +
  '## Bibliography\n\n- Chishti, Nur Ahmad. *Tahqiqat-i-Chishti*. Lahore, 1867.\n';

describe('useArticleContent parse sharing', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('parses the article once for two consumers on the same page', () => {
    const parseSpy = vi.spyOn(articleParsing, 'parseInlineSections');
    const buildSpy = vi.spyOn(articleParsing, 'buildArticleSections');
    /* A fresh row object per test: the cache is keyed on `shrine.raw`
       identity, so a shared fixture would carry a hit in from another case and
       this would pass for the wrong reason. */
    const shrine = buildShrine(makeShrineRow({ Description: DESCRIPTION }), 0)!;

    renderWithProviders(<TwoConsumers shrine={shrine} />);

    expect(parseSpy).toHaveBeenCalledTimes(1);
    expect(buildSpy).toHaveBeenCalledTimes(1);
  });

  it('still produces the sections and nav items it always did', () => {
    const shrine = buildShrine(makeShrineRow({ Description: DESCRIPTION }), 0)!;
    const { container } = renderWithProviders(<TwoConsumers shrine={shrine} />);
    // overview + History + Bibliography, and both consumers agree.
    expect(container.querySelector('[data-nav]')?.getAttribute('data-nav')).toBe('3-3');
  });
});
