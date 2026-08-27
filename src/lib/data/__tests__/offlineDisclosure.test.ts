// @vitest-environment node
/**
 * A page that reads the sheet must be able to say the sheet is not what it is
 * showing.
 *
 * The archive's distinguishing claim is provenance, and the date of the data in
 * front of the reader is part of it. `OfflineDataBanner` existed and was on the
 * map, alone. Measured offline on 27 August 2026, with the service worker doing
 * exactly its job: `/about`, `/almanac`, `/place/:slug`, `/saint/:slug` and
 * `/shrine/:slug` all rendered **completely** from cache, and none of them said
 * so.
 *
 * `/about` is the case that decides it. That page computes the archive's
 * coverage figures from the shipped data on every load *specifically* so they
 * cannot go stale — the standing-findings note in HANDOVER says a page "cannot
 * go stale the way a note can", and that is the whole reason the numbers are
 * computed rather than written down. Offline it printed "171 sites" from a cache
 * of unknown age with nothing to qualify it: the exact failure the design was
 * built to avoid, arriving through a door nobody had checked.
 *
 * Asserted at the source, like `siteFooter.test.ts`, and for the same reason:
 * the failure mode is **a new page**. Someone adds a route, calls
 * `useShrineData`, and inherits the gap. A test that reads the pages directory
 * notices; an e2e over a hardcoded route list does not.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PAGES = join(__dirname, '..', '..', '..', 'pages');
const files = readdirSync(PAGES).filter((f) => f.endsWith('.tsx'));

/** Source with comments stripped — a check a comment can satisfy is not
 *  checking the code (the lesson from siteFooter.test.ts). */
function code(file: string): string {
  return readFileSync(join(PAGES, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

/** Pages that read the sheet at all. Derived, not listed. */
const dataPages = files.filter((f) => code(f).includes('useShrineData('));

describe('every page that reads the sheet discloses a cached read', () => {
  it('found the data-driven pages', () => {
    /* If this drops, either the app shrank or `useShrineData` was renamed and
       this test quietly started checking nothing. */
    expect(dataPages.length).toBeGreaterThanOrEqual(8);
  });

  it('renders the banner on all of them', () => {
    const missing = dataPages.filter((f) => !code(f).includes('<OfflineDataBanner'));
    expect(
      missing,
      'These pages render the archive from a possibly-stale cache without saying so. ' +
        'An archive whose distinguishing claim is provenance owes the reader the date of ' +
        'what they are looking at.',
    ).toEqual([]);
  });

  it('passes it the two values it needs, not just the flag', () => {
    /* `offline` alone renders "showing cached data" with no date, which is the
       half of the sentence that does not help. */
    const incomplete = dataPages.filter((f) => {
      const source = code(f);
      const usage = source.slice(source.indexOf('<OfflineDataBanner'));
      const tag = usage.slice(0, usage.indexOf('/>') + 2);
      return !tag.includes('offline=') || !tag.includes('sourceTimestamp=');
    });
    expect(incomplete).toEqual([]);
  });

  it('keeps the map on the overlay variant', () => {
    /* The map is a full-height layout with no document flow for an inline
       banner to sit in; every other page is the opposite. Getting this backwards
       is invisible until someone is offline. */
    const map = code('MapPage.tsx');
    expect(map).toMatch(/<OfflineDataBanner[\s\S]{0,200}variant="overlay"/);
    for (const file of dataPages.filter((f) => f !== 'MapPage.tsx')) {
      expect(code(file), `${file} should use the inline variant`).not.toContain(
        'variant="overlay"',
      );
    }
  });
});
