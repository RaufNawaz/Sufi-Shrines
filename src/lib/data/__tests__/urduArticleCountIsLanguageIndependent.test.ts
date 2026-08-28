// @vitest-environment node
/**
 * `/about` must report the same archive to both of its readers.
 *
 * **The defect this is written against, measured on the dev server on 28 August
 * 2026.** `/about?lang=en` printed
 *
 *     entries with a full Urdu article    0 · 0%
 *
 * while `/about?lang=ur`, from the same dataset, printed `۱۶۸ · ۹۸٪`. Neither
 * page was stale — `buildArchiveReport` recomputes on every load precisely so a
 * figure cannot go stale the way a note can (see CLAUDE.md's struck-through
 * bibliography finding, which is the whole reason that page computes anything).
 * The count was a *function of who was asking*: it read
 * `getUrduFieldValue(row, 'Description')`, that field is filled in by
 * `src/data/urdu-content.json`, and `LanguageContext` fetches that file only
 * when `lang === 'ur'`. Since **no row of the sheet carries a `Description
 * Urdu` column**, an English reader's rows had nothing in that field at all.
 *
 * The failure mode is the one this archive can least afford: not a missing
 * number, but two confident contradictory ones, on the page that exists to
 * report the archive honestly.
 *
 * So the invariant is stated as an equality across the *load state of the
 * payload*, which is the thing that actually varied — asserting a literal 168
 * would have passed in Urdu on the broken build and told us nothing.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { buildArchiveReport } from '../archiveReport';
import { buildShrines } from '../shrineModel';
import {
  applyUrduContentOverrides,
  loadUrduContent,
  resetUrduContentForTests,
} from '../urduContentOverride';
import { hasUrduArticle, URDU_ARTICLE_COUNT } from '../urduArticleIndex';
import { buildStableSlug } from '../slugify';
import { getFieldValue } from '../fieldAliasing';
import type { ShrineRow } from '../../../types/shrine';
import snapshot from '../../../data/shrines-fallback.json';
import urduContent from '../../../data/urdu-content.json';
import articleIndex from '../../../data/urdu-article-index.json';

const rows = (snapshot as { rows: ShrineRow[] }).rows;

/** The dataset exactly as a reader of the given language would hold it. */
function datasetFor(payloadLoaded: boolean) {
  return buildShrines(payloadLoaded ? applyUrduContentOverrides(rows) : rows);
}

describe('the Urdu-article count does not depend on the reader’s language', () => {
  beforeEach(() => {
    resetUrduContentForTests();
  });

  it('reports the same figure with the Urdu payload absent and present', async () => {
    const asEnglishReader = buildArchiveReport(datasetFor(false)).urduDrafted;

    await loadUrduContent();
    const asUrduReader = buildArchiveReport(datasetFor(true)).urduDrafted;

    expect(asEnglishReader).toBe(asUrduReader);
    // And it is a real count, not two matching zeroes.
    expect(asEnglishReader).toBeGreaterThan(0);
  });

  it('counts every entry the dataset and the Urdu edition both hold', () => {
    const inDataset = rows.filter((row) =>
      articleIndex.slugs.includes(buildStableSlug(getFieldValue(row, 'Name'))),
    ).length;
    expect(buildArchiveReport(datasetFor(false)).urduDrafted).toBe(inDataset);
  });

  it('never claims an Urdu article for an entry the payload has no body for', () => {
    const withBody = new Set(
      Object.keys(urduContent).filter((slug) =>
        String((urduContent as Record<string, { descriptionUr?: string }>)[slug]?.descriptionUr ?? '').trim(),
      ),
    );
    for (const row of rows) {
      const slug = buildStableSlug(getFieldValue(row, 'Name'));
      if (hasUrduArticle(row)) {
        expect(withBody.has(slug), `${slug} counted but has no Urdu article body`).toBe(true);
      }
    }
  });
});

describe('the slug index is the Urdu payload, not a copy that drifted', () => {
  it('lists exactly the entries whose Urdu article has a body', () => {
    const expected = Object.keys(urduContent)
      .filter((slug) =>
        String((urduContent as Record<string, { descriptionUr?: string }>)[slug]?.descriptionUr ?? '').trim(),
      )
      .sort();
    // Same gate as `build-urdu-article-index.mjs --check`, restated here so a
    // stale index fails `npm run test` and not only `npm run data:validate`.
    expect([...articleIndex.slugs]).toEqual(expected);
    expect(URDU_ARTICLE_COUNT).toBe(expected.length);
  });
});
