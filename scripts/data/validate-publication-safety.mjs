#!/usr/bin/env node
/**
 * validate-publication-safety.mjs — refuses to ship internal workflow notes to
 * the public.
 *
 * Why this exists: on 20 August 2026 the map's region filter offered a chip
 * reading *"not the shrine's exact position) — ask Saifullah for a precise pin
 * when possible."* A task assignment to a named colleague, rendered as a public
 * UI control. The chip was a separate bug (see `extractRegion`), but the note
 * itself is still in a public column — `Location` — and still reaches the shrine
 * page, the almanac and the sidebar.
 *
 * The distinction this gate draws, and the reason it is narrow:
 *
 * - **"(surveyor: Saifullah)" inside a bibliography is correct and must stay.**
 *   The fieldworker is the source. An archive whose distinguishing claim is
 *   provenance names its sources, including its people. Seventeen entries do
 *   this and every one of them is right.
 * - **"ask Saifullah for a precise pin when possible" is not a fact about a
 *   shrine.** It is a note between colleagues that happens to live in a content
 *   column.
 *
 * So the rule is not "no personal names" — it is "no directives addressed to a
 * person, and no task markers". Anything broader would delete the archive's
 * provenance, which is the last thing it can afford.
 *
 * Internal columns (`qa_note`, `flags`, `needs_review`, `id`) are exempt: they
 * are already withheld from every page by INTERNAL_ONLY_KEYS in
 * src/lib/data/constants.ts, and they are the correct home for exactly this
 * kind of note.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Mirrors INTERNAL_ONLY_KEYS in src/lib/data/constants.ts. Kept in sync by
 * src/lib/data/__tests__/publicationSafety.test.ts, because a column that
 * silently stopped being internal would silently start being published.
 */
const INTERNAL_ONLY_KEYS = new Set(['id', 'flags', 'needs_review', 'qa_note']);

const RULES = [
  {
    name: 'task addressed to a person',
    // "ask Saifullah", "Ask Saifullah for", "requested from Saifullah",
    // "follow up with Rauf". Requires a capitalised name so ordinary prose
    // ("visitors ask whether…") does not trip it.
    // The verb is case-insensitive (a note can start a sentence: "Ask Saifullah
    // for a precise pin") but the name must stay capitalised, so ordinary prose
    // like "visitors ask whether the urs is held" does not trip it.
    pattern:
      /\b(?:[Aa]sk(?:ing)?|[Rr]equest(?:ed)?\s+from|[Ff]ollow\s+up\s+with|[Cc]heck\s+with)\s+[A-Z][a-z]+/,
    why: 'a directive to a named colleague is not a fact about the shrine — move it to qa_note',
  },
  {
    name: 'task marker',
    pattern: /\b(?:TODO|FIXME|TBD|XXX)\b/,
    why: 'a work marker left in published prose',
  },
  {
    name: 'placeholder',
    pattern: /\blorem ipsum\b/i,
    why: 'placeholder copy',
  },
];

function loadRows() {
  const candidates = [
    join(ROOT, 'src', 'data', 'shrines-fallback.json'),
    join(ROOT, 'data', 'shrines.json'),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    const rows = Array.isArray(parsed) ? parsed : (parsed.rows ?? []);
    if (rows.length) return { rows, path };
  }
  return { rows: [], path: null };
}

const { rows, path } = loadRows();
if (!rows.length) {
  console.error('[publication-safety] no shrine rows found — nothing checked.');
  process.exit(1);
}

/**
 * Rows whose fix is already written and waiting on a human, because agents do
 * not write to the sheet (CLAUDE.md RULE 3). `data/patch_data_hygiene_2026-08-21.csv`
 * moves the trailing task note out of `Location` and into `qa_note`, keeping the
 * substantive provenance — "an approximate landmark, not the shrine's exact
 * position" — exactly where it is.
 *
 * This list exists so the gate can pass today and still fail on anything *new*.
 * It must shrink to empty once the patch is imported; it must never grow as a
 * way of accepting a finding.
 */
const PENDING_SHEET_FIX = new Map([
  ['Darbar Abul Muali Qadri', 'Location'],
  ['Darbar Malik Ahmad Ayaz', 'Location'],
]);

const findings = [];
const deferred = [];
for (const row of rows) {
  const name = row.Name ?? row.name ?? '(unnamed row)';
  for (const [column, value] of Object.entries(row)) {
    if (typeof value !== 'string' || !value.trim()) continue;
    if (INTERNAL_ONLY_KEYS.has(column)) continue;
    for (const rule of RULES) {
      const match = rule.pattern.exec(value);
      if (!match) continue;
      const start = Math.max(0, match.index - 50);
      if (PENDING_SHEET_FIX.get(name) === column) {
        deferred.push(`${name} · ${column}`);
        continue;
      }
      findings.push({
        name,
        column,
        rule: rule.name,
        why: rule.why,
        excerpt: value.slice(start, match.index + match[0].length + 60).replace(/\s+/g, ' '),
      });
    }
  }
}

console.log(
  `[publication-safety] ${rows.length} row(s) checked in ${path.replace(ROOT + '/', '')}`,
);

if (findings.length > 0) {
  console.error(`\n[publication-safety] FAILED — ${findings.length} internal note(s) in public columns:\n`);
  for (const f of findings) {
    console.error(`  ${f.name}`);
    console.error(`    column: ${f.column}   (${f.rule})`);
    console.error(`    …${f.excerpt}…`);
    console.error(`    → ${f.why}\n`);
  }
  console.error(
    'These render on the shrine page, the almanac and the map sidebar. Move the note to\n' +
      'the qa_note column (internal, never displayed) and re-import. Agents do not write to\n' +
      'the sheet — see data/patches/ for a ready CSV patch (CLAUDE.md RULE 3).\n' +
      'A bibliography crediting a surveyor by name is NOT this: that is provenance, and it\n' +
      'is deliberately not matched by any rule here.',
  );
  process.exit(1);
}
if (deferred.length > 0) {
  console.log(
    `[publication-safety] ${deferred.length} known finding(s) awaiting a sheet import:\n` +
      deferred.map((d) => `    · ${d}`).join('\n') +
      '\n    → data/patch_data_hygiene_2026-08-21.csv is ready to import.',
  );
}

/* A stale exception is worse than none: it reports a finding as handled when the
   text is still live. If the sheet has been fixed, delete the entry. */
const stale = [...PENDING_SHEET_FIX.keys()].filter(
  (name) => !deferred.some((d) => d.startsWith(`${name} ·`)),
);
if (stale.length > 0) {
  console.error(
    `\n[publication-safety] FAILED — ${stale.length} stale exception(s): ${stale.join(', ')}\n` +
      'These rows no longer contain the note they were excused for, so the sheet has been\n' +
      'fixed. Remove them from PENDING_SHEET_FIX in this file.',
  );
  process.exit(1);
}

console.log('[publication-safety] OK — no unreviewed internal notes in public columns.');
