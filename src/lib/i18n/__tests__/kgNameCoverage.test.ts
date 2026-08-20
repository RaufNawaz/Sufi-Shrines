import { describe, it, expect } from 'vitest';
import { getArchiveFigures, getKGStore, slugToLabel } from '../../kg';
import { localizeFigureName, localizeOrderName, localizeShrineSlug } from '../localizeKgName';
import { buildUrduFallback, translateNameToUrdu, translateToUrdu } from '../urduFallback';

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
 * Measured 20 August 2026: 118/136 archive figures, 102/169 shrine labels, 5/5
 * orders — after `translateNameToUrdu` began matching on a normalized name
 * key, which recovered 51 figures whose only problem was that the sheet writes
 * "Hazrat Data Ganj Bakhsh (Ali Hujwiri)" where the graph writes "Data Ganj
 * Bakhsh".
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
    ).toBeGreaterThanOrEqual(118);
  });

  it('shrine labels: Urdu coverage does not fall below the recorded floor', () => {
    const covered = shrineSlugs.filter((s) => isUrdu(localizeShrineSlug(s, 'ur'))).length;
    expect(covered).toBeGreaterThanOrEqual(102);
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

/**
 * Two different figures must never resolve to the same Urdu name.
 *
 * This is the guard on the normalized matching in `translateNameToUrdu`. The
 * match is exact-after-normalization rather than by prefix precisely so that
 * "Khwaja Muhammad Qasim" and "Khwaja Muhammad Qasim Sadiq" — a master and his
 * pupil, two separate figures here — stay separate (HANDOVER §9.24). A new
 * collision means the normalization has become too aggressive.
 *
 * The one allowed pair is not a matching failure but a real duplicate in the
 * graph: `valmiki` and `bhagwan-valmik` are one figure entered twice. Removing
 * the duplicate is data work (see docs/TODO.md); until then it is named here
 * rather than silently tolerated.
 */
const KNOWN_DUPLICATE_FIGURES = [['bhagwan-valmik', 'valmiki']];

describe('normalized name matching does not merge distinct figures', () => {
  it('no two archive figures share an Urdu name', () => {
    const bySharedName = new Map<string, string[]>();
    for (const figure of getArchiveFigures()) {
      const urdu = localizeFigureName(figure, 'ur');
      if (!isUrdu(urdu)) continue;
      const bucket = bySharedName.get(urdu);
      if (bucket) bucket.push(figure.slug);
      else bySharedName.set(urdu, [figure.slug]);
    }
    const collisions = [...bySharedName.values()]
      .filter((slugs) => slugs.length > 1)
      .map((slugs) => [...slugs].sort())
      .filter(
        (slugs) => !KNOWN_DUPLICATE_FIGURES.some((known) => known.join('|') === slugs.join('|')),
      );
    expect(collisions, 'two distinct figures resolved to one Urdu name').toEqual([]);
  });

  it('keeps a master and his pupil apart', () => {
    const master = translateNameToUrdu('Khwaja Muhammad Qasim');
    const pupil = translateNameToUrdu('Khwaja Muhammad Qasim Sadiq');
    expect(isUrdu(master)).toBe(true);
    expect(isUrdu(pupil)).toBe(true);
    expect(master).not.toBe(pupil);
  });

  it('matches only after normalization, never by prefix', () => {
    // A name that is a strict prefix of a dictionary entry and normalizes to
    // something else must not resolve.
    expect(translateNameToUrdu('Data')).toBe('Data');
  });

  it('translateToUrdu itself is unchanged — no normalized matching there', () => {
    // Applied to a non-name it would equate a bare status with a qualified one.
    expect(translateToUrdu('Data Ganj Bakhsh')).toBe('Data Ganj Bakhsh');
    expect(buildUrduFallback('Data Ganj Bakhsh')).not.toMatch(/^حضرت/);
  });
});
