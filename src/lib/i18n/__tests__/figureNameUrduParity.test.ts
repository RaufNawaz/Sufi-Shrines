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
 * Two populations, held to different standards **until 30 August 2026**, when
 * the second caught up with the first:
 *
 *  - **Archive figures** (they have a shrine here, so a reader reaches them from
 *    a site page): zero tolerance, always.
 *  - **Lineage-only figures** (teachers named in someone's prose, no site in this
 *    archive — Hujwiri's master al-Khuttali and 65 others): a recorded budget
 *    that ratcheted 58 → 66 → 57 → **0**. All 66 now carry an Urdu name, so the
 *    budget is an assertion and both populations are held to the same rule.
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

  it('leaves no lineage-only figure titled in Latin either — the debt is closed', () => {
    /* This was a BUDGET for two weeks: 58 on 28 August, 66 when the kinship pass
       added eight figures, back to 57 once those eight were written into the
       dictionary. On 30 August the remaining 57 were done and the number is
       **zero**, so the budget becomes an assertion.
     *
     * Zero tolerance now applies to both populations, and the asymmetry the
     * original docstring described is gone. That is deliberate rather than
     * strict: the fix for a new figure is one line in
     * `urdu-i18n/build_dictionary.py`, and the failure it prevents is a Latin
     * name at the top of an otherwise Urdu page, which nothing else catches
     * because `localizeFigureName` returns its input unchanged by design
     * (i18n rule 3 — never transliterate character by character).
     *
     * If a figure genuinely has no Urdu rendering anyone can vouch for, that is
     * a reason to record it and say so, not to let the page title itself in the
     * wrong script. */
    expect(untranslated(lineageOnly)).toEqual([]);
  });
});
