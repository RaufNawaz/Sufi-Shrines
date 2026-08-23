// @vitest-environment node
/**
 * Repo hygiene invariants (RULE 4 — encode invariants, don't rely on
 * intentions).
 *
 * ## iCloud conflict copies
 *
 * This repository lives inside an iCloud-synced Desktop folder (see RULE 1),
 * and iCloud resolves a sync conflict by duplicating the file with a counter
 * appended to the basename: `thumbnail.test 2.ts`. Eleven of these were
 * sitting in `src/` on 23 Aug 2026, all copies of tracked test files. They do
 * real damage in two different ways, and neither announces itself:
 *
 * - **Byte-identical copies run twice.** Vitest's include glob is
 *   `src/**\/*.test.{ts,tsx}`, so a duplicated spec is collected and passes.
 *   Nothing fails; the suite is just quietly running the same assertions
 *   twice, and the test count no longer means what it says.
 * - **Stale copies break `npm run verify` from a file nobody edited.** Three
 *   of the eleven predated a `prettier --write` run, so `format:check` failed
 *   on paths that are not in git at all — a red verify with no diff to
 *   explain it, which is a genuinely confusing hour to lose.
 *
 * Untracked files are invisible to every other gate in the suite, so this is
 * the only place that can see them. The fix when this fails is to delete the
 * duplicate, never to reformat it.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join, basename, relative } from 'node:path';

const repoRoot = join(__dirname, '..', '..');

/** Directories whose contents are consumed by tsc, eslint, prettier or
 *  vitest — i.e. where a stray copy changes what the tooling does. */
const SCANNED = ['src', 'e2e', 'scripts', 'pipeline'];

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', 'test-results']);

/** iCloud's conflict-copy shape: a space and a counter immediately before the
 *  extension. Matches `MapSidebar.test 2.tsx` and `notes 10.md`; leaves
 *  legitimate names like `shrines_updated_2026-08-09.tsv` and `style2.css`
 *  alone. */
const CONFLICT_COPY = /\s\d+\.[A-Za-z0-9]+$/;

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out; // a scanned directory that doesn't exist is not a failure
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

describe('repo hygiene', () => {
  it('has no iCloud conflict copies in the code directories', () => {
    const offenders = SCANNED.flatMap((d) => walk(join(repoRoot, d)))
      .filter((f) => CONFLICT_COPY.test(basename(f)))
      .map((f) => relative(repoRoot, f));

    expect(
      offenders,
      'iCloud conflict copies found — delete them, do not reformat them:\n' +
        offenders.map((f) => `  ${f}`).join('\n'),
    ).toEqual([]);
  });
});
