/**
 * Placing an order's members on a century axis — and refusing to place the ones
 * the record cannot place.
 *
 * The order page already prints every member's dates as text and sums them into
 * a "12th–20th c." chip, so a reader willing to scan twenty-three rows can work
 * out the shape of a silsila in time. A strip is that work done for them. It is
 * also, for exactly the same reason, the surface where an unplaceable date stops
 * being a caveat and becomes a drawing: a bar has two ends, and giving one to a
 * figure the record dates once is a claim the archive cannot support.
 *
 * So the refusals live here, in the shape of the output, rather than in the
 * view's good intentions (RULE 4). Three of them:
 *
 * 1. **A figure the record cannot place in the Gregorian calendar is not on the
 *    axis at all.** That is `gregorianYear`'s judgement, not this module's: a
 *    Hijri-only date returns null, because converting it here would be the
 *    archive inventing a date (RULE 2), and so does a string carrying two
 *    unmarked years. They come back in `unplaced` with the reason, so the view
 *    can say how many and name them.
 *
 * 2. **One year is a point, never a bar.** Five of the fifty-one figures on the
 *    five order pages have a death year and no birth year, and one has a birth
 *    year and no death year. A bar from the single year to *anywhere* would be
 *    a lifespan the record does not give; the honest mark is a dot in the year
 *    the source recorded, and the row says which of the two it is.
 *
 * 3. **Two years in the wrong order are not silently swapped.** No member's
 *    dates are inverted today. If a future import produces one, the choice is
 *    between drawing a backwards bar, quietly reversing the source, and saying
 *    the record contradicts itself — and only the third is this archive's
 *    editorial standard. It is `unplaced` with `reason: 'contradictory'`.
 *
 * The axis snaps out to whole centuries because that is the unit the rest of the
 * archive names time in — `CENTURY_ORDINAL`, the era filter, the order page's
 * own span chip — and because a strip whose ends are two arbitrary lives invites
 * the reader to compare the wrong thing.
 */
import { centuryOf, gregorianYear, type DatedFigure } from './figureDates';

/** Why a figure is not on the axis. Both are the record's limits, not the
 * reader's: `undated` is "no year this archive may state", `contradictory` is
 * "two years that cannot both be true". */
export type UnplacedReason = 'undated' | 'contradictory';

export interface TimelineRow<T> {
  figure: T;
  /** Earliest placed year. */
  from: number;
  /** Latest placed year. Equal to `from` on a point. */
  to: number;
  /** Which recorded field a single-year mark came from, or null for a span.
   * The view needs it to say "died 1245" rather than implying a life. */
  point: 'born' | 'died' | null;
}

export interface UnplacedRow<T> {
  figure: T;
  reason: UnplacedReason;
}

export interface FigureTimeline<T> {
  /** Chronological — by the year each row ends, then by the year it starts, so
   * the strip reads down the page the way time runs across it. */
  rows: TimelineRow<T>[];
  unplaced: UnplacedRow<T>[];
  /** Whole-century bounds, e.g. 12 and 20. */
  fromCentury: number;
  toCentury: number;
  /** The axis in years: the first year of `fromCentury` through the last year
   * of `toCentury`. 12 → 1101, 20 → 2000. */
  axisFrom: number;
  axisTo: number;
  /** Every century the axis covers, for the ticks. */
  centuries: number[];
}

/** The two years a figure can be placed at, or a reason it cannot be. */
function placement<T extends DatedFigure>(
  figure: T,
): { from: number; to: number; point: 'born' | 'died' | null } | UnplacedReason {
  const born = gregorianYear(figure.born);
  const died = gregorianYear(figure.died);
  if (born === null && died === null) return 'undated';
  if (born !== null && died !== null) {
    if (born > died) return 'contradictory';
    return { from: born, to: died, point: null };
  }
  const year = (born ?? died) as number;
  return { from: year, to: year, point: born !== null ? 'born' : 'died' };
}

/**
 * The strip, or null where there is nothing to draw.
 *
 * Null on fewer than two placed figures, deliberately. A one-bar strip is an
 * axis with a mark on it: it tells a reader nothing they did not get from the
 * date printed beside the name, and it spends a section heading saying so. The
 * caller hides the section; the figures are still in the member list, and the
 * unplaced ones are still counted by the page's existing undated chip.
 */
export function buildFigureTimeline<T extends DatedFigure>(
  figures: T[],
): FigureTimeline<T> | null {
  const rows: TimelineRow<T>[] = [];
  const unplaced: UnplacedRow<T>[] = [];

  for (const figure of figures) {
    const placed = placement(figure);
    if (typeof placed === 'string') unplaced.push({ figure, reason: placed });
    else rows.push({ figure, ...placed });
  }

  if (rows.length < 2) return null;

  rows.sort((a, b) => a.to - b.to || a.from - b.from);

  const fromCentury = Math.min(...rows.map((r) => centuryOf(r.from)));
  const toCentury = Math.max(...rows.map((r) => centuryOf(r.to)));
  const centuries: number[] = [];
  for (let c = fromCentury; c <= toCentury; c++) centuries.push(c);

  return {
    rows,
    unplaced,
    fromCentury,
    toCentury,
    /* A century's first year, not its hundredth: the 12th century is 1101–1200,
       so the axis opens at 1101 and a figure who died in 1101 sits at its very
       start rather than one year before it. */
    axisFrom: (fromCentury - 1) * 100 + 1,
    axisTo: toCentury * 100,
    centuries,
  };
}

/**
 * Where a year falls on the axis, 0–100.
 *
 * Clamped, because a clamp is a visible flattening at the end of the strip
 * while an unclamped percentage is a bar drawn outside its own track — and the
 * bounds are computed from these same years, so a value outside them means a
 * caller has mixed two timelines and should see something wrong.
 */
export function axisPosition(timeline: { axisFrom: number; axisTo: number }, year: number): number {
  const span = timeline.axisTo - timeline.axisFrom;
  if (span <= 0) return 0;
  const pct = ((year - timeline.axisFrom) / span) * 100;
  return Math.min(100, Math.max(0, pct));
}

/**
 * Which centuries get a printed label.
 *
 * Nine ticks on a phone is nine overlapping ordinals, and in Urdu each is
 * longer ("۱۲ویں"). Every century keeps its gridline — the grid is what makes
 * the spacing legible — but the labels thin to at most `max`, always including
 * the first and the last, so the two ends of the span are named whatever else
 * is dropped.
 */
export function labelledCenturies(centuries: number[], max = 6): number[] {
  if (centuries.length <= max) return centuries;
  const step = Math.ceil((centuries.length - 1) / (max - 1));
  const out = new Set<number>();
  for (let i = 0; i < centuries.length; i += step) out.add(centuries[i]!);
  out.add(centuries[centuries.length - 1]!);
  return [...out].sort((a, b) => a - b);
}
