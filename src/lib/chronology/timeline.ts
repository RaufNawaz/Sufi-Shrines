import type { Shrine } from '../../types/shrine';
import { yearPrecisionKey, type YearPrecisionKey } from '../data/yearPrecision';
import { categoryKey, CATEGORY_ORDER, type CategoryKey } from '../data/categoryKey';

/**
 * Track C — the archive's span, drawn honestly.
 *
 * The rule this module exists to enforce is one line long: **uncertainty is
 * rendered as width, never as a point, and an unknown is never given a
 * plausible year.** `docs/planning/SHARED_GROUND_VISION.md` deferred this whole
 * track on exactly that risk — "a timeline must render those as intervals or it
 * launders uncertainty into false precision" — so the parsing lives here, in
 * pure functions with tests, rather than inside a chart component.
 *
 * `year_built_precision` is the input that makes it possible, and it is on
 * **168 of 169 rows** (measured 28 August 2026): exact 44, unknown 43, circa 41,
 * century 35, range 2, three prose sentences, one blank. The deferral was
 * written on 20 August against a column that has since been filled in — a
 * standing finding that had gone stale.
 *
 * Deliberate decisions, each of which could have been the dishonest one:
 *
 * - **`range` is plotted at the circa width, not at a range.** Both `range`
 *   rows record a *single* year (1300, 1800); the extent the precision refers
 *   to is not in the data. Drawing a specific span would invent it, so they get
 *   the same band as `circa` and keep their own recorded label, and the legend
 *   says the extent is not recorded. Widening them to a guessed range would be
 *   the exact failure this file is guarding.
 * - **A prose precision is undated, and its sentence is kept.** `"Uncertain —
 *   field value is a Hijri day-and-year, not a building date"` is the most
 *   honest cell in that column (RULE 2) and is not normalised to `unknown` to
 *   make a chart tidier. `yearPrecisionKey` already returns null for these; this
 *   module does not second-guess it.
 * - **A year that is not a clean CE integer is undated.** `"1024 AH (as given
 *   in the form; not a construction date)"` and `"1041 (as given: …)"` are not
 *   parsed for the digits inside them: converting AH to CE, or trusting a
 *   number that the cell itself says is not a construction date, would be
 *   inventing a date the archive does not hold.
 */

/** Half-width of the band drawn for `circa` (and for `range`, whose recorded
 *  extent is absent). A display convention, stated in the page's legend — not a
 *  claim found in the data. */
export const CIRCA_BAND_YEARS = 25;

/** The present, injectable so tests do not drift with the calendar. A band is
 *  clipped here because a building cannot have been built in the future: the
 *  span expresses uncertainty about a past event, so the part of it beyond
 *  today is impossible, and clipping states a fact rather than inventing one.
 *  Without it a `circa 2015` row draws to 2040 and the axis runs to 2100 — a
 *  heritage archive appearing to document the next century. */
export const presentYear = (): number => new Date().getFullYear();

export type UndatedReason =
  /** `year_built` is empty. */
  | 'no-year'
  /** The sheet says `unknown` in so many words. */
  | 'unknown'
  /** A free-form precision, or a year that is not a plain CE integer. */
  | 'qualified';

export interface DatedPlacement {
  kind: 'dated';
  from: number;
  to: number;
  /** The year as recorded, before the band was applied. */
  year: number;
  precision: Exclude<YearPrecisionKey, 'unknown'>;
}

export interface UndatedPlacement {
  kind: 'undated';
  reason: UndatedReason;
  /** Whatever the row does say, kept verbatim for display. '' when nothing. */
  recorded: string;
}

export type Placement = DatedPlacement | UndatedPlacement;

/** A plain CE year, or null when the cell is anything else. */
export function plainYear(value: string): number | null {
  const v = (value || '').trim();
  if (!/^\d{3,4}$/.test(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** The century containing a year: 950 → 900–999, 1072 → 1000–1099. */
export function centurySpan(year: number): { from: number; to: number } {
  const from = Math.floor(year / 100) * 100;
  return { from, to: from + 99 };
}

export function placeShrine(shrine: Shrine, now: number = presentYear()): Placement {
  const rawYear = (shrine.yearBuilt || '').trim();
  const precision = yearPrecisionKey(shrine.yearBuiltPrecision || '');

  if (!rawYear) return { kind: 'undated', reason: 'no-year', recorded: '' };
  if (precision === 'unknown') return { kind: 'undated', reason: 'unknown', recorded: rawYear };
  if (precision === null) return { kind: 'undated', reason: 'qualified', recorded: rawYear };

  const year = plainYear(rawYear);
  if (year === null) return { kind: 'undated', reason: 'qualified', recorded: rawYear };

  if (precision === 'century') {
    const { from, to } = centurySpan(year);
    return { kind: 'dated', from, to: Math.min(to, Math.max(from, now)), year, precision };
  }
  if (precision === 'exact') {
    return { kind: 'dated', from: year, to: year, year, precision };
  }
  /* circa and range: a band centred on the recorded year. */
  return {
    kind: 'dated',
    from: year - CIRCA_BAND_YEARS,
    to: Math.min(year + CIRCA_BAND_YEARS, Math.max(year, now)),
    year,
    precision,
  };
}

export interface TimelineEntry {
  shrine: Shrine;
  placement: DatedPlacement;
}

export interface TraditionBand {
  key: Exclude<CategoryKey, 'default'>;
  entries: TimelineEntry[];
  /** Earliest `from` and latest `to` in this band, or null when empty. */
  extent: { from: number; to: number } | null;
}

export interface Chronology {
  bands: TraditionBand[];
  /** The whole archive's plotted extent, rounded out to centuries. */
  extent: { from: number; to: number } | null;
  dated: number;
  undated: { total: number; byReason: Record<UndatedReason, number>; shrines: Shrine[] };
}

export function buildChronology(
  shrines: readonly Shrine[],
  now: number = presentYear(),
): Chronology {
  const byKey = new Map<Exclude<CategoryKey, 'default'>, TimelineEntry[]>();
  for (const key of CATEGORY_ORDER) byKey.set(key, []);

  const undatedShrines: Shrine[] = [];
  const byReason: Record<UndatedReason, number> = { 'no-year': 0, unknown: 0, qualified: 0 };
  let dated = 0;

  for (const shrine of shrines) {
    const placement = placeShrine(shrine, now);
    if (placement.kind === 'undated') {
      byReason[placement.reason] += 1;
      undatedShrines.push(shrine);
      continue;
    }
    dated += 1;
    const key = categoryKey(shrine.category);
    /* `default` is the fallback for a category outside the six. Production has
       carried off-schema categories before (HANDOVER, 27 Aug), so such a row is
       counted as dated and simply has no band to sit in rather than being
       silently dropped from the totals. */
    if (key === 'default') continue;
    byKey.get(key)?.push({ shrine, placement });
  }

  const bands: TraditionBand[] = CATEGORY_ORDER.map((key) => {
    const entries = (byKey.get(key) ?? []).sort(
      (a, b) => a.placement.from - b.placement.from || a.placement.to - b.placement.to,
    );
    const extent = entries.length
      ? {
          from: Math.min(...entries.map((e) => e.placement.from)),
          to: Math.max(...entries.map((e) => e.placement.to)),
        }
      : null;
    return { key, entries, extent };
  });

  const withEntries = bands.filter((b) => b.extent);
  /* The left edge rounds out to a century so the axis has a round gridline; the
     right edge does not, because rounding 2026 out to 2100 is the same future
     the clip above just removed. */
  const extent = withEntries.length
    ? {
        from: Math.floor(Math.min(...withEntries.map((b) => b.extent!.from)) / 100) * 100,
        to: Math.min(
          Math.ceil((Math.max(...withEntries.map((b) => b.extent!.to)) + 1) / 100) * 100,
          Math.max(now, ...withEntries.map((b) => b.extent!.to)),
        ),
      }
    : null;

  return {
    bands,
    extent,
    dated,
    undated: { total: undatedShrines.length, byReason, shrines: undatedShrines },
  };
}
