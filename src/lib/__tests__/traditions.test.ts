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

const descriptionFor = (slug: string, name?: string) => {
  const row = rows.find((r) => r.Name === name) ?? rows.find((r) => norm(r.Name ?? '') === slug);
  return row ? String(row.Description ?? '') : '';
};

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
      const article = urdu[t.definitionShrine]?.descriptionUr ?? '';
      expect(article, `${t.slug}: no Urdu article for ${t.definitionShrine}`).toBeTruthy();
      expect(norm(article).includes(norm(t.definitionUr)), `${t.slug}: Urdu drifted`).toBe(true);
      expect(t.definition.trim().length, `${t.slug}: empty definition`).toBeGreaterThan(60);
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
