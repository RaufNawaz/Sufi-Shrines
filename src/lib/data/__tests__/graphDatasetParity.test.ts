// @vitest-environment node
/**
 * The knowledge graph and the dataset must name the same 169 shrines
 * (RULE 4 — encode invariants, don't rely on intentions).
 *
 * ## The hazard this is for
 *
 * `data/kg.json` is rebuilt by `npm run data:kg`, which is a **separate command**
 * from `npm run data:build`. The sequence — build, then kg, then index — is
 * written down in `docs/SESSION_RESUME.md` and enforced by nothing. Run the
 * first and skip the second, and `/graph`, `/saint/:slug`, `/order/:slug`,
 * `/place/:slug` and `/shared-ground` all render from a graph built before the
 * import, with every gate green.
 *
 * The existing kg guards — `kgStats.test.ts`, `kgShrineFigures.test.ts`,
 * `traditions.test.ts`, `validate-kg-identity.mjs` — all compare kg artefacts to
 * **other kg artefacts**. A stale `kg.json` and a stale `kg-shrine-figures.json`
 * are stale together and every one of them passes. No edge ran between the graph
 * and the dataset it is built from.
 *
 * ## Why this particular staleness is not cosmetic
 *
 * It publishes a false claim about the archive's own holdings. A shrine present
 * in the dataset and absent from the graph leaves its figure marked
 * `lineageOnly`, and that figure's `/saint/` page — prerendered, in the sitemap,
 * in both languages — tells a reader *"The archive holds no entry of its own for
 * this figure."* That has happened: two entries live in the sheet with 5,268 and
 * 5,374 characters of prose, and their saint pages said the archive held
 * nothing. `scripts/data/check-drafted-entries-published.mjs` was written for
 * that case from the dataset side; this is the graph side of the same wound.
 *
 * ## The slug that matters is not the one called `id`
 *
 * Two identifier spaces exist here and both get called "slug" in conversation:
 *
 * - **The URL slug** — `buildStableSlug(name)`, e.g. `shrine-of-bibi-pak-daman`.
 *   This is `/shrine/:slug`, the prerendered filename, and the key the graph
 *   uses. There is no `Slug` column in the sheet: zero of 169 rows carry one, so
 *   every slug is derived from the name.
 * - **The `id` column** — e.g. `bibi-pak-daman`. This is the `public/photos/`
 *   directory name, and it is the list CLAUDE.md protects under "Eight slugs
 *   carry live photo URLs".
 *
 * Comparing the graph against `id` reports **14 graph slugs missing from the
 * dataset and 13 dataset ids missing from the graph** — a dramatic and entirely
 * false result, and the eight protected names are most of it. That was measured,
 * believed for several minutes, and is recorded here so the next person does not
 * spend the same minutes. This test joins on the URL slug, through the same
 * `buildSlugs` the scripts and prerender use, which `slugsSync.test.ts` holds
 * equal to the app's TypeScript.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
// The plain .mjs helper the data scripts and prerender share, imported the same
// way slugsSync.test.ts imports it.
import { buildSlugs } from '../../../../scripts/data/lib/slugs.mjs';

const ROOT = join(__dirname, '..', '..', '..', '..');
const read = (...p: string[]) => readFileSync(join(ROOT, ...p), 'utf8');

type Row = Record<string, unknown>;
type Relation = { type: string; subject: string; object: string };
type Graph = { relations: Relation[]; saints: { slug: string; shrines?: string[] }[] };

const datasetSlugs = (): Set<string> => {
  const rows = (JSON.parse(read('src', 'data', 'shrines-fallback.json')) as { rows: Row[] }).rows;
  return new Set(buildSlugs(rows) as string[]);
};

const graph = (): Graph => JSON.parse(read('data', 'kg.json')) as Graph;

const REBUILD =
  'Run `npm run data:kg`. The graph is rebuilt by a different command from the dataset, and ' +
  'nothing else notices when only one of them has run.';

describe('graph ↔ dataset parity', () => {
  it('gives every shrine in the dataset exactly one place', () => {
    const slugs = datasetSlugs();
    const locatedIn = graph().relations.filter((r) => r.type === 'located_in');
    const counts = new Map<string, number>();
    for (const r of locatedIn) counts.set(r.subject, (counts.get(r.subject) ?? 0) + 1);

    const missing = [...slugs].filter((s) => !counts.has(s));
    const duplicated = [...counts].filter(([, n]) => n > 1).map(([s, n]) => `${s} (${n})`);

    expect(
      missing,
      missing.length === 0
        ? ''
        : `${missing.length} shrine(s) in the dataset have no place in the graph. Each one leaves its\n` +
            `figure marked lineageOnly, and that figure's /saint/ page tells a reader the archive\n` +
            `holds no entry of its own for them — while the archive holds the entry.\n` +
            `${missing.slice(0, 10).map((s) => `  ${s}`).join('\n')}\n\n${REBUILD}`,
    ).toEqual([]);
    expect(duplicated, 'a shrine cannot be located in two places').toEqual([]);
  });

  it('names no shrine the dataset does not hold', () => {
    const slugs = datasetSlugs();
    const g = graph();
    const referenced = new Set<string>();
    for (const r of g.relations) {
      if (r.type === 'located_in') referenced.add(r.subject);
      if (r.type === 'buried_at') referenced.add(r.object);
    }
    for (const saint of g.saints) for (const s of saint.shrines ?? []) referenced.add(s);

    const ghosts = [...referenced].filter((s) => !slugs.has(s));
    expect(
      ghosts,
      ghosts.length === 0
        ? ''
        : `${ghosts.length} slug(s) the graph names are not in the dataset. A relation, or a saint's\n` +
            `shrine list, points at a page that will not resolve:\n` +
            `${ghosts.slice(0, 10).map((s) => `  ${s}`).join('\n')}\n\n${REBUILD}\n` +
            `If a shrine was renamed rather than removed, the old URL is published — see\n` +
            `retiredSlugs in kg.json, which exists for exactly that.`,
    ).toEqual([]);
  });

  it('joins on the URL slug, not the `id` column', () => {
    /* Guards the instrument, not the archive. If a future edit joins on `id` by
       mistake, the two assertions above turn into a 14-item false alarm rather
       than failing honestly — so pin the distinction where it can be read. */
    const rows = (JSON.parse(read('src', 'data', 'shrines-fallback.json')) as { rows: Row[] }).rows;
    const withExplicitSlugColumn = rows.filter((r) => String(r.Slug ?? '').trim() !== '');
    expect(
      withExplicitSlugColumn.length,
      'A `Slug` column has appeared. Slugs are currently derived from Name for every row; if ' +
        'the sheet starts carrying explicit slugs, buildSlugs honours them and this note is stale.',
    ).toBe(0);

    const sample = rows.find((r) => String(r.Name ?? '').includes('Bibi Pak Daman'));
    expect(sample, 'the row this note is written against has been renamed').toBeDefined();
    expect(String(sample?.id)).toBe('bibi-pak-daman');
    expect(datasetSlugs().has('shrine-of-bibi-pak-daman')).toBe(true);
    expect(
      datasetSlugs().has('bibi-pak-daman'),
      'The `id` column is the photo-directory name, not a URL slug. Joining the graph on it ' +
        'reports 14 false mismatches.',
    ).toBe(false);
  });
});
