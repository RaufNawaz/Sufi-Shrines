import type { Lang } from '../../types/shrine';
import { localizeRecordedDate } from './localizeRecordedDate';

/**
 * A recorded figure date, split into the date a reader needs and the
 * qualification the team reads.
 *
 * **Why this exists.** `figure_born` and `figure_died` are recorded as the
 * source gives them, qualification and all (RULE 2), and the infobox printed
 * the whole cell as the value. Shah Inayat Qadiri's `figure_born` reads
 * "c. 1643 (existing sourcing); a 2026 field survey separately gives 1056 AH
 * (~1646 CE) -- the two are consistent within the normal margin of approximate
 * dating", so the Urdu fact panel showed three lines of English under پیدائش
 * (Rauf, 29 October 2026: "there is english leakage"). Measured on the live
 * sheet that day: 4 of 68 `figure_born` cells and 42 of 180 `figure_died`
 * cells carry a sentence, not a date.
 *
 * The rule is the one the founded row already follows (11 September 2026:
 * "remove the notes in the founded"): the public reads the date, the team
 * reads every word. The cell is untouched; this decides only where the date
 * ends.
 *
 * **Where the date ends.** At the first `(`, `[`, `;`, a spaced dash, a
 * sentence stop, or a comma that does not lead into more date ("November 27,
 * 1981" keeps its year; "4 December 1908, Lahore" stops before the place). A
 * parenthetical that is itself a date ("1630 CE (8 Muharram 1040 AH)") stays.
 *
 * **What counts as a date.** At least one digit and no run of three Latin
 * words (the infobox's own line between a unit and a sentence: "1416 AH" is a
 * date, "1166 AH in the text" is not). So "Not given. The only early date is
 * ..." has no date, and the public is shown nothing for it rather than a
 * sentence; the team still sees all of it. A month spelling the Urdu table does
 * not know ("25 Rabī‘ al-Thānī" with a curly quote) is still a date: English
 * reads it as recorded, and the Urdu page declares it as a Latin run, which is
 * the founded row's treatment of the same case.
 */
export interface RecordedDateParts {
  /** The date as recorded, without the approximation marker; empty when the
   *  cell holds no date. */
  date: string;
  /** The approximation marker as written ("c. ", "circa "), or empty. */
  approx: string;
  /** Everything after the date, as recorded, without its leading separator. */
  qualification: string;
}

const APPROX_RE = /^(?:c\.|ca\.|circa|approx\.)\s*(?=[\d۰-۹~])/i;
/* No lookbehind (Safari before 16.4): the guard before the marker is a group. */
const INNER_APPROX_RE = /(^|[\s/(–-])(?:c\.|ca\.|circa|approx\.)\s*(?=[\d۰-۹])/gi;
const HAS_DIGIT = /[\d۰-۹]/;

/** Three Latin words in a row: a sentence, not a unit beside a number. */
function looksLikeSentence(text: string): boolean {
  const runs = text.match(/[A-Za-z]{2,}(?:\s+[A-Za-z]{2,})*/g) ?? [];
  return runs.some((run) => run.split(/\s+/).length >= 3);
}

/** True when the text reads as nothing but a date, every word of it known to
 *  the Urdu date table. Used for a parenthetical, which stays with the date
 *  only when it is certainly another date ("1630 CE (8 Muharram 1040 AH)"). */
export function isDateOnly(text: string): boolean {
  const value = text.trim();
  if (!value || !HAS_DIGIT.test(value)) return false;
  const urdu = localizeRecordedDate(value.replace(INNER_APPROX_RE, '$1~'), 'ur');
  return !/[A-Za-z]/.test(urdu);
}

/** The index where the date part of a recorded value ends. */
function dateEnd(value: string): number {
  let i = 0;
  while (i < value.length) {
    const ch = value[i];
    if (ch === '(') {
      const close = value.indexOf(')', i);
      if (close > i && isDateOnly(value.slice(i + 1, close))) {
        i = close + 1;
        continue;
      }
      return i;
    }
    if (ch === '[' || ch === ';') return i;
    if ((ch === '—' || ch === '–') && value[i - 1] === ' ' && value[i + 1] === ' ') return i;
    if (ch === '-' && value[i + 1] === '-') return i;
    if (ch === '.' && value[i + 1] === ' ') {
      /* "c. 1643" is an abbreviation, not a stop. */
      const word = value.slice(0, i).split(/\s+/).pop() ?? '';
      if (!/^(?:c|ca|approx)$/i.test(word)) return i;
    }
    if (ch === ',' && !/^,\s*[\d۰-۹]/.test(value.slice(i))) return i;
    i += 1;
  }
  return value.length;
}

/* The tazkirah runs mark a numeral the OCR may have misread as `[OCR?]`, often
   inside the date ("۹۷۲ [OCR?] AH"). It is a doubt about the reading, so it is
   the team's, and the date around it is still the date. */
const OCR_MARK = /\s*\[OCR\?\]/g;

export function splitRecordedDate(value: string | null | undefined): RecordedDateParts {
  const recorded = String(value ?? '').trim();
  if (!recorded) return { date: '', approx: '', qualification: '' };
  const raw = recorded.replace(OCR_MARK, '').trim();
  const end = dateEnd(raw);
  const head = raw.slice(0, end).trim();
  const rest = raw
    .slice(end)
    .replace(/^[\s,;.—–-]+/, '')
    .trim();
  if (!HAS_DIGIT.test(head) || looksLikeSentence(head)) {
    return { date: '', approx: '', qualification: recorded };
  }
  const approx = head.match(APPROX_RE)?.[0] ?? '';
  const qualification = OCR_MARK.test(recorded) ? `[OCR?] ${rest}`.trim() : rest;
  OCR_MARK.lastIndex = 0;
  return { date: head.slice(approx.length), approx, qualification };
}

/**
 * The date part for display: month names and calendar markers in Urdu where
 * the page is Urdu (`localizeRecordedDate`), and any approximation marker
 * inside the date ("681 CE / c. 63 AH") read as `circaLabel`. Digits are left
 * to `fmtNum` at the render site (i18n rule 5).
 */
export function localizeDatePart(date: string, lang: Lang, circaLabel: string): string {
  // eslint-disable-next-line no-restricted-syntax -- Urdu-specific: mirrors localizeRecordedDate
  if (lang !== 'ur') return date;
  return localizeRecordedDate(date.replace(INNER_APPROX_RE, `$1${circaLabel} `), lang);
}
