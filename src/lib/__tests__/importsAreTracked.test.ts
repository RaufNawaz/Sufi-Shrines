// @vitest-environment node
/**
 * Every module the app imports is a file git actually has.
 *
 * A `.gitignore` line reading `archive/` — added for the stale top-level folder
 * CLAUDE.md RULE 1 warns about — matches a directory of that name at *any*
 * depth. So `src/components/archive/CoverageStats.tsx` was silently excluded
 * from `git add -A`, and the commit that pushed the two pages importing it built
 * perfectly here and cannot build from a clean clone at all. Nothing in the
 * pipeline noticed: the working tree has the file, so `tsc`, `vite build`,
 * `eslint` and all 714 tests were green, and `git status` showed nothing to
 * commit because the file was ignored rather than untracked.
 *
 * That is the whole failure mode worth guarding — an invariant that holds in the
 * working tree and fails in the repository. Two things can cause it: an ignore
 * rule that is broader than it reads, and a plain forgotten `git add`. This
 * catches both, by asking git what it has rather than asking the filesystem.
 *
 * Scope: relative imports under `src/`, which is where the app's own modules
 * live. Package imports are node_modules' problem and `npm ci` already fails
 * loudly on those.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';

const SRC = join(__dirname, '..', '..');
const REPO = join(SRC, '..');

/** Everything git has, as repo-relative paths. `-z` because a filename can
 * contain a newline, and `ls-files` quotes such paths without it. */
const tracked = new Set(
  execFileSync('git', ['ls-files', '-z'], { cwd: REPO, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean),
);

/** Source files to scan — from git, so a file that is itself untracked cannot
 * hide its own untracked imports. */
const sourceFiles = [...tracked].filter(
  (p) => p.startsWith('src/') && /\.(ts|tsx)$/.test(p) && !p.endsWith('.d.ts'),
);

const IMPORT = /(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g;

/** The extensions Vite/tsc will try for a bare specifier, plus directory
 * indexes — a resolver's job, reimplemented only as far as this needs. */
const CANDIDATES = (spec: string) => [
  spec,
  `${spec}.ts`,
  `${spec}.tsx`,
  `${spec}.json`,
  `${spec}.css`,
  join(spec, 'index.ts'),
  join(spec, 'index.tsx'),
];

describe('local imports are tracked in git', () => {
  it('has source files to check', () => {
    expect(sourceFiles.length).toBeGreaterThan(100);
  });

  it('resolves every relative import to a file git has', () => {
    const missing: string[] = [];

    for (const file of sourceFiles) {
      const body = readFileSync(join(REPO, file), 'utf8');
      for (const match of body.matchAll(IMPORT)) {
        const spec = match[1];
        const from = dirname(join(REPO, file));
        const resolved = CANDIDATES(resolve(from, spec)).find((p) => existsSync(p));

        if (!resolved) {
          // Unresolvable on disk is a different bug, and tsc already reports it
          // with a better message than this test could.
          continue;
        }
        const repoPath = relative(REPO, resolved).split('\\').join('/');
        if (!tracked.has(repoPath)) {
          missing.push(`${file} imports '${spec}' → ${repoPath} (on disk, not in git)`);
        }
      }
    }

    expect(
      [...new Set(missing)],
      'These modules exist in the working tree but git does not have them, so the ' +
        'build is green here and broken from a clean clone. Either `git add` them, or — ' +
        'if a .gitignore rule is swallowing them — anchor the rule (`/archive/`, not ' +
        '`archive/`, matches only the top level).',
    ).toEqual([]);
  });
});
