/**
 * Reading observance dates out of the sheet's free-text `Events` column.
 *
 * ## Why this is a parser and not a lookup
 *
 * There is no urs-date column. `Events` is prose written by surveyors and
 * compilers — "Annual urs (18-20 Safar); Thursday-evening qawwali and dhamal;
 * daily langar" — and `event_year`/`event_note` are something else entirely
 * (a *historical* year: 1469 is Guru Nanak's birth, not an observance date).
 * So a calendar has to read the prose, and the only honest way to do that is
 * to abstain loudly wherever the prose does not actually say.
 *
 * ## Measured coverage (live sheet, 171 rows, 18 August 2026)
 *
 * | precision | rows |
 * |---|---|
 * | day (a day or day-range in a named month) | 22 |
 * | month (a named month, no day) | 10 |
 * | season ("spring", "late winter") | 6 |
 * | undated (names an observance, gives no date) | 79 |
 * | no observance recorded at all | 52 |
 *
 * 32 of the 169 shipped rows — 19% — carry a date at month precision or
 * better. The almanac's job is to show those honestly and to say plainly how
 * many it cannot show, not to backfill the rest from general knowledge
 * (RULE 2). These counts are asserted in `__tests__/ursDates.test.ts`, so
 * drift shows up as a failing test rather than as a stale comment.
 *
 * A 23rd day-precise date exists in the sheet and is *not* in that table:
 * Darbar Hazrat Shah Gohar Peer records "19–21 Ramzan" but has no
 * coordinates, so build-dataset drops the row before the app ever sees it.
 * The almanac cannot show a shrine the dataset does not contain.
 *
 * ## Rules this parser holds to
 *
 * - **Never infer a day from a rule.** "first Wednesday and Thursday of
 *   Rajab" resolves to month precision, not to a date. The rule is
 *   computable; what the archive actually recorded is the month.
 * - **Never resolve an ambiguous month.** Bare "Rabi" (I or II?) yields
 *   nothing. Only a disambiguated form maps.
 * - **Hijri dates stay Hijri.** Gregorian equivalents are computed for
 *   display and always carry the approximate flag: observance follows local
 *   moon sighting, so a printed Gregorian date is a forecast, not a fact.
 * - **Every parsed observance keeps its source text**, so any surface can
 *   show the reader the sentence the date came from.
 */

export type ObservancePrecision = 'day' | 'month' | 'season';
export type CalendarSystem = 'hijri' | 'gregorian';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface Observance {
  /** The clause of the Events cell this was read from, verbatim. */
  sourceText: string;
  calendar: CalendarSystem;
  /** 1-12 within `calendar`. Hijri: 1 = Muharram. Gregorian: 1 = January. */
  month: number | null;
  /** Set only when the source names a month *range* ("May-June"). */
  monthEnd: number | null;
  dayStart: number | null;
  dayEnd: number | null;
  season: Season | null;
  precision: ObservancePrecision;
  /** True when the source describes a recurrence rule rather than a date
   *  ("first Wednesday and Thursday of Rajab") — the month is recorded, the
   *  day deliberately is not. */
  ruleBased: boolean;
}

/** Hijri month names as they actually appear across the sheet, longest-first
 *  so "Rabi al-Thani" is tested before any shorter prefix could claim it.
 *  Bare "Rabi" and bare "Jumada" are absent on purpose: they do not identify
 *  a month, and guessing "I" would be inventing. */
const HIJRI_MONTHS: ReadonlyArray<readonly [RegExp, number]> = [
  [/rabi[\s'’ʻ‘-]*(?:al|ul|us)?[\s'’ʻ‘-]*(?:thani|sani|akhir|II\b|2nd)/i, 4],
  [/rabi[\s'’ʻ‘-]*(?:al|ul|us)?[\s'’ʻ‘-]*(?:awwal|awal|aval|I\b|1st)/i, 3],
  [/jumada[\s'’ʻ‘-]*(?:al|ul)?[\s'’ʻ‘-]*(?:thani|sani|akhir|II\b)/i, 6],
  [/jumada[\s'’ʻ‘-]*(?:al|ul)?[\s'’ʻ‘-]*(?:awwal|awal|ula|I\b)/i, 5],
  [/dhu[\s'’ʻ‘l-]*(?:al|ul)?[\s'’ʻ‘-]*hijj?ah?|zil[\s-]?h[ai]jj?/i, 12],
  [/dhu[\s'’ʻ‘l-]*(?:al|ul)?[\s'’ʻ‘-]*qi?[a‘'’]dah?|zil[\s-]?qa?[a']?d/i, 11],
  [/muharram|muharam/i, 1],
  [/safar/i, 2],
  [/rajab/i, 7],
  [/sha[‘'’ʻ]?ban/i, 8],
  [/ramadan|ramzan|ramadhan/i, 9],
  [/shawwal|shawal/i, 10],
];

export const HIJRI_MONTH_NAMES_EN = [
  'Muharram',
  'Safar',
  'Rabiʻ al-Awwal',
  'Rabiʻ al-Thani',
  'Jumada al-Awwal',
  'Jumada al-Thani',
  'Rajab',
  'Shaʻban',
  'Ramadan',
  'Shawwal',
  'Dhu al-Qaʻdah',
  'Dhu al-Hijjah',
] as const;

export const HIJRI_MONTH_NAMES_UR = [
  'محرم',
  'صفر',
  'ربیع الاول',
  'ربیع الثانی',
  'جمادی الاول',
  'جمادی الثانی',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذی القعدہ',
  'ذی الحجہ',
] as const;

export const GREGORIAN_MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const GREGORIAN_MONTH_NAMES_UR = [
  'جنوری',
  'فروری',
  'مارچ',
  'اپریل',
  'مئی',
  'جون',
  'جولائی',
  'اگست',
  'ستمبر',
  'اکتوبر',
  'نومبر',
  'دسمبر',
] as const;

/** Gregorian months are matched case-sensitively so the English verb "may"
 *  can never be read as a date. */
const GREGORIAN_MONTH_RE = new RegExp(`\\b(${GREGORIAN_MONTH_NAMES_EN.join('|')})\\b`);

const SEASON_RE: ReadonlyArray<readonly [RegExp, Season]> = [
  [/\bspring\b/i, 'spring'],
  [/\bsummer\b/i, 'summer'],
  [/\bautumn\b|\bfall\b/i, 'autumn'],
  [/\bwinter\b/i, 'winter'],
];

/**
 * A recurrence *rule* in place of a date: "first Wednesday and Thursday of
 * Rajab". The month is recorded; the day deliberately is not, because
 * resolving the rule would be the parser asserting a date the archive never
 * wrote down.
 *
 * Scoped narrowly on purpose. An earlier version also treated "daily",
 * "weekly" and "nightly" as rule markers, which silently destroyed real urs
 * dates: most Events cells pair a dated urs with undated weekly and daily
 * observances ("Annual Urs (7th-9th Muharram): … and langar" in a cell that
 * elsewhere says "daily"), and the marker from one clause suppressed the date
 * in another. Those words describe a *different* observance in the same cell,
 * never the urs date.
 */
const RULE_RE = /\b(?:first|second|third|fourth|last)\s+\w*day\b/i;

interface MonthHit {
  month: number;
  /** Every position the month name occurs at, as [index, length]. A cell can
   *  name the same month twice with only one of them carrying the date —
   *  "Muharram tazia procession (9 Muharram)" — so all occurrences are kept
   *  and the day search tries each. */
  occurrences: ReadonlyArray<readonly [number, number]>;
}

function allOccurrences(text: string, re: RegExp): Array<readonly [number, number]> {
  const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  return [...text.matchAll(global)].map((m) => [m.index ?? 0, m[0].length] as const);
}

function hijriMonthOf(text: string): MonthHit | null {
  for (const [re, n] of HIJRI_MONTHS) {
    const occurrences = allOccurrences(text, re);
    if (occurrences.length) return { month: n, occurrences };
  }
  return null;
}

function gregorianMonthOf(text: string): MonthHit | null {
  const m = text.match(GREGORIAN_MONTH_RE);
  if (!m) return null;
  const month = GREGORIAN_MONTH_NAMES_EN.indexOf(m[1] as never) + 1;
  const re = new RegExp(`\\b${GREGORIAN_MONTH_NAMES_EN[month - 1]}\\b`);
  return { month, occurrences: allOccurrences(text, re) };
}

/**
 * A run of days immediately *preceding* the month name, anchored to it:
 * "18-20 Safar", "7th-9th Muharram", "12, 13 and 14 Zil Hajj".
 *
 * The anchoring is the point. Matching a loose "NN <word>" anywhere in the
 * fragment reads "5 days of qawwali in Rajab" as the 5th of Rajab. Only
 * digits that actually abut the month name are a date.
 */
const DAY_RUN_BEFORE =
  /((?:\d{1,2}\s*(?:st|nd|rd|th)?\s*(?:[,،]|[-–—]|and)\s*)*\d{1,2}\s*(?:st|nd|rd|th)?)\s*$/i;
/** "October 31", "November 9-11" — the month-first ordering. */
const DAY_RUN_AFTER = /^\s*(\d{1,2})(?:\s*[-–—]\s*(\d{1,2}))?\b/;

/** Days abutting a month name, as [start, end]; end is null for a single day.
 *  Each occurrence of the month is tried in turn; the first that has digits
 *  actually touching it wins. */
function daysAdjacentTo(fragment: string, hit: MonthHit): [number | null, number | null] {
  for (const [index, length] of hit.occurrences) {
    const before = fragment.slice(0, index).match(DAY_RUN_BEFORE);
    if (before) {
      const nums = (before[1].match(/\d{1,2}/g) ?? []).map(Number);
      if (nums.length) {
        const lo = Math.min(...nums);
        const hi = Math.max(...nums);
        return [lo, hi === lo ? null : hi];
      }
    }
    const after = fragment.slice(index + length).match(DAY_RUN_AFTER);
    if (after) return [Number(after[1]), after[2] ? Number(after[2]) : null];
  }
  return [null, null];
}

/**
 * Splits an Events cell into the clauses worth examining. Semicolons separate
 * distinct observances in this dataset; parenthetical groups are kept with
 * their clause because that is where the dates live.
 */
function clausesOf(events: string): string[] {
  return events
    .split(/;/)
    .map((c) => c.trim())
    .filter(Boolean);
}

/**
 * A clause can carry more than one date — "Two annual urs observances
 * (15 March and 6 September)", "Iqbal Day (9 November); death anniversary
 * (21 April)". Split on " and " only when both halves look like dates, so
 * "qawwali and dhamal" is left alone.
 */
function dateFragmentsOf(clause: string): string[] {
  const parts = clause.split(/\s+and\s+/i);
  if (parts.length < 2) return [clause];
  const dated = parts.filter((p) => /\d/.test(p) && (hijriMonthOf(p) || GREGORIAN_MONTH_RE.test(p)));
  return dated.length >= 2 ? dated : [clause];
}

function parseFragment(fragment: string, sourceText: string): Observance | null {
  const ruleBased = RULE_RE.test(fragment);

  const hijri = hijriMonthOf(fragment);
  const gregorian = hijri ? null : gregorianMonthOf(fragment);
  const hit = hijri ?? gregorian;
  const calendar: CalendarSystem | null = hijri ? 'hijri' : gregorian ? 'gregorian' : null;
  const month = hit ? hit.month : null;

  if (hit === null || month === null) {
    for (const [re, season] of SEASON_RE) {
      if (re.test(fragment)) {
        return {
          sourceText,
          calendar: 'gregorian',
          month: null,
          monthEnd: null,
          dayStart: null,
          dayEnd: null,
          season,
          precision: 'season',
          ruleBased,
        };
      }
    }
    return null;
  }

  // A month *range* ("May-June") — record the span, claim no day.
  let monthEnd: number | null = null;
  if (calendar === 'gregorian') {
    const all = [...fragment.matchAll(new RegExp(GREGORIAN_MONTH_RE, 'g'))].map(
      (m) => GREGORIAN_MONTH_NAMES_EN.indexOf(m[1] as never) + 1,
    );
    const distinct = [...new Set(all)];
    if (distinct.length > 1) monthEnd = distinct[distinct.length - 1];
  }

  let dayStart: number | null = null;
  let dayEnd: number | null = null;

  // A recurrence rule names a month but deliberately yields no day, and a
  // month *range* is by definition not day-precise.
  if (!ruleBased && monthEnd === null) {
    [dayStart, dayEnd] = daysAdjacentTo(fragment, hit);
  }

  // Reject impossible days rather than displaying them.
  if (dayStart !== null && (dayStart < 1 || dayStart > 31)) dayStart = dayEnd = null;
  if (dayEnd !== null && (dayEnd < 1 || dayEnd > 31 || dayEnd < (dayStart ?? 1))) dayEnd = null;

  return {
    sourceText,
    calendar: calendar as CalendarSystem,
    month,
    monthEnd,
    dayStart,
    dayEnd,
    season: null,
    precision: dayStart !== null ? 'day' : 'month',
    ruleBased,
  };
}

/** All dated observances readable from one Events cell, best precision first. */
export function parseObservances(events: string | null | undefined): Observance[] {
  const text = (events ?? '').trim();
  if (!text) return [];

  const found: Observance[] = [];
  for (const clause of clausesOf(text)) {
    for (const fragment of dateFragmentsOf(clause)) {
      const parsed = parseFragment(fragment, clause);
      if (parsed) found.push(parsed);
    }
  }

  // Deduplicate identical readings produced by overlapping fragments.
  const seen = new Set<string>();
  return found.filter((o) => {
    const key = `${o.calendar}|${o.month}|${o.monthEnd}|${o.dayStart}|${o.dayEnd}|${o.season}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const OBSERVANCE_RE =
  /\burs\b|ʿurs|\bmela\b|\bfestival\b|\bcommemorat|\banniversar|\byatra\b|\bgurpurab\b|\bjatra\b|\bshivratri\b|\bgathering/i;

/** A clause that *denies* an observance: "no fixed public festival
 *  documented", "None - abandoned", "no public urs observed". Counting these
 *  as claims would overstate how much the archive knows — and this number is
 *  published on the almanac, so it has to be right. */
const NEGATED_RE = /\bno\b|\bnone\b|\bnot\b|\bnever\b|\bwithout\b/i;

/**
 * True when the cell names an observance but records no date — the rows the
 * almanac must count out loud rather than quietly drop.
 *
 * Deliberately disjoint from `parseObservances`: a cell is either dated or
 * undated-but-claimed or neither, never two of those, so the almanac's totals
 * add up to the row count.
 */
export function claimsUndatedObservance(events: string | null | undefined): boolean {
  const text = (events ?? '').trim();
  if (!text) return false;
  if (parseObservances(text).length > 0) return false;
  return clausesOf(text).some(
    (clause) => OBSERVANCE_RE.test(clause) && !NEGATED_RE.test(clause),
  );
}
