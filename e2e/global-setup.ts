import { readFileSync } from 'node:fs';
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
 * The check is on the *base path*, not on freshness. Whether `dist` is stale
 * relative to `src` is a different question and a much harder one to answer
 * without lying; this one is exact.
 *
 * **It deliberately does not check that `dist/` exists.** `webServer` starts
 * before `globalSetup` here — verified by removing `dist` and watching the run
 * die with "Timed out waiting 60000ms from config.webServer" without this file
 * executing at all. A guard for that case would be unreachable, and an absent
 * `dist` fails loudly anyway. What this catches is the case that comes back
 * *green*, which is the only one worth a gate.
 */
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
}
