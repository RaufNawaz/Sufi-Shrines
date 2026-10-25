import type { Lang, Shrine } from '../../types/shrine';
import { buildSourceIndex, type IndexedSource } from './sourceIndex';
import { citationKey } from './bibliography';
import { SOURCE_WORKS } from './sourceWorks';
import { sourceType, SOURCE_TYPE_ORDER, type SourceType } from './sourceType';
import shippedLibrary from '../../data/reading-library.json';

/**
 * The archive's library, as a reader browses it on `/sources`.
 *
 * Three things the project already records, put on one shelf:
 *
 * 1. **Every citation** the live sheet carries — `buildSourceIndex`, unchanged,
 *    each line verbatim (RULE 2) and now with a `type` (`sourceType.ts`).
 * 2. **The works** those citations name — the hand-curated vocabulary in
 *    `source-works.json`, which is how one book cited ten different ways is
 *    counted once.
 * 3. **The books read in full** for the archive — `reading-library.json`, the
 *    integrated half of the OCR book queue. Most of these are *not yet cited*
 *    by any published entry: their findings sit in review, as patches for the
 *    sheet. The shelf says so rather than hiding them, and because it is
 *    computed from the live sheet on every load, a book starts showing the
 *    entries that cite it the moment those patches are imported — nothing here
 *    has to be edited for that to happen.
 *
 * A work and a read book are the same thing when `workSlug` says so (two of
 * them today: Schaflechner's *Hinglaj Devi* and Schimmel's *Mystical
 * Dimensions*), and appear once.
 */

export interface LibraryBook {
  /** Book-queue id: joins to pipeline/book_queue/state.json and the takeaways. */
  id: string;
  slug: string;
  title: string;
  author?: string;
  year?: string;
  /** The year as an Urdu reader reads it — Eastern digits, ہجری/عیسوی. */
  yearUr?: string;
  /** Language the work was written in. */
  original: string;
  /** Language of the copy that was read. */
  read: string;
  pages?: number;
  match?: string;
  workSlug?: string;
  note?: string;
  /** The note in Urdu: prose may not be Latin in the Urdu view (i18n rule 7). */
  noteUr?: string;
}

export const READING_LIBRARY: readonly LibraryBook[] = (
  shippedLibrary as unknown as { books: LibraryBook[] }
).books;

/**
 * A read book's year and note in the reader's language. The Urdu values are
 * sibling fields that exist only for Urdu, hence the one sanctioned comparison.
 */
export function bookText(
  book: LibraryBook | undefined,
  fallbackYear: string | undefined,
  lang: Lang,
): { year?: string; note?: string } {
  // eslint-disable-next-line no-restricted-syntax -- yearUr/noteUr are Urdu-only sibling fields
  const urdu = lang === 'ur';
  const year = (urdu ? book?.yearUr : undefined) ?? book?.year ?? fallbackYear;
  const note = urdu ? book?.noteUr : book?.note;
  return { ...(year ? { year } : {}), ...(note ? { note } : {}) };
}

/** One citation line, with what kind of thing it points at. */
export interface LibrarySource extends IndexedSource {
  type: SourceType;
  /** Slugs of the shelf works this line cites (usually none, sometimes two). */
  works: string[];
}

/** A book on the shelf: cited by the archive, read in full, or both. */
export interface ShelfWork {
  slug: string;
  title: string;
  /** Urdu title, only where the archive's own Urdu articles give one. */
  titleUr?: string;
  author?: string;
  year?: string;
  /** The citation lines that name it, verbatim. */
  citations: LibrarySource[];
  /** The entries leaning on it, deduped across all its citation lines. */
  entries: Shrine[];
  /** Present when the book was read in full for the archive. */
  book?: LibraryBook;
}

export interface Library {
  /** Cited works first (most entries first), then books read but not yet cited. */
  works: ShelfWork[];
  /** Every distinct citation line, most-cited first. */
  sources: LibrarySource[];
  /** Distinct citation lines of each kind. */
  typeCounts: Record<SourceType, number>;
  /** Total citations — every line of every bibliography. */
  citations: number;
}

interface Matcher {
  slug: string;
  match: string;
  exclude: string[];
}

/** Every work a citation line can be matched to, keyed by shelf slug. */
const MATCHERS: Matcher[] = [
  ...SOURCE_WORKS.map((w) => ({
    slug: w.slug,
    match: citationKey(w.match),
    exclude: (w.excludeCitations ?? []).map(citationKey),
  })),
  ...READING_LIBRARY.filter((b) => b.match && !b.workSlug).map((b) => ({
    slug: b.slug,
    match: citationKey(b.match!),
    exclude: [],
  })),
];

function worksOf(key: string): string[] {
  return MATCHERS.filter((m) => key.includes(m.match) && !m.exclude.includes(key)).map(
    (m) => m.slug,
  );
}

const cache = new WeakMap<readonly Shrine[], Library>();

export function buildLibrary(shrines: readonly Shrine[]): Library {
  const hit = cache.get(shrines);
  if (hit) return hit;

  const index = buildSourceIndex(shrines);
  const bySlug = new Map(shrines.map((s) => [s.slug, s]));

  const sources: LibrarySource[] = index.sources.map((source) => ({
    ...source,
    type: sourceType(source.name),
    works: worksOf(source.key),
  }));

  const typeCounts = Object.fromEntries(SOURCE_TYPE_ORDER.map((t) => [t, 0])) as Record<
    SourceType,
    number
  >;
  for (const source of sources) typeCounts[source.type] += 1;

  /* Shelf entries: declared works, then read books not already a declared work. */
  const shelf = new Map<string, ShelfWork>();
  for (const work of SOURCE_WORKS) {
    shelf.set(work.slug, {
      slug: work.slug,
      title: work.title,
      ...(work.titleUr ? { titleUr: work.titleUr } : {}),
      ...(work.author ? { author: work.author } : {}),
      citations: [],
      entries: [],
    });
  }
  for (const book of READING_LIBRARY) {
    const slug = book.workSlug ?? book.slug;
    const existing = shelf.get(slug);
    if (existing) {
      existing.book = book;
      if (book.year) existing.year = book.year;
    } else {
      shelf.set(slug, {
        slug,
        title: book.title,
        ...(book.author ? { author: book.author } : {}),
        ...(book.year ? { year: book.year } : {}),
        citations: [],
        entries: [],
        book,
      });
    }
  }

  for (const source of sources) {
    for (const slug of source.works) {
      const work = shelf.get(slug);
      if (!work) continue;
      work.citations.push(source);
      for (const { slug: shrineSlug } of source.shrines) {
        const shrine = bySlug.get(shrineSlug);
        if (shrine && !work.entries.includes(shrine)) work.entries.push(shrine);
      }
    }
  }

  const works = [...shelf.values()].sort(
    (a, b) =>
      b.entries.length - a.entries.length ||
      Number(Boolean(b.book)) - Number(Boolean(a.book)) ||
      a.title.localeCompare(b.title),
  );
  for (const work of works) work.entries.sort((a, b) => a.name.localeCompare(b.name));

  const library: Library = { works, sources, typeCounts, citations: index.citations };
  cache.set(shrines, library);
  return library;
}

export interface CoCited {
  /** A shelf work, when the companion is one; otherwise a single citation line. */
  work?: ShelfWork;
  source?: LibrarySource;
  /** How many of this work's entries also cite the companion. */
  shared: number;
}

/**
 * What else the entries leaning on a work also cite — the reader's "if you are
 * reading this, the archive reads it beside…". Placeholders and the project's
 * own field survey are left out: neither is something a reader can go and pick
 * up next.
 */
export function coCited(work: ShelfWork, library: Library, limit = 6): CoCited[] {
  const mine = new Set(work.entries.map((s) => s.slug));
  if (mine.size === 0) return [];
  const ownLines = new Set(work.citations.map((c) => c.key));
  const tallies = new Map<string, CoCited & { slugs: Set<string> }>();

  for (const source of library.sources) {
    if (ownLines.has(source.key)) continue;
    if (source.type === 'general' || source.type === 'field') continue;
    const overlap = source.shrines.filter((s) => mine.has(s.slug)).map((s) => s.slug);
    if (overlap.length === 0) continue;
    /* A line naming a shelf work counts toward the work, so ten spellings of
       one book are one companion, not ten. */
    const companions = source.works.length > 0 ? source.works : [null];
    for (const slug of companions) {
      const id = slug ?? `line:${source.key}`;
      const tally =
        tallies.get(id) ??
        (slug
          ? { work: library.works.find((w) => w.slug === slug)!, shared: 0, slugs: new Set() }
          : { source, shared: 0, slugs: new Set<string>() });
      for (const s of overlap) tally.slugs.add(s);
      tally.shared = tally.slugs.size;
      tallies.set(id, tally);
    }
  }

  return [...tallies.values()]
    .filter((t) => t.work?.slug !== work.slug)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, limit)
    .map(({ slugs: _slugs, ...rest }) => rest);
}

/** The first URL a citation line carries, if any — the source itself, one tap away. */
export function urlInCitation(text: string): string | null {
  const match = /\bhttps?:\/\/[^\s<>"”)]+/i.exec(text);
  return match ? match[0].replace(/[.,;:]+$/, '') : null;
}

export type CopyService = 'worldcat' | 'googleBooks' | 'internetArchive' | 'openLibrary';

/**
 * Where a reader can look for a copy, as search links built from the title and
 * the author's surname — a search string, never a claimed holding: the archive
 * does not know which library has the book, and a link that said so would be
 * an invented fact.
 */
export function copySearchLinks(work: Pick<ShelfWork, 'title' | 'author'>): {
  service: CopyService;
  url: string;
}[] {
  const shortTitle = work.title.split(/[:(]/)[0]!.trim();
  /* First named person, surname only: "Shah Abdul Latif; Christopher Shackle
     (tr.)" searches as the poet, which is how catalogues file a translation. */
  const firstAuthor = (work.author ?? '')
    .split(/;| and /)[0]!
    .replace(/\(.*?\)/g, '')
    .trim();
  const surname = firstAuthor.includes(',')
    ? firstAuthor.split(',')[0]!.trim()
    : (firstAuthor.split(/\s+/).pop() ?? '');
  const query = encodeURIComponent(`${shortTitle} ${surname}`.trim());
  return [
    { service: 'worldcat', url: `https://search.worldcat.org/search?q=${query}` },
    { service: 'googleBooks', url: `https://www.google.com/search?tbm=bks&q=${query}` },
    { service: 'internetArchive', url: `https://archive.org/search?query=${query}` },
    { service: 'openLibrary', url: `https://openlibrary.org/search?q=${query}` },
  ];
}
