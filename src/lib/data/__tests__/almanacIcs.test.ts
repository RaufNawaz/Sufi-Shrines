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
    expect(ics).toContain('A fixed date in the Gregorian calendar\\, as recorded.');
    expect(ics).not.toContain('SUMMARY:Mian Mir — ʿurs (approximate)');
  });

  it('escapes RFC 5545 special characters in free text', () => {
    const almanac = buildAlmanac(
      [shrine('Comma, Shrine', 'Annual urs (7 February); qawwali, langar')],
      FROM,
    );
    const ics = unfold(buildIcs(almanac.dated, OPTIONS));
    expect(ics).toContain('Comma\\, Shrine');
    // The event is titled with the observance as recorded.
    expect(ics).toMatch(/SUMMARY:Comma\\, Shrine — Annual urs \(7 February\)/);
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

  it('gives the same observance the same UID whatever list it was downloaded from', () => {
    const dd = shrine('Data Darbar', 'Annual urs (18-20 Safar)');
    const alone = buildIcs(buildAlmanac([dd], FROM).dated, OPTIONS);
    const amongOthers = buildIcs(
      buildAlmanac([shrine('Mian Mir', 'Annual urs (7 February)'), dd], FROM).dated,
      OPTIONS,
    );
    const ddUid = (s: string) =>
      unfold(s)
        .split('\r\n')
        .find((l) => l.startsWith('UID:data-darbar-'));
    expect(ddUid(alone)).toBeDefined();
    expect(ddUid(amongOthers)).toBe(ddUid(alone));
  });

  it('leaves out an observance recorded only to the month — a calendar needs a day', () => {
    const almanac = buildAlmanac(
      [
        shrine('Month Only', 'Annual urs (Rajab)'),
        shrine('Rule Based', 'Urs on the first Wednesday and Thursday of Rajab'),
      ],
      FROM,
    );
    // Both are in the almanac — the file is what leaves them out.
    expect(almanac.dated.length).toBeGreaterThan(0);
    const ics = buildIcs(almanac.dated, OPTIONS);
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('titles an event with what was recorded, not the word ʿurs', () => {
    const almanac = buildAlmanac([shrine('Mazar-e-Iqbal', 'Iqbal Day (9 November)')], FROM);
    const ics = unfold(buildIcs(almanac.dated, OPTIONS));
    expect(ics).toContain('SUMMARY:Mazar-e-Iqbal — Iqbal Day (9 November)');
    expect(ics).not.toContain('ʿurs');
  });

  it('writes a place name, not a survey paragraph, as the location', () => {
    const almanac = buildAlmanac(
      [
        shrine(
          'Survey Shrine',
          'Annual urs (7 February)',
          'Lahore (no locality, address or coordinates recorded in the survey)',
        ),
      ],
      FROM,
    );
    const ics = unfold(buildIcs(almanac.dated, OPTIONS));
    expect(ics).not.toContain('recorded in the survey');
  });

  it('writes the Urdu reader’s file in Urdu', () => {
    const almanac = buildAlmanac([shrine('Data Darbar', 'Annual urs (18-20 Safar)')], FROM);
    const en = unfold(buildIcs(almanac.dated, OPTIONS));
    const ur = unfold(buildIcs(almanac.dated, { ...OPTIONS, lang: 'ur' }));
    expect(ur).not.toBe(en);
    expect(ur).toMatch(/DESCRIPTION:[^\r]*[\u0600-\u06FF]/);
  });

  it('produces an empty but valid calendar when nothing is dated', () => {
    const almanac = buildAlmanac([shrine('Undated', 'Annual urs')], FROM);
    const ics = buildIcs(almanac.dated, OPTIONS);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });
});
