// @vitest-environment node
/**
 * `docs/README.md` must link every doc (RULE 4).
 *
 * CLAUDE.md describes that file as "index of all reference and planning docs".
 * It listed 23 of 52, and the omissions were not the obscure ones: **`HANDOVER.md`
 * was missing** — the file CLAUDE.md tells every reader to open first — along
 * with `TODO.md`, `RUNBOOK.md`, `GOLD_STANDARD.md`, `FRONTEND_NOTES.md` and the
 * whole `prompts/` directory that RULE 0 exists to populate.
 *
 * Worse than the omissions: the index's "live working checklist" link pointed at
 * `docs/planning/TODO.md`, a snapshot from 12 July whose stated
 * highest-priority item (syncing the enriched workbook to the sheet) had been
 * completed on 18 August, and whose row count was two imports stale. A new
 * contributor following the index would have started on finished work.
 *
 * An index that goes stale silently is worse than no index, because it is
 * trusted. So it is checked: every markdown file under `docs/` must appear as a
 * link target, and every link target must exist.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');
const INDEX_PATH = join(ROOT, 'docs/README.md');
const INDEX = readFileSync(INDEX_PATH, 'utf8');

/** Every markdown file under docs/, relative to docs/. */
const DOCS = execSync("find docs -name '*.md'", { cwd: ROOT, encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((p) => p.replace(/^docs\//, ''))
  .filter((p) => p !== 'README.md')
  .sort();

/** Every relative link target in the index that points at a doc under docs/. */
const LINKED = new Set(
  [...INDEX.matchAll(/\]\(([^)]+)\)/g)]
    .map((m) => m[1]!)
    .filter((href) => !/^(https?:|#|\.\.\/)/.test(href)),
);

describe('the documentation index is complete', () => {
  it('found the docs tree', () => {
    // A find that returned nothing would make everything below vacuous.
    expect(DOCS.length).toBeGreaterThan(20);
    expect(DOCS).toContain('HANDOVER.md');
    expect(DOCS).toContain('TODO.md');
  });

  it('links every doc', () => {
    const missing = DOCS.filter((doc) => !LINKED.has(doc));
    expect(
      missing,
      'these docs exist but docs/README.md does not link them. CLAUDE.md calls that file the ' +
        'index of all docs, so a doc absent from it is a doc nobody will find.',
    ).toEqual([]);
  });

  it('links nothing that does not exist', () => {
    const dangling = [...LINKED].filter((href) => !existsSync(join(ROOT, 'docs', href)));
    expect(dangling, 'docs/README.md links these, but they are not there').toEqual([]);
  });

  it('sends the reader to the live checklist, not the superseded snapshot', () => {
    // The specific mistake this file exists for.
    const superseded = readFileSync(join(ROOT, 'docs/planning/TODO.md'), 'utf8');
    expect(
      superseded.slice(0, 400),
      'docs/planning/TODO.md is a July snapshot and must say so at the top, or a reader who ' +
        'lands on it will start on work that is finished',
    ).toMatch(/SUPERSEDED/);
  });
});
