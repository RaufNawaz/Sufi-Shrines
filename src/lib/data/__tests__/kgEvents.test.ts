// @vitest-environment node
/**
 * An urs is a Sufi observance, and the archive covers six traditions.
 *
 * `build-kg.mjs` typed every one of its 168 event nodes `urs` and named them
 * from one template, so the graph asserted "Urs of Shiva at Amb Temples", "Urs
 * of Bhai Waliram at Bhai Waliram Darbar" — **86 of 168, at Hindu temples and
 * Sikh gurdwaras.** These are not internal: `scripts/prerender.mjs` publishes
 * every event as a schema.org `Event` in its shrine page's JSON-LD, so the
 * category error was machine-readable on 86 published pages, and exported again
 * through `data:export` into the JSON-LD and RDF dumps.
 *
 * Two more inventions in the same 12 lines:
 *
 * - **`frequency: 'annual'` on no evidence.** The parser's final fallback was
 *   `'annual'` for any non-empty text, so 83 of 168 events shipped
 *   `repeatFrequency: P1Y` — including sites whose `Events` column reads "Not
 *   documented" or "None - destroyed 1992".
 * - **An event node at all** for a record that says nothing happens. 16 rows
 *   answer the "what happens here" column with a site *status*.
 *
 * All three are the same failure: a template filling in what the record does not
 * say. This file asserts the record's word decides, in both directions — nothing
 * is called an urs that is not one, and nothing that *is* recorded as one is
 * dropped.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildSlugs } from '../../../../scripts/data/lib/slugs.mjs';
import {
  resolveCategory,
  NON_MUSLIM_TRADITIONS,
  CATEGORY_ENUM,
} from '../../../../scripts/data/lib/category.mjs';

const ROOT = join(__dirname, '..', '..', '..', '..');
const kg = JSON.parse(readFileSync(join(ROOT, 'data', 'kg.json'), 'utf8'));
const dataset = JSON.parse(readFileSync(join(ROOT, 'data', 'shrines.json'), 'utf8'));
const rows: Record<string, string>[] = dataset.rows ?? dataset;
const slugs = buildSlugs(rows) as string[];

const rowBySlug = new Map<string, Record<string, string>>();
rows.forEach((row, i) => rowBySlug.set(slugs[i], row));

const events = kg.events as {
  slug: string;
  name: string;
  eventType: string;
  shrineSlug: string;
  frequency?: string;
}[];

const recordedEvents = (slug: string) => String(rowBySlug.get(slug)?.['Events'] ?? '');

describe('the graph found its events', () => {
  it('has events, and fewer than one per row', () => {
    /* A floor and a ceiling, so no assertion below can pass by the collection
       emptying or by every row producing one regardless of content. */
    expect(events.length).toBeGreaterThan(100);
    expect(events.length).toBeLessThan(rows.length);
  });

  it('points every event at a row that exists', () => {
    const orphans = events.filter((e) => !rowBySlug.has(e.shrineSlug)).map((e) => e.slug);
    expect(orphans).toEqual([]);
  });
});

describe('only an urs is called an urs', () => {
  it('never types an observance at a Hindu, Sikh, Nanakpanthi or Jain site as urs', () => {
    const wrong = events
      .filter((e) => e.eventType === 'urs')
      .filter((e) => NON_MUSLIM_TRADITIONS.has(resolveCategory(rowBySlug.get(e.shrineSlug) ?? {})))
      .map((e) => `${e.slug}: ${e.name}`);
    expect(
      wrong,
      'An urs is a Sufi death-anniversary observance. Naming a Shivratri or a Gurpurab one ' +
        'flattens six traditions into one vocabulary.',
    ).toEqual([]);
  });

  it('never types an event urs unless the record says urs', () => {
    const unsupported = events
      .filter((e) => e.eventType === 'urs')
      .filter((e) => !/\burs\b|ʿurs/i.test(recordedEvents(e.shrineSlug)))
      .map((e) => `${e.slug}: ${recordedEvents(e.shrineSlug).slice(0, 60)}`);
    expect(unsupported).toEqual([]);
  });

  it('does not drop an urs the record does state', () => {
    /* The other direction, and the one a stricter rule would have broken: one
       row carries the invalid `category: "Islam"` and a text that plainly says
       *ʿurs*. Requiring `category === 'Muslim Shrine'` would have retyped its
       real urs as a generic observance over a schema violation in the sheet. */
    const missed = rows
      .map((row, i) => ({ row, slug: slugs[i] }))
      .filter(({ row }) => /\burs\b|ʿurs/i.test(String(row['Events'] ?? '')))
      .filter(({ row }) => !NON_MUSLIM_TRADITIONS.has(resolveCategory(row)))
      .filter(({ slug }) => !events.some((e) => e.shrineSlug === slug && e.eventType === 'urs'))
      .map(({ slug }) => slug);
    expect(missed).toEqual([]);
  });

  it('uses only the two values the vocabulary has', () => {
    expect([...new Set(events.map((e) => e.eventType))].sort()).toEqual(['observance', 'urs']);
  });

  it('names a non-urs observance from the record rather than a template', () => {
    /* "Maha Shivratri at Churrio Jabal Durga Mata Temple", not "Urs of Goddess
       Durga at …". The archive has no vocabulary of its own for a Gurpurab, and
       inventing one is not the build script's job. */
    const templated = events
      .filter((e) => e.eventType === 'observance')
      .filter((e) => /^Urs\b/.test(e.name))
      .map((e) => e.name);
    expect(templated).toEqual([]);

    const shivratri = events.find((e) => e.shrineSlug === 'churrio-jabal-durga-mata-temple');
    expect(shivratri?.name).toContain('Maha Shivratri');
  });
});

describe('a frequency is stated, never assumed', () => {
  it('claims a frequency only where the record gives one', () => {
    const invented = events
      .filter((e) => e.frequency)
      .filter((e) => !/annual|monthly|biannual/i.test(recordedEvents(e.shrineSlug)))
      .map((e) => `${e.slug}: ${e.frequency}`);
    expect(
      invented,
      'This publishes `repeatFrequency` in the shrine page JSON-LD. An unstated schedule must ' +
        'be absent, not defaulted.',
    ).toEqual([]);
  });

  it('leaves a good number of events without one, rather than defaulting', () => {
    /* If this hits zero, the default is back. */
    expect(events.filter((e) => !e.frequency).length).toBeGreaterThan(20);
  });
});

describe('no event where the record says nothing happens', () => {
  it('builds no event from a site-status answer', () => {
    const STATUS_ONLY =
      /^(not documented|none\b|heritage\b|heritage\/|preserved as\b|reopened\b|recently restored)/i;
    const wrong = events
      .filter((e) => STATUS_ONLY.test(recordedEvents(e.shrineSlug).split(';')[0].trim()))
      .map((e) => `${e.slug}: ${recordedEvents(e.shrineSlug).slice(0, 50)}`);
    expect(wrong).toEqual([]);
  });

  it('still builds one where a denial sits beside a real observance', () => {
    /* "Hur gatherings on 27 Rajab and at fixed times; no public urs observed" —
       a blanket search for negatives would throw the gathering away with the
       denial, which is why only the first segment is tested. */
    const row = rows.find(({ Events }) => /no public urs observed/i.test(String(Events ?? '')));
    expect(row, 'the row this rule was written for is gone').toBeTruthy();
    const slug = slugs[rows.indexOf(row!)];
    expect(events.some((e) => e.shrineSlug === slug)).toBe(true);
  });
});

describe('the shared category resolver', () => {
  it('takes the first non-empty of the two columns, not `??`', () => {
    /* A blank string is not nullish. Either `??` direction gets a different row
       wrong, and both directions have shipped. */
    expect(resolveCategory({ category: '', Category: 'Hindu Temple' })).toBe('Hindu Temple');
    expect(resolveCategory({ category: 'Muslim Shrine', Category: '' })).toBe('Muslim Shrine');
    expect(resolveCategory({})).toBe('');
  });

  it('lists the six schema values, and the non-Muslim traditions are four of them', () => {
    expect(CATEGORY_ENUM).toHaveLength(6);
    for (const value of NON_MUSLIM_TRADITIONS) expect(CATEGORY_ENUM).toContain(value);
    expect(NON_MUSLIM_TRADITIONS.has('Muslim Shrine')).toBe(false);
  });
});
