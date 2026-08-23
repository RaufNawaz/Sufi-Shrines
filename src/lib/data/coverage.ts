import type { Shrine } from '../../types/shrine';
import { getFieldValue } from './fieldAliasing';
import { supportLevelKey, type SupportLevelKey } from './supportLevel';
import { infoLevelKey, type InfoLevelKey } from './infoLevel';
import { categoryKey, type CategoryKey } from './categoryKey';

/** Traditions the schema names — `default` is the "not one of these" bucket and
 * is reported as unrecorded rather than as a tradition. */
export type TraditionKey = Exclude<CategoryKey, 'default'>;

/**
 * What this archive knows, and what it does not — computed from the shipped
 * data rather than asserted.
 *
 * The standing findings in `docs/HANDOVER.md` are the most honest thing in this
 * repository and readers cannot see any of them. Worse, they go stale: the note
 * that "49 of 167 entries have no bibliography at all" was true when written and
 * is now wrong — 168 of 169 carry one. A page computed from the data cannot
 * drift from the data, and it turns the archive's candour from a document into
 * something a reader can check.
 *
 * Every count here is a count of *what the archive records*, never an estimate.
 * Where the archive is silent, the number says so instead of guessing.
 */

export interface Distribution<K extends string> {
  counts: Record<K, number>;
  /** Rows whose value the schema does not recognise, or which is blank. */
  unrecorded: number;
  total: number;
}

export interface CoverageReport {
  total: number;
  support: Distribution<SupportLevelKey>;
  info: Distribution<InfoLevelKey>;
  tradition: Distribution<TraditionKey>;
  bibliography: {
    /** Entries carrying at least one bibliography item. */
    withAny: number;
    /** Entries carrying three or more — a reader can triangulate. */
    withThreeOrMore: number;
    withNone: number;
    /** Total bibliography items across the archive. */
    items: number;
  };
  photos: {
    /** Entries with no photograph at all. */
    withNone: number;
    withAny: number;
    /** Total photographs referenced. */
    items: number;
  };
  dates: {
    /** Entries recording a construction year at all. */
    withYear: number;
    /** Of those, how many the archive itself calls exact. */
    exact: number;
    /** Entries carrying a written note qualifying the date — the archive
     * disagreeing with its own number, which is content, not noise. */
    hedged: number;
  };
  location: {
    /** Entries whose own text says the pin is approximate or absent. A
     * coordinate this archive did not measure is not a coordinate it has. */
    approximatePin: number;
  };
  observances: {
    /** Entries recording anything about an ʿurs or festival. */
    withText: number;
    withNone: number;
  };
}

/** One bibliography item = a markdown list item or a bare URL. */
const BIB_ITEM = /^\s*[-*]\s+\S|https?:\/\//gm;
const BIB_HEADING = /^##\s*(Sources|Bibliography|References|Further reading)\b/im;

/**
 * The bibliography region of an entry: a dedicated `Sources` column if the sheet
 * has one, otherwise everything after the first bibliography heading inside the
 * Description. Article sections can be authored either way (see
 * ARTICLE_SECTION_DEFINITIONS), so looking in only one place undercounts.
 */
function bibliographyItems(shrine: Shrine): number {
  const column = getFieldValue(shrine.raw, 'Sources');
  if (column.trim()) return (column.match(BIB_ITEM) ?? []).length;
  const description = getFieldValue(shrine.raw, 'Description');
  const heading = BIB_HEADING.exec(description);
  if (!heading) return 0;
  return (description.slice(heading.index + heading[0].length).match(BIB_ITEM) ?? []).length;
}

/**
 * Phrases with which the archive flags its own coordinates as approximate. Read
 * from the entry's own prose because that is where the survey records it — these
 * are sentences a fieldworker wrote, not a column anyone thought to add.
 */
const APPROXIMATE_PIN =
  /approximate|not the (?:shrine|grave)'s exact position|no coordinates|precise pin/i;

function photoCount(shrine: Shrine): number {
  let n = 0;
  for (let i = 1; i <= 16; i++) {
    if (getFieldValue(shrine.raw, `Image ${i}`).trim()) n++;
  }
  return n;
}

function tally<K extends string>(
  shrines: readonly Shrine[],
  keys: readonly K[],
  resolve: (shrine: Shrine) => K | null,
): Distribution<K> {
  const counts = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  let unrecorded = 0;
  for (const shrine of shrines) {
    const key = resolve(shrine);
    if (key === null) unrecorded++;
    else counts[key]++;
  }
  return { counts, unrecorded, total: shrines.length };
}

export const SUPPORT_KEYS: SupportLevelKey[] = [
  'field-verified',
  'source-documented',
  'source-seeded',
  'web-compiled',
];
export const INFO_KEYS: InfoLevelKey[] = ['full', 'moderate', 'low'];
export const TRADITION_KEYS: TraditionKey[] = [
  'muslim',
  'hindu',
  'sikh',
  'nanakpanthi',
  'jain',
  'secular',
];

export function buildCoverage(shrines: readonly Shrine[]): CoverageReport {
  const bibCounts = shrines.map(bibliographyItems);
  const photoCounts = shrines.map(photoCount);

  const withYear = shrines.filter((s) => getFieldValue(s.raw, 'year_built').trim());

  return {
    total: shrines.length,
    support: tally(shrines, SUPPORT_KEYS, (s) => supportLevelKey(s.supportLevel)),
    info: tally(shrines, INFO_KEYS, (s) => infoLevelKey(s.infoLevel)),
    tradition: tally(shrines, TRADITION_KEYS, (s) => {
      const key = categoryKey(s.category);
      return key === 'default' ? null : key;
    }),
    bibliography: {
      withAny: bibCounts.filter((n) => n >= 1).length,
      withThreeOrMore: bibCounts.filter((n) => n >= 3).length,
      withNone: bibCounts.filter((n) => n === 0).length,
      items: bibCounts.reduce((a, b) => a + b, 0),
    },
    photos: {
      withNone: photoCounts.filter((n) => n === 0).length,
      withAny: photoCounts.filter((n) => n > 0).length,
      items: photoCounts.reduce((a, b) => a + b, 0),
    },
    dates: {
      withYear: withYear.length,
      exact: withYear.filter(
        (s) => getFieldValue(s.raw, 'year_built_precision').trim().toLowerCase() === 'exact',
      ).length,
      hedged: shrines.filter((s) => getFieldValue(s.raw, 'year_built_note').trim()).length,
    },
    location: {
      approximatePin: shrines.filter((s) =>
        APPROXIMATE_PIN.test(
          [
            getFieldValue(s.raw, 'Location'),
            getFieldValue(s.raw, 'year_built_note'),
            getFieldValue(s.raw, 'status_note'),
          ].join(' '),
        ),
      ).length,
    },
    observances: {
      withText: shrines.filter((s) => getFieldValue(s.raw, 'Events').trim()).length,
      withNone: shrines.filter((s) => !getFieldValue(s.raw, 'Events').trim()).length,
    },
  };
}
