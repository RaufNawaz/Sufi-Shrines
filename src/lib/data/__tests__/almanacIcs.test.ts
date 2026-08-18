// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildIcs } from '../almanacIcs';
import { buildAlmanac } from '../almanac';
import { buildShrine } from '../shrineModel';

const FROM = new Date(Date.UTC(2026, 7, 18));
const OPTIONS = { baseUrl: 'https://example.org/Sufi-Shrines', now: FROM };

/** Reverses RFC 5545 line folding, so content assertions can read the logical
 *  line rather than the wire format. */
const unfold = (ics: string) => ics.replace(/\r\n /g, '');

function shrine(name: string, events: string, location = 'Lahore, Punjab') {
  return buildShrine(
    { Name: name, Latitude: '31.57', Longitude: '74.30', Events: events, Location: location } as never,
    0,
  )!;
}

describe('buildIcs', () => {
  it('emits a well-formed calendar with CRLF line endings', () => {
    const almanac = buildAlmanac([shrine('Mian Mir', 'Annual urs (7 February)')], FROM);
    const ics = buildIcs(almanac.dated, OPTIONS);

    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).toContain('VERSION:2.0');
    expect(ics.split('\r\n').filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(1);
  });

  it('writes all-day events with an exclusive DTEND', () => {
    // 12-14 January is three days: DTEND is the 15th per RFC 5545.
    const almanac = buildAlmanac([shrine('Wasif Ali Wasif', 'Annual Urs (12-14 January)')], FROM);
    const ics = buildIcs(almanac.dated, OPTIONS);
    expect(ics).toContain('DTSTART;VALUE=DATE:20270112');
    expect(ics).toContain('DTEND;VALUE=DATE:20270115');
  });

  it('carries the approximation into the event, not just the UI', () => {
    const almanac = buildAlmanac([shrine('Data Darbar', 'Annual urs (18-20 Safar)')], FROM);
    const ics = unfold(buildIcs(almanac.dated, OPTIONS));
    expect(ics).toContain('approximate');
    expect(ics).toContain('moon sighting');
  });

  it('does not claim approximation for a fixed civil date', () => {
    const almanac = buildAlmanac([shrine('Mian Mir', 'Annual urs (7 February)')], FROM);
    const ics = unfold(buildIcs(almanac.dated, OPTIONS));
    expect(ics).toContain('A fixed civil-calendar date.');
    expect(ics).not.toContain('SUMMARY:Mian Mir — ʿurs (approximate)');
  });

  it('escapes RFC 5545 special characters in free text', () => {
    const almanac = buildAlmanac(
      [shrine('Comma, Shrine', 'Annual urs (7 February); qawwali, langar')],
      FROM,
    );
    const ics = unfold(buildIcs(almanac.dated, OPTIONS));
    expect(ics).toContain('Comma\\, Shrine');
    // The recorded source text keeps its semicolon, escaped.
    expect(ics).toMatch(/Recorded in the archive as: Annual urs \(7 February\)/);
  });

  it('folds lines to the 75-octet limit', () => {
    const almanac = buildAlmanac(
      [
        shrine(
          'A shrine with a very long name indeed, long enough to need folding across lines',
          'Annual urs (7 February)',
        ),
      ],
      FROM,
    );
    const ics = buildIcs(almanac.dated, OPTIONS);
    for (const line of ics.split('\r\n')) {
      expect(line.length, `line too long: ${line}`).toBeLessThanOrEqual(75);
    }
  });

  it('gives each event a stable UID so re-import updates rather than duplicates', () => {
    const almanac = buildAlmanac([shrine('Data Darbar', 'Annual urs (18-20 Safar)')], FROM);
    const first = buildIcs(almanac.dated, OPTIONS);
    const second = buildIcs(buildAlmanac([shrine('Data Darbar', 'Annual urs (18-20 Safar)')], FROM).dated, OPTIONS);
    const uid = (s: string) => unfold(s).split('\r\n').find((l) => l.startsWith('UID:'));
    expect(uid(first)).toBe(uid(second));
  });

  it('produces an empty but valid calendar when nothing is dated', () => {
    const almanac = buildAlmanac([shrine('Undated', 'Annual urs')], FROM);
    const ics = buildIcs(almanac.dated, OPTIONS);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });
});
