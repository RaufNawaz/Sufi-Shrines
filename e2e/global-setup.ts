import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = join(ROOT, 'dist', 'index.html');

/**
 * Refuse to run the suite against a bundle it cannot load.
 *
 * `playwright.config.ts` serves `dist/` through `npm run preview` at
 * `http://localhost:4173/` and reuses an existing server. Nothing anywhere
 * checked *which* `dist/` that is, and there are two:
 *
 *   npm run build       → assets at `/Sufi-Shrines/assets/…` (GitHub Pages)
 *   npm run build:e2e   → assets at `/assets/…`              (the preview root)
 *
 * Run the suite after a plain `npm run build` and every page serves an
 * index.html whose script tags 404. The app never boots, and the failure does
 * not look like one: on 29 August 2026 a full run reported **`7 passed`** and
 * **exited 0** against a production-base bundle, forty minutes after an
 * identical suite had reported 358 passed against the right one. Both numbers
 * are green-shaped. Only one of them was a test of anything.
 *
 * That is the shape RULE 4 exists for — a plausible assumption ("dist is
 * whatever I last built for the suite") that nothing cheaply checked — so it is
 * checked here, before a single browser opens, and it names the command to run.
 *
 * There are two checks here, and the second one was added the hard way — see
 * `assertNotStale` below.
 *
 * **It deliberately does not check that `dist/` exists.** `webServer` starts
 * before `globalSetup` here — verified by removing `dist` and watching the run
 * die with "Timed out waiting 60000ms from config.webServer" without this file
 * executing at all. A guard for that case would be unreachable, and an absent
 * `dist` fails loudly anyway. What this catches is the case that comes back
 * *green*, which is the only one worth a gate.
 */
/**
 * Refuse to run against a `dist/` older than the source it was built from.
 *
 * This file's first version said freshness was "a different question and a much
 * harder one to answer without lying", and left it. Within the hour it cost two
 * mutation checks: a CSS rule was broken on purpose, `npm run build:e2e` was
 * run, the spec passed — and the conclusion drawn was "the assertion is weak".
 * It was not. **The build had failed** (a red `tsc` on an unrelated committed
 * file), `vite build` never ran, and Playwright served the previous, correct
 * bundle. A failed rebuild leaves the last good `dist` in place, so the suite
 * goes green against code that is no longer on disk.
 *
 * That is the same family as the base-path bug above and worse, because it
 * produces a *pass*. `npm run build:e2e` chains `tsc && vite build && …`, so any
 * red typecheck anywhere in the repo silently turns every e2e run on the branch
 * into a test of whatever was built last.
 *
 * The comparison is deliberately coarse — newest mtime under the inputs that
 * reach the bundle, against `dist/index.html`. It is allowed to be conservative:
 * a false "rebuild first" costs a build, and a false pass costs a wrong belief
 * about whether the code works. Test files are excluded because editing a spec
 * does not change the bundle, and that is by far the most common edit made
 * between runs.
 */
const BUNDLE_INPUTS = ['src', 'data', 'public', 'index.html', 'vite.config.ts'];

function newestMtime(path: string): number {
  let stat;
  try {
    stat = statSync(path);
  } catch {
    return 0; // an input that does not exist cannot make dist stale
  }
  if (!stat.isDirectory()) return stat.mtimeMs;
  let newest = 0;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    // A spec or a fixture does not reach the bundle, and editing one between
    // runs is the normal case.
    if (/^__tests__$/.test(entry.name) || /\.(test|spec)\./.test(entry.name)) continue;
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    newest = Math.max(newest, newestMtime(join(path, entry.name)));
  }
  return newest;
}

function assertNotStale(): void {
  const built = statSync(INDEX).mtimeMs;
  let newestInput = 0;
  let culprit = '';
  for (const input of BUNDLE_INPUTS) {
    const at = newestMtime(join(ROOT, input));
    if (at > newestInput) {
      newestInput = at;
      culprit = input;
    }
  }
  if (newestInput <= built) return;
  const ageSec = Math.round((newestInput - built) / 1000);
  throw new Error(
    `e2e: dist/ is older than the source it was built from — "${culprit}" changed ${ageSec}s ` +
      'after the last build, so this run would test the previous bundle and could pass ' +
      'against code that is no longer on disk.\n' +
      '     A failed `npm run build:e2e` leaves the last good dist in place, so check for a ' +
      'red tsc before assuming this is just a missed rebuild.\n' +
      '     Run:  npm run build:e2e',
  );
}

export default function globalSetup(): void {
  const html = readFileSync(INDEX, 'utf8');
  const entry = /<script[^>]+src="([^"]+\.js)"/.exec(html);
  if (!entry) {
    throw new Error(
      'e2e: no module script found in dist/index.html — the build output has changed shape, ' +
        'and this guard is now looking at nothing. Fix the guard, do not delete it.',
    );
  }

  const src = entry[1]!;
  if (!src.startsWith('/assets/')) {
    throw new Error(
      `e2e: dist/ was built for a different base path — index.html loads "${src}", but the ` +
        'suite serves dist/ at the root of http://localhost:4173/, so every asset would 404 ' +
        'and the app would never boot.\n' +
        '     This is almost always a plain `npm run build` (GitHub Pages base) left behind.\n' +
        '     Run:  npm run build:e2e',
    );
  }

  assertNotStale();
}
