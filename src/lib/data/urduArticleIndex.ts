import type { ShrineRow } from '../../types/shrine';
import indexFile from '../../data/urdu-article-index.json';
import { getFieldValue, getUrduFieldValue } from './fieldAliasing';
import { buildStableSlug } from './slugify';

/**
 * Which entries have an Urdu article, answered without loading the Urdu.
 *
 * `src/data/urdu-content.json` is 253 KB and language-gated — an English reader
 * never downloads it, deliberately (see `urduContentOverride.ts`). Every one of
 * the archive's 168 Urdu articles lives in that file; **not one row of the sheet
 * carries a `Description Urdu` column.** So any code that asks "does this entry
 * have an Urdu article?" by reading the row was really asking "is the reader
 * reading Urdu?", and `/about` answered `0 · 0%` in English against `۱۶۸ · ۹۸٪`
 * in Urdu from the same dataset (measured 28 August 2026).
 *
 * This index is the same question decided from a 6 KB list of slugs, generated
 * from the payload by `scripts/data/build-urdu-article-index.mjs` and held to it
 * by that script's `--check` inside `npm run data:validate`.
 */
const URDU_ARTICLE_SLUGS: ReadonlySet<string> = new Set(indexFile.slugs);

/** The number of entries the in-repo Urdu edition covers, dataset aside. */
export const URDU_ARTICLE_COUNT = URDU_ARTICLE_SLUGS.size;

/**
 * True when this row has an Urdu article body.
 *
 * The sheet is asked first and the index second, in that order on purpose: the
 * schema has always allowed a real `Description Urdu` column (RULE 3 — the sheet
 * is production), and on the day one is authored it must win over the in-repo
 * stopgap here exactly as it does in `mergeUrduContent`. The index is the
 * fallback, not the authority.
 *
 * Language-independent by construction: neither branch depends on what has been
 * loaded. Once the payload *is* loaded the first branch starts matching the
 * rows the second branch already matched, so the answer does not change —
 * `src/lib/data/__tests__/urduArticleCountIsLanguageIndependent.test.ts` holds
 * that.
 */
export function hasUrduArticle(row: ShrineRow): boolean {
  if (getUrduFieldValue(row, 'Description')) return true;
  const slug = buildStableSlug(getFieldValue(row, 'Name'));
  return slug !== '' && URDU_ARTICLE_SLUGS.has(slug);
}
