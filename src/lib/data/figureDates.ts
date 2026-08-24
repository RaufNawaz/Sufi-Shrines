
/**
 * When a figure lived, to the century, from the free text the sources recorded —
 * and `null` wherever answering would mean converting a calendar.
 *
 * `parseEra` already turns a `founded` string into a century range and is right
 * for that column. Pointed at a figure's dates it is dangerous, because it
 * reads every 3–4 digit number as a Gregorian year. Five of the 77 dated
 * figures carry a Hijri one, and two of those carry *only* Hijri: Shah Gohar
 * Peer's "11 Rabīʿ al-Sānī 729 AH / 21 Ramzan 825 AH" would file a man who died
 * around 1422 CE under the 8th and 9th centuries, and Hazrat Tahir Bandagi's
 * "8 Muharram 1040 AH / 8 August 1630 CE" would give one person an eleventh-to-
 * seventeenth-century lifespan. Both would look like ordinary data on a page.
 *
 * So the rule is explicit rather than clever:
 *
 *  1. A year marked CE wins, even when an AH year sits beside it — that is the
 *     source doing the conversion, not us.
 *  2. Otherwise, an AH marker anywhere in the string means **no answer**. The
 *     arithmetic is easy and it is still not ours to do (RULE 2): a Hijri year
 *     spans parts of two Gregorian ones, and the archive's own entries hedge
 *     that conversion in prose where it matters.
 *  3. Otherwise a single unmarked year is read as CE, which is what every
 *     unmarked year in this dataset is.
 *  4. Two unmarked years with no CE marker is ambiguous, so: no answer.
 *
 * Every caller must therefore be able to say "and N figures are undated",
 * because a span computed over a subset and presented as the whole is the same
 * error in a different place.
 */

/** Just the two recorded date fields, accepting `null` as well as absent —
 * `KGSaint` declares them optional, and a caller building a row by hand (or a
 * test naming the empty case) writes `null`. Nothing here needs the rest of a
 * figure. */
export interface DatedFigure {
  born?: string | null;
  died?: string | null;
}

const AH_MARKER = /\bAH\b|\bA\.H\.|هجری|ہجری/;
/* The optional tail is for an abbreviated range: the survey writes
   "1341 AH (c. 1922\u201323 CE by calendar conversion)", where the token
   immediately before CE is "23". Without it the marked year is missed and the
   AH rule below returns nothing — a date the source had already converted. */
const CE_YEAR = /\b(\d{3,4})(?:\s*[\u2013\u2014-]\s*\d{1,4})?\s*(?:CE|C\.E\.|AD|A\.D\.)/g;
const ANY_YEAR = /\b(\d{3,4})\b/g;

const inRange = (year: number) => year >= 100 && year <= 2100;

/** The Gregorian year a recorded date names, or null where saying would mean
 * converting a calendar or choosing between two candidates. */
export function gregorianYear(recorded: string | null | undefined): number | null {
  const text = recorded?.trim();
  if (!text) return null;

  const marked = [...text.matchAll(CE_YEAR)].map((m) => Number(m[1])).filter(inRange);
  if (marked.length > 0) return Math.min(...marked);

  if (AH_MARKER.test(text)) return null;

  const bare = [...new Set([...text.matchAll(ANY_YEAR)].map((m) => Number(m[1])).filter(inRange))];
  return bare.length === 1 ? bare[0] : null;
}

/** 1630 → 17. */
export function centuryOf(year: number): number {
  return Math.ceil(year / 100);
}

/**
 * The century to file a figure under: the death year where the record gives
 * one, else the birth year. Death first because a shrine commemorates a death
 * and an ʿurs dates from it — the archive's own centre of gravity.
 */
export function figureCentury(saint: DatedFigure): number | null {
  const year = gregorianYear(saint.died) ?? gregorianYear(saint.born);
  return year === null ? null : centuryOf(year);
}

export interface CenturySpan {
  from: number;
  to: number;
  /** Figures placed in the span. */
  dated: number;
  /** Figures the record cannot place without converting a calendar or guessing
   * between two years. Must be shown wherever the span is. */
  undated: number;
}

/** The century span of a set of figures, with the count it could not place. */
export function centurySpan(saints: DatedFigure[]): CenturySpan | null {
  const centuries = saints.map(figureCentury).filter((c): c is number => c !== null);
  const undated = saints.length - centuries.length;
  if (centuries.length === 0) return null;
  return {
    from: Math.min(...centuries),
    to: Math.max(...centuries),
    dated: centuries.length,
    undated,
  };
}
