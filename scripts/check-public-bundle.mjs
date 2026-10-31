/**
 * The public build carries no team-only content (docs/TEAM_ACCESS_PLAN.md, 31 October 2026).
 *
 * Rauf's ruling: the team view is a separate, encrypted build, and the public site is the clean
 * one. The compile-time gate (vite.config.ts `define`) is what removes the team's modules,
 * strings and data from the public bundle, but a gate is an intention; this is the check that it
 * held. It reads every text file the public build emits and fails on any of:
 *   - a team-only chunk (the review desk, the provenance panel, /about's team sections, the
 *     badge, the review queue, the provenance and book-figure data, the team string table);
 *   - a team-only interface string, English or Urdu (src/lib/i18n/uiStrings.team.ts);
 *   - a string from a team-only data file (data/provenance.json, data/kg-review-queue.json,
 *     data/kg-book-figures-*.json) that public data does not also contain.
 *
 * Usage:
 *   node scripts/check-public-bundle.mjs                   # dist/, without dist/team (part of `npm run build`)
 *   node scripts/check-public-bundle.mjs --dir dist/team   # the encrypted edition: nothing readable
 *   node scripts/check-public-bundle.mjs --dir dist-team --expect-hits
 *                                                          # the canary: an unencrypted team build must hit
 * In `npm run build` it skips itself when VITE_TEAM_GATE says the build is not the public one.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { transform } from 'esbuild';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const dirArg = args.includes('--dir') ? args[args.indexOf('--dir') + 1] : null;
const expectHits = args.includes('--expect-hits');
const gate = process.env.VITE_TEAM_GATE ?? 'public';
if (!dirArg && gate !== 'public') {
  console.log(`[public-bundle] skipped: this is the ${gate} build, not the public one`);
  process.exit(0);
}
const DIR = resolve(ROOT, dirArg ?? 'dist');
if (!existsSync(DIR)) {
  console.error(`[public-bundle] ${relative(ROOT, DIR)} does not exist: build first`);
  process.exit(1);
}

const TEAM_CHUNKS =
  /(?:^|\/)(?:ReviewPage|SourcesProvenance|AboutTeamSections|ArchiveKnows|ArchiveState|TeamViewBadge|provenance|kg-review-queue|kg-book-figures-[\w-]+|uiStrings\.team)-[\w-]{6,}\.js$/;
// Only text a browser can read as text; and markers with no character a bundler would escape.
const TEXT = /\.(?:js|mjs|css|html|json|webmanifest|txt|xml|svg)$/;
const plain = (s) => typeof s === 'string' && !/["'\\`\n\r\t]/.test(s) && !/\$\{/.test(s);

async function teamStrings() {
  const file = join(ROOT, 'src/lib/i18n/uiStrings.team.ts');
  if (!existsSync(file)) return [];
  // The table may import types from uiStrings.ts; types vanish in the transform, and a
  // runtime import is rewritten to an empty stub so the table loads on its own.
  const { code } = await transform(readFileSync(file, 'utf8'), { loader: 'ts', format: 'esm' });
  const stubbed = code.replace(/^import\s[^;]*;$/gm, '');
  const mod = await import(
    `data:text/javascript;base64,${Buffer.from(stubbed).toString('base64')}`
  );
  const out = [];
  const walk = (v) => {
    if (typeof v === 'string') out.push(v);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  Object.values(mod).forEach(walk);
  return out.filter((s) => plain(s) && s.trim().length >= 25);
}

function dataStrings() {
  const teamFiles = ['data/provenance.json', 'data/kg-review-queue.json'].concat(
    readdirSync(join(ROOT, 'data'))
      .filter((f) => /^kg-book-figures-.*\.json$/.test(f))
      .map((f) => `data/${f}`),
  );
  // What the public build may legitimately contain: its own data.
  const publicText = [
    ...readdirSync(join(ROOT, 'src/data'))
      .filter((f) => f.endsWith('.json'))
      .map((f) => join(ROOT, 'src/data', f)),
    join(ROOT, 'data/kg.json'),
  ]
    .filter((f) => existsSync(f))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');
  const out = new Set();
  for (const f of teamFiles) {
    if (!existsSync(join(ROOT, f))) continue;
    const walk = (v) => {
      if (typeof v === 'string') {
        if (plain(v) && v.length >= 40 && !publicText.includes(v)) out.add(v);
      } else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(JSON.parse(readFileSync(join(ROOT, f), 'utf8')));
  }
  return [...out];
}

function files(dir, skipTeam) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (!(skipTeam && dir === DIR && name === 'team')) out.push(...files(p, skipTeam));
    } else out.push(p);
  }
  return out;
}

const strings = await teamStrings();
const data = dataStrings();
const markers = [...strings.map((s) => ['string', s]), ...data.map((s) => ['data', s])];
const all = files(DIR, !dirArg);
const hits = [];
for (const f of all) {
  const rel = relative(DIR, f).split('\\').join('/');
  if (TEAM_CHUNKS.test(rel)) hits.push(`${rel}: a team-only chunk`);
  if (!TEXT.test(rel)) continue;
  const text = readFileSync(f, 'utf8');
  for (const [kind, m] of markers) {
    if (text.includes(m)) {
      hits.push(`${rel}: team ${kind} "${m.slice(0, 70)}${m.length > 70 ? '…' : ''}"`);
      if (hits.length > 40) break;
    }
  }
}
const where = relative(ROOT, DIR) + (dirArg ? '' : ' (without team/)');
console.log(
  `[public-bundle] ${all.length} files in ${where} against ${strings.length} team strings, ${data.length} team data strings and the team chunk names`,
);
if (expectHits) {
  if (!hits.length) {
    console.error(
      '[public-bundle] FAIL: expected team content here (the canary), found none: the check cannot see it',
    );
    process.exit(1);
  }
  console.log(
    `[public-bundle] ok: the canary finds team content (${hits.length} hits), so the check works`,
  );
  process.exit(0);
}
if (hits.length) {
  console.error(`[public-bundle] FAIL: team-only content in ${where}:`);
  hits.slice(0, 40).forEach((h) => console.error('  ' + h));
  process.exit(1);
}
console.log('[public-bundle] ok: no team-only content');
