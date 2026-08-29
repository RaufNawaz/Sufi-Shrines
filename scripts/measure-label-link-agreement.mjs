#!/usr/bin/env node
/**
 * measure-label-link-agreement.mjs — where the sheet's legacy figure cell and
 * the knowledge graph disagree about who a site commemorates.
 *
 * ⚠ **ITS PREMISE CHANGED WITHIN HOURS OF BEING WRITTEN, AND THE HEADER IS
 * CORRECTED RATHER THAN QUIETLY REWRITTEN**, because that is the failure this
 * file exists to catch. It was written on 28 August 2026 to answer "does the
 * name a shrine page *prints* match the person it links to". Later the same
 * evening `ShrinePage` was changed to render the graph's name instead of the
 * raw `Sufi Saint` cell (`11dfe52`), so the rendered page now always agrees and
 * this script no longer measures the page at all. **It measures the data seam:
 * rows where the sheet's legacy cell and the graph name different people.** The
 * question it was built for is now answered by the page itself.
 *
 * Left running, and useful, for one reason: a row it reports is a row whose
 * sheet cell has not caught up with the graph — i.e. a pending RULE 3 patch, or
 * an override living in the build. That is exactly what `data/patch_javindi_
 * bibi_figure_2026-08-28.csv` is waiting for. When the sheet catches up, the
 * row leaves this list on its own.
 *
 * WHY THIS EXISTS AS A FILE. `/shrine/tomb-of-javindi-bibi` renders the label
 * **"Jalaluddin Surkh-Posh Bukhari"** over the href **`/saint/bibi-jawindi`**:
 * a man's name on a woman's tomb, linking to the woman. Neither half is a bug
 * on its own. `ShrinePage` takes the label from the row's legacy `Sufi Saint`
 * cell (`localizeField(shrine.raw, 'Sufi Saint')`) and the href from the
 * knowledge graph (`primaryFigureSlug`), and **nothing has ever compared the
 * two**. The graph was corrected for that row; the visible cell was not; and
 * because each source is separately defensible the disagreement is invisible
 * to every check the repository has.
 *
 * That is the same seam as `figureColumns.mjs` (28 August): two copies of one
 * fact, no gate where they meet. This is the gate.
 *
 * WHAT IT REPORTS, and why it is two lists and not one. Measured 28 August
 * 2026 over the 169-row committed snapshot: **6 rows disagree, and they are two
 * unrelated defects.**
 *
 *   Kind B — a different person (1 row). Tomb of Javindi Bibi. **Closed at the
 *   render layer the same evening** (`3998982`/`11dfe52`): the graph override
 *   points at Bibi Jawindi and the page now prints her name over her link,
 *   verified in a browser. It still appears in this script's output, correctly,
 *   because the *sheet cell* still says Jalaluddin Surkh-Posh Bukhari until the
 *   patch is imported. A row here is a pending import, not a broken page.
 *
 *   Kind A — the same person with a sentence for a slug (5 rows). The label and
 *   the figure are the same human; the slug swallowed a description, e.g.
 *   `/saint/malik-ahmad-ayaz-described-in-the-survey-as-slave-of-mahmud-ghaznavi-
 *   minister-and-governor-of-lahore`. These are `extractParenthetical` treating
 *   a role or a whole sentence as an alt-name — a known problem that HANDOVER
 *   §9 records as needing a curated rule rather than a heuristic, because the
 *   two conservative regexes tried against it both flagged genuine Arabic and
 *   Persian name particles. They are **published URL surface**, not just display
 *   strings: `scripts/prerender.mjs` emits a file per figure route, so
 *   "tidying" one retires a live URL.
 *
 * WHY IT IS A SURVEY AND NOT YET A GATE. It would be red today on the five
 * Kind A rows, and this project's rule — earned twice on 28 August — is that an
 * invariant is not worth encoding until it has been watched go green. It exits
 * 0 deliberately. When the curated parenthetical rule lands and Kind A is
 * empty, `--check` is one `process.exit(1)` away and belongs in `data:validate`.
 *
 * READ THIS BEFORE TRUSTING ITS COUNT. **The matcher over-fires on purpose.**
 * It compares letters-only, in both directions, and calls a row a disagreement
 * unless one name contains the other. That is why five same-person rows appear:
 * a stricter rule would hide them, and a similarity score would be the
 * instrument that proposed 21 merges of which 2 were right (HANDOVER §9,
 * 28 August). **It is built to hand a human six rows to read, not to publish a
 * number.** Read the rows.
 *
 * Usage:
 *   node scripts/measure-label-link-agreement.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

const snapshot = read('src/data/shrines-fallback.json');
const shrineFigures = read('data/kg-shrine-figures.json');
const kg = read('data/kg.json');

const rows = Array.isArray(snapshot) ? snapshot : (snapshot.rows ?? snapshot.shrines ?? []);
const rawFigures = kg.figures ?? kg.saints ?? [];
const figures = Array.isArray(rawFigures) ? rawFigures : Object.values(rawFigures);

/** Figure slug → the graph's display name. Slugs carry a `saint:` prefix in kg.json. */
const nameBySlug = new Map();
for (const f of figures) {
  const id = String(f.id ?? f.slug ?? '').replace(/^saint:/, '');
  if (id) nameBySlug.set(id, f.name ?? f.label ?? '');
}

/* Mirrors `src/lib/data/slugify.ts` closely enough to join rows to the index.
   Any row it fails to join is reported rather than skipped silently — a shrine
   missing from the index is itself a finding. */
const slugify = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

const letters = (s) => s.toLowerCase().replace(/[^a-z]/g, '');

const disagreements = [];
const unjoined = [];
let compared = 0;

for (const row of rows) {
  const name = row.Name ?? row.name ?? '';
  const label = String(row['Sufi Saint'] ?? '').trim();
  if (!label) continue;
  const slugs = shrineFigures[slugify(name)];
  if (!slugs || slugs.length === 0) {
    unjoined.push(name);
    continue;
  }
  compared++;
  const primary = slugs[0];
  const graphName = nameBySlug.get(primary) ?? '(no such figure node)';
  const a = letters(label);
  const b = letters(graphName);
  if (a && b && !a.includes(b) && !b.includes(a)) {
    disagreements.push({ name, label, primary, graphName });
  }
}

console.log(`\nLabel vs link — ${compared} row(s) with both a legacy label and a graph link\n`);
if (unjoined.length) {
  console.log(`  ${unjoined.length} row(s) had a label but no figure in the index:`);
  for (const n of unjoined) console.log(`    · ${n}`);
  console.log('');
}
console.log(`  ${disagreements.length} disagree. Read them; the matcher over-fires by design.\n`);
for (const d of disagreements) {
  console.log(`  ${d.name}`);
  console.log(`     shows: "${d.label}"`);
  console.log(`     links: /saint/${d.primary}  ("${d.graphName}")`);
}
console.log('\n  Exit 0 — this is a survey, not a gate. See the header for why.\n');
