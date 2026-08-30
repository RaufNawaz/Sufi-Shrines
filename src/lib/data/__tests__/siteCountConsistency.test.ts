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
 *
 * ## The narrowness cost one number, so it widened by exactly one paragraph
 *
 * On 30 August 2026 the fourth bullet above — CLAUDE.md's bibliography standing
 * finding — was computed rather than read, and **"107 of them citing three or
 * more sources" was 103**. The other three figures in the same sentence (533
 * citations, 168 of 169 entries, exactly one citing nothing) were all correct.
 *
 * What makes it worth guarding rather than just correcting is where it sat: four
 * lines below that paragraph's own explanation of the 544→533 drift, inside the
 * sentence whose point is that *"a standing finding is a measurement with a date
 * on it"*, in a note that goes on to say `/about` recomputes these figures
 * "because a page cannot go stale the way a note can". The note went stale
 * anyway. A paragraph cannot be inoculated by being about staleness.
 *
 * So the second block below ties that one paragraph's four numbers to
 * `buildCoverage()` — the same function `/about` calls — and no further. Still
 * narrow, one paragraph wider.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildShrines } from '../shrineModel';
import { buildCoverage } from '../coverage';

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

/**
 * CLAUDE.md's bibliography standing finding, number by number.
 *
 * Each pattern anchors on the words around the figure, so a reworded sentence
 * fails loudly rather than silently stopping being checked. The expected value
 * comes from `buildCoverage()` — the function `/about` calls — so the paragraph
 * and the page can never give a reader two different answers.
 */
const BIBLIOGRAPHY_CLAIMS: {
  file?: string;
  label: string;
  pattern: RegExp;
  actual: (c: ReturnType<typeof buildCoverage>) => number;
}[] = [
  {
    file: 'docs/HANDOVER.md',
    label: '§1 — entries citing three or more sources',
    pattern: /counting rule was corrected on 24 August; (\d+) citing three/,
    actual: (c) => c.bibliography.withThreeOrMore,
  },
  {
    file: 'docs/TODO.md',
    label: 'citations in total',
    pattern: /168 of 169 now carry one, (\d+) citations/,
    actual: (c) => c.bibliography.items,
  },
  {
    file: 'docs/TODO.md',
    label: 'entries citing three or more sources',
    pattern: /(\d+) citing three or more/,
    actual: (c) => c.bibliography.withThreeOrMore,
  },
  {
    label: 'entries carrying a bibliography',
    pattern: /(\d+) of \d+ entries now carry a bibliography/,
    actual: (c) => c.bibliography.withAny,
  },
  {
    label: 'citations in total',
    pattern: /\*\*(\d+)\*\* citations in total/,
    actual: (c) => c.bibliography.items,
  },
  {
    label: 'entries citing three or more sources',
    pattern: /\*\*(\d+)\*\* of\s*\n?\s*them citing three or more sources/,
    actual: (c) => c.bibliography.withThreeOrMore,
  },
];

describe('bibliography figures written in prose match buildCoverage', () => {
  const coverage = buildCoverage(buildShrines(snapshot.rows ?? snapshot));

  it.each(BIBLIOGRAPHY_CLAIMS)('$file $label', ({ file, pattern, actual, label }) => {
    const where = file ?? 'CLAUDE.md';
    const text = readFileSync(join(ROOT, where), 'utf8');
    const m = pattern.exec(text);
    expect(
      m,
      `could not find "${label}" in ${where}. If the wording changed, update the pattern — do ` +
        'not delete the entry. An unchecked number in that paragraph is exactly how 107 ' +
        'survived as 103 in three files.',
    ).not.toBeNull();
    expect(
      Number(m![1]),
      `${where} says ${m![1]} for "${label}"; buildCoverage computes ${actual(coverage)}. ` +
        '/about shows the computed one, so the two are telling a reader different things.',
    ).toBe(actual(coverage));
  });

  it('still finds exactly one entry citing nothing, as the paragraph claims', () => {
    expect(
      coverage.bibliography.withNone,
      'CLAUDE.md says "Exactly one entry cites nothing (Sant Baba Asudaram Darbar)". If this ' +
        'moved, the sentence needs rewriting rather than the number nudging — it names the entry.',
    ).toBe(1);
    expect(readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8')).toContain(
      'Exactly one entry cites nothing',
    );
  });
});
