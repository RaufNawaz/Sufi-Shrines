#!/usr/bin/env node
/**
 * repoint-kg-evidence.mjs — move a KG quote's `source` to where its words still are.
 *
 * WHY THIS EXISTS. On 30 October 2026 the sheet's `Description` for 94 rows was
 * replaced by a shorter public text (`entries/descriptions_public/`), and the long
 * team prose it replaced now lives only in `entries/descriptions/<id>.md`. About
 * 220 quotes in the knowledge graph's evidence named `data/shrines.csv#<slug>` and
 * quoted that team prose, so they stopped being substrings of their source and
 * `verify-kg-proposals.mjs` failed. Rauf, 30 October 2026, in chat: point them to
 * the team files, and for quotes the team files no longer hold, to a frozen copy
 * of the sheet (`data/live_sheet_2026-10-15.csv`, committed on 15 October).
 *
 * WHAT IT CHANGES. Only `source`, and only where every quote on the object is
 * absent from the current row and present, verbatim (by the verifier's own
 * normalisation), in the new target. No quote, relation or confidence is
 * touched. The fragment keeps the shrine slug, so `figureProvenance.ts` can
 * still link the shrine: `entries/descriptions/<id>.md#<slug>`.
 *
 * WHAT IT LEAVES ALONE. `orderProse`, `traditions` and `traditionMemberships`:
 * those are shown to readers as excerpts of the shrine's article, so they are
 * reselected from the public text (build-order-prose.mjs, build-traditions.mjs),
 * never pointed at prose the article no longer holds (Rauf, 30 October 2026).
 *
 *     node scripts/data/repoint-kg-evidence.mjs           # report only
 *     node scripts/data/repoint-kg-evidence.mjs --write   # rewrite the JSON files
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { slugify } from './lib/slugs.mjs';

const require = createRequire(import.meta.url);
const Papa = require('papaparse');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const WRITE = process.argv.includes('--write');
const FROZEN = 'data/live_sheet_2026-10-15.csv';
const DISPLAYED = new Set(['orderProse', 'traditions', 'traditionMemberships']);
const FILES = [
  'data/kg-seeds.json',
  'data/kg-lineage-proposals.json',
  'data/kg-order-proposals.json',
  'data/kg-saint-dates-proposals.json',
];

/** Same as norm() in verify-kg-proposals.mjs. */
function norm(s) {
  return String(s)
    .replace(/[‘’ʼ′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

const { rows } = JSON.parse(readFileSync(join(ROOT, 'data', 'shrines.json'), 'utf8'));
const current = new Map(rows.map((r) => [slugify(r.Name), r]));
const frozen = new Map(
  Papa.parse(readFileSync(join(ROOT, FROZEN), 'utf8'), { header: true, skipEmptyLines: true }).data.map(
    (r) => [slugify(r.Name), r],
  ),
);
const rowText = (r) => norm(Object.values(r ?? {}).join('\n'));

function teamFile(slug) {
  const id = current.get(slug)?.id;
  if (!id) return null;
  const path = `entries/descriptions/${id}.md`;
  return existsSync(join(ROOT, path)) ? path : null;
}

const counts = { team: 0, frozen: 0, unresolved: 0 };
const unresolved = [];

function visit(node, file, path) {
  if (Array.isArray(node)) return node.forEach((v, i) => visit(v, file, `${path}[${i}]`));
  if (!node || typeof node !== 'object') return;
  const source = typeof node.source === 'string' ? node.source : '';
  const quotes = [node.quote, ...(node.quotes ?? [])].filter((q) => typeof q === 'string' && q.trim());
  if (source.startsWith('data/shrines.csv#') && quotes.length) {
    const slug = source.slice('data/shrines.csv#'.length).trim();
    const now = rowText(current.get(slug));
    if (!quotes.every((q) => now.includes(norm(q)))) {
      const team = teamFile(slug);
      const teamText = team ? norm(readFileSync(join(ROOT, team), 'utf8')) : '';
      if (team && quotes.every((q) => teamText.includes(norm(q)))) {
        node.source = `${team}#${slug}`;
        counts.team++;
      } else if (quotes.every((q) => rowText(frozen.get(slug)).includes(norm(q)))) {
        node.source = `${FROZEN}#${slug}`;
        counts.frozen++;
      } else {
        counts.unresolved++;
        unresolved.push(`${file} ${path}: ${source} — "${quotes[0].slice(0, 60)}…"`);
      }
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (path === '' && DISPLAYED.has(key)) continue;
    if (value && typeof value === 'object') visit(value, file, path ? `${path}.${key}` : key);
  }
}

for (const file of FILES) {
  const full = join(ROOT, file);
  const raw = readFileSync(full, 'utf8');
  const doc = JSON.parse(raw);
  visit(doc, file, '');
  // Keep each file's own indent (the order and dates proposals use one space),
  // so the diff is the changed `source` lines and nothing else.
  const indent = /^\{\n( +)/.exec(raw)?.[1].length ?? 2;
  if (WRITE) writeFileSync(full, JSON.stringify(doc, null, indent) + (raw.endsWith('\n') ? '\n' : ''));
}

console.log(
  `[repoint-kg-evidence] team files ${counts.team}, frozen sheet ${counts.frozen}, ` +
    `unresolved ${counts.unresolved}${WRITE ? '' : ' (report only; --write to apply)'}`,
);
unresolved.forEach((u) => console.log(`  ✗ ${u}`));
if (unresolved.length) process.exitCode = 1;
