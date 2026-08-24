// @vitest-environment node
/**
 * The Urdu interface strings stay out of every reader's bundle.
 *
 * `uiStrings.ur.ts` is 42 KB of source — 22 KB built — and it is a separate chunk
 * so an English-only reader never fetches a word of it. Every route's eager JS
 * dropped ~27 KB when it was split out.
 *
 * **A single static import anywhere in `src/` collapses that**, silently and
 * completely: the bundler folds the chunk back into whatever imports it, every
 * route pays the 42 KB again, and nothing fails. The site works. That is the
 * whole reason this file exists — it is the same failure the bundle budget was
 * written for (1 MB of `urdu-content.json` as a static import), one directory
 * over, and the budgets alone would not name the cause.
 *
 * The other half is the flash. `t()` falls back to English for a table that has
 * not loaded, which is the right safety net and precisely the wrong first frame:
 * a page that reads English for 200ms under an Urdu toggle has told the reader
 * which language the site thinks is real. `main.tsx` must therefore *await* the
 * active language's table before rendering, and there is nothing to hide that
 * wait behind — the prerendered files are `<head>` metadata around a
 * `<div id="root">` shell, not server-rendered HTML (HANDOVER §9.98). What makes
 * the wait unnoticeable is a `modulepreload` the prerenderer injects into `/ur`
 * pages, so the fetch starts with the document instead of after the bundle
 * parses.
 *
 * Each of those three is asserted here, because each fails quietly: an import
 * that costs every reader 42 KB, a render that is not gated, and a preload that
 * stopped being emitted.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '..', '..', '..');
const ROOT = join(SRC, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** App source only. A test or an e2e spec may import the table directly — it is
 * asserting *about* the table, and nothing in a test reaches the bundle. */
const appFiles = walk(SRC).filter(
  (f) => !f.includes('__tests__') && !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'),
);

describe('the Urdu string table is not in the eager bundle', () => {
  it('has app source to check', () => {
    expect(appFiles.length).toBeGreaterThan(80);
  });

  it('is never statically imported', () => {
    const offenders: string[] = [];
    for (const file of appFiles) {
      const body = readFileSync(file, 'utf8');
      // `import … from './uiStrings.ur'` — but not `import('./uiStrings.ur')`,
      // which is the sanctioned dynamic form.
      for (const match of body.matchAll(/^\s*import\s[^\n]*['"][^'"]*uiStrings\.ur['"]/gm)) {
        offenders.push(`${file.replace(ROOT + '/', '')}: ${match[0].trim()}`);
      }
    }
    expect(
      offenders,
      'A static import folds the 42 KB Urdu table back into the importer’s chunk, so every ' +
        'reader pays for it again and nothing fails. Use loadUiStrings(lang) from uiStrings.ts.',
    ).toEqual([]);
  });

  it('is reachable exactly one way — the loader in uiStrings.ts', () => {
    const uiStrings = readFileSync(join(SRC, 'lib', 'i18n', 'uiStrings.ts'), 'utf8');
    expect(uiStrings, 'the loader no longer dynamically imports the table').toMatch(
      /import\(['"]\.\/uiStrings\.ur['"]\)/,
    );
    expect(uiStrings).toContain('export function loadUiStrings');
  });

  it('gates the first render on the active language’s table', () => {
    /* Not a style preference. Without the await, an Urdu reader's first frame is
       English — `t()`'s fallback doing exactly what it is designed to do, in the
       one place it must not. */
    const main = readFileSync(join(SRC, 'main.tsx'), 'utf8');
    expect(main).toContain('loadUiStrings(');
    expect(
      /loadUiStrings\([^)]*\)\s*\.then\(\s*\(\)\s*=>\s*\{[\s\S]{0,400}createRoot/.test(main),
      'main.tsx renders without waiting for the interface strings, so an Urdu reader ' +
        'gets an English first frame',
    ).toBe(true);
  });

  it('loads the table before switching language, not after', () => {
    /* Switching first paints the new language's page with the old language's
       words — on a switch into Urdu, the entire page in English under an Urdu
       toggle. */
    const context = readFileSync(join(SRC, 'lib', 'i18n', 'LanguageContext.tsx'), 'utf8');
    expect(
      /loadUiStrings\(next\)[\s\S]{0,200}setLangState\(next\)/.test(context),
      'setLang switches the language before its strings are loaded',
    ).toBe(true);
  });
});

/* The preload is a build artefact, so it can only be checked after a build. Skipped
   rather than failed when dist/ is absent: `npm run test` runs without building,
   and a test that fails for that reason trains people to ignore it.

   Absent was the easy half. `dist/` is gitignored, so it is never cleaned by a
   checkout and never rebuilt by `npm run test` — it simply persists, at whatever
   commit last built it. A build from 23 August satisfied `existsSync` and then
   failed both assertions below, because the split it is asserting about did not
   exist until the 24th. Nothing was wrong with the source; the guard was asking
   the wrong question. So it asks the right one: is this dist newer than the
   things that decide what it contains?

   Skipping a stale one loses nothing, because the real gate is
   `check-routes-prerendered.mjs`, which runs inside `npm run build` and therefore
   cannot be handed an old artefact. What survives here is the cheap local signal
   for anyone who did just build. */
const distUr = join(ROOT, 'dist', 'ur', 'about', 'index.html');
const distEn = join(ROOT, 'dist', 'about', 'index.html');
const distManifest = join(ROOT, 'dist', '.vite', 'manifest.json');

/** Change any of these and the built preload can change with it. */
const DECIDES_THE_OUTPUT = [
  join(SRC, 'lib', 'i18n', 'uiStrings.ur.ts'),
  join(SRC, 'lib', 'i18n', 'uiStrings.ts'),
  join(ROOT, 'scripts', 'prerender.mjs'),
  join(ROOT, 'vite.config.ts'),
];

const mtime = (f: string) => (existsSync(f) ? statSync(f).mtimeMs : 0);
const distIsCurrent =
  existsSync(distUr) &&
  existsSync(distManifest) &&
  mtime(distManifest) >= Math.max(...DECIDES_THE_OUTPUT.map(mtime));

describe.skipIf(!distIsCurrent)(
  'the built /ur pages preload the table (needs a fresh dist)',
  () => {
    it('names the real chunk from the manifest', () => {
      const manifest = JSON.parse(
        readFileSync(join(ROOT, 'dist', '.vite', 'manifest.json'), 'utf8'),
      ) as Record<string, { file?: string }>;
      const chunk = manifest['src/lib/i18n/uiStrings.ur.ts']?.file;
      expect(chunk, 'the Urdu table is no longer a dynamic entry — the split is gone').toBeTruthy();

      const html = readFileSync(distUr, 'utf8');
      expect(html, 'the /ur page does not preload the Urdu strings').toContain(chunk!);
      expect(html).toMatch(/<link rel="modulepreload"[^>]*uiStrings\.ur/);
    });

    it('uses the same base path as the entry script', () => {
      /* A preload whose base has drifted from the entry script's points at a 404,
       which costs the round trip this tag exists to remove while looking like it
       worked. */
      const html = readFileSync(distUr, 'utf8');
      const entry = /<script[^>]+type="module"[^>]+src="([^"]+)"/.exec(html)?.[1];
      const preload = /<link rel="modulepreload"[^>]*href="([^"]*uiStrings\.ur[^"]*)"/.exec(
        html,
      )?.[1];
      expect(entry).toBeTruthy();
      expect(preload).toBeTruthy();
      const baseOf = (url: string) => url.slice(0, url.indexOf('assets/'));
      expect(baseOf(preload!), 'preload base differs from the entry script’s').toBe(baseOf(entry!));
    });

    it('does not put it on an English page', () => {
      /* The entire point of the split. An English reader fetching 22 KB of Nastaliq
       interface copy is the thing this undid. */
      expect(readFileSync(distEn, 'utf8')).not.toContain('uiStrings.ur');
    });
  },
);
