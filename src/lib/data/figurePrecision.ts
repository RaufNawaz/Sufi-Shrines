import type { UI_TEXT } from '../i18n/uiStrings';

/**
 * How precise a figure's dates are — the field the archive records and no page
 * showed.
 *
 * `datePrecision` is set on 97 of the graph's figures and was rendered nowhere,
 * which produced exactly the failure this archive exists not to commit: **23
 * figures were shown bare years the data itself calls imprecise.** Bulleh Shah
 * as "1680 / 1757" where the record says `circa`. Lal Shahbaz Qalandar
 * "1177 / 1274", `circa`. Data Ganj Bakhsh "1009 / 1072", `range`. Abdullah
 * Shah Ghazi "773", `century`. And Abul Faiz Qalander Ali Suharwardi as
 * "1885 / 1958" where the record says `disputed` — his own `disputedDates` entry
 * lists two competing birth dates, so the page asserted a settled year over data
 * that says the sources disagree.
 *
 * A number looks correct. That is the whole problem: nothing about "1680" tells
 * a reader it is an approximation, and RULE 2's standard is that the archive
 * reports what the data says including when the data hedges.
 *
 * **This is a display marker, never a rewrite.** The date string stays exactly as
 * recorded (RULE 2); the precision is shown beside it. Where the string already
 * hedges — "c. 1165", "between 1450 and 1470" — no marker is added, because
 * saying "circa" next to "c. 1165" is noise rather than information.
 */

/** The vocabulary `datePrecision` actually uses in the shipped graph. Distinct
 * from `YearPrecisionKey` (the shrine's `year_built_precision`), which has no
 * `exact-date`, `year` or `disputed` and spells the empty case `unknown`. Kept as
 * separate types because they are separate columns with separate vocabularies —
 * merging them would mean one of the two silently accepting a value it has no
 * label for. */
export type FigurePrecisionKey =
  | 'exact-date'
  | 'year'
  | 'circa'
  | 'century'
  | 'range'
  | 'disputed'
  | 'unrecorded';

const KEYS: readonly FigurePrecisionKey[] = [
  'exact-date',
  'year',
  'circa',
  'century',
  'range',
  'disputed',
  'unrecorded',
];

export function figurePrecisionKey(value: string | undefined): FigurePrecisionKey | null {
  const v = (value || '').trim().toLowerCase();
  return (KEYS as readonly string[]).includes(v) ? (v as FigurePrecisionKey) : null;
}

/**
 * The precisions that need saying out loud. `exact-date` and `year` are the
 * archive claiming the date *is* the date, so a marker would be clutter;
 * `unrecorded` has no date to qualify.
 */
const NEEDS_MARKER: Record<FigurePrecisionKey, boolean> = {
  'exact-date': false,
  year: false,
  circa: true,
  century: true,
  range: true,
  disputed: true,
  unrecorded: false,
};

/** Reuses the labels the shrine infobox already has for `year_built_precision`,
 * and the "sources disagree" heading the disputed-dates section already uses.
 * Four existing keys, no new interface copy — which also keeps this off the
 * string payload. */
const LABEL_KEYS: Partial<Record<FigurePrecisionKey, keyof (typeof UI_TEXT)['en']>> = {
  circa: 'precisionCirca',
  century: 'precisionCentury',
  range: 'precisionRange',
  disputed: 'disputedDatesLabel',
};

/**
 * Words that mean the recorded string is already hedging for itself.
 *
 * Deliberately generous, and biased towards *not* marking: a missed marker leaves
 * a date reading as it always has, while a doubled one ("c. 1165 · circa") makes
 * the archive look like it cannot read its own data. Includes the Urdu forms,
 * because a recorded date can be an Urdu phrase.
 */
const ALREADY_HEDGED =
  /\bc\.|\bca\.|circa|approx|about\s+\d|around\s+\d|\?|between|\bor\b|century|centuries|\d\s*[–—-]\s*\d|تقریب|صدی|حدود|یا/i;

export function statesItsOwnHedge(...dates: (string | null | undefined)[]): boolean {
  return ALREADY_HEDGED.test(dates.filter(Boolean).join(' '));
}

export interface FigurePrecisionMarker {
  key: FigurePrecisionKey;
  labelKey: keyof (typeof UI_TEXT)['en'];
}

/**
 * The marker to show beside a figure's dates, or null.
 *
 * Null in three different circumstances, all of them correct: the record claims
 * precision, the record has no dates, or the dates already say so themselves.
 */
export function figurePrecisionMarker(figure: {
  datePrecision?: string | undefined;
  born?: string | undefined;
  died?: string | undefined;
  era?: string | undefined;
}): FigurePrecisionMarker | null {
  const key = figurePrecisionKey(figure.datePrecision);
  if (!key || !NEEDS_MARKER[key]) return null;
  if (!figure.born && !figure.died && !figure.era) return null;
  if (statesItsOwnHedge(figure.born, figure.died, figure.era)) return null;
  const labelKey = LABEL_KEYS[key];
  return labelKey ? { key, labelKey } : null;
}
