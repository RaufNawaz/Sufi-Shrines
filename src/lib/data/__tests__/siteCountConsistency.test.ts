// @vitest-environment node
/**
 * Any file that states the archive's size must state the current one (RULE 4).
 *
 * The number went stale in four places at once, and each was found separately:
 *
 * - `CITATION.cff` said 163 sites (and named three traditions of six)
 * - `README.md` said 163, on the repository's front page
 * - `docs/HANDOVER.md` §1 said 167, in the paragraph stating the archive's
 *   central claim
 * - `CLAUDE.md`'s standing findings said "49 of 167 entries have no
 *   bibliography", which had also stopped being true
 *
 * None of them was wrong when written. That is the whole problem: a count in
 * prose is a measurement with a date on it, and prose does not recompute. The
 * project's answer to this for the *reader* was `/coverage`, which computes
 * everything from the shipped data on every load. This is the answer for the
 * *repository*: a number written down has to match the data or the build fails.
 *
 * Only the total is checked, and only where it appears as a site count. That is
 * deliberately narrow — a check that tried to validate every figure in every
 * document would be unmaintainable, and this is the one number that appears in
 * the places a stranger reads first.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');
const snapshot = JSON.parse(readFileSync(join(ROOT, 'src/data/shrines-fallback.json'), 'utf8'));
const ROWS: number = (snapshot.rows ?? snapshot).length;

/**
 * Each entry names a file and a pattern whose capture group is a site count.
 * The pattern has to be specific enough not to match an unrelated number — so
 * each anchors on the surrounding words rather than on digits alone.
 */
const CLAIMS: { file: string; label: string; pattern: RegExp }[] = [
  {
    file: 'README.md',
    label: 'the headline site count',
    pattern: /open dataset of \*\*(\d+) sacred\s*\n?\s*sites/,
  },
  {
    file: 'README.md',
    label: 'the dataset row count in Data & Citation',
    pattern: /The dataset \((\d+) rows\)/,
  },
  {
    file: 'CITATION.cff',
    label: 'the abstract site count',
    pattern: /open dataset of (\d+) sacred/,
  },
  {
    file: 'docs/HANDOVER.md',
    label: "§1's comparison against the Punjab Auqaf register",
    pattern: /\*\*534\*\* shrines against our \*\*(\d+)\*\*/,
  },
];

describe('stated site counts match the shipped data', () => {
  it('the snapshot has rows to compare against', () => {
    expect(ROWS).toBeGreaterThan(100);
  });

  it.each(CLAIMS)('$file — $label', ({ file, pattern }) => {
    const text = readFileSync(join(ROOT, file), 'utf8');
    const m = pattern.exec(text);
    expect(
      m,
      `could not find the site count in ${file}. If the wording changed, update the pattern ` +
        'in this test — do not delete the entry, because an unchecked number is how this went ' +
        'stale in four files at once.',
    ).not.toBeNull();
    expect(
      Number(m![1]),
      `${file} says ${m![1]} sites; the shipped snapshot has ${ROWS}`,
    ).toBe(ROWS);
  });
});
