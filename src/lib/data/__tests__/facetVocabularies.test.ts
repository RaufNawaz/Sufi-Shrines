// @vitest-environment node
/**
 * The three closed facet vocabularies, enforced over the rows the site ships
 * (RULE 4 — encode invariants, don't rely on intentions).
 *
 * ## The hazard this is for
 *
 * `CLAUDE.md`'s schema fixes three closed vocabularies:
 *
 * - `status` — Active · Occasional · Heritage · Ruin · Destroyed
 * - `support_level` — Field-verified · Source-documented · Source-seeded · Web-compiled
 * - `info_level` — Full · Moderate · Low
 *
 * **Nothing enforced any of them.** `scripts/data/validate.mjs` exits 0 on a row
 * carrying `status: "Blown up last Tuesday"`, `support_level: "Vibes"` and
 * `info_level: "Some"`; its ten warnings say nothing about these columns.
 * `pipeline/validate_shrines.py` checks that the *columns exist*, never their
 * values. `check-live-sheet.mjs` lists all three under `REPORTED_COLUMNS` —
 * counted, not validated — and its header says why: *"Their vocabularies live in
 * TypeScript this file cannot import, and hardcoding a copy here would create a
 * third source of truth."*
 *
 * **That objection is exactly why this is a unit test and not a script.** A
 * vitest file imports the real normalizers, so no fourth copy of any enum comes
 * into existence: the check and the app agree by construction.
 *
 * ## What an off-vocabulary value costs
 *
 * All three normalizers return `null` on anything they do not recognise, and
 * every caller renders nothing rather than the raw text. So `Field verified`
 * without the hyphen would drop the badge from `ShrinePage` and
 * `ShrinePreview`, drop the row out of the "Field-verified only" filter in
 * `shrineFilters.ts`, and drop it out of both `/about` builders — and the page
 * still looks finished, because a missing badge looks exactly like a shrine
 * that has no badge. A sheet edit deploys instantly with no review step
 * (RULE 3), so nothing else stands between a typo and the live site.
 *
 * To be exact about the damage, because the first version of this note
 * overstated it: `/about` is **not** blind. `buildCoverage`'s `tally()` returns
 * `unrecorded` and `buildArchiveReport` returns `statusUnknown`, and both are
 * drawn. What is missing is anything that *exits non-zero*, anything that
 * *names the row*, and any signal at all on the entry's own page.
 *
 * ## Why two rows are allowed, and why they are not edited
 *
 * Two shipped rows carry prose in `status`, both beginning `Active;`. So the
 * archive holds 130 active sites and `/about` counts 128.
 *
 * They are named below rather than fixed, for two reasons that are both rules.
 * The sheet is production and agents do not write to it (RULE 3). And the fix
 * already exists as a patch awaiting a human import —
 * `data/patch_schema_hygiene_2026-08-27.csv` moves each sentence into
 * `status_note` and sets `status` to `Active`, keeping every word. Editing the
 * prose to clear a check is the thing RULE 4 explicitly forbids; the sentences
 * are real information about real places.
 *
 * A blank value stays legal. Unrecorded is honest, and `validate.mjs`'s
 * empty-field warnings already cover it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { siteStatusKey } from '../siteStatus';
import { supportLevelKey } from '../supportLevel';
import { infoLevelKey } from '../infoLevel';

const repoRoot = join(__dirname, '..', '..', '..', '..');

type Row = Record<string, unknown>;

function shippedRows(): Row[] {
  const path = join(repoRoot, 'src', 'data', 'shrines-fallback.json');
  return (JSON.parse(readFileSync(path, 'utf8')) as { rows: Row[] }).rows;
}

const FACETS = [
  {
    column: 'status',
    normalise: siteStatusKey,
    vocabulary: 'Active | Occasional | Heritage | Ruin | Destroyed',
    prose: 'status_note',
    costs:
      'the row loses its status label on the shrine page and in the map preview, drops out of the status filter, and is counted as "unrecorded" on /about',
  },
  {
    column: 'support_level',
    normalise: supportLevelKey,
    vocabulary: 'Field-verified | Source-documented | Source-seeded | Web-compiled',
    prose: 'qa_note',
    costs:
      'the row loses its provenance badge everywhere it appears and drops out of the "Field-verified only" filter',
  },
  {
    column: 'info_level',
    normalise: infoLevelKey,
    vocabulary: 'Full | Moderate | Low',
    prose: 'qa_note',
    costs: 'the row loses its completeness badge and its line in the /about breakdown',
  },
] as const;

/**
 * Rows known to carry prose where a code belongs, with the patch that fixes
 * them.
 *
 * An allowlist rather than a count: a count would let a second row in silently
 * as long as a first one left. Each line is a claim someone can go and check,
 * and the "no longer offends" assertion below deletes the line for them once the
 * patch is imported.
 */
export const KNOWN_PROSE_IN_A_CODE_COLUMN = new Map<string, string>([
  [
    'Darbar Abul Muali Qadri::status',
    '"Active; in use daily, construction ongoing". Fixed by data/patch_schema_hygiene_2026-08-27.csv, which sets status=Active and moves the clause to status_note verbatim. Awaiting import (RULE 3).',
  ],
  [
    'Darbar Malik Ahmad Ayaz::status',
    '"Active; physically constrained. Reported as occupying a small area reduced by losses in the Sikh era…". Same patch, same treatment — the sentence is real information about the site and is kept whole.',
  ],
]);

describe('closed facet vocabularies', () => {
  it('ships no value outside the vocabulary it belongs to', () => {
    const rows = shippedRows();
    const offenders: string[] = [];

    for (const row of rows) {
      const name = String(row.Name ?? row.name ?? '(unnamed row)');
      for (const facet of FACETS) {
        const raw = String(row[facet.column] ?? '').trim();
        if (raw === '') continue; // unrecorded is honest
        if (facet.normalise(raw) !== null) continue;
        if (KNOWN_PROSE_IN_A_CODE_COLUMN.has(`${name}::${facet.column}`)) continue;
        offenders.push(
          `  ${name}\n      ${facet.column} = ${JSON.stringify(raw.slice(0, 120))}\n` +
            `      not one of: ${facet.vocabulary}\n` +
            `      cost: ${facet.costs}\n` +
            `      prose belongs in \`${facet.prose}\``,
        );
      }
    }

    expect(
      offenders,
      offenders.length === 0
        ? ''
        : `${offenders.length} value(s) outside a closed vocabulary:\n\n${offenders.join('\n\n')}\n\n` +
            'Fix the sheet and import a patch (RULE 3 — agents do not write to it). Do not edit\n' +
            'the value here to clear this, and do not widen the vocabulary to fit the value: both\n' +
            'are the shortcut RULE 4 names. If a new vocabulary term is genuinely wanted, it goes\n' +
            "in CLAUDE.md's schema and in the normalizer first.",
    ).toEqual([]);
  });

  it('names no exception that has stopped offending', () => {
    const rows = shippedRows();
    const stillOffending = new Set<string>();
    for (const row of rows) {
      const name = String(row.Name ?? row.name ?? '(unnamed row)');
      for (const facet of FACETS) {
        const raw = String(row[facet.column] ?? '').trim();
        if (raw !== '' && facet.normalise(raw) === null) {
          stillOffending.add(`${name}::${facet.column}`);
        }
      }
    }
    const stale = [...KNOWN_PROSE_IN_A_CODE_COLUMN.keys()].filter((k) => !stillOffending.has(k));
    expect(
      stale,
      stale.length === 0
        ? ''
        : `${stale.length} allowlisted row(s) no longer carry prose — the patch has been imported.\n` +
            'Delete these lines so the list stays a set of claims someone can check:\n' +
            stale.map((k) => `  ${k}`).join('\n'),
    ).toEqual([]);
  });

  it('still counts two active sites that /about reports as unrecorded', () => {
    // The consequence, pinned as a number so that importing the patch visibly
    // moves it. 128 render as Active; the archive holds 130.
    const rows = shippedRows();
    const active = rows.filter((r) => siteStatusKey(String(r.status ?? '')) === 'active').length;
    const proseActive = rows.filter((r) => {
      const raw = String(r.status ?? '').trim();
      return raw !== '' && siteStatusKey(raw) === null && /^active\b/i.test(raw);
    }).length;
    expect(active).toBe(128);
    expect(proseActive).toBe(2);
  });
});
