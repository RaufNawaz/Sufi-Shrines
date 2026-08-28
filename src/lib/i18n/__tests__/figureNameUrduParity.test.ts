/**
 * Every figure a reader can reach from the archive has an Urdu name.
 *
 * The i18n contract is that the Urdu edition is as complete as the English one,
 * and a figure page's own title is the least forgiving place to break it: there
 * is no prose around it to carry the meaning. `localizeFigureName` returns the
 * original string for input it does not know (i18n rule 3 — never transliterate
 * character-by-character), so a missing dictionary entry surfaces as a Latin
 * name at the top of an otherwise Urdu page.
 *
 * This was written on 28 August 2026 after the three rows whose figure cell
 * names two people stopped collapsing to one. That gave Bhai Mardana and Bhai
 * Lalo pages of their own — Mardana had not been in the graph at all — and
 * neither name was in the dictionary, so the archive gained two figure pages
 * titled in Latin. Nothing caught it: `build_dictionary.py --check` validates
 * saint coverage against the raw `Sufi Saint` cells in the sheet, and neither
 * "Bhai Mardana" nor "Bhai Lalo" is a cell — they are the *parts* of one.
 *
 * Two populations, deliberately held to different standards:
 *
 *  - **Archive figures** (they have a shrine here, so a reader reaches them from
 *    a site page): zero tolerance.
 *  - **Lineage-only figures** (teachers named in someone's prose, no site in this
 *    archive — Hujwiri's master al-Khuttali and 57 others): a recorded budget.
 *    They are real graph nodes and their names are genuinely untranslated; that
 *    is known Urdu debt, not a regression. The budget is asserted as an upper
 *    bound so the debt can only shrink, and a *drop* is expected to fail this
 *    test — update the number and say what you translated.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { localizeFigureName } from '../localizeKgName';
import type { KGSaint } from '../../../types/kg';

const kg = JSON.parse(readFileSync(join(__dirname, '../../../../data/kg.json'), 'utf8')) as {
  saints: KGSaint[];
};

const hasLatin = (s: string) => /[A-Za-z]/.test(s);
const untranslated = (saints: KGSaint[]) =>
  saints
    .filter((s) => hasLatin(localizeFigureName(s, 'ur')))
    .map((s) => `${s.slug} (${s.name})`)
    .sort();

const archiveFigures = kg.saints.filter((s) => (s.shrines?.length ?? 0) > 0);
const lineageOnly = kg.saints.filter((s) => (s.shrines?.length ?? 0) === 0);

describe('figure names in the Urdu edition', () => {
  it('has figures to check', () => {
    // A floor, so the assertions below cannot pass by the graph emptying.
    expect(archiveFigures.length).toBeGreaterThan(100);
    expect(lineageOnly.length).toBeGreaterThan(30);
  });

  it('leaves no archive figure titled in Latin', () => {
    expect(untranslated(archiveFigures)).toEqual([]);
  });

  it('keeps the lineage-only Urdu debt at or below its recorded size', () => {
    /* 58 as measured 28 August 2026. An upper bound: translating one of these
       should fail this test and lower the number, which is the point. */
    expect(untranslated(lineageOnly).length).toBeLessThanOrEqual(58);
  });
});
