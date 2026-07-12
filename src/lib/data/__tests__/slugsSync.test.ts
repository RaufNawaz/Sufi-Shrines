// @vitest-environment node
/**
 * Drift guard: scripts/data/lib/slugs.mjs (shared by all data scripts and
 * prerender) must produce exactly the same slugs as the app's own
 * src/lib/data/slugify.ts. If this test fails, one side changed without the
 * other — update both, they are two implementations of one contract.
 */
import { describe, it, expect } from 'vitest';
import { slugify as slugifyApp, buildStableSlug } from '../slugify';
import { slugify as slugifyScript, buildSlugs } from '../../../../scripts/data/lib/slugs.mjs';

const FIXTURES: string[] = [
  // ampersand / at / percent / plus substitutions
  'Data Darbar & Badshahi Mosque',
  'shrine @ Lahore',
  '100% pure + more',
  '&&start and end&&',
  // diacritics (stripped as non-word chars)
  'Mazār-e-Sharīf',
  'Bībī Pāk Dāman',
  'Shāh ʿAbd al-Laṭīf',
  // parentheses
  'Shah Abdul Latif (Bhitai)',
  'Baba Farid (Ganj-e-Shakar) of Pakpattan',
  // Urdu characters (non-word in a non-unicode regex → stripped entirely)
  'درگاہ داتا دربار',
  'مزار قائد Karachi',
  // whitespace / underscores / dash runs
  'multiple    spaces   here',
  '  leading and trailing spaces  ',
  '--leading and trailing dashes--',
  'under_scores_become_dashes',
  'dash---runs----collapse',
  // casing, digits, empty-ish inputs
  'MiXeD CaSe 1234',
  '',
  '   ',
  '!!!',
];

describe('scripts slugify stays in sync with src/lib/data/slugify.ts', () => {
  it('produces identical output for the whole fixture corpus', () => {
    for (const input of FIXTURES) {
      expect(slugifyScript(input), `slugify(${JSON.stringify(input)})`).toBe(slugifyApp(input));
    }
  });

  it('matches buildStableSlug (name-only stable slug) as well', () => {
    for (const input of FIXTURES) {
      expect(slugifyScript(input), `buildStableSlug(${JSON.stringify(input)})`).toBe(
        buildStableSlug(input),
      );
    }
  });

  it('substitutes & @ % + as words, not characters', () => {
    expect(slugifyScript('A & B')).toBe('a-and-b');
    expect(slugifyScript('A @ B')).toBe('a-at-b');
    expect(slugifyScript('A % B')).toBe('a-percent-b');
    expect(slugifyScript('A + B')).toBe('a-plus-b');
  });
});

describe('buildSlugs collision handling', () => {
  it('disambiguates duplicate names by location, then saint, then numeric suffix', () => {
    const rows = [
      { Name: 'Shrine of Shah Jamal', Location: 'Lahore, Punjab', 'Sufi Saint': 'Shah Jamal' },
      { Name: 'Shrine of Shah Jamal', Location: 'Multan, Punjab', 'Sufi Saint': 'Shah Jamal' },
      { Name: 'Shrine of Shah Jamal', Location: 'Lahore, Punjab', 'Sufi Saint': 'Baba Jamal' },
      { Name: 'Shrine of Shah Jamal', Location: 'Lahore, Punjab', 'Sufi Saint': 'Shah Jamal' },
    ];
    const slugs = buildSlugs(rows);
    expect(slugs).toEqual([
      'shrine-of-shah-jamal',
      'shrine-of-shah-jamal-multan-punjab',
      'shrine-of-shah-jamal-lahore-punjab',
      'shrine-of-shah-jamal-lahore-punjab-shah-jamal',
    ]);
    expect(new Set(slugs).size).toBe(rows.length);
  });

  it('falls back to a numeric suffix when name+location+saint all collide', () => {
    const row = { Name: 'Eidgah Shrine', Location: 'Multan', 'Sufi Saint': 'Shah Gardez' };
    const slugs = buildSlugs([{ ...row }, { ...row }, { ...row }, { ...row }]);
    expect(slugs[0]).toBe('eidgah-shrine');
    expect(slugs[1]).toBe('eidgah-shrine-multan');
    expect(slugs[2]).toBe('eidgah-shrine-multan-shah-gardez');
    expect(slugs[3]).toBe('eidgah-shrine-2');
    expect(new Set(slugs).size).toBe(4);
  });

  it('honors an explicit Slug column verbatim', () => {
    const rows = [
      { Name: 'Some Long Shrine Name', Location: 'Karachi', Slug: 'custom-slug' },
      { Name: 'Another Shrine', Location: 'Karachi', Slug: '  padded-slug  ' },
      { Name: 'Generated Shrine', Location: 'Karachi' },
    ];
    const slugs = buildSlugs(rows);
    expect(slugs[0]).toBe('custom-slug');
    expect(slugs[1]).toBe('padded-slug'); // trimmed, otherwise untouched
    expect(slugs[2]).toBe('generated-shrine');
  });

  it('uses shrine-<index> for rows whose name slugifies to nothing', () => {
    const slugs = buildSlugs([{ Name: 'Real Shrine' }, { Name: '' }, { Name: 'درگاہ' }]);
    expect(slugs).toEqual(['real-shrine', 'shrine-1', 'shrine-2']);
  });
});
