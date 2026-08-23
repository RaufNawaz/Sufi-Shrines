import { describe, it, expect } from 'vitest';
import { buildFigureIndex, figureHaystack, matchFigures } from '../figureSearch';
import { getArchiveFigures } from '../../kg';
import type { KGSaint } from '../../../types/kg';

/**
 * The explorer's figure filter, tested against the real graph rather than
 * fixtures — the property that matters is bilingual reach, and that only holds
 * if the actual dictionary resolves the actual names.
 */

const FIGURES = getArchiveFigures();
const INDEX = buildFigureIndex(FIGURES);
const find = (q: string) => matchFigures(FIGURES, q, INDEX);
const slugs = (q: string) => find(q).map((f) => f.slug);

describe('figure search', () => {
  it('has a non-trivial corpus to search', () => {
    expect(FIGURES.length).toBeGreaterThan(120);
  });

  it('finds a figure by its English name', () => {
    expect(slugs('bulleh')).toContain('bulleh-shah');
  });

  it('finds a figure by its Urdu name while reading English', () => {
    // Bulleh Shah's recorded Urdu name is بلھے شاہ (عبداللہ شاہ قادری). A
    // reader who only knows the Urdu spelling must still be able to find him,
    // which is the whole reason the haystack is bilingual.
    expect(slugs('بلھے')).toContain('bulleh-shah');
  });

  it('finds a whole tradition by its group label, in either language', () => {
    const english = find('sikh guru');
    const urdu = find('سکھ گرو');
    expect(english.length).toBeGreaterThan(3);

    /*
     * Both queries must reach the whole group — but not necessarily *only* it,
     * and not the same extras. Exact parity across languages is the wrong
     * expectation: the two haystacks hold different text, so they pick up
     * different incidental matches. "سکھ گرو" also finds Bhai Biba Singh,
     * whose recorded Urdu name reads "بھائی بیبا سنگھ (سکھ جنگجو؛ گوردوارہ گرو
     * گوبند سنگھ کے دور سے)" — a Sikh warrior of Guru Gobind Singh's era.
     * Substring search finding him is right, not a defect.
     */
    const gurus = FIGURES.filter((f) => f.figureType === 'Sikh Guru').map((f) => f.slug);
    expect(gurus.length).toBeGreaterThan(3);
    for (const slug of gurus) {
      expect(english.map((f) => f.slug), `English query missed ${slug}`).toContain(slug);
      expect(urdu.map((f) => f.slug), `Urdu query missed ${slug}`).toContain(slug);
    }
  });

  it('requires every term but not in order', () => {
    const forward = slugs('shah bulleh').sort();
    const backward = slugs('bulleh shah').sort();
    expect(forward).toEqual(backward);
    expect(forward).toContain('bulleh-shah');
  });

  it('an empty or whitespace query returns the input unchanged, by identity', () => {
    // Identity matters: a caller's downstream useMemo should not invalidate
    // every time the field is cleared.
    expect(find('')).toBe(FIGURES);
    expect(find('   ')).toBe(FIGURES);
  });

  it('returns nothing rather than everything for a query nothing matches', () => {
    expect(find('zzzzqqqq')).toEqual([]);
  });

  it('is case-insensitive', () => {
    expect(slugs('BULLEH')).toEqual(slugs('bulleh'));
  });

  it('searches alternative names and recorded titles', () => {
    const withAlt = FIGURES.find((f) => (f.altNames?.length ?? 0) > 0);
    expect(withAlt, 'no figure in the graph has an altName to test with').toBeDefined();
    expect(figureHaystack(withAlt!)).toContain(withAlt!.altNames![0]!.toLowerCase());
  });

  it('falls back to computing a haystack for a figure missing from the index', () => {
    const stranger = {
      id: 'saint:not-indexed',
      type: 'saint',
      slug: 'not-indexed',
      name: 'Someone Unindexed',
      shrines: [],
    } as unknown as KGSaint;
    expect(matchFigures([stranger], 'unindexed', new Map())).toEqual([stranger]);
  });
});
