// @vitest-environment node
/**
 * The `category` vocabulary is written down in four places and had to be made
 * to agree (RULE 4 — encode invariants, don't rely on intentions).
 *
 * `category` is the most load-bearing column in the archive. It decides the
 * marker colour, the category filter, the tradition pages, and every
 * per-tradition count on `/about`. It is also the one closed vocabulary that
 * had **no drift guard**, while `figure_type`, `places`, slugs and the
 * bibliography rule all had one.
 *
 * ## The four declarations, and what each is worth
 *
 * | File | Column | Force |
 * | --- | --- | --- |
 * | `src/lib/data/categoryKey.ts` | modern `category` | app rendering, filters, marker colour |
 * | `scripts/data/lib/category.mjs` | modern `category` | a **warning** in `validate.mjs` |
 * | `pipeline/validate_shrines.py` | modern `category` | warn-only (CI runs `--fail-on NONE`) |
 * | `scripts/data/schema.mjs` | **legacy** `Category` | **hard error**, blocks `data:validate` |
 *
 * **The only hard error is on the legacy column, and it was the narrower list.**
 * 20 rows carry a legacy `Category` disagreeing with the modern `category`
 * beside them, so bringing those cells into line — the obvious hygiene job —
 * made `data:validate` exit 1 and told the operator to use `Christian Church`
 * or `Other`. That is fixed at the declaration; this file holds it fixed.
 *
 * **The column every consumer actually reads is guarded by a warning.** One
 * shipped row says `Islam`. `validate.mjs` exits 0 with that in its output.
 *
 * ## A correction to the finding that prompted this
 *
 * The review that raised it counted eight declarations across seven files and
 * called three of them stale: `data/shrine-schema.json` and the two in
 * `data/datapackage.json`. Measured, those are **not wrong**. They describe the
 * legacy `Category` column, and that column really does hold only values inside
 * their five-value enum — 76 Muslim Shrine, 50 Hindu Temple, 37 Sikh Gurdwara,
 * 6 blank, nothing else. Their real defect is that they do not describe the
 * modern `category` column at all, which is the published-schema coverage
 * finding and belongs there rather than here. `docs/DATA_DICTIONARY.md` is the
 * same case.
 *
 * Recorded because the distinction is the whole point: a declaration about a
 * *different column* is not a disagreement, and fixing it as one would have put
 * a six-value enum on a column that has never held five of them.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { categoryKey, CATEGORY_ORDER } from '../categoryKey';

const ROOT = join(__dirname, '..', '..', '..', '..');
const read = (...p: string[]) => readFileSync(join(ROOT, ...p), 'utf8');

/** The literal list in the build-script mirror, read out of its source. */
const scriptVocabulary = (() => {
  const block = /export const CATEGORY_ENUM = \[([\s\S]*?)\];/.exec(
    read('scripts', 'data', 'lib', 'category.mjs'),
  );
  return block ? [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : null;
})();

/** The literal set in the Python validator, read out of its source. */
const pythonVocabulary = (() => {
  const block = /VALID_CATEGORIES = \{([\s\S]*?)\}/.exec(read('pipeline', 'validate_shrines.py'));
  return block ? [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : null;
})();

/** The legacy column's list, which must stay a superset of the modern six. */
const legacyVocabulary = (() => {
  const block = /export const CATEGORY_VALUES = \[([\s\S]*?)\];/.exec(
    read('scripts', 'data', 'schema.mjs'),
  );
  return block ? [...block[1].matchAll(/'([^']*)'/g)].map((m) => m[1]) : null;
})();

const MODERN_SIX = [
  'Muslim Shrine',
  'Hindu Temple',
  'Sikh Gurdwara',
  'Nanakpanthi / Udasi Darbar',
  'Jain Temple',
  'Secular / Memorial',
];

type Row = Record<string, unknown>;
const shippedRows = (): Row[] =>
  (JSON.parse(read('src', 'data', 'shrines-fallback.json')) as { rows: Row[] }).rows;

/**
 * Shipped rows whose `category` is outside the six, with the fix.
 *
 * `pipeline/validate_shrines.py` records finding `'Islam' x2` and
 * `'Sufi shrine (Islam)' x1` live on 18 August 2026; two of those three have
 * since been corrected in the sheet. This is the last one.
 */
export const KNOWN_OFF_VOCABULARY = new Map<string, string>([
  [
    'Darbar Abul Muali Qadri',
    '"Islam" — a tradition, not a site category. Fixed by data/patch_schema_hygiene_2026-08-27.csv, which sets category=Muslim Shrine. Awaiting import (RULE 3: agents do not write to the sheet). The same patch carries this row\'s status prose.',
  ],
]);

describe('the category vocabulary', () => {
  it('is still declared where this test reads it from', () => {
    expect(scriptVocabulary, 'CATEGORY_ENUM was renamed or removed').not.toBeNull();
    expect(pythonVocabulary, 'VALID_CATEGORIES was renamed or removed').not.toBeNull();
    expect(legacyVocabulary, 'CATEGORY_VALUES was renamed or removed').not.toBeNull();
  });

  it('agrees between the build script and the Python validator', () => {
    expect([...(scriptVocabulary ?? [])].sort()).toEqual([...MODERN_SIX].sort());
    expect([...(pythonVocabulary ?? [])].sort()).toEqual([...MODERN_SIX].sort());
  });

  it('is exactly the set the app buckets, so the list above is not a guess', () => {
    // Probed through the app's public function rather than a private const,
    // the way figureTypeVocabulary.test.ts does it.
    const keys = MODERN_SIX.map((v) => categoryKey(v));
    expect(keys, 'a sheet value the app cannot bucket renders in the default colour').not.toContain(
      'default',
    );
    expect(new Set(keys).size, 'two sheet values collapsed to one key').toBe(MODERN_SIX.length);
    expect([...keys].sort()).toEqual([...CATEGORY_ORDER].sort());
  });

  it('never lets the legacy hard error reject a correct migration', () => {
    // 20 rows have a legacy `Category` disagreeing with the modern `category`.
    // Bringing one into line must not exit 1 — that is a check punishing the
    // fix, which RULE 4 names as the failure mode to avoid.
    const missing = MODERN_SIX.filter((v) => !(legacyVocabulary ?? []).includes(v));
    expect(
      missing,
      `scripts/data/schema.mjs's CATEGORY_VALUES is the only hard error on a category, and it sits\n` +
        `on the legacy column. It must accept every modern value, or migrating a legacy cell to\n` +
        `the value beside it makes \`npm run data:validate\` exit 1 and tells the operator to put\n` +
        `back a value this archive does not use. Missing: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('ships no category outside the six', () => {
    const allowed = new Set(MODERN_SIX);
    const offenders = shippedRows()
      .filter((r) => {
        const value = String(r.category ?? '').trim();
        if (value === '' || allowed.has(value)) return false;
        return !KNOWN_OFF_VOCABULARY.has(String(r.Name ?? ''));
      })
      .map((r) => `  ${String(r.Name)} · category = ${JSON.stringify(String(r.category ?? ''))}`);

    expect(
      offenders,
      offenders.length === 0
        ? ''
        : `${offenders.length} row(s) carry a category outside the six:\n${offenders.join('\n')}\n\n` +
            'The row loses its marker colour, its category filter, its tradition page and every\n' +
            'per-tradition count on /about — and the map still looks finished. Fix the sheet and\n' +
            'import a patch (RULE 3). Do not widen the vocabulary to fit the value.',
    ).toEqual([]);
  });

  it('names no exception that has stopped offending', () => {
    const allowed = new Set(MODERN_SIX);
    const stillOff = new Set(
      shippedRows()
        .filter((r) => {
          const v = String(r.category ?? '').trim();
          return v !== '' && !allowed.has(v);
        })
        .map((r) => String(r.Name ?? '')),
    );
    const stale = [...KNOWN_OFF_VOCABULARY.keys()].filter((k) => !stillOff.has(k));
    expect(
      stale,
      stale.length === 0
        ? ''
        : `The patch has been imported — delete these lines:\n${stale.map((k) => `  ${k}`).join('\n')}`,
    ).toEqual([]);
  });
});
