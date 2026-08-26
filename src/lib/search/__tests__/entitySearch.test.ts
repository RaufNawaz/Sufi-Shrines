import { describe, it, expect } from 'vitest';
import { matchEntities, normalizeForSearch, type SearchEntity } from '../entitySearch';
import index from '../../../../data/kg-search-index.json';

/**
 * The archive is searchable by the names people actually use.
 *
 * Two of these assertions are about the data as much as the matcher, and they
 * are here rather than in a data test because a search index that stops
 * containing honorifics fails silently: the field is optional, the file still
 * parses, and the only symptom is that a reader who types the name they know
 * gets nothing.
 */

const ENTITIES: SearchEntity[] = [
  { type: 'figure', slug: 'ali-hujwiri', name: 'Ali Hujwiri', aka: ['Data Ganj Bakhsh'] },
  { type: 'figure', slug: 'muin-al-din-chishti', name: 'Muʿin al-Din Chishti' },
  { type: 'figure', slug: 'baba-farid', name: 'Baba Farid', nameUr: 'بابا فرید' },
  { type: 'order', slug: 'chishtiyya', name: 'Chishtiyya' },
  { type: 'order', slug: 'qadiriyya', name: 'Qadiriyya' },
];

describe('normalizeForSearch', () => {
  it('drops the marks so a transliteration matches its plain spelling', () => {
    expect(normalizeForSearch('Muʿin al-Dīn')).toBe(normalizeForSearch('Muin al-Din'));
  });

  it('reduces punctuation and case to the same words', () => {
    expect(normalizeForSearch('Bakhsh, Data-Ganj')).toBe('bakhsh data ganj');
  });

  it('keeps Urdu letters and drops the optional harakat', () => {
    /* Harakat are optional in written Urdu, so they are never safe to match on;
       the letters must survive, or an Urdu query matches nothing at all. */
    expect(normalizeForSearch('بابا فرید')).toBe('بابا فرید');
    expect(normalizeForSearch('بَابَا')).toBe('بابا');
  });
});

describe('matchEntities', () => {
  it('finds a figure by an honorific rather than a name', () => {
    /* Nobody searches "Ali Hujwiri". They search Data Ganj Bakhsh, which is a
       title the sources give him. */
    const hits = matchEntities(ENTITIES, 'data ganj');
    expect(hits[0]?.entity.slug).toBe('ali-hujwiri');
  });

  it('puts the order ahead of the figures whose titles contain its name', () => {
    const hits = matchEntities(ENTITIES, 'chishti');
    expect(hits[0]?.entity.slug).toBe('chishtiyya');
  });

  it('matches a transliteration typed without its diacritics', () => {
    expect(matchEntities(ENTITIES, 'muin')[0]?.entity.slug).toBe('muin-al-din-chishti');
  });

  it('matches an Urdu name from the English interface', () => {
    expect(matchEntities(ENTITIES, 'فرید')[0]?.entity.slug).toBe('baba-farid');
  });

  it('returns nothing for an empty or whitespace query', () => {
    expect(matchEntities(ENTITIES, '')).toEqual([]);
    expect(matchEntities(ENTITIES, '   ')).toEqual([]);
  });

  it('respects the limit', () => {
    expect(matchEntities(ENTITIES, 'a', 2)).toHaveLength(2);
  });
});

describe('the shipped index', () => {
  const entities = index as SearchEntity[];

  it('carries every figure and order', () => {
    expect(entities.length).toBeGreaterThan(150);
    expect(entities.some((e) => e.type === 'order')).toBe(true);
  });

  it('has a slug and a name on every row', () => {
    const broken = entities.filter((e) => !e.slug || !e.name);
    expect(broken, 'a row with no slug is a result that cannot be opened').toEqual([]);
  });

  it('still indexes honorifics', () => {
    /* The specific case that motivated indexing titles at all. If this fails,
       check that build-kg.mjs still merges `titles` into `aka`. */
    const hits = matchEntities(entities, 'data ganj bakhsh');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].entity.type).toBe('figure');
  });

  it('is small enough to fetch on first keystroke', () => {
    /* It is a dynamic import, but a reader still waits for it. 60 KB is roughly
       twice today's size — room to grow, not room to become the graph. */
    const bytes = JSON.stringify(entities).length;
    expect(bytes, `${Math.round(bytes / 1024)} KB`).toBeLessThan(60 * 1024);
  });
});
