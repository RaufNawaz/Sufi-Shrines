// @vitest-environment node
/**
 * The file the validator reads and the file the site ships must hold the same
 * rows (RULE 4 — encode invariants, don't rely on intentions).
 *
 * ## The hazard this is for
 *
 * `npm run data:build` writes four files. Two of them hold rows:
 *
 * - **`data/shrines.json`** — the canonical dataset. `scripts/data/validate.mjs`
 *   reads it, and so do `validate-tours`, `validate-images` and
 *   `build-shrine-index --check`. It is what "the data is valid" means.
 * - **`src/data/shrines-fallback.json`** — the shipped snapshot. It is what
 *   `scripts/prerender.mjs`, `useShrineData`, `buildCoverage`,
 *   `buildArchiveReport`, `audit_coordinates.py` and every unit test that pins a
 *   number actually read. It is what a reader sees.
 *
 * **Four gates read only the first, two read only the second, and nothing tied
 * them together.** They agree today — 169 rows, 7,436 field values, zero
 * differences — and nothing held them there.
 *
 * The way they come apart is ordinary. Someone hand-edits the shipped snapshot
 * to try a badge or apply a patch locally; an iCloud conflict copy is resolved
 * the wrong way round; a partial `git checkout` restores one file and not the
 * other. `data:validate` then reads the canonical, finds it clean, and exits 0.
 * Every prerendered page, every `/about` figure and every pinned count is
 * computed from a file no validator has read.
 *
 * And the obvious repair did not repair. `build-dataset.mjs` short-circuited on
 * the canonical file's digest alone and printed `Files untouched` — so
 * re-running the build to be safe confirmed the wrong file and left the shipped
 * one drifted. That is fixed in the same commit as this test; this is the half
 * that *detects*, that is the half that *repairs*, and neither is sufficient
 * alone.
 *
 * ## Why the existing guards do not cover it
 *
 * There are two nearby chains and the hole is between them.
 * `shrinesIndex.test.ts` ties `src/data/shrines-index.json` to
 * `data/shrines.json`. `snapshotFidelity.test.ts` ties the newest
 * `data/snapshot_*.csv` to the **fallback** — but `snapshot-sheet.mjs` generates
 * that CSV *from* the fallback, so the pair moves together and proves nothing
 * about the canonical. No edge ran between the canonical and the shipped file.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(__dirname, '..', '..', '..', '..');

const CANONICAL = 'data/shrines.json';
const SHIPPED = 'src/data/shrines-fallback.json';

type Row = Record<string, unknown>;
type Dataset = { generated?: string; count?: number; rows: Row[]; schema_version?: string };

function load(rel: string): Dataset {
  return JSON.parse(readFileSync(join(repoRoot, rel), 'utf8')) as Dataset;
}

/**
 * The one legitimate difference between the two files.
 *
 * The canonical carries `schema_version`; the snapshot does not, and never has
 * — it is the app's payload rather than a published artefact. `generated`
 * differs whenever only one has been rewritten, which is not itself a defect:
 * the rows are the claim.
 */
const IGNORED_TOP_LEVEL = new Set(['schema_version', 'generated']);

describe('dataset ↔ shipped snapshot parity', () => {
  it('ships the rows the validator validated, field for field', () => {
    const canonical = load(CANONICAL);
    const shipped = load(SHIPPED);

    expect(
      shipped.rows.length,
      `${CANONICAL} holds ${canonical.rows.length} rows and ${SHIPPED} holds ${shipped.rows.length}. ` +
        'The second is what every page renders from and what no schema gate reads. Run ' +
        '`npm run data:build`.',
    ).toBe(canonical.rows.length);

    const differences: string[] = [];
    for (let i = 0; i < canonical.rows.length; i += 1) {
      const a = canonical.rows[i];
      const b = shipped.rows[i] ?? {};
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const key of keys) {
        const left = a[key] ?? '';
        const right = b[key] ?? '';
        if (String(left) !== String(right)) {
          const name = String(a.Name ?? a.name ?? `row ${i}`);
          differences.push(
            `  ${name} · ${key}\n      validated: ${JSON.stringify(left).slice(0, 90)}\n      shipped:   ${JSON.stringify(right).slice(0, 90)}`,
          );
        }
      }
    }

    expect(
      differences,
      differences.length === 0
        ? ''
        : `${differences.length} field(s) differ between the file the validator reads and the file the\n` +
            `site ships. The shipped one is ${SHIPPED} and nothing else checks it:\n\n` +
            `${differences.slice(0, 25).join('\n')}\n\n` +
            'Run `npm run data:build`. If it prints "digest match, files untouched" on a tree in\n' +
            'this state, that is the bug this test was written beside — say so rather than\n' +
            'hand-copying one file over the other.',
    ).toEqual([]);
  });

  it('agrees on the row count it advertises', () => {
    const canonical = load(CANONICAL);
    const shipped = load(SHIPPED);
    // `count` is read by nothing at runtime, which is exactly why it can rot.
    expect(canonical.count).toBe(canonical.rows.length);
    expect(shipped.count).toBe(shipped.rows.length);
  });

  it('differs at the top level only where it is meant to', () => {
    const canonical = load(CANONICAL) as unknown as Record<string, unknown>;
    const shipped = load(SHIPPED) as unknown as Record<string, unknown>;
    const onlyCanonical = Object.keys(canonical).filter(
      (k) => !(k in shipped) && !IGNORED_TOP_LEVEL.has(k),
    );
    const onlyShipped = Object.keys(shipped).filter(
      (k) => !(k in canonical) && !IGNORED_TOP_LEVEL.has(k),
    );
    expect(
      [...onlyCanonical, ...onlyShipped],
      'The two dataset files have grown a structural difference beyond `schema_version` and ' +
        '`generated`. A new top-level key on one side is a new thing the other side does not ' +
        'carry — decide which file it belongs in before this list is widened.',
    ).toEqual([]);
  });
});
