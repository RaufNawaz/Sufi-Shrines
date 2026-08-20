import { describe, it, expect } from 'vitest';
import { getArchiveFigures, getKGStore, slugToLabel } from '../../kg';
import { localizeFigureName, localizeOrderName, localizeShrineSlug } from '../localizeKgName';
import { buildUrduFallback, translateToUrdu } from '../urduFallback';

/**
 * A ratchet, not an assertion of completeness.
 *
 * The Saints & Orders explorer, the order pages and the lineage views rendered
 * every entity name in Latin script even under `?lang=ur`. They now go through
 * `localizeKgName`, which resolves what `urdu-seed.json` already knows. It does
 * not know everything: the dictionary is generated from the sheet's own
 * columns, and the graph's canonical names often differ from them ("Data Ganj
 * Bakhsh" vs "Hazrat Data Ganj Bakhsh (Ali Hujwiri)").
 *
 * The no-English-leak e2e guard cannot be pointed at these routes yet for
 * exactly that reason. So the floor is locked here instead: coverage may rise,
 * and a change that drops it fails. Raising a floor is a one-line diff; letting
 * it fall silently is how these pages ended up all-Latin in the first place.
 *
 * Measured 20 August 2026: 67/136 archive figures, 92/169 shrine labels, 5/5
 * orders.
 */

const isUrdu = (s: string) => !/[A-Za-z]/.test(s);

describe('Urdu coverage of knowledge-graph names', () => {
  const figures = getArchiveFigures();
  const kg = getKGStore();
  const shrineSlugs = [
    ...new Set(
      kg.relations
        .filter((r) => r.type === 'buried_at')
        .map((r) => r.object.replace(/^shrine:/, '')),
    ),
  ];

  it('every order has an Urdu name', () => {
    const latin = kg.orders.filter((o) => !isUrdu(localizeOrderName(o, 'ur'))).map((o) => o.slug);
    expect(latin, 'an order whose Urdu name is still Latin').toEqual([]);
  });

  it('every order has an Urdu description', () => {
    const missing = kg.orders.filter((o) => o.description && !o.descriptionUr).map((o) => o.slug);
    expect(missing, 'add descriptionUr in data/kg-seeds.json').toEqual([]);
  });

  it('archive figures: Urdu name coverage does not fall below the recorded floor', () => {
    const covered = figures.filter((f) => isUrdu(localizeFigureName(f, 'ur'))).length;
    expect(figures.length).toBeGreaterThan(120);
    expect(
      covered,
      `Urdu figure-name coverage fell to ${covered}/${figures.length}. If this is a ` +
        'deliberate drop, lower the floor here and say why; otherwise a name changed ' +
        'out from under urdu-seed.json.',
    ).toBeGreaterThanOrEqual(67);
  });

  it('shrine labels: Urdu coverage does not fall below the recorded floor', () => {
    const covered = shrineSlugs.filter((s) => isUrdu(localizeShrineSlug(s, 'ur'))).length;
    expect(covered).toBeGreaterThanOrEqual(92);
  });

  it('an unknown name stays in its original script rather than being transliterated', () => {
    // i18n rule 3: never render character-by-character transliteration.
    expect(localizeShrineSlug('a-place-nobody-has-recorded', 'ur')).toBe(
      slugToLabel('a-place-nobody-has-recorded'),
    );
  });

  it('English is untouched', () => {
    expect(localizeOrderName(kg.orders[0]!, 'en')).toBe(kg.orders[0]!.name);
    expect(localizeFigureName(figures[0]!, 'en')).toBe(figures[0]!.name);
  });
});

/**
 * "c. 1165" is the shape three of the five orders record their founding in,
 * and it used to survive into the Urdu view as Latin: tokenising left the "c."
 * in Latin script, which failed `translateToUrdu`'s no-Latin check, so the
 * whole string came back untranslated and every order page read "c. ۱۱۶۵".
 */
describe('approximate years translate', () => {
  it('renders a circa year in Urdu', () => {
    expect(buildUrduFallback('c. 1165')).toBe('تقریباً 1165');
    expect(translateToUrdu('c. 1165')).toBe('تقریباً 1165');
    expect(translateToUrdu('circa 1389')).toBe('تقریباً 1389');
    expect(translateToUrdu('c.1000')).toBe('تقریباً 1000');
    expect(translateToUrdu('c. 1100 CE')).toBe('تقریباً 1100');
  });

  it('every order that records a founding year shows it in Urdu', () => {
    const latin = getKGStore()
      .orders.filter((o) => o.founded && /[A-Za-z]/.test(translateToUrdu(o.founded)))
      .map((o) => `${o.slug}: ${o.founded}`);
    expect(latin).toEqual([]);
  });

  it('does not mistake an unrelated string for a circa year', () => {
    // A bare "c" is not circa, so this stays a pattern rule rather than a
    // word-level mapping.
    expect(buildUrduFallback('c')).toBe('c');
  });
});
