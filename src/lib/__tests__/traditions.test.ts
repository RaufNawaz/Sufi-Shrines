// @vitest-environment node
/**
 * The six traditions the graph had no word for.
 *
 * `belongs_to_order` is the graph's only affiliation vocabulary and every order
 * in it is Sufi. **90 of the 169 sites are not Muslim shrines, and exactly one
 * of those 90 carries a `silsila` cell** — so for the other 89 the graph
 * recorded a tradition only as `category`, a six-value bucket, while the entries
 * themselves carry dedicated authored sections naming and describing Nath,
 * Udasi, Pranami, Swaminarayan, Daduvansi and Shakti Peetha.
 *
 * What is asserted here is what stops this layer becoming the thing it was built
 * to fix — an assertion nobody can check:
 *
 *  - every definition and every membership is **verbatim** in the entry it cites;
 *  - every definition has an **Urdu** half, because a definition is a page's
 *    account and English there is an untranslated sentence (§9.128);
 *  - the recorded **non**-memberships stay recorded, because a term match is not
 *    evidence and every one of them is a trap a scan walks into.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildStableSlug } from '../data/slugify';

const ROOT = join(__dirname, '..', '..', '..');
const read = (p: string) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

const kgt = read('data/kg-traditions.json') as {
  traditions: {
    slug: string;
    name: string;
    nameUr: string;
    category: string;
    definition: string;
    definitionUr: string;
    definitionShrine: string;
  }[];
  memberships: { traditionSlug: string; shrineSlug: string; quote: string }[];
};
const seeds = read('data/kg-seeds.json') as {
  traditionNonMemberships: { tradition: string; shrineSlug: string; why: string }[];
};
const rows = read('data/shrines.json').rows as Record<string, string>[];
const urdu = read('src/data/urdu-content.json') as Record<string, { descriptionUr: string }>;

/* Whitespace-insensitive on both sides: the seed holds each passage on one line
   and the Description wraps it across paragraphs. */
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
const CATEGORIES = new Set([
  'Muslim Shrine',
  'Hindu Temple',
  'Sikh Gurdwara',
  'Nanakpanthi / Udasi Darbar',
  'Jain Temple',
  'Secular / Memorial',
]);

/* Slug → row, through the app's OWN slug builder.
 *
 * The first draft of this helper compared `norm(r.Name)` to the slug — but
 * `norm` collapses whitespace and nothing else, so "Dargah Pir Ratan Nath Jee"
 * never equals "dargah-pir-ratan-nath-jee" and it returned '' for every
 * tradition. Any assertion resting on it would have passed vacuously, which is
 * worse than no assertion: the docstring above would have been claiming a check
 * that never ran. Caught by a reviewer, and it is the reason this now resolves
 * the row by slug FIRST and then looks for the quote in it.
 *
 * Resolving the other way round — find the row that contains the quote, then
 * assert the quote is in that row — is circular and always passes. */
const rowBySlug = new Map(rows.map((r) => [buildStableSlug(String(r.Name ?? '')), r]));

describe('the tradition layer', () => {
  it('has traditions and memberships to check', () => {
    expect(kgt.traditions.length).toBeGreaterThanOrEqual(6);
    expect(kgt.memberships.length).toBeGreaterThanOrEqual(8);
  });

  it('gives every tradition a name in both languages', () => {
    const bad = kgt.traditions
      .filter((t) => !t.name?.trim() || !t.nameUr?.trim() || /[A-Za-z]/.test(t.nameUr))
      .map((t) => t.slug);
    expect(bad, 'an Urdu page would title the tradition in Latin').toEqual([]);
  });

  it('places every tradition inside one of the six schema categories', () => {
    /* A tradition that contradicts the site's own bucket would put two different
       answers on one page. */
    const bad = kgt.traditions.filter((t) => !CATEGORIES.has(t.category)).map((t) => t.slug);
    expect(bad).toEqual([]);
  });

  it('quotes its definition verbatim from the entry it cites, in both languages', () => {
    for (const t of kgt.traditions) {
      /* The English half, which is the half that matters most in a provenance
         archive and the half this test used to check only the LENGTH of — an
         English definition could have been paraphrased or drifted and nothing
         here would have said so. */
      const row = rowBySlug.get(t.definitionShrine);
      expect(row, `${t.slug}: no entry with slug "${t.definitionShrine}"`).toBeTruthy();
      const description = String(row?.Description ?? '');
      expect(t.definition.trim().length, `${t.slug}: empty definition`).toBeGreaterThan(60);
      expect(
        norm(description).includes(norm(t.definition)),
        `${t.slug}: the English definition is not verbatim in ${t.definitionShrine}`,
      ).toBe(true);

      const article = urdu[t.definitionShrine]?.descriptionUr ?? '';
      expect(article, `${t.slug}: no Urdu article for ${t.definitionShrine}`).toBeTruthy();
      expect(norm(article).includes(norm(t.definitionUr)), `${t.slug}: Urdu drifted`).toBe(true);
      expect(/[A-Za-z]{3,}/.test(t.definitionUr), `${t.slug}: Latin in the Urdu`).toBe(false);
    }
  });

  it('quotes every membership verbatim from the entry it cites', () => {
    const drifted: string[] = [];
    for (const m of kgt.memberships) {
      const row = rows.find((r) => String(r.Description ?? '').includes(m.quote.slice(0, 40)));
      if (!row || !norm(String(row.Description ?? '')).includes(norm(m.quote))) {
        drifted.push(`${m.traditionSlug} ← ${m.shrineSlug}`);
      }
    }
    expect(drifted, 'a membership must quote the archive saying so').toEqual([]);
  });

  it('gives all eight records the same shape', () => {
    /* The invariant that would have caught a real blank page.
     *
     * `daduvansi` was the one tradition with no other name, so under the
     * omit-empty idiom it was the one record with no `alsoKnownAs` key. A
     * consumer destructured it, `alsoKnownAs.length` threw, and
     * `/tradition/daduvansi` rendered a TypeError. **Typecheck cannot see
     * this** — the file is a JSON import, so its element type is whatever the
     * file happens to contain — and **spot-checking cannot either**: the other
     * seven pages were perfect. A generated file that a renderer consumes gets
     * one shape, and this is what holds it to that. */
    const keys = [...new Set(kgt.traditions.flatMap((t) => Object.keys(t)))].sort();
    for (const t of kgt.traditions) {
      expect(
        Object.keys(t).sort(),
        `${t.slug} does not have the same keys as its siblings`,
      ).toEqual(keys);
    }
  });

  it('keeps the sites that carry more than one tradition', () => {
    /* Three of the 18, and each is the archive asserting two traditions in one
       sentence — Khatwari Darbar "belongs to the shared Nanakpanthi and *Udasi*
       devotional world", the Jagiasi line runs "through Baba Sri Chand's Udasi
       line", and the Gandava darbar is "a Nanakpanthi–Sevapanthi shrine".
       Asserted as a floor because a renderer now depends on a site having
       possibly-many traditions: a regeneration that flattened one to a single
       value would be silent, and the accessor that reads it would go back to
       being a `.find()` that quietly drops the second answer. */
    const bySite = new Map<string, string[]>();
    for (const m of kgt.memberships) {
      bySite.set(m.shrineSlug, [...(bySite.get(m.shrineSlug) ?? []), m.traditionSlug]);
    }
    const multi = [...bySite.entries()].filter(([, v]) => v.length > 1);
    expect(
      multi.length,
      'a site with two recorded traditions must keep both',
    ).toBeGreaterThanOrEqual(3);
  });

  it('names only traditions that exist', () => {
    const known = new Set(kgt.traditions.map((t) => t.slug));
    expect(kgt.memberships.filter((m) => !known.has(m.traditionSlug))).toEqual([]);
  });

  it('keeps the recorded non-memberships, because a term match is not evidence', () => {
    /* Each of these is a false positive a corpus scan returns: "udasi" is also
       Guru Nanak's JOURNEY, Nankana Sahib names Udasi mahants in an account of
       removing them, "jogi" catches Ranjha in the Heer legend, and "Jogiwara" is
       a street. Deleting this list is how they get shipped as memberships. */
    expect(seeds.traditionNonMemberships.length).toBeGreaterThanOrEqual(7);
    const memberKeys = new Set(kgt.memberships.map((m) => `${m.traditionSlug}|${m.shrineSlug}`));
    const contradictions = seeds.traditionNonMemberships
      .filter((r) => memberKeys.has(`${r.tradition}|${r.shrineSlug}`))
      .map((r) => `${r.tradition}|${r.shrineSlug}`);
    expect(contradictions, 'recorded as both a membership and a non-membership').toEqual([]);
    for (const r of seeds.traditionNonMemberships) {
      expect(r.why?.trim(), `${r.tradition}|${r.shrineSlug}`).toBeTruthy();
    }
  });
});
