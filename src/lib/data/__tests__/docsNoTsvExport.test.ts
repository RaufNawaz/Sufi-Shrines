// @vitest-environment node
/**
 * No document may tell a reader to export the sheet as TSV (RULE 3, RULE 4).
 *
 * Google Sheets' TSV export silently strips the newlines inside cells. Every
 * `Description` in this archive is markdown — headings, bibliography bullets,
 * verse breaks — so a TSV round-trip flattens the entire archive's prose
 * structure. Nothing errors. You find out later.
 *
 * That is why CLAUDE.md RULE 3 says "Export CSV, never TSV", and why this
 * repository documents the discovery in three places. And yet
 * `docs/RUNBOOK.md` STEP 1 said `File → Download → Tab-separated values`,
 * because it was written on 9 August, before anyone knew. A stale instruction is
 * more dangerous than a stale fact: a fact is merely believed, an instruction is
 * *followed* — and this one had been promoted into the "read these first"
 * section of the documentation index.
 *
 * So the rule gets a check. Discussing TSV is fine and necessary — several docs
 * explain why it is forbidden. What is banned is an *imperative*: telling
 * someone to download, export or save the sheet in that format.
 *
 * The exemption looks at a **window** around the match, not the matching line
 * alone. The first version was line-scoped and flagged three separate passages
 * that exist precisely to forbid TSV — each quoting the menu path on one line
 * and calling it harmful on the next. Prose wraps; a line is not a thought. A
 * line-scoped exemption over wrapped prose is a false-positive machine, and
 * widening it here costs nothing real: a genuine imperative step in a runbook
 * does not have the word "forbidden" three lines away.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');

const DOCS = execSync("find docs -name '*.md'", { cwd: ROOT, encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

/**
 * Imperative TSV-export phrasings. Each is an instruction, not a discussion:
 * a Sheets menu path, or a verb telling the reader to produce a TSV.
 */
const INSTRUCTIONS = [
  /Download\s*→\s*Tab-separated/i,
  /Download\s+as\s+Tab-separated/i,
  /export(?:\s+\w+){0,3}\s+as\s+TSV\s*(?:→|:|\.|$)/im,
  /save\s+(?:it\s+)?as\s+[\w-]*\.tsv\b/i,
  /output=tsv/i,
];

describe('no doc instructs a TSV export of the sheet', () => {
  it('found the docs tree', () => {
    expect(DOCS.length).toBeGreaterThan(20);
  });

  it.each(INSTRUCTIONS.map((re, i) => ({ i, re })))(
    'no doc matches pattern %#',
    ({ re }) => {
      /* Words that mark a passage as *forbidding* TSV rather than instructing
         it. Matched against a window, per the note above. */
      const FORBIDS =
        /never|not TSV|off-limits|forbidden|flatten|strips|destroy|do not|don't|originally said|harmful|RULE 3/i;
      const WINDOW_BEFORE = 2;
      const WINDOW_AFTER = 3;

      const offenders: string[] = [];
      for (const file of DOCS) {
        const lines = readFileSync(join(ROOT, file), 'utf8').split('\n');
        lines.forEach((line, i) => {
          if (!re.test(line)) return;
          const window = lines
            .slice(Math.max(0, i - WINDOW_BEFORE), i + WINDOW_AFTER + 1)
            .join(' ');
          if (FORBIDS.test(window)) return;
          offenders.push(`${file}:${i + 1} ${line.trim().slice(0, 80)}`);
        });
      }
      expect(
        offenders,
        "Sheets' TSV export strips newlines inside cells, which flattens the markdown in every " +
          'Description (CLAUDE.md RULE 3). Say CSV. If the line is explaining why TSV is banned, ' +
          'phrase it so that it says so.',
      ).toEqual([]);
    },
  );
});
