import type { SourceIndex } from './sourceIndex';
import { citationKey } from './bibliography';
import shipped from '../../data/source-works.json';

/**
 * What the archive rests on, counted by WORK rather than by citation string.
 *
 * `buildSourceIndex` dedupes on the exact citation, which is right for what it
 * is: the citation string is the reader's search string, and two entries citing
 * different pages of a book have cited different things. The consequence is
 * that **one book appears as many sources**, and on this archive the effect is
 * not marginal — Alam Faqri's *Tazkirah Awliya-e-Pakistan* is ten citation
 * records, and `/about` shows its three biggest as separate rows of 25, 11 and 5
 * with seven more scattered through a 436-long tail.
 *
 * A reader cannot add up what they cannot see. Counted by work, **48 of the
 * archive's 168 sourced entries — 29% — lean on that one book**, which is
 * roughly twice what the largest number on the page suggests.
 *
 * Nothing here rewrites a citation. This is a second view over the same data,
 * and the citations stay exactly as recorded (RULE 2).
 *
 * The vocabulary is curated by hand in `data/kg-seeds.json#sourceWorks` and
 * shipped by `build-kg.mjs`, never inferred by similarity —
 * `scripts/data/lib/saintIdentity.mjs` explains at length why a matcher that is
 * right most of the time is the wrong tool for identity. Periodicals are
 * deliberately absent: the italic run in a news citation is the publication, not
 * the work, so sixteen Express Tribune articles are sixteen sources.
 */
export interface SourceWork {
  slug: string;
  title: string;
  author?: string;
  /** Distinctive lowercased substring of a citation that names this work. */
  match: string;
  /** Citation keys that contain `match` and are NOT citations of the work. */
  excludeCitations?: string[];
}

export interface WorkRollup {
  work: SourceWork;
  /** Entries leaning on this work, deduped across all its citation strings. */
  entries: { slug: string; name: string }[];
  /** How many distinct citation strings the archive uses for it. */
  citationRecords: number;
}

export const SOURCE_WORKS: readonly SourceWork[] = (
  shipped as { works: SourceWork[] }
).works;

/** The works a single citation names — usually none, occasionally two. */
export function worksForCitation(citation: string): SourceWork[] {
  const key = citationKey(citation);
  return SOURCE_WORKS.filter((w) => {
    if (!key.includes(citationKey(w.match))) return false;
    /* A citation can contain a work's title and not be a citation OF it: one
       says the Tazkirah *post-dates* its subject, which is evidence of a gap
       rather than of reliance. */
    return !(w.excludeCitations ?? []).some((x) => citationKey(x) === key);
  });
}

/**
 * Roll a citation index up by work, heaviest dependency first.
 *
 * Only works the archive actually cites appear — a declared work with no
 * citation is omitted rather than shown as a zero, because a bibliography is a
 * record of what was used.
 */
export function buildWorkRollup(index: SourceIndex): WorkRollup[] {
  const acc = new Map<string, { entries: Map<string, string>; records: number }>();

  for (const source of index.sources) {
    for (const work of worksForCitation(source.name)) {
      if (!acc.has(work.slug)) acc.set(work.slug, { entries: new Map(), records: 0 });
      const bucket = acc.get(work.slug)!;
      bucket.records += 1;
      /* Deduped across the work's citation strings: an entry citing both
         volume 1 and volume 2 leans on one book, not two. */
      for (const shrine of source.shrines) bucket.entries.set(shrine.slug, shrine.name);
    }
  }

  return [...acc.entries()]
    .map(([slug, bucket]) => ({
      work: SOURCE_WORKS.find((w) => w.slug === slug)!,
      entries: [...bucket.entries].map(([s, name]) => ({ slug: s, name })),
      citationRecords: bucket.records,
    }))
    .sort(
      (a, b) => b.entries.length - a.entries.length || a.work.title.localeCompare(b.work.title),
    );
}
