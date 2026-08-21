// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { INTERNAL_ONLY_KEYS, NON_DETAIL_KEYS } from '../constants';

/**
 * `scripts/data/validate-publication-safety.mjs` exempts the internal columns
 * from its check, because those columns are already withheld from every page and
 * are the correct home for a workflow note. That exemption is only safe while the
 * two lists agree.
 *
 * A `.mjs` build script cannot import a `.ts` module, so the script keeps its own
 * copy — and a copy that can drift is the failure mode this whole session kept
 * finding. If a column stopped being internal, it would silently start being
 * published *and* stay exempt from the gate that would have caught it.
 */
const SCRIPT = readFileSync(
  join(__dirname, '..', '..', '..', '..', 'scripts', 'data', 'validate-publication-safety.mjs'),
  'utf8',
);

describe('publication-safety gate', () => {
  it('its internal-column list matches src/lib/data/constants.ts', () => {
    const match = /const INTERNAL_ONLY_KEYS = new Set\(\[([^\]]*)\]\)/.exec(SCRIPT);
    expect(match, 'INTERNAL_ONLY_KEYS not found in the gate script').not.toBeNull();
    const inScript = [...match![1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
    expect([...inScript].sort()).toEqual([...INTERNAL_ONLY_KEYS].sort());
  });

  it('every internal column is genuinely withheld from shrine detail rendering', () => {
    // The gate's exemption rests on this: an internal column is never shown.
    for (const key of INTERNAL_ONLY_KEYS) {
      expect(NON_DETAIL_KEYS.has(key), `${key} is internal but would render`).toBe(true);
    }
  });

  it('does not match a bibliography that credits a surveyor by name', () => {
    /*
     * The line this gate must never cross. Seventeen entries credit their
     * fieldworker — "Field survey, Darbar Malik Ahmad Ayaz (surveyor:
     * Saifullah), 29 July 2026" — and that is provenance, the thing this archive
     * exists to provide. A rule broad enough to catch personal names would
     * delete it.
     */
    const rulePatterns = [...SCRIPT.matchAll(/pattern:\s*\n?\s*(\/(?:[^/\\\n]|\\.)+\/[gimsuy]*)/g)].map(
      (m) => m[1]!,
    );
    expect(rulePatterns.length).toBeGreaterThanOrEqual(3);

    const provenance =
      'Field survey, Darbar Malik Ahmad Ayaz (surveyor: Saifullah), 29 July 2026. - Alam ' +
      'Faqri, *Tazkirah Awliya-e-Pakistan*, Lahore.';
    for (const source of rulePatterns) {
      const body = source.slice(1, source.lastIndexOf('/'));
      const flags = source.slice(source.lastIndexOf('/') + 1);
      expect(
        new RegExp(body, flags).test(provenance),
        `rule ${source} flags a legitimate surveyor credit`,
      ).toBe(false);
    }
  });
});
