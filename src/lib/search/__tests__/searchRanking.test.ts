/**
 * What the site search returns for the names readers type, over the shipped
 * rows. Every word first, any word only as a fallback, typos only in words of
 * five letters or more (search council, 17 October 2026) — before that, "Bibi
 * Pak Daman" listed 137 of 171 sites.
 */
import { describe, it, expect } from 'vitest';
import MiniSearch from 'minisearch';
import { INDEX_FIELDS, SEARCH_OPTIONS, processTerm, searchAllThenAny } from '../search.worker';
import { buildSearchDocs } from '../searchDocs';
import { buildShrines } from '../../data/shrineModel';
import fallback from '../../../data/shrines-fallback.json';
import type { ShrineRow } from '../../../types/shrine';

const shrines = buildShrines(fallback.rows as unknown as ShrineRow[]);
const docs = buildSearchDocs(shrines);
const index = new MiniSearch({
  idField: 'id',
  fields: [...INDEX_FIELDS],
  storeFields: [],
  processTerm,
  searchOptions: SEARCH_OPTIONS,
});
index.addAll(docs);
const names = (query: string) =>
  searchAllThenAny(index, query).map((id) => shrines[id]?.name ?? String(id));

describe('site search', () => {
  it('finds a site by its full name without listing every site that shares a word', () => {
    const hits = names('Bibi Pak Daman');
    expect(hits.length).toBeLessThanOrEqual(3);
    expect(hits[0]).toMatch(/Bibi Pak Daman/);
  });

  it('does not take a typo in a four-letter word', () => {
    expect(names('Data').some((n) => /Hinglaj/.test(n))).toBe(false);
  });

  it('still forgives a typo in a longer word', () => {
    expect(names('Shahbaz Qalander').length).toBeGreaterThan(0);
  });

  it('falls back to any word when no site has every word', () => {
    expect(names('Multan zzzzqqq').length).toBeGreaterThan(0);
  });
});
