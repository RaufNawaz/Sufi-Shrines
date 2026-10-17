/**
 * iCalendar export for the dated observances.
 *
 * The approximation is carried into the file rather than left behind in the
 * UI: a Hijri-derived event says so in its DESCRIPTION and its SUMMARY, so a
 * date that lands in someone's phone still knows it is a forecast. An .ics
 * that quietly asserted "18-20 Safar" as three fixed civil days would be the
 * single easiest way for this archive to publish a wrong date.
 *
 * Events are all-day (DTSTART;VALUE=DATE) because that is what an urs is —
 * a day or a span of days, not an instant. Per RFC 5545 an all-day DTEND is
 * exclusive, so it is the day *after* the last day of the observance.
 */
import type { AlmanacEntry } from './almanac';
import type { Lang } from '../../types/shrine';
import { t } from '../i18n/uiStrings';
import { localizeShrineName } from '../i18n/localizeShrineName';
import { localizeObservance } from '../i18n/localizeObservance';
import { publicLocation } from './publicLocation';

/**
 * Whether an observance can go into a calendar file as days.
 *
 * Only one recorded to the day. The calendar page will not place a month-only
 * observance on a day, because that would invent a date; the file used to do
 * something worse and write it as an all-day event 29–61 days long ("Jeth,
 * May–June" became 61 days), with "A fixed civil-calendar date." in its notes
 * (calendar council, 17 October 2026). A recurrence rule ("first Wednesday and
 * Thursday of Rajab") is a month with the day deliberately unrecorded, so it
 * stays out too.
 */
export function isCalendarable(entry: AlmanacEntry): boolean {
  return entry.observance.precision === 'day' && !entry.observance.ruleBased;
}

/** A short stable hash, so two observances of one site on one day stay two. */
function shortHash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function icsDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/** Escapes per RFC 5545 §3.3.11 and folds to the 75-octet line limit. */
function icsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * RFC 5545 §3.1 line folding. Applied to *every* line rather than only the
 * obviously long free-text ones — a UID built from a long shrine slug runs
 * past 75 octets just as easily as a DESCRIPTION does, and an over-long line
 * is a parse error for strict consumers.
 */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest) parts.push(` ${rest}`);
  return parts.join('\r\n');
}

export interface IcsOptions {
  /** Absolute base URL for shrine links, e.g. https://example.org/Sufi-Shrines */
  baseUrl: string;
  /** Stamp for DTSTAMP; injected so output is deterministic in tests. */
  now: Date;
  /** The reader's language: names, titles and notes are written in it. */
  lang?: Lang;
}

export function buildIcs(entries: AlmanacEntry[], options: IcsOptions): string {
  const stamp = `${icsDate(options.now)}T000000Z`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mapping the Shrines of Pakistan//Urs Almanac//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsText('Urs Almanac — Shrines of Pakistan')}`,
  ];

  const lang = options.lang ?? 'en';
  for (const entry of entries.filter(isCalendarable)) {
    const { shrine, observance, window, approximate } = entry;
    const name = localizeShrineName(shrine, lang);
    /* The observance as recorded — "Annual urs (18-20 Safar)", "Guru Nanak
       Gurpurab" — not the word ʿurs for every row: Iqbal Day and a Kali
       festival were both titled "— ʿurs". */
    const recorded = localizeObservance(observance.sourceText, lang);
    const summary = `${name} — ${recorded}${approximate ? ` (${t(lang, 'almanacApproximate')})` : ''}`;

    const description = [
      approximate ? t(lang, 'almanacProjectedCaveat') : t(lang, 'almanacIcsFixedDate'),
      `${options.baseUrl}/shrine/${shrine.slug}`,
    ].join('\n');

    /* Stable across downloads, so re-importing updates rather than
       duplicates. It carried the row's index in whatever list was downloaded,
       so the same ʿurs had a different UID from the shrine page, the full
       calendar and a filtered one. */
    const uid = `${shrine.slug}-${icsDate(window.start)}-${shortHash(observance.sourceText)}@shrines-of-pakistan`;
    /* A place name, not the survey's paragraph about the address. */
    const location = shrine.location ? publicLocation(shrine.location, shrine, lang) : '';

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(window.start)}`,
      // All-day DTEND is exclusive.
      `DTEND;VALUE=DATE:${icsDate(new Date(window.end.getTime() + 86_400_000))}`,
      `SUMMARY:${icsText(summary)}`,
      `DESCRIPTION:${icsText(description)}`,
      `URL:${options.baseUrl}/shrine/${shrine.slug}`,
      location ? `LOCATION:${icsText(location)}` : '',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.filter(Boolean).map(fold).join('\r\n');
}
