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

  entries.forEach((entry, i) => {
    const { shrine, observance, window, approximate } = entry;
    const summary = approximate
      ? `${shrine.name} — ʿurs (approximate)`
      : `${shrine.name} — ʿurs`;

    const description = [
      `Recorded in the archive as: ${observance.sourceText}`,
      approximate
        ? 'This date is projected from the Hijri calendar. The observance begins on ' +
          'local moon sighting and may fall one or two days either side. Confirm with ' +
          'the shrine before travelling.'
        : 'A fixed civil-calendar date.',
      `${options.baseUrl}/shrine/${shrine.slug}`,
    ].join('\n');

    // A stable UID so re-importing updates rather than duplicates.
    const uid = `${shrine.slug}-${icsDate(window.start)}-${i}@shrines-of-pakistan`;

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
      shrine.location ? `LOCATION:${icsText(shrine.location)}` : '',
      'END:VEVENT',
    );
  });

  lines.push('END:VCALENDAR');
  return lines.filter(Boolean).map(fold).join('\r\n');
}
