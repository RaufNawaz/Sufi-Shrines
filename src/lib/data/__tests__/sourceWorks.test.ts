// @vitest-environment node
/**
 * The archive's dependence on one book, counted where a reader can see it.
 *
 * `buildSourceIndex` dedupes on the citation string, which is right — the string
 * is the reader's search string. The consequence is that one book appears as
 * many sources: Alam Faqri's *Tazkirah Awliya-e-Pakistan* is ten citation
 * records, so `/about` lists its three biggest as separate rows of 25, 11 and 5
 * and scatters seven more through a 436-long tail. **A reader cannot add up what
 * they cannot see**, and the archive's heaviest dependency reads as roughly half
 * what it is.
 *
 * These assertions are about the honesty of that number, so they are pinned to
 * the real data rather than to a fixture.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildSourceIndex } from '../sourceIndex';
import { buildShrines } from '../shrineModel';
import { buildWorkRollup, worksForCitation, SOURCE_WORKS } from '../sourceWorks';

const ROOT = join(__dirname, '..', '..', '..', '..');
const read = (p: string) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

const rows = read('data/shrines.json').rows;
const index = buildSourceIndex(buildShrines(rows));
const rollup = buildWorkRollup(index);
const seeds = read('data/kg-seeds.json') as { sourceWorks: { slug: string }[] };

describe('what the archive rests on, counted by work', () => {
  it('ships the curated vocabulary and nothing invented', () => {
    /* Drift guard: the shipped file is generated from the seed by build-kg, and
       a hand-edit to either would otherwise pass unnoticed. */
    expect(SOURCE_WORKS.map((w) => w.slug).sort()).toEqual(
      seeds.sourceWorks.map((w) => w.slug).sort(),
    );
  });

  it('finds the archive leaning on one book far harder than the citation list shows', () => {
    const top = rollup[0];
    expect(top.work.slug).toBe('tazkirah-awliya-e-pakistan');
    /* The number the citation index can show is the biggest single record — 25.
       The number that is true is the work's. Asserted as a floor so the gap
       cannot quietly close by the rollup breaking. */
    const biggestSingleRecord = Math.max(...index.sources.map((s) => s.shrines.length));
    expect(top.entries.length).toBeGreaterThan(biggestSingleRecord);
    expect(top.entries.length).toBeGreaterThanOrEqual(45);
    expect(top.citationRecords).toBeGreaterThan(1);
  });

  it('counts an entry once per work, however many of its volumes it cites', () => {
    for (const r of rollup) {
      const slugs = r.entries.map((e) => e.slug);
      expect(new Set(slugs).size, `${r.work.slug} double-counts an entry`).toBe(slugs.length);
    }
  });

  it('never claims a work the archive does not cite', () => {
    for (const r of rollup) expect(r.entries.length, r.work.slug).toBeGreaterThan(0);
  });

  it('refuses a citation that names a work only to say it does not cover the subject', () => {
    /* The one exclusion, and the reason exclusions exist at all: this sentence
       contains the title and is evidence of a GAP, not of reliance. */
    const denial =
      '(This saint post-dates the Tazkirah Awliya-e-Pakistan compendium; entry based on established modern accounts.)';
    expect(worksForCitation(denial)).toEqual([]);
    expect(worksForCitation('Alam Faqri, *Tazkirah Awliya-e-Pakistan* (Lahore).')[0]?.slug).toBe(
      'tazkirah-awliya-e-pakistan',
    );
  });

  it('does not fuse a periodical’s articles into one work', () => {
    /* The error that would be worse than the one this fixes. Sixteen Express
       Tribune articles are sixteen sources; the italic run there is the
       publication, not the work. */
    for (const citation of [
      '"Pakistan set to reopen Lahore\'s famous Jain temple," *The Express Tribune*, 5 December 2021.',
      'Zulfiqar Ali Kalhoro, "Nanakpanthi Saints of Sindh," *The Friday Times*, 13 April 2018.',
    ]) {
      expect(worksForCitation(citation), citation.slice(0, 40)).toEqual([]);
    }
  });
});
