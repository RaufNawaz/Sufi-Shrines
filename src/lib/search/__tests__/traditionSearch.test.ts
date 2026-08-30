// @vitest-environment node
/**
 * Every entity that has a page is reachable from search.
 *
 * On 29 August 2026 eight `/tradition/:slug` pages shipped and none of them was
 * in `data/kg-search-index.json`, which carried `figure` and `order` only. So
 * typing "Nath" into the palette found four *figures* named Nath and never the
 * tradition they belong to. Nothing failed: an index that is merely incomplete
 * returns fewer results, which looks exactly like a query with fewer answers.
 *
 * The assertion is therefore not "traditions are in the index" — that would go
 * stale the moment a tenth kind of page appears. It is that **the index covers
 * the generated sets the archive publishes pages for**, checked against the
 * generated files themselves rather than a number typed here.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { matchEntities, type SearchEntity } from '../entitySearch';

const ROOT = join(__dirname, '..', '..', '..', '..');
const read = (p: string) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

const index = read('data/kg-search-index.json') as SearchEntity[];
const kgt = read('data/kg-traditions.json') as { traditions: { slug: string; name: string }[] };
const kg = read('data/kg.json') as { orders: { slug: string }[]; saints: { slug: string }[] };

const slugsOfType = (type: string) =>
  new Set(index.filter((e) => e.type === type).map((e) => e.slug));

describe('the archive search index', () => {
  it('covers every tradition that has a page', () => {
    const indexed = slugsOfType('tradition');
    const missing = kgt.traditions.map((t) => t.slug).filter((s) => !indexed.has(s));
    expect(missing, 'a tradition with a page and no index row is unreachable').toEqual([]);
  });

  it('covers every order and every figure, which is how the gap was found', () => {
    const orders = slugsOfType('order');
    const figures = slugsOfType('figure');
    expect(kg.orders.map((o) => o.slug).filter((s) => !orders.has(s))).toEqual([]);
    expect(kg.saints.map((s) => s.slug).filter((s) => !figures.has(s))).toEqual([]);
  });

  it('finds a tradition by the words a reader would actually type', () => {
    /* The aliases earn their place here: nobody types "Pranami" when the temple
       is signed "Parnami", and "Kanphata yogis" is how the Nath order is named
       in the entry a reader just came from. */
    const traditions = index.filter((e) => e.type === 'tradition');
    for (const [query, slug] of [
      ['nath', 'nath'],
      ['kanphata', 'nath'],
      ['parnami', 'pranami'],
      ['udasipanth', 'udasi'],
      ['nanak-panthi', 'nanakpanthi'],
      ['shakti peetha', 'shakti-peetha'],
    ] as const) {
      const hits = matchEntities(traditions, query, 5);
      expect(hits[0]?.entity.slug, `"${query}" should reach /tradition/${slug}`).toBe(slug);
    }
  });

  it('matches an Urdu reader typing the Urdu name', () => {
    const traditions = index.filter((e) => e.type === 'tradition');
    expect(matchEntities(traditions, 'ناتھ', 5)[0]?.entity.slug).toBe('nath');
    expect(matchEntities(traditions, 'نانک پنتھی', 5)[0]?.entity.slug).toBe('nanakpanthi');
  });
});
